/**
 * Permission System
 *
 * Defines all permissions and provides utilities to check user access.
 * Implements tier-based feature gating and role-based permissions.
 *
 * Related: FEATURE_SPEC_USER_MANAGEMENT.md - Permission System
 */

import type { User, UserRole, UserTier } from '../shared/types';

/**
 * Permission definitions
 *
 * Each permission can be gated by:
 * - Tier: Which subscription tiers have access
 * - Role: Which user roles have access (overrides tier for admins)
 */
export interface PermissionDefinition {
  tiers?: UserTier[]; // Allowed tiers (undefined = all tiers)
  roles?: UserRole[]; // Allowed roles (undefined = all roles, but admins always allowed)
}

export const PERMISSIONS: Record<string, PermissionDefinition> = {
  // ============================================================================
  // Game Permissions
  // ============================================================================

  'game.create.public': {
    tiers: ['free', 'paid', 'lifetime', 'beta'],
  },

  'game.create.private': {
    tiers: ['paid', 'lifetime', 'beta'],
  },

  'game.join': {
    tiers: ['free', 'paid', 'lifetime', 'beta'],
  },

  'game.observe': {
    tiers: ['free', 'paid', 'lifetime', 'beta'],
  },

  'game.export': {
    tiers: ['paid', 'lifetime', 'beta'],
  },

  'game.analysis': {
    tiers: ['paid', 'lifetime', 'beta'],
  },

  // ============================================================================
  // AI Permissions
  // ============================================================================

  'ai.difficulty.easy': {
    tiers: ['free', 'paid', 'lifetime', 'beta'],
  },

  'ai.difficulty.medium': {
    tiers: ['paid', 'lifetime', 'beta'],
  },

  'ai.difficulty.hard': {
    tiers: ['paid', 'lifetime', 'beta'],
  },

  // ============================================================================
  // History & Storage Permissions
  // ============================================================================

  'history.view.limited': {
    tiers: ['free'],
  },

  'history.view.unlimited': {
    tiers: ['paid', 'lifetime', 'beta'],
  },

  // ============================================================================
  // Chat Permissions
  // ============================================================================

  'chat.send': {
    tiers: ['free', 'paid', 'lifetime', 'beta'],
  },

  'chat.moderate': {
    roles: ['admin', 'moderator'],
  },

  // ============================================================================
  // Admin Permissions
  // ============================================================================

  'admin.users.view': {
    roles: ['admin'],
  },

  'admin.users.edit': {
    roles: ['admin'],
  },

  'admin.users.ban': {
    roles: ['admin'],
  },

  'admin.users.delete': {
    roles: ['admin'],
  },

  'admin.games.view': {
    roles: ['admin'],
  },

  'admin.games.delete': {
    roles: ['admin'],
  },

  'admin.analytics.view': {
    roles: ['admin'],
  },

  'admin.audit_log.view': {
    roles: ['admin'],
  },

  // ============================================================================
  // Moderation Permissions
  // ============================================================================

  'moderate.chat.delete': {
    roles: ['admin', 'moderator'],
  },

  'moderate.games.close': {
    roles: ['admin', 'moderator'],
  },
};

/**
 * Check if user has permission
 *
 * @param user - User to check permissions for
 * @param permissionKey - Permission key from PERMISSIONS object
 * @returns true if user has permission, false otherwise
 */
export function userCan(user: User, permissionKey: string): boolean {
  const permission = PERMISSIONS[permissionKey];

  // If permission doesn't exist, deny by default
  if (!permission) {
    console.warn(`Unknown permission: ${permissionKey}`);
    return false;
  }

  // Admins have access to everything
  if (user.role === 'admin') {
    return true;
  }

  // Check role-based permissions
  if (permission.roles) {
    return permission.roles.includes(user.role);
  }

  // Check tier-based permissions
  if (permission.tiers) {
    return permission.tiers.includes(user.tier);
  }

  // If no restrictions, allow
  return true;
}

/**
 * Check if user can access AI difficulty level
 */
