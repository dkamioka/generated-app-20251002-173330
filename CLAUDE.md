# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kido is a real-time multiplayer Go game application built on Cloudflare's edge infrastructure with a retro 90s aesthetic. The application features casual and ranked gameplay, user authentication, role-based access control, matchmaking, and a subscription system.

## Development Commands

### Setup and Installation
```bash
bun install                    # Install dependencies
```

### Development Server
```bash
bun run dev                    # Start dev server at http://localhost:3000
```

### Building and Deployment
```bash
bun run build                  # Build both frontend and worker for production
bun run preview                # Build and preview production bundle locally
bun run deploy                 # Deploy to Cloudflare (build + wrangler deploy)
```

### Linting
```bash
bun run lint                   # Run ESLint with caching (outputs JSON)
```

### Testing

#### Unit Tests
```bash
bun run test                   # Run all tests with Vitest
bun run test:unit              # Run unit tests only
bun run test:watch             # Run tests in watch mode
bun run test:ui                # Launch Vitest UI
bun run test:coverage          # Generate test coverage report
```

#### Component Tests
```bash
bun run test:components        # Test React components
```

#### Integration Tests
```bash
bun run test:integration       # Test API endpoints and backend logic
```

#### End-to-End Tests
```bash
bun run test:e2e               # Run Playwright E2E tests
bun run test:e2e:ui            # Run E2E tests in Playwright UI mode
```

#### Run All Tests
```bash
bun run test:all               # Run both Vitest and Playwright tests
```

### Cloudflare-Specific
```bash
bun run cf-typegen             # Generate TypeScript types from wrangler config
```

## Deployment to Production

### Prerequisites
- Cloudflare account with Workers access
- D1 database named `kido-go-users` already created
- Wrangler CLI installed and authenticated

### Deployment Steps

```bash
# 1. Login to Cloudflare (opens browser for OAuth)
npx wrangler login

# 2. Run Database Migrations (if not already run)
npx wrangler d1 execute kido-go-users --remote --file=worker/db/create_matchmaking_tables.sql
npx wrangler d1 execute kido-go-users --remote --file=worker/db/add_matchmaking_columns.sql

# 3. Build & Deploy
bun run build
npx wrangler deploy
```

### Database Migration Files
- `worker/db/create_matchmaking_tables.sql` - Creates `player_ratings`, `ranked_games`, `queue_history` tables
- `worker/db/add_matchmaking_columns.sql` - Adds `ranked_games_today` and `last_ranked_game_date` to users table

### Post-Deployment Testing

Critical path test:
1. Navigate to `/matchmaking`
2. Join queue with first user
3. Open incognito window, login as different user
4. Both users join queue → match found dialog appears
5. Both accept → game starts
6. Complete game (resign or double-pass)
7. Verify rating changes display
8. Check leaderboard reflects new ratings

### Environment Variables Required

Set these in Cloudflare dashboard or via wrangler secrets:
- `JWT_SECRET` - Secret for signing JWT tokens (required)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (required for auth)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (required for auth)

## High-Level Architecture

### Three-Layer Structure

**1. Frontend (src/):**
- React SPA built with Vite
- Zustand for state management (multiple stores: gameStore, userStore, adminStore, replayStore)
- React Router for navigation
- Tailwind CSS + shadcn/ui components
- Path alias: `@/` maps to `src/`

**2. Backend (worker/):**
- Cloudflare Workers with Hono web framework
- Routes defined in `worker/userRoutes.ts` (DO NOT modify `worker/index.ts`)
- Middleware for auth, RBAC, CORS in `worker/middleware/`
- Services layer: `worker/services/userService.ts`, `worker/services/ratingService.ts`
- Path alias: `@worker/` maps to `worker/`

**3. Shared Types (shared/):**
- TypeScript interfaces shared between frontend and backend
- Main file: `shared/types.ts`
- Path alias: `@shared/` maps to `shared/`

### Critical Architecture Patterns

#### Durable Objects (Stateful Backend)

