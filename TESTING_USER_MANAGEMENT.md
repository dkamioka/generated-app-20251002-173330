# Testing Plan: User Management & Role System

**Feature:** User Management, Roles, Subscriptions
**Related Spec:** [FEATURE_SPEC_USER_MANAGEMENT.md](./FEATURE_SPEC_USER_MANAGEMENT.md)
**Test Status:** ⏳ Planned

---

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Coverage Requirements](#test-coverage-requirements)
3. [Unit Tests](#unit-tests)
4. [Integration Tests](#integration-tests)
5. [Component Tests](#component-tests)
6. [E2E Tests](#e2e-tests)
7. [Test Data & Fixtures](#test-data--fixtures)
8. [Mocking Strategy](#mocking-strategy)

---

## Testing Strategy

### Test Pyramid for User Management

```
        /\
       /  \    E2E Tests (10%)
      /    \   - Full user flows
     /------\  - Payment flows
    /        \ Integration Tests (30%)
   /          \- API endpoints
  /            \- Auth middleware
 /--------------\ Component Tests (30%)
/                \- Admin pages
/------------------\ Unit Tests (30%)
                    - Permissions
                    - Role logic
                    - Data validation
```

### Coverage Goals

| Layer | Coverage | Focus Areas |
|-------|----------|-------------|
| Unit | 90%+ | Permission logic, role assignment |
| Integration | 80%+ | API endpoints, auth flow, database |
| Component | 70%+ | Admin UI, permission displays |
| E2E | Critical paths | Signup, subscription, admin actions |

---

## Test Coverage Requirements

### Phase 1: Role System

**Must Cover:**
- ✅ User creation with default role
- ✅ First user becomes admin
- ✅ Role persistence across sessions
- ✅ Auth middleware blocks unauthorized
- ✅ RBAC middleware checks roles
- ✅ Permission utility functions

**Test Count Target:** 25+ tests

### Phase 4: Admin Dashboard

**Must Cover:**
- ✅ Admin-only route protection
- ✅ User list pagination
- ✅ User search functionality
- ✅ Role change operations
- ✅ Ban/unban operations
- ✅ Analytics calculations
- ✅ Audit log creation

**Test Count Target:** 40+ tests

### Phase 2: Tier System

**Must Cover:**
- ✅ Tier assignment on signup
- ✅ Feature gating logic
- ✅ Game creation limits
- ✅ Beta mode feature access
- ✅ Free tier restrictions
- ✅ Permission checks for each feature

**Test Count Target:** 30+ tests

### Phase 3: Stripe Integration

**Must Cover:**
- ✅ Checkout session creation
- ✅ Webhook signature verification
- ✅ Subscription creation handling
- ✅ Trial period setup
- ✅ Payment failure handling
- ✅ Subscription cancellation
- ✅ Downgrade to free tier

**Test Count Target:** 35+ tests

### Phase 5: Advanced Features

**Must Cover:**
- ✅ Founding member badge display
- ✅ Email notification triggers
- ✅ Moderation actions
- ✅ Analytics aggregations
- ✅ Beta migration flow

**Test Count Target:** 20+ tests

---

## Unit Tests

### File: `tests/unit/permissions.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { userCan, PERMISSIONS } from '@worker/permissions';
import type { User } from '@shared/types';

describe('Permission System', () => {
  describe('userCan()', () => {
    it('should allow free users to create public games', () => {
      const user = createMockUser({ tier: 'free' });
      expect(userCan(user, 'game.create.public')).toBe(true);
    });

    it('should deny free users from creating private games', () => {
      const user = createMockUser({ tier: 'free' });
      expect(userCan(user, 'game.create.private')).toBe(false);
    });

    it('should allow paid users to create private games', () => {
      const user = createMockUser({ tier: 'paid' });
      expect(userCan(user, 'game.create.private')).toBe(true);
    });

    it('should allow beta users all features', () => {
      const user = createMockUser({ tier: 'beta' });
      expect(userCan(user, 'game.create.private')).toBe(true);
      expect(userCan(user, 'ai.difficulty.hard')).toBe(true);
      expect(userCan(user, 'game.history.unlimited')).toBe(true);
    });

    it('should allow admins all features regardless of tier', () => {
      const user = createMockUser({ tier: 'free', role: 'admin' });
      expect(userCan(user, 'game.create.private')).toBe(true);
      expect(userCan(user, 'admin.users.manage')).toBe(true);
    });

    it('should deny moderators admin-only permissions', () => {
      const user = createMockUser({ role: 'moderator' });
      expect(userCan(user, 'admin.users.manage')).toBe(false);
    });

    it('should allow moderators to moderate chat', () => {
      const user = createMockUser({ role: 'moderator' });
      expect(userCan(user, 'chat.moderate')).toBe(true);
    });
  });

  describe('Game Creation Limits', () => {
    it('should enforce 3 game limit for free users', async () => {
      const user = createMockUser({ tier: 'free' });
      const activeGames = 3;

      expect(canCreateGame(user, activeGames)).toBe(false);
    });

    it('should allow game creation if under limit', async () => {
      const user = createMockUser({ tier: 'free' });
      const activeGames = 2;

      expect(canCreateGame(user, activeGames)).toBe(true);
    });

    it('should not enforce limits for paid users', async () => {
      const user = createMockUser({ tier: 'paid' });
      const activeGames = 100;

      expect(canCreateGame(user, activeGames)).toBe(true);
    });
  });
});
```

### File: `tests/unit/roleAssignment.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { assignDefaultRole, promoteToAdmin } from '@worker/userService';

describe('Role Assignment', () => {
  describe('assignDefaultRole()', () => {
    it('should assign user role by default', () => {
      const role = assignDefaultRole(false);
      expect(role).toBe('user');
    });

    it('should assign admin role for first user', () => {
      const role = assignDefaultRole(true);
      expect(role).toBe('admin');
    });
  });

  describe('promoteToAdmin()', () => {
    it('should promote user to admin', async () => {
      const user = createMockUser({ role: 'user' });
      const updated = await promoteToAdmin(user.id);

      expect(updated.role).toBe('admin');
    });

    it('should create audit log entry', async () => {
      const admin = createMockUser({ role: 'admin' });
      const user = createMockUser({ role: 'user' });

      await promoteToAdmin(user.id, admin.id);

      const log = await getLatestAdminAction();
      expect(log.actionType).toBe('change_role');
      expect(log.adminId).toBe(admin.id);
    });
  });
});
```

### File: `tests/unit/tierLogic.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateGameHistoryLimit, canAccessAI } from '@worker/tierLogic';

describe('Tier Logic', () => {
  describe('Game History Limits', () => {
    it('should limit free users to 10 games', () => {
      const user = createMockUser({ tier: 'free' });
      expect(calculateGameHistoryLimit(user)).toBe(10);
    });

    it('should give unlimited history to paid users', () => {
      const user = createMockUser({ tier: 'paid' });
      expect(calculateGameHistoryLimit(user)).toBe(Infinity);
    });

    it('should give unlimited history to beta users', () => {
      const user = createMockUser({ tier: 'beta' });
      expect(calculateGameHistoryLimit(user)).toBe(Infinity);
    });
  });

  describe('AI Access', () => {
    it('should allow free users only easy AI', () => {
      const user = createMockUser({ tier: 'free' });
      expect(canAccessAI(user, 'easy')).toBe(true);
      expect(canAccessAI(user, 'medium')).toBe(false);
      expect(canAccessAI(user, 'hard')).toBe(false);
    });

    it('should allow paid users all AI levels', () => {
      const user = createMockUser({ tier: 'paid' });
      expect(canAccessAI(user, 'easy')).toBe(true);
      expect(canAccessAI(user, 'medium')).toBe(true);
      expect(canAccessAI(user, 'hard')).toBe(true);
    });
  });
});
```

---

## Integration Tests

### File: `tests/integration/auth.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestD1Database, clearDatabase } from '../helpers/db';

describe('Authentication Flow', () => {
  let db: D1Database;

  beforeEach(async () => {
    db = await createTestD1Database();
  });

  afterEach(async () => {
    await clearDatabase(db);
  });

  describe('Google OAuth Login', () => {
    it('should create new user on first login', async () => {
      const mockGooglePayload = {
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
        sub: 'google-123',
      };

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify(mockGooglePayload),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe('test@example.com');
      expect(result.data.user.role).toBe('user');
      expect(result.data.user.tier).toBe('beta');
    });

    it('should make first user admin', async () => {
      const mockGooglePayload = {
        email: 'admin@example.com',
        name: 'Admin User',
        picture: 'https://example.com/pic.jpg',
        sub: 'google-456',
      };

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify(mockGooglePayload),
      });

      const result = await response.json();

      expect(result.data.user.role).toBe('admin');
    });

    it('should update existing user on subsequent login', async () => {
      // First login
      await createUser({ email: 'test@example.com', name: 'Old Name' });

      // Second login with updated name
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'New Name',
          sub: 'google-123',
        }),
      });

      const result = await response.json();
      expect(result.data.user.name).toBe('New Name');
    });
  });

  describe('Auth Middleware', () => {
    it('should block unauthenticated requests', async () => {
      const response = await fetch('/api/users/me');

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: 'Unauthorized'
      });
    });

    it('should allow authenticated requests', async () => {
      const token = await createAuthToken({ email: 'test@example.com' });

      const response = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
    });

    it('should attach user to context', async () => {
      const user = await createUser({ email: 'test@example.com' });
      const token = await createAuthToken(user);

      const response = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      expect(result.data.id).toBe(user.id);
    });
  });
});
```

### File: `tests/integration/adminApi.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Admin API Endpoints', () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin' });
    const user = await createUser({ role: 'user' });

    adminToken = await createAuthToken(admin);
    userToken = await createAuthToken(user);
  });

  describe('GET /api/admin/users', () => {
    it('should return list of users for admin', async () => {
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should deny access to non-admin users', async () => {
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: 'Forbidden'
      });
    });

    it('should support pagination', async () => {
      // Create 25 users
      for (let i = 0; i < 25; i++) {
        await createUser({ email: `user${i}@example.com` });
      }

      const response = await fetch('/api/admin/users?page=2&limit=10', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const result = await response.json();
      expect(result.data.length).toBe(10);
      expect(result.pagination.page).toBe(2);
    });

    it('should support search by email', async () => {
      await createUser({ email: 'alice@example.com' });
      await createUser({ email: 'bob@example.com' });

      const response = await fetch('/api/admin/users?search=alice', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const result = await response.json();
      expect(result.data.length).toBe(1);
      expect(result.data[0].email).toBe('alice@example.com');
    });
  });

  describe('PATCH /api/admin/users/:id/role', () => {
    it('should allow admin to change user role', async () => {
      const user = await createUser({ role: 'user' });

      const response = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ role: 'moderator' }),
      });

      expect(response.status).toBe(200);

      const updated = await getUser(user.id);
      expect(updated.role).toBe('moderator');
    });

    it('should create audit log entry', async () => {
      const user = await createUser({ role: 'user' });

      await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ role: 'moderator' }),
      });

      const log = await getLatestAdminAction();
      expect(log.actionType).toBe('change_role');
      expect(log.targetId).toBe(user.id);
    });
  });

  describe('PATCH /api/admin/users/:id/ban', () => {
    it('should ban user', async () => {
      const user = await createUser();

      const response = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          isBanned: true,
          reason: 'Inappropriate behavior',
        }),
      });

      expect(response.status).toBe(200);

      const updated = await getUser(user.id);
      expect(updated.isBanned).toBe(true);
      expect(updated.banReason).toBe('Inappropriate behavior');
    });

    it('should prevent banned user from logging in', async () => {
      const user = await createUser();
      await banUser(user.id);

      const token = await createAuthToken(user);
      const response = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: 'Your account has been banned.'
      });
    });
  });
});
```

### File: `tests/integration/subscriptions.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import Stripe from 'stripe';

