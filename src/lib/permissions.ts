/**
 * Frontend Permission Utilities
 *
 * Client-side permission checking based on user tier and role.
 * Mirrors the backend permission system from worker/permissions.ts
 *
 * Related: FEATURE_SPEC_USER_MANAGEMENT.md - Phase 2
 */

import type { User, UserTier, UserRole } from '@shared/types';

/**
 * Permission definitions (matches backend)
 */
export const TIER_FEATURES = {
  // Game creation
  createPrivateGame: ['paid', 'lifetime', 'beta'] as UserTier[],
  createPublicGame: ['free', 'paid', 'lifetime', 'beta'] as UserTier[],

  // AI difficulties
  aiEasy: ['free', 'paid', 'lifetime', 'beta'] as UserTier[],
  aiMedium: ['paid', 'lifetime', 'beta'] as UserTier[],
  aiHard: ['paid', 'lifetime', 'beta'] as UserTier[],

  // Game features
  gameExport: ['paid', 'lifetime', 'beta'] as UserTier[],
  gameAnalysis: ['paid', 'lifetime', 'beta'] as UserTier[],
  unlimitedHistory: ['paid', 'lifetime', 'beta'] as UserTier[],
  unlimitedGames: ['paid', 'lifetime', 'beta'] as UserTier[],
};

/**
 * Get concurrent game limit for user's tier
 */
export function getConcurrentGameLimit(user: User | null): number {
  if (!user) return 0;

  if (
    user.role === 'admin' ||
    user.tier === 'paid' ||
    user.tier === 'lifetime' ||
    user.tier === 'beta'
  ) {
    return -1; // unlimited
  }

  return 3; // free tier limit
}

/**
 * Get game history limit for user's tier
 */
export function getGameHistoryLimit(user: User | null): number {
  if (!user) return 0;

  if (
    user.role === 'admin' ||
    user.tier === 'paid' ||
    user.tier === 'lifetime' ||
    user.tier === 'beta'
  ) {
    return -1; // unlimited
  }

  return 10; // free tier limit
}

/**
 * Check if user can create private games
 */
export function canCreatePrivateGame(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return TIER_FEATURES.createPrivateGame.includes(user.tier);
}

/**
 * Check if user can access AI difficulty
 */
export function canAccessAIDifficulty(
  user: User | null,
  difficulty: 'easy' | 'medium' | 'hard'
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  switch (difficulty) {
    case 'easy':
      return TIER_FEATURES.aiEasy.includes(user.tier);
    case 'medium':
      return TIER_FEATURES.aiMedium.includes(user.tier);
    case 'hard':
      return TIER_FEATURES.aiHard.includes(user.tier);
    default:
      return false;
  }
}

/**
 * Check if user can export games
 */
export function canExportGames(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return TIER_FEATURES.gameExport.includes(user.tier);
}

/**
 * Check if user can use game analysis
 */
export function canUseGameAnalysis(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return TIER_FEATURES.gameAnalysis.includes(user.tier);
}

/**
 * Check if user has unlimited game history
 */
export function hasUnlimitedHistory(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return TIER_FEATURES.unlimitedHistory.includes(user.tier);
}

/**
 * Check if user has unlimited concurrent games
 */
export function hasUnlimitedGames(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return TIER_FEATURES.unlimitedGames.includes(user.tier);
}

/**
 * Check if user is on free tier
 */
export function isFreeTier(user: User | null): boolean {
  return user?.tier === 'free';
}

/**
 * Check if user is on paid tier
 */
export function isPaidTier(user: User | null): boolean {
  return user?.tier === 'paid' || user?.tier === 'lifetime';
}

/**
 * Check if user is in beta
 */
export function isBetaTier(user: User | null): boolean {
  return user?.tier === 'beta';
}

/**
 * Get available AI difficulties for user
 */
export function getAvailableAIDifficulties(
  user: User | null
): ('easy' | 'medium' | 'hard')[] {
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
 * Get feature summary for user
 */
export function getFeatureSummary(user: User | null): {
  privateGames: boolean;
  aiDifficulties: string[];
  gameHistoryLimit: number | 'unlimited';
  concurrentGameLimit: number | 'unlimited';
  gameExport: boolean;
  gameAnalysis: boolean;
  tier: UserTier | null;
  isPaid: boolean;
} {
  return {
    privateGames: canCreatePrivateGame(user),
    aiDifficulties: getAvailableAIDifficulties(user),
    gameHistoryLimit:
      getGameHistoryLimit(user) === -1 ? 'unlimited' : getGameHistoryLimit(user),
    concurrentGameLimit:
      getConcurrentGameLimit(user) === -1 ? 'unlimited' : getConcurrentGameLimit(user),
    gameExport: canExportGames(user),
    gameAnalysis: canUseGameAnalysis(user),
    tier: user?.tier || null,
    isPaid: isPaidTier(user),
  };
}

/**
 * Get upgrade message for feature
 */
export function getUpgradeMessage(feature: string): string {
  const messages: Record<string, string> = {
    privateGames: 'Upgrade to Paid to create private games',
    aiMedium: 'Upgrade to Paid to play against Medium AI',
    aiHard: 'Upgrade to Paid to play against Hard AI',
    gameExport: 'Upgrade to Paid to export your games',
    gameAnalysis: 'Upgrade to Paid to use game analysis',
    unlimitedGames: 'Upgrade to Paid for unlimited concurrent games',
    unlimitedHistory: 'Upgrade to Paid for unlimited game history',
  };

  return messages[feature] || 'Upgrade to Paid for more features';
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: UserTier): string {
  const names: Record<UserTier, string> = {
    free: 'Free',
    paid: 'Paid',
    lifetime: 'Lifetime',
    beta: 'Beta',
  };

  return names[tier];
}

/**
 * Get tier badge color
 */
export function getTierBadgeColor(tier: UserTier): string {
  const colors: Record<UserTier, string> = {
    free: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    lifetime: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    beta: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  };

  return colors[tier];
}
