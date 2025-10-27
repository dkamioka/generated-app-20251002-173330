/**
 * Authentication and User Management Routes
 *
 * Handles all user-related endpoints including:
 * - Google OAuth authentication
 * - User profile management
 * - Admin user management
 * - Analytics and audit logs
 *
 * Related: FEATURE_SPEC_USER_MANAGEMENT.md
 */

import { Hono } from 'hono';
import type {
  User,
  LoginResponse,
  GoogleProfile,
  UserListResponse,
  UserListQuery,
  AdminAnalyticsOverview,
  ApiResponse,
} from '../shared/types';
import { UserService } from './services/userService';
import {
  authMiddleware,
  optionalAuthMiddleware,
  createAuthToken,
  AuthContext,
} from './middleware/auth';
import {
  requireAdmin,
  requireModerator,
  preventSelfAction,
  auditLog,
} from './middleware/rbac';

// Extended Env type with D1 database and JWT secret
export interface ExtendedEnv {
  GlobalDurableObject: DurableObjectNamespace;
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export function authRoutes(app: Hono<{ Bindings: ExtendedEnv }>) {
  // ============================================================================
  // Authentication Routes
  // ============================================================================

  /**
   * Google OAuth callback handler
   *
   * Handles Google OAuth login and creates/updates user.
   * Implements first-user-becomes-admin logic.
   *
   * POST /api/auth/google
   * Body: { profile: GoogleProfile }
   * Returns: { user: User, token: string, expiresAt: string }
   */
  app.post('/api/auth/google', async (c) => {
    try {
      const { code, profile } = await c.req.json<{
        code?: string;
        profile: GoogleProfile;
      }>();

      if (!profile || !profile.email || !profile.id) {
        return c.json(
          { success: false, error: 'Invalid Google profile data' },
          400
        );
      }

      const userService = new UserService(c.env.DB);

      // Check if user exists by Google ID
      let user = await userService.getUserByGoogleId(profile.id);

      if (!user) {
        // Check if user exists by email (for existing users migrating to OAuth)
        user = await userService.getUserByEmail(profile.email);

        if (user) {
          // Update existing user with Google ID
          await c.env.DB
            .prepare('UPDATE users SET google_id = ?, updated_at = ? WHERE id = ?')
            .bind(profile.id, new Date().toISOString(), user.id)
            .run();

          // Re-fetch user
          user = await userService.getUserById(user.id);
          if (!user) throw new Error('Failed to update user');
        } else {
          // Create new user (first user becomes admin)
          user = await userService.createUser(profile);
        }
      }

      // Update last login
      await userService.updateLastLogin(user.id);

      // Create JWT token
      const { token, expiresAt } = await createAuthToken(
        user,
        c.env.JWT_SECRET
      );

      return c.json({
        success: true,
        data: { user, token, expiresAt } satisfies LoginResponse,
      });
    } catch (error: any) {
      console.error('Auth error:', error);
      return c.json({ success: false, error: 'Authentication failed' }, 500);
    }
  });

  /**
   * Get current user (requires auth)
   *
   * GET /api/auth/me
   * Headers: Authorization: Bearer <token>
   * Returns: User
   */
  app.get(
    '/api/auth/me',
    (c, next) => authMiddleware(c.env.JWT_SECRET, c.env.DB)(c, next),
    async (c) => {
      const authContext = c as AuthContext;
      return c.json({ success: true, data: authContext.user });
    }
  );

  /**
   * Refresh token (requires auth)
   *
   * POST /api/auth/refresh
   * Headers: Authorization: Bearer <token>
   * Returns: { token: string, expiresAt: string }
   */
  app.post(
    '/api/auth/refresh',
    (c, next) => authMiddleware(c.env.JWT_SECRET, c.env.DB)(c, next),
    async (c) => {
      const authContext = c as AuthContext;
      const { token, expiresAt } = await createAuthToken(
        authContext.user!,
        c.env.JWT_SECRET
      );

      return c.json({
        success: true,
        data: { token, expiresAt },
      });
    }
  );

  // ============================================================================
  // User Profile Routes
  // ============================================================================

  /**
   * Update user profile (self-service)
   *
   * PATCH /api/users/me
   * Headers: Authorization: Bearer <token>
   * Body: { name?: string, picture?: string }
   * Returns: User
   */
  app.patch(
    '/api/users/me',
    (c, next) => authMiddleware(c.env.JWT_SECRET, c.env.DB)(c, next),
    async (c) => {
      try {
        const authContext = c as AuthContext;
        const updates = await c.req.json<{ name?: string; picture?: string }>();

        const userService = new UserService(c.env.DB);
        const user = await userService.updateUserProfile(
          authContext.userId!,
          updates
        );

        return c.json({ success: true, data: user });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 400);
      }
    }
  );