describe('Subscription Management', () => {
  describe('POST /api/subscription/checkout', () => {
    it('should create Stripe checkout session for monthly plan', async () => {
      const user = await createUser({ tier: 'free' });
      const token = await createAuthToken(user);

      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: 'monthly' }),
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.checkoutUrl).toContain('checkout.stripe.com');
    });

    it('should include 30-day trial for new subscriptions', async () => {
      const user = await createUser({ tier: 'free' });
      const token = await createAuthToken(user);

      const mockStripe = vi.spyOn(stripe.checkout.sessions, 'create');

      await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: 'monthly' }),
      });

      expect(mockStripe).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            trial_period_days: 30,
          }),
        })
      );
    });
  });

  describe('Stripe Webhooks', () => {
    it('should handle checkout.session.completed', async () => {
      const user = await createUser({ tier: 'free' });

      const event = createMockStripeEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: user.stripeCustomerId,
            subscription: 'sub_123',
          },
        },
      });

      const response = await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': signWebhook(event),
        },
        body: JSON.stringify(event),
      });

      expect(response.status).toBe(200);

      const updated = await getUser(user.id);
      expect(updated.tier).toBe('paid');
      expect(updated.subscriptionStatus).toBe('trialing');
    });

    it('should handle customer.subscription.deleted', async () => {
      const user = await createUser({
        tier: 'paid',
        stripeSubscriptionId: 'sub_123',
      });

      const event = createMockStripeEvent({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: user.stripeCustomerId,
          },
        },
      });

      await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': signWebhook(event) },
        body: JSON.stringify(event),
      });

      const updated = await getUser(user.id);
      expect(updated.tier).toBe('free');
      expect(updated.subscriptionStatus).toBe('expired');
    });

    it('should verify webhook signature', async () => {
      const event = createMockStripeEvent({
        type: 'checkout.session.completed',
      });

      const response = await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid-signature',
        },
        body: JSON.stringify(event),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Invalid signature'
      });
    });
  });
});
```

---

## Component Tests

### File: `tests/components/AdminDashboard.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminDashboard } from '@/pages/admin/Dashboard';

