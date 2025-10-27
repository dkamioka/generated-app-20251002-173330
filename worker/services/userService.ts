/**
 * User Service
 *
 * Handles all user-related database operations including:
 * - User creation and authentication
 * - Role and tier management
 * - User queries and updates
 * - First-user-admin logic
 *
 * Related: FEATURE_SPEC_USER_MANAGEMENT.md
 */

import type {
  User,
  UserRole,
  UserTier,
  SubscriptionStatus,
  GoogleProfile,
  UserListQuery,
  AdminUserUpdateRequest,
} from '../../shared/types';

// Database row interface (snake_case from SQLite)
interface UserRow {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  google_id: string;
  role: UserRole;
  tier: UserTier;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  beta_user: number; // SQLite uses 0/1 for boolean
  founding_member: number;
  is_banned: number;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

/**
 * Convert database row to User object
 */
function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    picture: row.picture || undefined,
    googleId: row.google_id,
    role: row.role,
    tier: row.tier,
    subscriptionStatus: row.subscription_status,
    subscriptionExpiresAt: row.subscription_expires_at || undefined,
    stripeCustomerId: row.stripe_customer_id || undefined,
    stripeSubscriptionId: row.stripe_subscription_id || undefined,
    betaUser: row.beta_user === 1,
    foundingMember: row.founding_member === 1,
    isBanned: row.is_banned === 1,
    banReason: row.ban_reason || undefined,
    bannedAt: row.banned_at || undefined,
    bannedBy: row.banned_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLogin: row.last_login || undefined,
  };
}

/**
 * Generate unique user ID
 */
function generateUserId(): string {
  return `user_${crypto.randomUUID()}`;
}

export class UserService {
  constructor(private db: D1Database) {}

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<UserRow>();

    return result ? rowToUser(result) : null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<UserRow>();

