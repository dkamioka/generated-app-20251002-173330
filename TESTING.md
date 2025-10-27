# Testing Guide for Kido - The Retro Go Arena

This document provides comprehensive information about testing the Kido Go Game application.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Coverage](#coverage)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

---

## Overview

Our testing strategy covers four layers:

1. **Unit Tests** - Testing game logic in isolation (Go rules, captures, Ko, etc.)
2. **Integration Tests** - Testing API endpoints and data flow
3. **Component Tests** - Testing React components with user interactions
4. **E2E Tests** - Testing complete user journeys with Playwright

**Test Coverage Goals:**
- Unit Tests: 80%+
- Integration Tests: 70%+
- Component Tests: 70%+
- Critical paths: 100%

---

## Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | [Vitest](https://vitest.dev/) | Fast, Vite-native test runner |
| Integration | Vitest | API endpoint testing with mocks |
| Component | [React Testing Library](https://testing-library.com/react) | User-centric component testing |
| E2E | [Playwright](https://playwright.dev/) | Cross-browser automation |
| Mocking | [Vitest Mock](https://vitest.dev/guide/mocking.html) | Function and module mocks |
| Coverage | [V8](https://v8.dev/blog/javascript-code-coverage) | Code coverage reporting |

---

## Setup

### Install Dependencies

```bash
# Install testing dependencies
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @playwright/test
npm install -D jsdom

# Install Playwright browsers
npx playwright install
```

### Configuration Files

- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `tests/setup.ts` - Test environment setup

---

## Running Tests

### All Tests

```bash
# Run all tests (unit, integration, component)
npm test

# Run all tests including E2E
npm run test:all
```

### Unit Tests

```bash
# Run unit tests once
npm run test:unit

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with UI
npm run test:ui
```

### Integration Tests

```bash
# Run API integration tests
npm run test:integration
```

### Component Tests

```bash
# Run React component tests
npm run test:components
```

### E2E Tests

```bash
# Run Playwright E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific E2E test file
npx playwright test game-flow.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=webkit
npx playwright test --project=firefox
```

### Coverage

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/index.html
```

---

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── unit/
│   ├── gameLogic.test.ts      # Go game rules tests
│   └── helpers.test.ts        # Utility function tests
├── integration/
│   ├── api.test.ts            # API endpoint tests
│   └── durableObject.test.ts # Durable Object tests
├── components/
│   ├── GoBoard.test.tsx       # Board component tests
│   ├── ChatPanel.test.tsx     # Chat component tests
│   └── GamePanel.test.tsx     # Game panel tests
└── e2e/
    ├── game-flow.spec.ts      # Complete game flow
    ├── auth.spec.ts           # Authentication flow
    └── mobile.spec.ts         # Mobile responsiveness
```

---

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/gameLogic.test.ts
import { describe, it, expect } from 'vitest';

describe('Go Game Rules', () => {
  it('should detect Ko rule violation', () => {
    const game = createTestGame();
    // Setup Ko scenario
    game.board[5][5] = 'black';
    game.board[5][6] = 'white';

    // Black captures white
    const result1 = makeMove(game, 5, 6);
    expect(result1.success).toBe(true);

    // White tries immediate recapture - Ko violation
    const result2 = makeMove(game, 5, 5);
    expect(result2.error).toContain('Ko');
  });
});
```

### Integration Test Example

```typescript
// tests/integration/api.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('POST /api/games', () => {
  it('should create a new game', async () => {
    const response = await fetch('/api/games', {
      method: 'POST',
      body: JSON.stringify({
        playerName: 'Alice',
        boardSize: 19,
        isPublic: true
      })
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.game.boardSize).toBe(19);
  });
});
```

### Component Test Example

```typescript
// tests/components/GoBoard.test.tsx
import { render, fireEvent } from '@testing-library/react';
import { GoBoard } from '@/components/GoBoard';

describe('GoBoard', () => {
  it('should place stone on click', () => {
    const mockPlaceStone = vi.fn();
    render(<GoBoard placeStone={mockPlaceStone} />);

    const cells = screen.getAllByRole('button');
    fireEvent.click(cells[0]);

    expect(mockPlaceStone).toHaveBeenCalledWith(0, 0);
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete game flow', async ({ page }) => {
  await page.goto('/');

  // Create game
  await page.click('text=Create Game');
  await page.fill('input[name="playerName"]', 'Alice');
  await page.click('button[type="submit"]');

  // Verify game started
  await expect(page).toHaveURL(/\/game\//);
  await expect(page.locator('text=KIDO')).toBeVisible();
});
```

---

## Test Coverage

### View Coverage Report

```bash
npm run test:coverage
open coverage/index.html
```

### Coverage Thresholds

Configured in `vitest.config.ts`:

```typescript
coverage: {
  lines: 70,
  functions: 70,
  branches: 70,
  statements: 70,
}
```

### Excluded from Coverage

- `node_modules/`
- Test files (`*.test.ts`, `*.spec.ts`)
- Configuration files
- Type definitions (`*.d.ts`)
- Mock data

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests

Workflow file: `.github/workflows/test.yml`

```yaml
- name: Run tests
  run: npm run test:all

- name: Upload coverage
  uses: codecov/codecov-action@v4
```

### Pre-commit Hooks (Optional)

```bash
# Install husky
npm install -D husky

# Setup pre-commit hook
npx husky init
echo "npm run test:unit" > .husky/pre-commit
```

---

## Best Practices

### General

1. **Follow AAA Pattern**
   - Arrange: Setup test data
   - Act: Execute the code under test
   - Assert: Verify the results

2. **Test Behavior, Not Implementation**
   ```typescript
   // Good ✅
   expect(screen.getByText('Game Over')).toBeVisible();

   // Bad ❌
   expect(component.state.isGameOver).toBe(true);
   ```

3. **Use Descriptive Test Names**
   ```typescript
   // Good ✅
   it('should prevent Ko rule violation when capturing and recapturing', () => {});

   // Bad ❌
   it('test Ko', () => {});
   ```

### Unit Tests

1. **Test Edge Cases**
   - Empty boards
   - Corner stones
   - Edge stones
   - Full boards
   - Invalid inputs

2. **Test Complex Logic**
   - Ko rule detection
   - Suicide rule prevention
   - Capture mechanics
   - Territory calculation

3. **Keep Tests Fast**
   - No network calls
   - No file system access
   - Use mocks for external dependencies

### Component Tests

1. **Test User Interactions**
   ```typescript
   fireEvent.click(button);
   fireEvent.change(input, { target: { value: 'test' } });
   ```

2. **Use Accessible Queries**
   ```typescript
   // Good ✅
   screen.getByRole('button', { name: /submit/i });
   screen.getByLabelText(/username/i);

   // Bad ❌
   container.querySelector('.submit-btn');
   ```

3. **Test Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader compatibility

### E2E Tests

1. **Test Critical Paths**
   - User registration/login
   - Game creation
   - Move placement
   - Chat functionality

2. **Use Page Objects (Optional)**
   ```typescript
   class GamePage {
     async placeStone(row: number, col: number) {
       const cell = this.page.locator(`[data-cell="${row}-${col}"]`);
       await cell.click();
     }
   }
   ```

3. **Handle Flaky Tests**
   - Use proper waits (`waitForSelector`)
   - Avoid hardcoded timeouts
   - Use retry mechanisms

### Mocking

1. **Mock External Dependencies**
   ```typescript
   vi.mock('@/store/gameStore');
   vi.mock('fetch');
   ```

2. **Mock Timers**
   ```typescript
   vi.useFakeTimers();
   vi.advanceTimersByTime(1000);
   vi.useRealTimers();
   ```

3. **Reset Mocks**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks();
   });
   ```

---

## Debugging Tests

### Vitest UI

```bash
npm run test:ui
# Opens http://localhost:51204/__vitest__/
```

### Playwright Debug Mode

```bash
# Run with debugger
npx playwright test --debug

# Step through specific test
npx playwright test game-flow.spec.ts --debug
```

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:watch"],
  "console": "integratedTerminal"
}
```

---

## Common Issues & Solutions

### Issue: Tests timeout

**Solution:**
```typescript
// Increase timeout
test('slow test', async () => {}, { timeout: 10000 });
```

### Issue: Module not found

**Solution:**
- Check path aliases in `vitest.config.ts`
- Verify imports use correct paths

### Issue: Flaky E2E tests

**Solution:**
```typescript
// Use proper waits
await expect(page.locator('text=Loading')).not.toBeVisible();
await page.waitForLoadState('networkidle');
```

### Issue: Coverage not generated

**Solution:**
```bash
# Clear cache and regenerate
rm -rf coverage/
npm run test:coverage
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [Playwright Documentation](https://playwright.dev/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

---

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass: `npm run test:all`
3. Maintain coverage above 70%
4. Add test documentation for complex scenarios

---

## Questions?

For testing-related questions, please:
1. Check this guide
2. Review existing tests for examples
3. Open an issue on GitHub
4. Contact the dev team

---

**Happy Testing! 🧪**

## User Management & Subscription Testing

For comprehensive testing documentation of the user management, role system, and subscription features, see:

**[TESTING_USER_MANAGEMENT.md](./TESTING_USER_MANAGEMENT.md)**

This document covers:
- Permission system testing
- Role assignment tests
- Authentication flow tests
- Admin API endpoint tests
- Stripe integration tests
- Subscription webhook tests
- E2E user journeys

### Key Test Areas

#### D1 Database Testing
```typescript
// Create test database
const db = await createTestD1Database();

// Run migrations
await runMigrations(db);

// Seed test data
await seedDatabase(db);
```

#### Permission Testing
```typescript
import { userCan } from '@worker/permissions';

it('should enforce tier-based permissions', () => {
  const freeUser = createMockUser({ tier: 'free' });
  expect(userCan(freeUser, 'game.create.private')).toBe(false);

  const paidUser = createMockUser({ tier: 'paid' });
  expect(userCan(paidUser, 'game.create.private')).toBe(true);
});
```

#### Stripe Webhook Testing
```typescript
import { mockStripe } from '@/tests/mocks/stripe';

it('should handle subscription creation', async () => {
  const event = createMockStripeEvent({
    type: 'customer.subscription.created',
    data: { customer: 'cus_test123' }
  });

  await handleStripeWebhook(event);

  const user = await getUser(userId);
  expect(user.tier).toBe('paid');
});
```

---