vi.mock('@/store/userStore');

describe('Admin Dashboard', () => {
  it('should display user statistics', async () => {
    mockAdminStore({
      stats: {
        totalUsers: 150,
        activeUsers: 75,
        paidUsers: 20,
      },
    });

    render(<AdminDashboard />);

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('should display game statistics', async () => {
    mockAdminStore({
      stats: {
        totalGames: 500,
        activeGames: 25,
        gamesThisWeek: 120,
      },
    });

    render(<AdminDashboard />);

    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Total Games')).toBeInTheDocument();
  });

  it('should redirect non-admin users', () => {
    mockAdminStore({ user: { role: 'user' } });

    render(<AdminDashboard />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});
```

### File: `tests/components/UserManagement.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserManagement } from '@/pages/admin/UserManagement';

describe('User Management Page', () => {
  it('should display list of users', async () => {
    const mockUsers = [
      { id: '1', email: 'alice@example.com', role: 'user', tier: 'free' },
      { id: '2', email: 'bob@example.com', role: 'moderator', tier: 'paid' },
    ];

    mockFetch('/api/admin/users', { data: mockUsers });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  it('should allow searching users', async () => {
    render(<UserManagement />);

    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=alice')
      );
    });
  });

  it('should allow changing user role', async () => {
    const user = { id: '1', email: 'test@example.com', role: 'user' };
    mockFetch('/api/admin/users', { data: [user] });

    render(<UserManagement />);

    await waitFor(() => screen.getByText('test@example.com'));

    const roleSelect = screen.getByRole('combobox', { name: /role/i });
    fireEvent.change(roleSelect, { target: { value: 'moderator' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/admin/users/${user.id}/role`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ role: 'moderator' }),
        })
      );
    });
  });

  it('should show ban dialog', async () => {
    const user = { id: '1', email: 'test@example.com', role: 'user' };
    mockFetch('/api/admin/users', { data: [user] });

    render(<UserManagement />);

    await waitFor(() => screen.getByText('test@example.com'));

    const banButton = screen.getByRole('button', { name: /ban/i });
    fireEvent.click(banButton);

    expect(screen.getByText('Ban User')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Reason for ban...')).toBeInTheDocument();
  });
});
```

---

## E2E Tests

### File: `tests/e2e/user-signup.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Signup & Role Assignment', () => {
  test('first user becomes admin', async ({ page }) => {
    // Clear database
    await clearTestDatabase();

    await page.goto('/');

    // Click sign in with Google
    await page.click('text=Sign in with Google');

    // Mock Google OAuth (in test environment)
    await mockGoogleOAuth(page, {
      email: 'first@example.com',
      name: 'First User',
    });

    // Should redirect to lobby
    await expect(page).toHaveURL('/');

    // Check user menu
    await page.click('[data-testid="user-menu"]');

    // Should see admin badge
    await expect(page.locator('text=Admin')).toBeVisible();

    // Should have access to admin dashboard
    await page.click('text=Admin Dashboard');
    await expect(page).toHaveURL('/admin');
  });

  test('second user gets regular user role', async ({ page }) => {
    // First user already exists
    await createUser({ email: 'admin@example.com', role: 'admin' });

    await page.goto('/');
    await page.click('text=Sign in with Google');

    await mockGoogleOAuth(page, {
      email: 'second@example.com',
      name: 'Second User',
    });

    await page.click('[data-testid="user-menu"]');

    // Should NOT see admin badge
    await expect(page.locator('text=Admin')).not.toBeVisible();

    // Should NOT have admin dashboard link
    await expect(page.locator('text=Admin Dashboard')).not.toBeVisible();
  });

  test('all users start with beta tier', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Sign in with Google');

    await mockGoogleOAuth(page, {
      email: 'beta@example.com',
      name: 'Beta User',
    });

    // Should see beta badge
    await expect(page.locator('text=🧪 Beta')).toBeVisible();

    // Should have access to all features
    await page.click('text=Create Game');
    await page.click('text=Private Game');
    await expect(page.locator('input[type="checkbox"][name="isPublic"]')).not.toBeChecked();
  });
});
```

### File: `tests/e2e/subscription-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Subscription Flow', () => {
  test('user can upgrade to paid monthly', async ({ page }) => {
    const user = await createUser({ tier: 'free' });
    await loginAs(page, user);

    await page.goto('/pricing');

    // Click upgrade on monthly plan
    await page.click('text=Monthly Plan >> button:has-text("Upgrade")');

    // Should redirect to Stripe
    await page.waitForURL(/checkout.stripe.com/);

    // Fill payment details (test mode)
    await fillStripeTestCard(page);

    // Complete payment
    await page.click('button:has-text("Subscribe")');

    // Should redirect back to success page
    await page.waitForURL('/checkout/success');

    // Should see success message
    await expect(page.locator('text=Welcome to Pro!')).toBeVisible();

    // Should now have Pro badge
    await page.goto('/');
    await expect(page.locator('text=Pro')).toBeVisible();
  });

  test('trial period shows correctly', async ({ page }) => {
    const user = await createUser({ tier: 'free' });
    await loginAs(page, user);

    await page.goto('/pricing');
    await page.click('text=Monthly Plan >> button:has-text("Start Trial")');

    await page.waitForURL(/checkout.stripe.com/);

    // Should show trial information
    await expect(page.locator('text=30-day free trial')).toBeVisible();
    await expect(page.locator('text=$0.00 due today')).toBeVisible();
  });

  test('user can cancel subscription', async ({ page }) => {
    const user = await createUser({
      tier: 'paid',
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: 'sub_test123',
    });
    await loginAs(page, user);

    await page.goto('/settings');
    await page.click('text=Manage Subscription');

    await page.click('text=Cancel Subscription');

    // Confirm cancellation
    await page.click('text=Yes, Cancel');

    await expect(page.locator('text=Subscription cancelled')).toBeVisible();
    await expect(page.locator('text=Access until')).toBeVisible();
  });
});
```

### File: `tests/e2e/admin-operations.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Admin Operations', () => {
  test('admin can view all users', async ({ page }) => {
    const admin = await createUser({ role: 'admin' });
    await createUser({ email: 'user1@example.com' });
    await createUser({ email: 'user2@example.com' });

    await loginAs(page, admin);
    await page.goto('/admin/users');

    await expect(page.locator('text=user1@example.com')).toBeVisible();
    await expect(page.locator('text=user2@example.com')).toBeVisible();
  });

  test('admin can promote user to moderator', async ({ page }) => {
    const admin = await createUser({ role: 'admin' });
    const user = await createUser({ email: 'promote@example.com', role: 'user' });

    await loginAs(page, admin);
    await page.goto('/admin/users');

    // Find user row
    const userRow = page.locator(`tr:has-text("${user.email}")`);

    // Change role
    await userRow.locator('select[name="role"]').selectOption('moderator');

    // Should show success message
    await expect(page.locator('text=Role updated')).toBeVisible();

    // Verify change
    await page.reload();
    const roleSelect = userRow.locator('select[name="role"]');
    await expect(roleSelect).toHaveValue('moderator');
  });

  test('admin can ban user', async ({ page }) => {
    const admin = await createUser({ role: 'admin' });
    const user = await createUser({ email: 'ban@example.com' });

    await loginAs(page, admin);
    await page.goto('/admin/users');

    const userRow = page.locator(`tr:has-text("${user.email}")`);

    await userRow.locator('button:has-text("Ban")').click();

    // Fill ban reason
    await page.fill('textarea[name="banReason"]', 'Inappropriate behavior');
    await page.click('button:has-text("Confirm Ban")');

    await expect(page.locator('text=User banned')).toBeVisible();

    // User should show as banned
    await expect(userRow.locator('text=Banned')).toBeVisible();
  });

  test('banned user cannot login', async ({ page }) => {
    const user = await createUser({ email: 'banned@example.com', isBanned: true });

    await page.goto('/');
    await page.click('text=Sign in with Google');

    await mockGoogleOAuth(page, {
      email: user.email,
      name: user.name,
    });

    // Should see banned message
    await expect(page.locator('text=Your account has been banned')).toBeVisible();

    // Should NOT be logged in
    await expect(page.locator('text=Sign in with Google')).toBeVisible();
  });
});
```

---

## Test Data & Fixtures

### File: `tests/helpers/fixtures.ts`

```typescript
import type { User, Role, Tier } from '@shared/types';

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: crypto.randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/pic.jpg',
    googleId: 'google-' + crypto.randomUUID(),

    role: 'user',
    tier: 'beta',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: undefined,

    stripeCustomerId: undefined,
    stripeSubscriptionId: undefined,

    betaUser: true,
    foundingMember: false,
    foundingMemberTier: undefined,

    isBanned: false,
    banReason: undefined,
    bannedAt: undefined,
    bannedBy: undefined,

    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),

    ...overrides,
  };
}

