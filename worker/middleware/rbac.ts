/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Enforces role and permission requirements for protected routes.
 *
 * Related: FEATURE_SPEC_USER_MANAGEMENT.md - RBAC System
 */

import { Context, Next } from 'hono';
import type { UserRole } from '../../shared/types';
import type { AuthContext } from './auth';

/**
 * Require specific role(s) to access route
 *
 * Usage:
 *   app.get('/api/admin/*', requireRole('admin'));
 *   app.get('/api/moderate/*', requireRole(['admin', 'moderator']));
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (c: Context, next: Next) => {
    const authContext = c as AuthContext;

    if (!authContext.user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const userRole = authContext.user.role;

    // Admins have access to everything
    if (userRole === 'admin') {
      await next();
      return;
    }

    // Check if user has required role
    if (!roles.includes(userRole)) {
      return c.json(
        {
          error: 'Insufficient permissions',
          required: roles,
          current: userRole,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Require admin role
 *
 * Convenience wrapper for requireRole('admin')
 */
export function requireAdmin() {
  return requireRole('admin');
}

/**
 * Require moderator or admin role
 *
 * Convenience wrapper for requireRole(['admin', 'moderator'])
 */
export function requireModerator() {
  return requireRole(['admin', 'moderator']);
}

/**
 * Prevent self-actions
 *
 * Useful for admin endpoints that shouldn't allow self-modification
 * (e.g., can't ban yourself, can't demote yourself)
 */
export function preventSelfAction(targetUserIdParam: string = 'id') {
  return async (c: Context, next: Next) => {
    const authContext = c as AuthContext;

    if (!authContext.user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const targetUserId = c.req.param(targetUserIdParam);

    if (targetUserId === authContext.user.id) {
      return c.json(
        {
          error: 'Cannot perform this action on yourself',
        },
        400
      );
    }

    await next();
  };
}

/**
 * Prevent removing last admin
 *
 * Used on role change endpoints to ensure at least one admin exists
 */
export function preventLastAdminRemoval(db: D1Database) {
  return async (c: Context, next: Next) => {
    const authContext = c as AuthContext;
    const targetUserId = c.req.param('id');

    // Get the target user to check if they're an admin
    const targetUser = await db
      .prepare('SELECT role FROM users WHERE id = ?')
      .bind(targetUserId)
      .first<{ role: UserRole }>();

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Only check if target is currently an admin
    if (targetUser.role !== 'admin') {
      await next();
      return;
    }

    // Check if this is the last admin
    const adminCount = await db
      .prepare('SELECT COUNT(*) as count FROM users WHERE role = ?')
      .bind('admin')
      .first<{ count: number }>();

    if (adminCount && adminCount.count <= 1) {
      return c.json(
        {
          error: 'Cannot remove or demote the last admin',
        },
        400
      );
    }

    await next();
  };
}

/**
 * Audit log middleware
 *
 * Records admin actions to audit_log table
 */
export function auditLog(
  actionType: string,
  targetType: 'user' | 'game' | 'other'
) {
  return async (c: Context, next: Next) => {
    const authContext = c as AuthContext;

    if (!authContext.user) {
      await next();
      return;
    }

    // Execute the action first
    await next();

    // Only log if action was successful (2xx status)
    if (c.res.status >= 200 && c.res.status < 300) {
      try {
        const targetId =
          targetType === 'user'
            ? c.req.param('id')
            : targetType === 'game'
            ? c.req.param('gameId')
            : null;

        const body = await c.req.json().catch(() => ({}));

        const db = (c.env as any).DB as D1Database;

        await db
          .prepare(`
            INSERT INTO admin_actions (
              id, admin_id, action_type,
              target_user_id, target_game_id,
              reason, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            `action_${crypto.randomUUID()}`,
            authContext.user.id,
            actionType,
            targetType === 'user' ? targetId : null,
            targetType === 'game' ? targetId : null,
            body.reason || null,
            JSON.stringify({ body }),
            new Date().toISOString()
          )
          .run();
      } catch (error) {
        // Don't fail the request if audit logging fails
        console.error('Failed to log audit action:', error);
      }
    }
  };
}