  // ============================================================================
  // Admin Routes - User Management
  // ============================================================================

  /**
   * List all users (admin only)
   *
   * GET /api/admin/users?page=1&limit=20&search=&role=&tier=
   * Headers: Authorization: Bearer <token>
   * Returns: UserListResponse
   */
  app.get(
    '/api/admin/users',
    (c, next) => authMiddleware(c.env.JWT_SECRET, c.env.DB)(c, next),
    requireAdmin(),
    async (c) => {
      try {
        const query: UserListQuery = {
          page: Number(c.req.query('page')) || 1,
          limit: Number(c.req.query('limit')) || 20,
          search: c.req.query('search'),
          role: c.req.query('role') as any,
          tier: c.req.query('tier') as any,
          sortBy: c.req.query('sortBy') as any,
          sortOrder: c.req.query('sortOrder') as any,
        };

        const userService = new UserService(c.env.DB);
        const result = await userService.listUsers(query);

        return c.json({
          success: true,
          data: result,
        } satisfies ApiResponse<UserListResponse>);
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
      }
    }
  );

  /**
   * Get user by ID (admin only)
   *
   * GET /api/admin/users/:id
   * Headers: Authorization: Bearer <token>
   * Returns: User
   */
  app.get(
    '/api/admin/users/:id',
    (c, next) => authMiddleware(c.env.JWT_SECRET, c.env.DB)(c, next),
    requireAdmin(),
    async (c) => {
      try {
        const userId = c.req.param('id');
        const userService = new UserService(c.env.DB);
        const user = await userService.getUserById(userId);

        if (!user) {
          return c.json({ success: false, error: 'User not found' }, 404);
        }

        return c.json({ success: true, data: user });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
      }
    }
  );