**GlobalDurableObject** (`worker/durableObject.ts`):
- Manages all game state (board, players, moves, chat, history)
- Single global instance: `c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"))`
- Methods:
  - `createGame()` - Create casual or AI games
  - `createRankedGame()` - Create ranked matchmaking games
  - `joinGame()` - Join existing game
  - `makeMove()` - Place stone with Go rules validation (Ko, suicide, captures)
  - `passTurn()` - Pass turn (two passes end game)
  - `resignGame()` - Resign and trigger rating updates
  - `addChatMessage()` - Send public/player chat
  - Go logic: `findGroup()`, `calculateTerritoryAndFinalScore()`
- AI opponent logic embedded in `_makeAiMove()` with tactical heuristics
- Automatically processes ranked game completion and updates ratings

**MatchmakingQueue** (`worker/durableObjects/MatchmakingQueue.ts`):
- Single global instance manages matchmaking queue
- Rating-based matchmaking with expanding search ranges over time
- Match acceptance flow (30s timeout)
- Creates ranked games via GlobalDurableObject's `createRankedGame()`

#### Database Architecture (D1/SQLite)

Binding: `c.env.kido_go_users`

**Tables:**
- `users` - User profiles, roles, tiers, subscription status, Google OAuth IDs
  - Added columns for matchmaking: `ranked_games_today`, `last_ranked_game_date`
- `subscription_events` - Payment and subscription change history
- `admin_actions` - Audit log for admin/moderator actions
- `user_sessions` - Active JWT sessions
- `player_ratings` - ELO ratings and ranked game stats
  - Fields: `user_id`, `rating`, `ranked_wins`, `ranked_losses`, `peak_rating`, `current_streak`, `best_streak`, `total_games`, `last_game_at`
  - Default rating: 1200
- `ranked_games` - Historical record of ranked games
  - Fields: `id`, `player1_id`, `player2_id`, `player1_rating_before`, `player2_rating_before`, `player1_rating_after`, `player2_rating_after`, `winner_id`, `game_id`, `duration_seconds`, `completed_at`
- `queue_history` - Matchmaking queue analytics
  - Fields: `id`, `user_id`, `joined_at`, `left_at`, `match_found`, `wait_time_seconds`, `rating_at_join`

**Services:**
- `UserService` (`worker/services/userService.ts`) - User CRUD, admin queries
- `RatingService` (`worker/services/ratingService.ts`) - ELO calculations, matchmaking rating queries

#### Authentication Flow

1. **Google OAuth** → `POST /api/auth/google` with Google profile
2. First user automatically becomes **admin** (see `UserService.createUser()`)
3. Returns JWT token created by `createAuthToken()` in `worker/middleware/auth.ts`
4. Frontend stores token in `userStore` (Zustand)
5. Protected routes use `authMiddleware()` middleware
6. Admin routes add `requireAdmin()` or `requireModerator()` middleware

**Session Management:**
- Session-based game authentication uses `player.sessionId` (generated per player in game)
- User account authentication uses JWT tokens
- Game sessions stored in localStorage: `kido-session-{gameId}`

#### Game State Polling

The frontend polls `/api/games/:gameId` every 2 seconds to get real-time updates. No WebSockets are used. Polling logic is in page components like `GamePage.tsx`.

#### Ranked Matchmaking Flow

1. User joins queue → `POST /api/matchmaking/join` (requires auth)
2. `MatchmakingQueue` finds match based on ELO rating
3. Both players accept match → `POST /api/matchmaking/accept`
4. Game created via `GlobalDurableObject.createRankedGame()`
5. On game end (resign/pass), ratings updated via `RatingService.updateRatingsAfterGame()`

**Matchmaking Algorithm Parameters:**
- **Initial Rating Range:** ±100 rating points
- **Range Expansion:** +50 points every 30 seconds in queue
- **Maximum Range:** ±300 rating points
- **Match Acceptance Timeout:** 30 seconds
- **Queue Polling Interval:** 3 seconds (frontend)

**ELO Rating System:**
- **Starting Rating:** 1200
- **K-Factor:** 32
- **Formula:** `newRating = oldRating + K * (actualScore - expectedScore)`
- **Expected Score:** `1 / (1 + 10^((opponentRating - playerRating) / 400))`

**Tier Limits:**
- Free tier: 10 ranked games per day
- Paid/Lifetime/Beta: Unlimited ranked games

#### AI Opponent

AI moves are calculated in `GlobalDurableObject._makeAiMove()`:
- Tactical scoring: captures, saving groups, creating atari, avoiding self-atari
- Greedy selection of highest-scored valid move
- Falls back to pass if no valid moves

