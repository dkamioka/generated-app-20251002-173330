# System Architecture: Kido - The Retro Go Arena

**Version:** 2.0 (with User Management)
**Last Updated:** 2025-10-27

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Data Flow](#data-flow)
5. [Database Architecture](#database-architecture)
6. [Authentication & Authorization](#authentication--authorization)
7. [API Layer](#api-layer)
8. [Frontend Architecture](#frontend-architecture)
9. [Payment Integration](#payment-integration)
10. [Deployment](#deployment)
11. [Security](#security)
12. [Scalability](#scalability)

---

## System Overview

Kido is a full-stack multiplayer Go game application built on Cloudflare's edge infrastructure with the following key characteristics:

- **Serverless Architecture:** Cloudflare Workers handle all backend logic
- **Stateful Game Management:** Durable Objects maintain real-time game state
- **Persistent User Data:** D1 (SQLite) stores user profiles, roles, and subscriptions
- **Edge Deployment:** Globally distributed with low latency
- **Role-Based Access Control:** Admin, Moderator, and User roles
- **Subscription System:** Free, Paid, and Lifetime tiers with Stripe integration

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   React SPA  │  │ Google OAuth │  │Stripe Checkout│             │
│  │   (Vite)     │  │    Client    │  │   Elements    │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘             │
│         │                 │                  │                      │
│         │ HTTP/JSON       │ OAuth 2.0        │ Hosted Page          │
│         ▼                 ▼                  ▼                      │
└─────────┼─────────────────┼──────────────────┼──────────────────────┘
          │                 │                  │
┌─────────┼─────────────────┼──────────────────┼──────────────────────┐
│         │        CLOUDFLARE WORKERS          │                      │
├─────────┼─────────────────┼──────────────────┼──────────────────────┤
│         ▼                 │                  │                      │
│  ┌──────────────────────────────────────────────────────┐           │
│  │              Hono Web Framework                      │           │
│  │  ┌─────────────┬──────────────┬─────────────────┐  │           │
│  │  │  Middleware │  API Routes  │  Error Handling │  │           │
│  │  ├─────────────┼──────────────┼─────────────────┤  │           │
│  │  │ - Auth      │ - /api/games │ - Global catch  │  │           │
│  │  │ - RBAC      │ - /api/users │ - Error logs    │  │           │
│  │  │ - CORS      │ - /api/admin │ - Client errors │  │           │
│  │  │ - Rate Lim  │ - /api/stripe│                 │  │           │
│  │  └─────────────┴──────────────┴─────────────────┘  │           │
│  └──────────────────────────────────────────────────────┘           │
│         │                 │                  │                      │
│         ▼                 ▼                  ▼                      │
│  ┌────────────┐   ┌──────────────┐  ┌────────────────┐            │
│  │   Assets   │   │ Auth Service │  │ Stripe Webhooks│            │
│  │  (Static)  │   │(OAuth verify)│  │   Handler      │            │
│  └────────────┘   └──────┬───────┘  └───────┬────────┘            │
│                          │                   │                      │
└──────────────────────────┼───────────────────┼──────────────────────┘
                           │                   │
┌──────────────────────────┼───────────────────┼──────────────────────┐
│         DATA LAYER       │                   │                      │
├──────────────────────────┼───────────────────┼──────────────────────┤
│                          ▼                   │                      │
│  ┌────────────────────────────────┐          │                      │
│  │      Cloudflare D1 (SQLite)    │◄─────────┘                      │
│  ├────────────────────────────────┤                                 │
│  │  Tables:                       │                                 │
│  │  - users                       │                                 │
│  │  - subscription_events         │                                 │
│  │  - admin_actions               │                                 │
│  │  - user_sessions               │                                 │
│  └────────────────────────────────┘                                 │
│                                                                     │
│  ┌────────────────────────────────┐                                 │
│  │   Durable Objects (Game State) │                                 │
│  ├────────────────────────────────┤                                 │
│  │  GlobalDurableObject:          │                                 │
│  │  - games: Map<id, GameState>   │                                 │
│  │  - board state                 │                                 │
│  │  - move history                │                                 │
│  │  - chat messages               │                                 │
│  │  - real-time updates           │                                 │
│  └────────────────────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Google     │  │    Stripe    │  │   Codecov    │             │
│  │   OAuth 2.0  │  │   Payments   │  │  (optional)  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI framework | 18.3.1 |
| **TypeScript** | Type safety | 5.8 |
| **Vite** | Build tool | 6.3.1 |
| **Zustand** | State management | 5.0.6 |
| **React Router** | Routing | 6.30.0 |
| **Tailwind CSS** | Styling | 3.4.17 |
| **shadcn/ui** | Component library | Latest |
| **Framer Motion** | Animations | 12.23.0 |
| **@react-oauth/google** | Google login | 0.12.2 |

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Cloudflare Workers** | Serverless runtime | Latest |
| **Hono** | Web framework | 4.8.5 |
| **Durable Objects** | Stateful storage | Latest |
| **D1 Database** | SQLite database | Latest |
| **TypeScript** | Type safety | 5.8 |

### Payments & Auth

| Service | Purpose |
|---------|---------|
| **Stripe** | Payment processing |
| **Google OAuth** | Authentication |

### Development & Testing

| Tool | Purpose | Version |
|------|---------|---------|
| **Vitest** | Test runner | 1.0+ |
| **Playwright** | E2E testing | 1.40+ |
| **ESLint** | Linting | 9.31.0 |
| **Wrangler** | CF Workers CLI | Latest |

---

## Data Flow

### 1. User Authentication Flow

```
User clicks "Sign in with Google"
  ↓
Redirect to Google OAuth consent screen
  ↓
User grants permission
  ↓
Google redirects back with authorization code
  ↓
Frontend exchanges code for ID token
  ↓
POST /api/auth/google (with ID token)
  ↓
Worker verifies token with Google
  ↓
Check if user exists in D1:
  ├─ YES: Update last_login, return user + session
  └─ NO:  Create user, assign role (first user = admin)
  ↓
Check if user is banned:
  ├─ YES: Return 403 Forbidden
  └─ NO:  Create session, return auth token
  ↓
Frontend stores token in localStorage
  ↓
Attach token to all subsequent requests
```

### 2. Game Creation Flow

```
User clicks "Create Game"
  ↓
Check permissions: userCan(user, 'game.create.public')
  ↓
If Free tier:
  Count active games → If >= 3: Show "Upgrade" modal
  ↓
POST /api/games { playerName, boardSize, isPublic, opponentType }
  ↓
Worker auth middleware: Verify token, get user
  ↓
Permission check: Can user create game type?
  ├─ Private game: Requires paid/beta tier
  └─ AI opponent: Check difficulty access
  ↓
Get Durable Object (GlobalDurableObject)
  ↓
Create game in Durable Object memory
  ↓
Return game state to client
  ↓
Frontend navigates to /game/:gameId
  ↓
Start polling: GET /api/games/:gameId every 2s
```

### 3. Move Placement Flow

```
Player clicks board intersection
  ↓
Frontend: placeStone(row, col)
  ↓
Check: Is it my turn? Am I a player?
  ↓
POST /api/games/:gameId/move { row, col, playerId, sessionId }
  ↓
Worker auth middleware: Verify session
  ↓
Get Durable Object for this game
  ↓
Validate move:
  ├─ Check turn order
  ├─ Check board position empty
  ├─ Check Ko rule
  ├─ Check suicide rule
  └─ Calculate captures
  ↓
Apply move:
  ├─ Update board state
  ├─ Remove captured stones
  ├─ Switch current player
  ├─ Add to history
  └─ Check if AI's turn → queue AI move
  ↓
Save state in Durable Object
  ↓
Return updated game state
  ↓
Frontend updates board display
  ↓
Other clients poll and see update
```

### 4. Subscription Purchase Flow

```
User clicks "Upgrade to Pro"
  ↓
Navigate to /pricing
  ↓
Select plan: Monthly ($2) / Yearly ($20) / Lifetime ($50)
  ↓
Click "Subscribe"
  ↓
POST /api/subscription/checkout { plan }
  ↓
Worker creates Stripe checkout session:
  ├─ Create or get Stripe customer
  ├─ Set trial period (30 days for recurring)
  ├─ Set success_url and cancel_url
  └─ Return checkout URL
  ↓
Redirect user to Stripe checkout page
  ↓
User enters payment details on Stripe
  ↓
Stripe processes payment
  ↓
Stripe redirects back to success_url
  ↓
Stripe sends webhook: checkout.session.completed
  ↓
POST /api/webhooks/stripe (with event)
  ↓
Worker verifies webhook signature
  ↓
Update user in D1:
  ├─ Set tier: 'paid' (or 'lifetime')
  ├─ Set subscription_status: 'trialing' (or 'active')
  ├─ Store stripe_customer_id
  └─ Store stripe_subscription_id
  ↓
Create subscription_events log entry
  ↓
Return 200 OK to Stripe
  ↓
User sees "Welcome to Pro!" page
  ↓
Features unlocked immediately
```

### 5. Admin Dashboard Flow

```
Admin navigates to /admin
  ↓
Frontend checks: user.role === 'admin'
  ├─ NO: Show "Access Denied", redirect to /
  └─ YES: Continue
  ↓
GET /api/admin/analytics/overview
  ↓
Worker RBAC middleware: requireRole('admin')
  ├─ NO: Return 403 Forbidden
  └─ YES: Continue
  ↓
Query D1 database:
  ├─ SELECT COUNT(*) FROM users
  ├─ SELECT COUNT(*) FROM users WHERE tier = 'paid'
  ├─ Calculate MRR, growth metrics
  └─ Join with games data
  ↓
Return analytics data
  ↓
Frontend displays charts and metrics
```

---

## Database Architecture

### D1 (SQL Database)

**Purpose:** Persistent, queryable user data

**Schema Design:**

```sql
-- Primary user table
CREATE TABLE users (
  id TEXT PRIMARY KEY,                 -- UUID v4
  email TEXT UNIQUE NOT NULL,          -- User email
  name TEXT NOT NULL,                  -- Display name
  role TEXT DEFAULT 'user',            -- admin | moderator | user
  tier TEXT DEFAULT 'beta',            -- free | paid | lifetime | beta
  subscription_status TEXT,            -- active | trialing | cancelled | expired
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_role ON users(role);
```

**Why D1?**
- ✅ SQL queries for analytics
- ✅ Built-in on Cloudflare platform
- ✅ Globally replicated (read replicas)
- ✅ Easy migrations
- ✅ ACID compliance
- ✅ Better for relational data (users, subscriptions, audit logs)

### Durable Objects (In-Memory State)

**Purpose:** Real-time game state with strong consistency

**Data Structure:**

```typescript
class GlobalDurableObject extends DurableObject {
  private games: Map<string, GameState> = new Map();

  // Game state stored in memory:
  // - board: Stone[][] (19x19 grid)
  // - players: Player[] (2 players max)
  // - currentPlayer: 'black' | 'white'
  // - history: Move[] (full game history)
  // - publicChat: ChatMessage[]
  // - playerChat: ChatMessage[]
}
```

**Why Durable Objects?**
- ✅ Strong consistency (single-instance writes)
- ✅ Low latency for real-time moves
- ✅ Automatic persistence to disk
- ✅ Per-game isolation
- ✅ Handles concurrent players elegantly

**Storage Strategy:**
```typescript
await this.ctx.storage.put("games", this.games);
```

All game state periodically persisted to disk, automatically restored on restart.

---

## Authentication & Authorization

### Authentication (Who are you?)

**Google OAuth 2.0:**

```typescript
// Frontend flow
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

const login = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    const result = await fetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token: tokenResponse.access_token })
    });

    const { user, sessionToken } = await result.json();
    localStorage.setItem('authToken', sessionToken);
  }
});
```

**Backend verification:**

```typescript
// worker/auth.ts
async function verifyGoogleToken(token: string) {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
  );

  const payload = await response.json();

  if (payload.email_verified) {
    return { email: payload.email, name: payload.name, ... };
  }

  throw new Error('Invalid token');
}
```

### Authorization (What can you do?)

**Role-Based Access Control (RBAC):**

```typescript
// worker/middleware/rbac.ts
export function requireRole(...roles: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
  };
}

// Usage in routes
app.get('/api/admin/users',
  requireAuth,           // Must be logged in
  requireRole('admin'),  // Must be admin
  listUsers
);
```

**Permission System:**

```typescript
// worker/permissions.ts
export const PERMISSIONS = {
  'game.create.private': {
    free: false,
    paid: true,
    lifetime: true,
    beta: true,
  },
  'admin.users.manage': {
    // Only admins, regardless of tier
  },
};

export function userCan(user: User, permission: string): boolean {
  const perm = PERMISSIONS[permission];
  if (!perm) return false;

  // Admins can do anything
  if (user.role === 'admin') return true;

  // Check tier permission
  return perm[user.tier] === true;
}
```

---

## API Layer

### API Design Principles

1. **RESTful** - Standard HTTP methods (GET, POST, PATCH, DELETE)
2. **JSON** - All requests/responses use JSON
3. **Consistent response format:**
   ```typescript
   { success: boolean; data?: T; error?: string }
   ```
4. **Versioned** - Future: `/api/v2/...`
5. **Authenticated** - Most endpoints require auth token

### Endpoint Categories

#### Public Endpoints (No Auth)
```typescript
POST   /api/auth/google          // Google OAuth login
GET    /api/health               // System health check
```

#### User Endpoints (Auth Required)
```typescript
GET    /api/users/me             // Current user profile
PATCH  /api/users/me             // Update profile
GET    /api/games                // List public games
POST   /api/games                // Create game
GET    /api/games/:id            // Get game state
POST   /api/games/:id/move       // Place stone
```

#### Admin Endpoints (Admin Role Required)
```typescript
GET    /api/admin/users          // List all users
PATCH  /api/admin/users/:id/role // Change user role
DELETE /api/admin/games/:id      // Delete game
GET    /api/admin/analytics      // System analytics
```

#### Subscription Endpoints (Auth Required)
```typescript
POST   /api/subscription/checkout  // Create checkout session
GET    /api/subscription/status    // Get subscription info
POST   /api/subscription/cancel    // Cancel subscription
```

#### Webhook Endpoints (Stripe Signature Required)
```typescript
POST   /api/webhooks/stripe      // Stripe event webhooks
```

---

## Frontend Architecture

### State Management

**Zustand Stores:**

```
src/store/
├── userStore.ts       # User profile, auth, role
├── gameStore.ts       # Current game state
└── replayStore.ts     # Game replay state
```

**Example Store:**

```typescript
// userStore.ts
export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (token) => {
    const user = await fetchUser(token);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('authToken');
    set({ user: null, isAuthenticated: false });
  },

  can: (permission: string) => {
    const { user } = get();
    return userCan(user, permission);
  },
}));
```

### Routing

```typescript
// main.tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<LobbyPage />} />
    <Route path="/game/:gameId" element={<GamePage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/pricing" element={<PricingPage />} />
    <Route path="/replay/:gameId" element={<ReplayPage />} />

    {/* Admin routes */}
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="games" element={<GameMonitoring />} />
      <Route path="analytics" element={<Analytics />} />
    </Route>

    {/* Payment routes */}
    <Route path="/checkout/success" element={<CheckoutSuccess />} />
    <Route path="/checkout/cancel" element={<CheckoutCancel />} />
  </Routes>
</BrowserRouter>
```

### Component Hierarchy

```
App
├── ErrorBoundary
├── GoogleOAuthProvider
└── Router
    ├── LobbyPage
    │   ├── CreateGameDialog
    │   ├── WatchGameDialog
    │   └── UserProfileDialog
    │
    ├── GamePage
    │   ├── GoBoard
    │   ├── GamePanel
    │   ├── ChatPanel
    │   └── MobileGameDrawer
    │
    ├── ProfilePage
    │   └── UserGameslist
    │
    ├── PricingPage
    │   └── PricingCards
    │
    └── Admin
        ├── Dashboard
        ├── UserManagement
        ├── GameMonitoring
        └── Analytics
```

---

## Payment Integration

### Stripe Configuration

**Products:**
1. Pro Monthly - $2/month with 30-day trial
2. Pro Yearly - $20/year with 30-day trial
3. Founding Member Lifetime - $50 one-time

**Checkout Flow:**

```typescript
// Create checkout session
const session = await stripe.checkout.sessions.create({
  customer: user.stripeCustomerId,
  mode: 'subscription', // or 'payment' for lifetime
  line_items: [{
    price: PRICE_IDS.monthly,
    quantity: 1,
  }],
  subscription_data: {
    trial_period_days: 30,
  },
  success_url: 'https://kido.com/checkout/success',
  cancel_url: 'https://kido.com/pricing',
});
```

**Webhooks:**
```typescript
// Handle subscription events
app.post('/api/webhooks/stripe', async (c) => {
  const signature = c.req.header('stripe-signature');
  const event = stripe.webhooks.constructEvent(
    await c.req.text(),
    signature,
    WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'checkout.session.completed':
      await activateSubscription(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await downgradeToFree(event.data.object.customer);
      break;
  }

  return c.json({ received: true });
});
```

---

## Deployment

### Cloudflare Workers Deployment

**Configuration:** `wrangler.jsonc`

```json
{
  "name": "kido-go-game",
  "main": "worker/index.ts",
  "compatibility_date": "2025-04-24",

  "assets": {
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },

  "durable_objects": {
    "bindings": [{
      "name": "GlobalDurableObject",
      "class_name": "GlobalDurableObject"
    }]
  },

  "d1_databases": [{
    "binding": "DB",
    "database_name": "kido-users",
    "database_id": "..."
  }]
}
```

**Deploy Command:**
```bash
npm run build    # Build React app
npm run deploy   # Deploy to Cloudflare
```

**Environments:**
- Development: `localhost:3000` (Vite dev server)
- Staging: `kido-staging.workers.dev`
- Production: `kido.com` (custom domain)

---

## Security

### Security Measures

1. **HTTPS Only** - Enforced by Cloudflare
2. **CORS** - Configured for specific origins
3. **Rate Limiting** - Per IP and per user
4. **Input Validation** - Zod schemas
5. **SQL Injection Prevention** - Prepared statements
6. **XSS Protection** - React escapes by default
7. **CSRF Protection** - SameSite cookies
8. **Audit Logging** - All admin actions logged
9. **Webhook Verification** - Stripe signature validation

### Rate Limiting

```typescript
// Per user tier
const RATE_LIMITS = {
  free: { requests: 100, window: 60 },     // 100 req/min
  paid: { requests: 1000, window: 60 },    // 1000 req/min
  admin: { requests: 10000, window: 60 },  // 10k req/min
};
```

---

## Scalability

### Current Limits

- **Users:** Unlimited (D1 can handle millions)
- **Concurrent Games:** ~10,000 (Durable Object sharding)
- **API Requests:** 100,000+ req/sec (Cloudflare Workers scale)
- **Database Size:** 10GB (D1 limit, can be increased)

### Scaling Strategy

**Horizontal Scaling:**
- Cloudflare Workers auto-scale globally
- Durable Objects can be sharded by game ID
- D1 read replicas in multiple regions

**Vertical Scaling:**
- Optimize queries with indexes
- Cache frequently accessed data
- Use batch operations

**Future Improvements:**
- Move finished games to R2 (object storage)
- Implement caching layer (KV storage)
- Shard users across multiple D1 databases

---

## Performance Metrics

**Target Metrics:**
- API Response Time: < 100ms (p95)
- Page Load Time: < 2s
- Time to Interactive: < 3s
- Database Query Time: < 10ms

---

**For implementation details, see:**
- [FEATURE_SPEC_USER_MANAGEMENT.md](./FEATURE_SPEC_USER_MANAGEMENT.md)
- [TESTING_USER_MANAGEMENT.md](./TESTING_USER_MANAGEMENT.md)

---

**End of Architecture Document**