    return result ? rowToUser(result) : null;
  }

  /**
   * Get user by Google ID
   */
  async getUserByGoogleId(googleId: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE google_id = ?')
      .bind(googleId)
      .first<UserRow>();

    return result ? rowToUser(result) : null;
  }

  /**
   * Get user by Stripe customer ID
   */
  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE stripe_customer_id = ?')
      .bind(stripeCustomerId)
      .first<UserRow>();

    return result ? rowToUser(result) : null;
  }

  /**
   * Count total users (for first-user-admin check)
   */
  async countUsers(): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM users')
      .first<{ count: number }>();

    return result?.count || 0;
  }

  /**
   * Create new user with Google OAuth profile
   *
   * Implements first-user-becomes-admin logic:
   * - First user automatically gets 'admin' role
   * - All subsequent users get 'user' role
   * - All users start with 'beta' tier during beta period
   */
  async createUser(profile: GoogleProfile): Promise<User> {
    const userId = generateUserId();
    const userCount = await this.countUsers();
    const isFirstUser = userCount === 0;

    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO users (
          id, email, name, picture, google_id,
          role, tier, subscription_status,
          beta_user, founding_member, is_banned,
          created_at, updated_at, last_login
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        userId,
        profile.email,
        profile.name,
        profile.picture || null,
        profile.id,
        isFirstUser ? 'admin' : 'user', // First user becomes admin
        'beta', // Everyone starts in beta tier
        'active',
        1, // beta_user = true
        0, // founding_member = false
        0, // is_banned = false
        now,
        now,
        now
      )
      .run();

    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        UPDATE users
        SET last_login = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(now, now, userId)
      .run();
  }

  /**
   * Update user profile (self-service)
   */
  async updateUserProfile(
    userId: string,
    updates: { name?: string; picture?: string }
  ): Promise<User> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.picture !== undefined) {
      fields.push('picture = ?');
      values.push(updates.picture);
    }

    if (fields.length === 0) {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');
      return user;
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(userId);

    await this.db
      .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    return user;
  }

  /**
   * Update user (admin only)
   */
  async adminUpdateUser(
    userId: string,
    updates: AdminUserUpdateRequest
  ): Promise<User> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }

    if (updates.tier !== undefined) {
      fields.push('tier = ?');
      values.push(updates.tier);
    }

    if (updates.isBanned !== undefined) {
      fields.push('is_banned = ?');
      values.push(updates.isBanned ? 1 : 0);

      if (updates.isBanned) {
        fields.push('banned_at = ?');
        values.push(now);

        if (updates.banReason) {
          fields.push('ban_reason = ?');
          values.push(updates.banReason);
        }
      } else {
        // Unbanning - clear ban fields
        fields.push('banned_at = NULL');
        fields.push('ban_reason = NULL');
        fields.push('banned_by = NULL');
      }
    }

    if (fields.length === 0) {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');
      return user;
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(userId);

    await this.db
      .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    return user;
  }

  /**
   * Ban user
   */
  async banUser(
    userId: string,
    bannedBy: string,
    reason: string
  ): Promise<User> {
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        UPDATE users
        SET is_banned = 1, banned_at = ?, banned_by = ?, ban_reason = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(now, bannedBy, reason, now, userId)
      .run();

    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    return user;
  }

  /**
   * Unban user
   */
  async unbanUser(userId: string): Promise<User> {
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        UPDATE users
        SET is_banned = 0, banned_at = NULL, banned_by = NULL, ban_reason = NULL, updated_at = ?
        WHERE id = ?
      `)
      .bind(now, userId)
      .run();

    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    return user;
  }

  /**
   * Delete user (hard delete)
   */
  async deleteUser(userId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM users WHERE id = ?')
      .bind(userId)
      .run();
  }

  /**
   * List users with pagination and filters (admin only)
   */
  async listUsers(query: UserListQuery): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.search) {
      conditions.push('(email LIKE ? OR name LIKE ?)');
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    if (query.role) {
      conditions.push('role = ?');
      params.push(query.role);
    }

    if (query.tier) {
      conditions.push('tier = ?');
      params.push(query.tier);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`)
      .bind(...params)
      .first<{ count: number }>();

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Sort clause
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';
    const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // Fetch users
    const results = await this.db
      .prepare(`
        SELECT * FROM users
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `)
      .bind(...params, limit, offset)
      .all<UserRow>();

    const users = results.results.map(rowToUser);

    return {
      users,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get analytics overview (admin only)
   */
  async getAnalyticsOverview(): Promise<{
    totalUsers: number;
    activeUsers: number;
    paidUsers: number;
    bannedUsers: number;
    newUsersThisMonth: number;
  }> {
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [total, active, paid, banned, newUsers] = await Promise.all([
      // Total users
      this.db
        .prepare('SELECT COUNT(*) as count FROM users')
        .first<{ count: number }>(),

      // Active users (logged in within 30 days)
      this.db
        .prepare(`
          SELECT COUNT(*) as count FROM users
          WHERE last_login > datetime('now', '-30 days')
        `)
        .first<{ count: number }>(),

      // Paid users
      this.db
        .prepare(`
          SELECT COUNT(*) as count FROM users
          WHERE tier IN ('paid', 'lifetime')
        `)
        .first<{ count: number }>(),

      // Banned users
      this.db
        .prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 1')
        .first<{ count: number }>(),

      // New users this month
      this.db
        .prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= ?')
        .bind(monthAgo)
        .first<{ count: number }>(),
    ]);

    return {
      totalUsers: total?.count || 0,
      activeUsers: active?.count || 0,
      paidUsers: paid?.count || 0,
      bannedUsers: banned?.count || 0,
      newUsersThisMonth: newUsers?.count || 0,
    };
  }

  /**
   * Update Stripe customer ID for user
   */
  async updateStripeCustomerId(
    userId: string,
    stripeCustomerId: string
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        UPDATE users
        SET stripe_customer_id = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(stripeCustomerId, now, userId)
      .run();
  }

  /**
   * Update subscription info
   */
  async updateSubscription(
    userId: string,
    updates: {
      tier?: UserTier;
      status?: SubscriptionStatus;
      stripeSubscriptionId?: string;
      expiresAt?: string | null;
    }
  ): Promise<User> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.tier !== undefined) {
      fields.push('tier = ?');
      values.push(updates.tier);
    }

    if (updates.status !== undefined) {
      fields.push('subscription_status = ?');
      values.push(updates.status);
    }

    if (updates.stripeSubscriptionId !== undefined) {
      fields.push('stripe_subscription_id = ?');
      values.push(updates.stripeSubscriptionId);
    }

    if (updates.expiresAt !== undefined) {
      fields.push('subscription_expires_at = ?');
      values.push(updates.expiresAt);
    }

    if (fields.length === 0) {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');
      return user;
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(userId);

    await this.db
      .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    return user;
  }
}