### State Management (Zustand Stores)

**gameStore** (`src/store/gameStore.ts`):
- Current game state, board, players
- Actions: `fetchGame()`, `placeStone()`, `passTurn()`, `resignGame()`, `sendMessage()`
- Session management: `myPlayerId`, `mySessionId`, `myObserverId`

**userStore** (`src/store/userStore.ts`):
- Current user, JWT token, authentication status
- Actions: `login()`, `logout()`, `fetchCurrentUser()`, `updateProfile()`

**adminStore** (`src/store/adminStore.ts`):
- Admin panel data: user lists, analytics, ban actions
- Only used by admin/moderator roles

**replayStore** (`src/store/replayStore.ts`):
- Replay game history with time-travel controls
- Uses `GameState.replayHistory` (event log) and `GameState.history` (board states)

### Role-Based Access Control (RBAC)

**Roles:** `admin`, `moderator`, `user`

**Tiers:** `free`, `paid`, `lifetime`, `beta`

**Permissions enforcement:**
- Middleware: `requireAdmin()`, `requireModerator()`, `preventSelfAction()` in `worker/middleware/rbac.ts`
- Permission checks: see `worker/permissions.ts` for full permission matrix
- Free tier limits: 10 ranked games/day (enforced in `matchmakingRoutes.ts`)

### Key Routes

**Game Routes** (`worker/userRoutes.ts`):
- `GET /api/games` - List public games
- `POST /api/games` - Create game (casual or AI)
- `GET /api/games/:gameId` - Get game state
- `POST /api/games/:gameId/join` - Join game
- `POST /api/games/:gameId/watch` - Watch as observer
- `POST /api/games/:gameId/move` - Make move
- `POST /api/games/:gameId/pass` - Pass turn
- `POST /api/games/:gameId/resign` - Resign game
- `POST /api/games/:gameId/chat` - Send chat message

**Auth Routes** (`worker/authRoutes.ts`):
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout
- `PUT /api/users/me` - Update own profile
- `GET /api/users/:userId` - Get public user profile

**Admin Routes** (`worker/authRoutes.ts`):
- `GET /api/admin/users` - List all users (paginated, searchable)
- `PUT /api/admin/users/:userId` - Update user role/tier/ban
- `DELETE /api/admin/users/:userId` - Delete user
- `GET /api/admin/analytics` - Dashboard analytics
- `POST /api/admin/games/clear` - Clear all games (dangerous)

**Matchmaking Routes** (`worker/routes/matchmakingRoutes.ts`):
- `POST /api/matchmaking/join` - Join ranked queue (requires auth, enforces daily limits)
- `POST /api/matchmaking/leave` - Leave queue (requires auth)
- `GET /api/matchmaking/status` - Check queue status (requires auth)
- `POST /api/matchmaking/accept/:matchId` - Accept match (requires auth)
- `POST /api/matchmaking/reject/:matchId` - Reject match (requires auth)
- `GET /api/matchmaking/leaderboard?limit=100` - Get top players by rating (optional limit param)

**Stats Routes** (`worker/routes/matchmakingRoutes.ts`):
- `GET /api/stats/me` - Get current user's stats (requires auth)
- `GET /api/stats/history` - Get current user's match history (requires auth)

## Testing Guidelines

### Test Structure
- **Unit tests:** `tests/unit/` - Pure functions, game logic, permissions
- **Integration tests:** `tests/integration/` - API endpoints with mock D1 database
- **Component tests:** `tests/components/` - React components with React Testing Library
- **E2E tests:** `tests/e2e/` - Full user flows with Playwright

### Running Specific Test Files
```bash
bun run test tests/unit/gameLogic.test.ts
bun run test tests/integration/auth.test.ts
```

### Key Testing Patterns

**Mocking Durable Objects in Tests:**
```typescript
const mockDurableObjectStub = {
  createGame: vi.fn(),
  getGame: vi.fn(),
  makeMove: vi.fn(),
};
```

**Mocking D1 Database:**
```typescript
const mockD1 = {
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      run: vi.fn(),
      all: vi.fn(),
      first: vi.fn(),
    })),
  })),
};
```

See `tests/setup.ts` for global test configuration.

## Special Features