export function createMockSubscriptionEvent(overrides = {}) {
  return {
    id: 1,
    userId: crypto.randomUUID(),
    eventType: 'created',
    fromTier: 'free',
    toTier: 'paid',
    stripeEventId: 'evt_test123',
    metadata: {},
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockStripeEvent(overrides = {}) {
  return {
    id: 'evt_' + crypto.randomUUID(),
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {},
    },
    ...overrides,
  };
}
```

### File: `tests/helpers/db.ts`

```typescript
import { D1Database } from '@cloudflare/workers-types';

export async function createTestD1Database(): Promise<D1Database> {
  // Create in-memory SQLite for testing
  const db = await createD1();
  await runMigrations(db);
  return db;
}

export async function clearDatabase(db: D1Database) {
  await db.exec('DELETE FROM users');
  await db.exec('DELETE FROM subscription_events');
  await db.exec('DELETE FROM admin_actions');
  await db.exec('DELETE FROM user_sessions');
}

export async function seedDatabase(db: D1Database) {
  // Create test users
  const admin = await createUser(db, { role: 'admin' });
  const moderator = await createUser(db, { role: 'moderator' });
  const paidUser = await createUser(db, { tier: 'paid' });
  const freeUser = await createUser(db, { tier: 'free' });

  return { admin, moderator, paidUser, freeUser };
}
```

---

## Mocking Strategy

### Stripe Mocking

```typescript
// tests/mocks/stripe.ts
import { vi } from 'vitest';

export function mockStripe() {
  return {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'cs_test123',
          url: 'https://checkout.stripe.com/test123',
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn((payload, signature, secret) => {
        return JSON.parse(payload);
      }),
    },
  };
}
```

### D1 Mocking

```typescript
// tests/mocks/d1.ts
export function mockD1Database() {
  const data = new Map();

  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...params) => ({
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(data.get('user')),
        all: vi.fn().mockResolvedValue({ results: Array.from(data.values()) }),
      })),
    })),
    exec: vi.fn().mockResolvedValue({ success: true }),
  };
}
```

---

## Test Execution Order

1. **Unit Tests** - Run first (fastest)
2. **Integration Tests** - Run second (database interactions)
3. **Component Tests** - Run third (UI rendering)
4. **E2E Tests** - Run last (slowest, most comprehensive)

## CI/CD Integration

All tests run automatically on:
- Push to main/develop
- Pull requests
- Pre-deployment

**Required:** All tests must pass before merge.

---

**Next Steps:**
1. Implement test stubs
2. Run `npm run test` to verify setup
3. Implement features with TDD approach
4. Maintain 80%+ coverage

---

**Questions? See [TESTING.md](./TESTING.md) for general testing guide.**