export function canAccessAIDifficulty(user: User, difficulty: 'easy' | 'medium' | 'hard'): boolean {
  switch (difficulty) {
    case 'easy':
      return userCan(user, 'ai.difficulty.easy');
    case 'medium':
      return userCan(user, 'ai.difficulty.medium');
    case 'hard':
      return userCan(user, 'ai.difficulty.hard');
    default:
      return false;
  }
}

/**
 * Get game history limit for user's tier
 *
 * @returns number of games user can view in history, or -1 for unlimited
 */
export function getGameHistoryLimit(user: User): number {
  // Admins, paid, lifetime, and beta users get unlimited history
  if (
    user.role === 'admin' ||
    user.tier === 'paid' ||
    user.tier === 'lifetime' ||
    user.tier === 'beta'
  ) {
    return -1; // unlimited
  }

  // Free users get 10 games
  return 10;
}

/**
 * Get concurrent game limit for user's tier
 *
 * @returns number of games user can have in progress, or -1 for unlimited
 */
export function getConcurrentGameLimit(user: User): number {
  // Admins and paid tiers get unlimited games
  if (
    user.role === 'admin' ||
    user.tier === 'paid' ||
    user.tier === 'lifetime' ||
    user.tier === 'beta'
  ) {
    return -1; // unlimited
  }

  // Free users can have 3 games in progress
  return 3;
}

/**
 * Check if user can create a new game
 *
 * @param user - User attempting to create game
 * @param isPrivate - Whether the game is private
 * @param currentGameCount - Number of games user currently has in progress
 */
export async function canCreateGame(
  user: User,
  isPrivate: boolean,
  currentGameCount: number
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if user can create private games
  if (isPrivate && !userCan(user, 'game.create.private')) {
    return {
      allowed: false,
      reason: 'Private games require a paid subscription',
    };
  }

  // Check concurrent game limit
  const limit = getConcurrentGameLimit(user);
  if (limit !== -1 && currentGameCount >= limit) {
    return {
      allowed: false,
      reason: `Free tier limited to ${limit} concurrent games. Upgrade for unlimited games.`,
    };
  }

  return { allowed: true };
}

/**
 * Get available AI difficulties for user
 */
export function getAvailableAIDifficulties(user: User): ('easy' | 'medium' | 'hard')[] {
  const difficulties: ('easy' | 'medium' | 'hard')[] = [];

  if (canAccessAIDifficulty(user, 'easy')) {
    difficulties.push('easy');
  }
  if (canAccessAIDifficulty(user, 'medium')) {
    difficulties.push('medium');
  }
  if (canAccessAIDifficulty(user, 'hard')) {
    difficulties.push('hard');
  }

  return difficulties;
}

/**
 * Get feature summary for user's tier
 *
 * Useful for displaying feature limitations in the UI
 */
export function getFeatureSummary(user: User): {
  privateGames: boolean;
  aiDifficulties: string[];
  gameHistoryLimit: number | 'unlimited';
  concurrentGameLimit: number | 'unlimited';
  gameExport: boolean;
  gameAnalysis: boolean;
} {
  return {
    privateGames: userCan(user, 'game.create.private'),
    aiDifficulties: getAvailableAIDifficulties(user),
    gameHistoryLimit:
      getGameHistoryLimit(user) === -1 ? 'unlimited' : getGameHistoryLimit(user),
    concurrentGameLimit:
      getConcurrentGameLimit(user) === -1 ? 'unlimited' : getConcurrentGameLimit(user),
    gameExport: userCan(user, 'game.export'),
    gameAnalysis: userCan(user, 'game.analysis'),
  };
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

/**
 * Check if user is moderator or admin
 */
export function isModerator(user: User): boolean {
  return user.role === 'admin' || user.role === 'moderator';
}

/**
 * Check if user has paid subscription
 */
export function hasPaidSubscription(user: User): boolean {
  return user.tier === 'paid' || user.tier === 'lifetime' || user.tier === 'beta';
}