  /**
   * Update user role (admin only)
   *
   * PATCH /api/admin/users/:id/role
   * Headers: Authorization: Bearer <token>
   * Body: { role: 'admin' | 'moderator' | 'user' }
   * Returns: User
   */
  app.patch(
    '/api/admin/users/:id/role',
    (c, next) => authMiddleware(c.env.JWT_SECRET, c.env.DB)(c, next),
    requireAdmin(),
    preventSelfAction(),
    auditLog('user_role_changed', 'user'),
    async (c) => {
      try {
        const userId = c.req.param('id');
        const { role } = await c.req.json<{ role: string }>();

        if (!['admin', 'moderator', 'user'].includes(role)) {
          return c.json({ success: false, error: 'Invalid role' }, 400);
        }

        const userService = new UserService(c.env.DB);
        const user = await userService.adminUpdateUser(userId, {
          role: role as any,
        });

        return c.json({ success: true, data: user });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 400);
      }
    }
  );

  /**
   * Ban user (admin only)
   *
   * POST /api/admin/users/:id/ban
   * Headers: Authorization: Bearer <token>
   * Body: { reason: string }
   * Returns: User
   */
  app.post(
    '/api/admin/users/:id/ban',
    (c, next) => authMiddleware(c.env.JWT_SECRET, c.env.DB)(c, next),
    requireAdmin(),
    preventSelfAction(),
    auditLog('user_banned', 'user'),
    async (c) => {
      try {
        const authContext = c as AuthContext;
        const userId = c.req.param('id');
        const { reason } = await c.req.json<{ reason: string }>();

        if (!reason || reason.trim().length === 0) {
          return c.json(
            { success: false, error: 'Ban reason is required' },
            400
          );
        }

        const userService = new UserService(c.env.DB);
        const user = await userService.banUser(
          userId,
          authContext.userId!,
          reason
        );

        return c.json({ success: true, data: user });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 400);
      }
    }
  );

  /**
   * Unban user (admin only)
   *
   * POST /api/admin/users/:id/unban
   * Headers: Authorization: Bearer <token>
   * Returns: User
   */
  app.post(
    '/api/admin/users/:id/unban',
    (c, next) => authMiddleware(c.env.JWT_SECRET, c.env.DB)(c, next),
    requireAdmin(),
    auditLog('user_unbanned', 'user'),
    async (c) => {
      try {
        const userId = c.req.param('id');

        const userService = new UserService(c.env.DB);
        const user = await userService.unbanUser(userId);

        return c.json({ success: true, data: user });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 400);
      }
    }
  );

  /**
   * Delete user (admin only)
   *
   * DELETE /api/admin/users/:id
   * Headers: Authorization: Bearer <token>
   * Returns: { deleted: true }
   */
  app.delete(
    '/api/admin/users/:id',
    (c, next) => authMiddleware(c.env.JWT_SECRET, c.env.DB)(c, next),
    requireAdmin(),
    preventSelfAction(),
    auditLog('user_deleted', 'user'),
    async (c) => {
      try {
        const userId = c.req.param('id');

        const userService = new UserService(c.env.DB);
        await userService.deleteUser(userId);

        return c.json({ success: true, data: { deleted: true } });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 400);
      }
    }
  );

  // ============================================================================
  // Admin Routes - Analytics
  // ============================================================================

  /**
   * Get analytics overview (admin only)
   *
   * GET /api/admin/analytics/overview
   * Headers: Authorization: Bearer <token>
   * Returns: AdminAnalyticsOverview
   */
  app.get(
    '/api/admin/analytics/overview',
    (c, next) => authMiddleware(c.env.JWT_SECRET, c.env.DB)(c, next),
    requireAdmin(),
    async (c) => {
      try {
        const userService = new UserService(c.env.DB);
        const stats = await userService.getAnalyticsOverview();

        // TODO: Add game statistics from Durable Objects

        return c.json({
          success: true,
          data: {
            ...stats,
            totalGames: 0, // Placeholder - fetch from Durable Objects
            gamesInProgress: 0, // Placeholder
            monthlyRevenue: 0, // Placeholder - will be calculated from Stripe
            growthRate: 0, // Placeholder
          } satisfies AdminAnalyticsOverview,
        });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
      }
    }
  );

  /**
   * Get audit log (admin only)
   *
   * GET /api/admin/audit-log?page=1&limit=50
   * Headers: Authorization: Bearer <token>
   * Returns: { actions: AdminAction[], page: number, limit: number }
   */
  app.get(
    '/api/admin/audit-log',
    (c, next) => authMiddleware(c.env.JWT_SECRET, c.env.DB)(c, next),
    requireAdmin(),
    async (c) => {
      try {
        const page = Number(c.req.query('page')) || 1;
        const limit = Number(c.req.query('limit')) || 50;
        const offset = (page - 1) * limit;

        const results = await c.env.DB.prepare(`
            SELECT * FROM admin_actions
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
          `)
          .bind(limit, offset)
          .all();

        return c.json({
          success: true,
          data: {
            actions: results.results,
            page,
            limit,
          },
        });
      } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
      }
    }
  );
}
