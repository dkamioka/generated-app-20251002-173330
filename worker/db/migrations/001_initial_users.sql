-- Migration: 001_initial_users
-- Description: Initial user management tables with RBAC and subscription support
-- Created: 2025-10-27

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  google_id TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'moderator', 'user')),
  tier TEXT NOT NULL DEFAULT 'beta' CHECK(tier IN ('free', 'paid', 'lifetime', 'beta')),
  subscription_status TEXT DEFAULT 'active' CHECK(subscription_status IN ('active', 'trialing', 'cancelled', 'expired', 'paused')),
  subscription_expires_at TIMESTAMP,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  beta_user BOOLEAN NOT NULL DEFAULT FALSE,
  founding_member BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason TEXT,
  banned_at TIMESTAMP,
  banned_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);

-- Subscription Events Table
CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN (
    'subscription_started',
    'subscription_renewed',
    'subscription_cancelled',
    'subscription_expired',
    'trial_started',
    'trial_converted',
    'trial_expired',
    'payment_succeeded',
    'payment_failed',
    'refund_issued'
  )),
  stripe_event_id TEXT UNIQUE,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe ON subscription_events(stripe_event_id);

-- Admin Actions Table
CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK(action_type IN (
    'user_role_changed',
    'user_banned',
    'user_unbanned',
    'user_deleted',
    'game_deleted',
    'chat_message_deleted',
    'subscription_modified'
  )),
  target_user_id TEXT,
  target_game_id TEXT,
  reason TEXT,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user ON admin_actions(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type, created_at DESC);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Game Statistics Cache
CREATE TABLE IF NOT EXISTS game_stats_cache (
  date TEXT PRIMARY KEY,
  total_games INTEGER NOT NULL DEFAULT 0,
  games_completed INTEGER NOT NULL DEFAULT 0,
  games_in_progress INTEGER NOT NULL DEFAULT 0,
  total_moves INTEGER NOT NULL DEFAULT 0,
  unique_players INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