### Browser Notifications
Implemented in `src/lib/notifications.ts` via `NotificationManager` class:
- Requests permission on first use
- Notifies when match found
- Notifies when match expires
- Can be enabled/disabled by user

### Sound Effects
Implemented in `src/lib/sounds.ts` via `SoundManager` class:
- Uses Web Audio API for low-latency playback
- Sounds: match found, queue joined, error
- Volume control and toggle on/off
- Gracefully handles browser autoplay restrictions

### Loading States
- Skeleton screens for async data (leaderboard, stats)
- Queue animations with position updates
- Loading indicators on API calls

### Error Handling
- Exponential backoff retry logic for failed API calls
- User-friendly error messages via `sonner` toast notifications
- Automatic recovery from transient failures

## Important Files to Never Modify

- `worker/index.ts` - Core worker bootstrap (comment explicitly forbids changes)
- `wrangler.jsonc` - Durable Object and D1 bindings (comment warns against modification)

## Common Patterns

### Adding a New API Route
1. Add route in `worker/userRoutes.ts` (NOT `worker/index.ts`)
2. Define request/response types in `shared/types.ts`
3. Add tests in `tests/integration/`

### Adding a New Zustand Store Action
1. Define action in store interface
2. Implement in `create()` callback
3. Use `apiCall()` helper for backend requests
4. Show user feedback with `toast()` from `sonner`

### Go Game Logic
All game rules (Ko, suicide, captures, liberties) are in `GlobalDurableObject`:
- Move validation: `_isValidMove()`
- Group finding: `findGroup()`
- Territory scoring: `calculateTerritoryAndFinalScore()`

### Session Persistence
Game sessions are stored per-game in localStorage:
```typescript
localStorage.setItem(`kido-session-${gameId}`, JSON.stringify({ playerId, sessionId }));
```

Load session on GamePage mount via `gameStore.loadSession(gameId)`.

## Project Structure Summary

```
├── src/                    # Frontend React app
│   ├── components/         # React components (GoBoard, ChatPanel, etc.)
│   ├── pages/              # Page components (GamePage, LobbyPage, AdminPage, etc.)
│   ├── store/              # Zustand stores (gameStore, userStore, etc.)
│   └── hooks/              # Custom React hooks
├── worker/                 # Cloudflare Workers backend
│   ├── index.ts            # Main worker entry (DO NOT MODIFY)
│   ├── userRoutes.ts       # User-defined API routes
│   ├── authRoutes.ts       # Authentication routes
│   ├── durableObject.ts    # GlobalDurableObject (game state)
│   ├── durableObjects/     # Additional Durable Objects (MatchmakingQueue)
│   ├── middleware/         # Auth, RBAC middleware
│   ├── services/           # Business logic (UserService, RatingService)
│   └── routes/             # Additional route modules (matchmakingRoutes)
├── shared/                 # Shared TypeScript types
│   └── types.ts            # All interfaces shared between frontend/backend
├── tests/                  # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # API integration tests
│   ├── components/         # Component tests
│   └── e2e/                # Playwright E2E tests
├── wrangler.jsonc          # Cloudflare configuration (DO NOT MODIFY)
└── vite.config.ts          # Vite build configuration
```

## Frontend Pages

**Core Pages:**
- `LobbyPage.tsx` - List public games, create new games
- `GamePage.tsx` - Play Go game with board, chat, and controls
- `ProfilePage.tsx` - View user profile and settings

**Matchmaking Pages:**
- `MatchmakingPage.tsx` - Join ranked queue, see queue status, accept/reject matches
- `LeaderboardPage.tsx` - View top players with tier badges and ratings
- `StatsPage.tsx` - View personal stats, W/L record, rating history

**Admin Pages:**
- `AdminPage.tsx` - User management, analytics, system controls (admin/moderator only)

**Replay:**
- `ReplayPage.tsx` - Watch game replays with time-travel controls

## Additional Documentation

For more detailed information, refer to these files:
- `ARCHITECTURE.md` - Comprehensive system architecture
- `FEATURE_SPEC_USER_MANAGEMENT.md` - User management system specification
- `MATCHMAKING_MASTER_PLAN.md` - Matchmaking system design
- `TESTING.md` - Detailed testing documentation
- `DEPLOYMENT_HANDOFF.md` - Complete deployment guide with testing checklist
- `QUICK_START.md` - Quick reference commands for deployment
