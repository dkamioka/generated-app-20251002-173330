# Tests

This directory contains all tests for the Kido Go Game application.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Directory Structure

```
tests/
├── setup.ts              # Test environment configuration
├── unit/                 # Unit tests for game logic
│   └── gameLogic.test.ts
├── integration/          # API integration tests
│   └── api.test.ts
├── components/           # React component tests
│   ├── GoBoard.test.tsx
│   └── ChatPanel.test.tsx
└── e2e/                  # End-to-end tests
    └── game-flow.spec.ts
```

## Test Categories

### Unit Tests (`tests/unit/`)

Tests for core game logic in isolation:
- **Ko rule detection** - Prevents immediate board recapture
- **Suicide rule** - Prevents playing into captured position
- **Liberty counting** - Calculates empty adjacent points
- **Group detection** - Finds connected stones
- **Capture mechanics** - Removes captured groups
- **Territory calculation** - Scores empty areas
- **Komi application** - Adds compensation to white

**Example:**
```bash
npm run test:unit
```

### Integration Tests (`tests/integration/`)

Tests for API endpoints and data flow:
- Game creation
- Move validation
- Session authentication
- Chat messaging
- Observer functionality

**Example:**
```bash
npm run test:integration
```

### Component Tests (`tests/components/`)

Tests for React components with user interactions:
- GoBoard - Stone placement, hover effects, territory display
- ChatPanel - Message sending, tab switching, visibility toggle
- GamePanel - Turn indication, score display, action buttons

**Example:**
```bash
npm run test:components
```

### E2E Tests (`tests/e2e/`)

Tests for complete user journeys:
- Creating and joining games
- Playing full games
- Chat functionality
- Observer mode
- Replay system
- Mobile responsiveness

**Example:**
```bash
npm run test:e2e
```

## Writing New Tests

### 1. Choose the Right Test Type

- **Unit**: Pure logic, no UI, no network
- **Integration**: API calls, data flow between systems
- **Component**: User interactions with UI
- **E2E**: Complete user journeys across multiple pages

### 2. Follow Naming Conventions

```typescript
// File names
gameLogic.test.ts       // Unit test
api.test.ts             // Integration test
GoBoard.test.tsx        // Component test
game-flow.spec.ts       // E2E test

// Test descriptions
describe('Module/Component Name', () => {
  it('should do something specific when condition', () => {
    // test implementation
  });
});
```

### 3. Use Helper Functions

```typescript
// Create reusable test utilities
function createTestGame(boardSize: BoardSize = 19): GameState {
  // ...
}

function mockPlayerStore(overrides = {}) {
  return {
    myPlayerId: 'test-player',
    ...overrides
  };
}
```

### 4. Test Edge Cases

```typescript
describe('Edge Cases', () => {
  it('should handle empty board', () => {});
  it('should handle corner stones', () => {});
  it('should handle maximum captures', () => {});
  it('should handle invalid inputs', () => {});
});
```

## Coverage Report

View detailed coverage:

```bash
npm run test:coverage
open coverage/index.html
```

Coverage is tracked for:
- **Statements** - Individual code statements
- **Branches** - If/else, switch cases
- **Functions** - Function declarations
- **Lines** - Source code lines

**Target Coverage: 70%+**

## Debugging Tests

### Vitest UI

Interactive test runner:
```bash
npm run test:ui
```

### Playwright Inspector

Step through E2E tests:
```bash
npx playwright test --debug
```

### Console Logs

```typescript
// Add debugging output
it('should do something', () => {
  console.log('Current state:', gameState);
  expect(gameState.turn).toBe(1);
});
```

## Continuous Integration

Tests automatically run on:
- Every push to `main` or `develop`
- Every pull request
- Before deployments

See `.github/workflows/test.yml` for CI configuration.

## Common Patterns

### Mocking Stores

```typescript
vi.mock('@/store/gameStore', () => ({
  useGameStore: vi.fn(() => ({
    board: createEmptyBoard(19),
    placeStone: vi.fn(),
  })),
}));
```

### Testing Async Operations

```typescript
it('should fetch game data', async () => {
  const promise = fetchGame('game-123');
  await expect(promise).resolves.toHaveProperty('gameId');
});
```

### Testing User Events

```typescript
import { fireEvent } from '@testing-library/react';

fireEvent.click(button);
fireEvent.change(input, { target: { value: 'test' } });
fireEvent.submit(form);
```

## Test Data

Shared test data and fixtures:

```typescript
// Mock game state
const mockGame: GameState = {
  gameId: 'test-game-1',
  boardSize: 19,
  board: createEmptyBoard(19),
  players: [mockPlayer1, mockPlayer2],
  // ...
};

// Mock players
const mockPlayer1: Player = {
  id: 'player-1',
  sessionId: 'session-1',
  name: 'Alice',
  color: 'black',
  captures: 0,
  playerType: 'human',
};
```

## Performance Testing

Monitor test execution time:

```bash
# Show slow tests
vitest --reporter=verbose
```

Slow tests (>1s) should be optimized or marked:

```typescript
it.skip('slow test', async () => {
  // Mark slow tests to skip in normal runs
}, 10000); // 10s timeout
```

## Further Reading

See [TESTING.md](../TESTING.md) for comprehensive testing guide.

---

**Questions? Check the main TESTING.md or open an issue!**
