# Feature Specification: User Management & Role System

**Version:** 1.0
**Status:** In Development
**Author:** Development Team
**Last Updated:** 2025-10-27

---

## Table of Contents

1. [Overview](#overview)
2. [Goals & Objectives](#goals--objectives)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Subscription Tiers](#subscription-tiers)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [User Flows](#user-flows)
8. [Security & Authentication](#security--authentication)
9. [Beta Launch Strategy](#beta-launch-strategy)
10. [Phase Rollout Plan](#phase-rollout-plan)

---

## Overview

This feature adds comprehensive user management, role-based access control (RBAC), and subscription tiers to the Kido Go Game application. The system separates **roles** (admin, moderator, user) from **subscription tiers** (free, paid, lifetime, beta), allowing flexible permission management.

### Key Features

- **Role System:** Admin, Moderator, User roles with specific permissions
- **Subscription Tiers:** Free, Paid ($2/mo or $20/yr), Lifetime ($50)
- **Admin Dashboard:** User management, game monitoring, analytics
- **Beta Program:** All users get paid features free during beta (3 months)
- **Founding Member Program:** Lifetime access for early adopters

---

## Goals & Objectives

### Primary Goals

1. **Enable monetization** through subscription tiers
2. **Provide administrative tools** for moderation and management
3. **Reward early adopters** with founding member benefits
4. **Scale gradually** with phased rollout

### Success Metrics

**Beta Phase (3 months):**
- 100+ user signups
- 50+ daily active users
- 500+ games played

**Post-Launch:**
- 15% conversion to paid tier
- 10+ founding member lifetime purchases
- $30+ Monthly Recurring Revenue

---

## User Roles & Permissions

### Role Hierarchy

```
Admin > Moderator > User
```

Roles are **independent** from subscription tiers.

### Role Definitions

#### **Admin**

**Purpose:** Full system control and management

**Permissions:**
- ✅ All user permissions
- ✅ All moderator permissions
- ✅ Access admin dashboard
- ✅ Manage user roles (promote/demote)
- ✅ Ban/suspend users
- ✅ Delete any game
- ✅ View system analytics
- ✅ Manage subscriptions
- ✅ View audit logs
- ✅ Access system health monitoring

**Auto-Assignment:** First user to register becomes admin

#### **Moderator**

**Purpose:** Content moderation and community management

**Permissions:**
- ✅ All user permissions
- ✅ View flagged content
- ✅ Delete inappropriate chat messages
- ✅ Mute users in games
- ✅ Close games with violations
- ✅ View moderation queue
- ❌ Cannot manage user roles
- ❌ Cannot ban users (must escalate to admin)
- ❌ Cannot access analytics

**Assignment:** Promoted by admin

#### **User**

**Purpose:** Standard player

**Permissions:**
- ✅ Create games (subject to tier limits)
- ✅ Join games
- ✅ Play games
- ✅ Send chat messages
- ✅ View own profile
- ✅ View game history (subject to tier limits)
- ❌ Cannot access admin features
- ❌ Cannot moderate content

**Assignment:** Default role for new signups

---

## Subscription Tiers

### Tier Overview

| Feature | Free | Paid | Lifetime | Beta |
|---------|------|------|----------|------|
| **Price** | $0 | $2/mo or $20/yr | $50 once | $0 |
| **Active Games** | 3 max | Unlimited | Unlimited | Unlimited |
| **Private Games** | ❌ | ✅ | ✅ | ✅ |
| **Game History** | Last 10 | Unlimited | Unlimited | Unlimited |
| **AI Easy** | ✅ | ✅ | ✅ | ✅ |
| **AI Medium** | ❌ | ✅ | ✅ | ✅ |
| **AI Hard** | ❌ | ✅ | ✅ | ✅ |
| **Game Analysis** | ❌ | ✅ | ✅ | ✅ |
| **Export Games** | ❌ | ✅ | ✅ | ✅ |
| **No Ads** | ❌ | ✅ | ✅ | ✅ |
| **Badge** | None | Pro | 🎖️ Founder | 🧪 Beta |
| **Trial Period** | N/A | 30 days | N/A | N/A |

### Tier Details

#### **Free Tier**

**Target User:** Casual players, new users trying the game

**Limitations:**
- Maximum 3 active games simultaneously
- Public games only (no private games)
- Game history limited to last 10 games
- AI opponent: Easy difficulty only
- Cannot export games
- May see ads (future feature)

**Upgrade Path:**
- Banner: "Upgrade to Pro for unlimited games"
- Feature-locked modals when hitting limits
- Pricing page easily accessible

#### **Paid Tier ($2/mo or $20/yr)**

**Target User:** Regular players who want full features

**Benefits:**
- Unlimited active games
- Create private games
- Full game history (all games)
- AI opponents: Easy, Medium, Hard
- Game analysis mode (hints, move evaluation)
- Export games as SGF format
- Priority support
- No ads
- "Pro" badge

**Trial:** 30-day free trial (all features)

**Billing:**
- Monthly: $2/month, cancel anytime
- Yearly: $20/year (save $4, ~17% discount)
- Billed through Stripe
- Auto-renewal

#### **Lifetime Tier ($50 one-time)**

**Target User:** Early adopters, dedicated players

**Benefits:**
- All Paid tier features
- **Forever** (no recurring payments)
- "🎖️ Founding Member" badge (gold)
- Special avatar border
- Listed in "Hall of Founders" page
- Early access to new features
- Priority support
- Exclusive founding member tournaments

**Availability:**
- Only during beta and 1 month after launch
- Limited to first 100 purchases (create scarcity)

#### **Beta Tier (Temporary)**

**Target User:** All users during beta period

**Benefits:**
- All paid features for free
- "🧪 Beta Tester" badge
- Automatically marked as `beta_user: true`
- After beta ends: prompted to choose tier

**Duration:** 3 months from launch

**Migration:**
- Month 4: Email notification "Beta ending"
- Users choose: Free, Paid, or Founding Lifetime
- Beta users eligible for founding member discount

---

## Database Schema

### Cloudflare D1 (SQLite)

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID v4
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,                           -- Google profile picture URL
  google_id TEXT UNIQUE,                  -- Google OAuth ID

  -- Role system (independent of subscription)
  role TEXT DEFAULT 'user'
    CHECK(role IN ('admin', 'moderator', 'user')),

  -- Subscription tier
  tier TEXT DEFAULT 'beta'
    CHECK(tier IN ('free', 'paid', 'lifetime', 'beta')),
  subscription_status TEXT DEFAULT 'active'
    CHECK(subscription_status IN ('active', 'trialing', 'cancelled', 'expired')),
  subscription_expires_at TIMESTAMP,

  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,

  -- Beta and founding member tracking
  beta_user BOOLEAN DEFAULT FALSE,        -- True if signed up during beta
  founding_member BOOLEAN DEFAULT FALSE,  -- True if purchased lifetime
  founding_member_tier TEXT
    CHECK(founding_member_tier IN ('beta', 'lifetime', NULL)),

  -- Account status
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  banned_at TIMESTAMP,
  banned_by TEXT,                         -- Admin user ID

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,

  -- Constraints
  FOREIGN KEY (banned_by) REFERENCES users(id)
);

-- Subscription events (audit trail)
CREATE TABLE subscription_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,               -- 'created', 'updated', 'cancelled', 'expired'
  from_tier TEXT,
  to_tier TEXT,
  stripe_event_id TEXT UNIQUE,
  metadata TEXT,                          -- JSON data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Admin actions (audit log)
CREATE TABLE admin_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL,
  action_type TEXT NOT NULL,              -- 'ban_user', 'change_role', 'delete_game', etc.
  target_id TEXT,                         -- User ID or Game ID affected
  reason TEXT,
  metadata TEXT,                          -- JSON data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- User sessions (for tracking)
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  last_activity TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
```

### Migration Strategy

**Initial Migration:**
```sql
-- File: worker/db/migrations/001_initial_users.sql
-- Run this migration to create tables on first deploy
```

**Future Migrations:**
- Each schema change gets a numbered migration file
- Migrations run automatically on worker startup
- Rollback plan for each migration

---

## API Endpoints

### Authentication Endpoints

```typescript
POST   /api/auth/google              // Google OAuth login
POST   /api/auth/logout              // Logout
GET    /api/auth/session             // Get current session
```

### User Endpoints

```typescript
GET    /api/users/me                 // Get current user profile
PATCH  /api/users/me                 // Update profile (name, picture)
GET    /api/users/:id                // Get user profile (public info)
GET    /api/users/:id/games          // Get user's games
GET    /api/users/:id/stats          // Get user statistics
```

### Admin Endpoints (require `role: 'admin'`)

```typescript
// User management
GET    /api/admin/users              // List all users (paginated, searchable)
GET    /api/admin/users/:id          // Get user details (full)
PATCH  /api/admin/users/:id/role     // Change user role
PATCH  /api/admin/users/:id/ban      // Ban/unban user
DELETE /api/admin/users/:id          // Delete user account

// Game management
GET    /api/admin/games              // List all games
GET    /api/admin/games/:id          // Get game details
DELETE /api/admin/games/:id          // Delete game
PATCH  /api/admin/games/:id/close    // Close game

// Analytics
GET    /api/admin/analytics/overview // Dashboard overview stats
GET    /api/admin/analytics/users    // User growth metrics
GET    /api/admin/analytics/games    // Game statistics
GET    /api/admin/analytics/revenue  // Revenue metrics (MRR, etc.)

// System
GET    /api/admin/health             // System health
GET    /api/admin/audit-log          // Admin action log
```

### Subscription Endpoints

```typescript
GET    /api/subscription/plans       // Get available plans
POST   /api/subscription/checkout    // Create Stripe checkout session
POST   /api/subscription/portal      // Get Stripe customer portal URL
GET    /api/subscription/status      // Get subscription status
POST   /api/subscription/cancel      // Cancel subscription
```

### Stripe Webhook

```typescript
POST   /api/webhooks/stripe          // Stripe webhook handler
```

---

## User Flows

### 1. New User Signup (Beta Period)

```
User → Google OAuth → Create Account → Auto-assigned:
  - role: 'user'
  - tier: 'beta'
  - beta_user: true

Result: Full paid features, beta badge
```

### 2. First User Becomes Admin

```
First signup → Check if users table empty → Assign role: 'admin'
```

### 3. Free Tier Game Creation (Post-Beta)

```
User clicks "Create Game"
  ↓
Check: userCan('game.create.unlimited')
  ↓
If Free tier:
  ↓
  Count active games → If >= 3:
    ↓
    Show modal: "Upgrade to Pro for unlimited games"
    ↓
    [Cancel] or [Upgrade]
  ↓
  If < 3: Allow creation
```

### 4. Paid Subscription Flow

```
User clicks "Upgrade to Pro"
  ↓
Redirect to /pricing
  ↓
Select plan: Monthly / Yearly / Lifetime
  ↓
Create Stripe checkout session
  ↓
Redirect to Stripe
  ↓
User enters payment
  ↓
Stripe processes payment
  ↓
Webhook: checkout.session.completed
  ↓
Update user tier in D1
  ↓
Redirect to /success
  ↓
Show "Welcome to Pro!" message
```

### 5. Trial Period Flow

```
User signs up for Paid tier
  ↓
Stripe creates subscription with 30-day trial
  ↓
User gets immediate access (tier: 'paid', status: 'trialing')
  ↓
Day 25: Email reminder "Trial ending in 5 days"
  ↓
Day 30: Stripe charges card
  ↓
Webhook: invoice.paid → status: 'active'

If payment fails:
  ↓
Webhook: invoice.payment_failed
  ↓
Email: "Payment failed, please update card"
  ↓
3 retry attempts (Stripe automatic)
  ↓
If all fail: status: 'expired', tier: 'free'
```

### 6. Admin Bans User

```
Admin → Admin Dashboard → Users → Select user
  ↓
Click "Ban User"
  ↓
Enter reason
  ↓
Confirm
  ↓
POST /api/admin/users/:id/ban
  ↓
Update: is_banned = true, ban_reason, banned_at
  ↓
Log in admin_actions table
  ↓
User cannot login (blocked by auth middleware)
  ↓
Show: "Your account has been banned. Reason: [reason]"
```

### 7. Beta to Paid Migration

```
Beta ends (Month 4)
  ↓
Email to all beta_user: true users:
  "Beta ending - Choose your plan"
  ↓
User logs in → Modal:
  ┌─────────────────────────────┐
  │ Beta Ending                 │
  │ Choose your plan:           │
  │                             │
  │ □ Free (limited)            │
  │ □ Paid ($2/mo)              │
  │ □ Founding Lifetime ($50)   │
  │   ↑ Special discount!       │
  │                             │
  │ [Continue]                  │
  └─────────────────────────────┘
  ↓
User selects plan
  ↓
If Paid/Lifetime → Stripe checkout
  ↓
If Free → Update tier: 'free'
  ↓
Remove beta badge, apply limits
```

---

## Security & Authentication

### Authentication Flow

**Current:** Google OAuth
**Future:** May add email/password for admins

```typescript
// Auth middleware
async function requireAuth(c: Context, next: Next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Verify Google OAuth token
  const payload = await verifyGoogleToken(token);

  // Get or create user in D1
  const user = await getOrCreateUser(payload);

  // Attach to context
  c.set('user', user);

  await next();
}
```

### Role-Based Access Control

```typescript
// Permission middleware
function requireRole(...roles: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
  };
}

// Usage
app.get('/api/admin/users', requireAuth, requireRole('admin'), listUsers);
```

### Permission Checking

```typescript
// Centralized permissions
const PERMISSIONS = {
  'game.create.private': {
    free: false,
    paid: true,
    lifetime: true,
    beta: true,
  },
  'game.create.unlimited': {
    free: false,
    paid: true,
    lifetime: true,
    beta: true,
  },
  // ... more permissions
};

export function userCan(user: User, permission: string): boolean {
  const perm = PERMISSIONS[permission];
  if (!perm) return false;

  // Check tier permission
  if (perm[user.tier]) return true;

  // Admins can do everything
  if (user.role === 'admin') return true;

  return false;
}
```

### Security Measures

- ✅ HTTPS only (enforced by Cloudflare)
- ✅ CSRF protection (SameSite cookies)
- ✅ Rate limiting per tier
- ✅ SQL injection protection (prepared statements)
- ✅ XSS protection (React escapes by default)
- ✅ Session expiration (7 days)
- ✅ Audit logging for admin actions
- ✅ Stripe webhook signature verification
- ✅ Input validation with Zod

---

## Beta Launch Strategy

### Timeline

**Month 1-3: Beta Period**
- All features free for everyone
- Collect feedback
- Fix bugs
- Refine features

**Month 4: Migration Period**
- Announce beta ending (2 weeks notice)
- Email all users
- Show in-app modal
- Offer founding member discount

**Month 5+: Full Launch**
- Regular paid subscriptions
- Free tier limitations enforced
- Founding member offer ends

### Beta User Benefits

During Beta:
- Full access to all paid features
- "🧪 Beta Tester" badge
- Direct feedback channel
- Early access to new features

After Beta (if they become founding members):
- "🎖️ Founding Member" badge
- Listed in Hall of Founders
- Special avatar border
- Exclusive tournaments
- Lifetime access

### Communication Plan

**Week 1 of Beta:**
```
Subject: Welcome to Kido Beta! 🎉

You're one of the first to try Kido! During beta, you get:
- All Pro features FREE
- Special beta badge
- Direct line to developers

Enjoy and please share feedback!
```

**Week 10 (2 weeks before end):**
```
Subject: Beta Ending Soon - Choose Your Plan

Our beta period ends in 2 weeks. Time to choose:

1. Free: Basic features
2. Pro: $2/mo - Full features
3. Founding Member: $50 one-time - Lifetime access + special perks

As a beta tester, you're eligible for founding member status!

[View Pricing] [Learn More]
```

**Week 12 (Beta ends):**
```
Subject: Action Required - Beta Has Ended

Beta has ended. Please choose your plan to continue playing:

[Choose Free Plan] [Upgrade to Pro] [Become Founding Member]

Note: Founding member offer ends in 30 days!
```

---

## Phase Rollout Plan

### Phase 1: Role System (Week 1)

**Goal:** Implement role-based access control

**Deliverables:**
- ✅ D1 database setup
- ✅ Users table with roles
- ✅ Auth middleware
- ✅ RBAC middleware
- ✅ First user auto-admin
- ✅ Update userStore

**Tests:**
- Unit: Role assignment logic
- Integration: Auth middleware
- E2E: User signup becomes admin

---

### Phase 4: Admin Dashboard (Week 2-3)

**Goal:** Build admin UI

**Deliverables:**
- ✅ Admin layout component
- ✅ User management page
- ✅ Game monitoring page
- ✅ Analytics dashboard
- ✅ System health page
- ✅ Audit log viewer

**Tests:**
- Component: Admin pages
- Integration: Admin API endpoints
- E2E: Admin user flows

---

### Phase 2: Tier System (Week 4)

**Goal:** Add subscription tiers (beta mode)

**Deliverables:**
- ✅ Tier field in users table
- ✅ Permission system
- ✅ Feature gating
- ✅ Pricing page
- ✅ Beta badge
- ✅ Limit enforcement

**Tests:**
- Unit: Permission checks
- Integration: Limit enforcement
- E2E: Feature gating

---

### Phase 3: Stripe Integration (Week 5-6)

**Goal:** Enable payments

**Deliverables:**
- ✅ Stripe account setup
- ✅ Webhook handler
- ✅ Checkout flow
- ✅ Customer portal
- ✅ Subscription management
- ✅ Trial handling

**Tests:**
- Integration: Webhook handling
- E2E: Full payment flow

---

### Phase 5: Advanced Features (Week 7-8)

**Goal:** Polish and extra features

**Deliverables:**
- ✅ Founding member badges
- ✅ Email notifications
- ✅ Advanced analytics
- ✅ Content moderation
- ✅ Game export (SGF)

**Tests:**
- E2E: Full user journeys
- Integration: Email delivery

---

## Success Criteria

### Phase 1 Success
- ✅ Users can sign up with Google
- ✅ First user becomes admin
- ✅ Admin role persists across sessions
- ✅ All tests passing

### Phase 4 Success
- ✅ Admin can view all users
- ✅ Admin can change user roles
- ✅ Admin can view analytics
- ✅ Dashboard loads < 2s

### Phase 2 Success
- ✅ All users in beta mode
- ✅ Limits enforced for free tier (in code, not active)
- ✅ Pricing page live
- ✅ Feature gating works

### Phase 3 Success
- ✅ Users can subscribe
- ✅ Trial period works
- ✅ Webhooks update tiers
- ✅ Cancellation works
- ✅ 0 payment failures

### Phase 5 Success
- ✅ Founding member badges show
- ✅ Email notifications sent
- ✅ Moderation tools work
- ✅ 90%+ user satisfaction

---

## Appendix

### TypeScript Types

```typescript
export type Role = 'admin' | 'moderator' | 'user';

export type Tier = 'free' | 'paid' | 'lifetime' | 'beta';

export type SubscriptionStatus = 'active' | 'trialing' | 'cancelled' | 'expired';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  googleId: string;

  role: Role;
  tier: Tier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: Date;

  stripeCustomerId?: string;
  stripeSubscriptionId?: string;

  betaUser: boolean;
  foundingMember: boolean;
  foundingMemberTier?: 'beta' | 'lifetime';

  isBanned: boolean;
  banReason?: string;
  bannedAt?: Date;
  bannedBy?: string;

  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface SubscriptionEvent {
  id: number;
  userId: string;
  eventType: 'created' | 'updated' | 'cancelled' | 'expired';
  fromTier?: Tier;
  toTier?: Tier;
  stripeEventId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AdminAction {
  id: number;
  adminId: string;
  actionType: string;
  targetId?: string;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
```

---

**End of Specification**
