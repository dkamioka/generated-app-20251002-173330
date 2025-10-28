/**
 * Upgrade Prompt Component
 *
 * Displays upgrade prompts for locked features.
 * Shows gentle nudges to encourage paid subscriptions.
 *
 * Related: FEATURE_SPEC_USER_MANAGEMENT.md - Phase 2
 */

import { getUpgradeMessage } from '@/lib/permissions';

interface UpgradePromptProps {
  feature: string;
  className?: string;
  inline?: boolean;
}

export function UpgradePrompt({ feature, className = '', inline = false }: UpgradePromptProps) {
  const message = getUpgradeMessage(feature);

  if (inline) {
    return (
      <span className={`text-sm text-blue-600 dark:text-blue-400 ${className}`}>
        {message}
      </span>
    );
  }

  return (
    <div className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {message}
          </p>
          <button className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
            Learn More →
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Feature Lock Badge
 *
 * Small badge to show a feature is locked
 */
interface FeatureLockBadgeProps {
  children: React.ReactNode;
  locked: boolean;
  className?: string;
}

export function FeatureLockBadge({ children, locked, className = '' }: FeatureLockBadgeProps) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <span className={`relative ${className}`}>
      {children}
      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
        <svg
          className="h-4 w-4 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </span>
  );
}

/**
 * Tier Badge Component
 *
 * Shows user's current tier with color coding
 */
import { getTierDisplayName, getTierBadgeColor } from '@/lib/permissions';
import type { UserTier } from '@shared/types';

interface TierBadgeProps {
  tier: UserTier;
  className?: string;
}

export function TierBadge({ tier, className = '' }: TierBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor(tier)} ${className}`}>
      {getTierDisplayName(tier)}
    </span>
  );
}

/**
 * Feature Limit Indicator
 *
 * Shows usage limits (e.g., "2/3 games")
 */
interface FeatureLimitIndicatorProps {
  current: number;
  limit: number | 'unlimited';
  label: string;
  className?: string;
}

export function FeatureLimitIndicator({
  current,
  limit,
  label,
  className = '',
}: FeatureLimitIndicatorProps) {
  const isUnlimited = limit === 'unlimited';
  const isNearLimit = !isUnlimited && current >= limit * 0.8;
  const isAtLimit = !isUnlimited && current >= limit;

  return (
    <div className={`text-sm ${className}`}>
      <span className="text-gray-600 dark:text-gray-400">{label}: </span>
      <span
        className={`font-medium ${
          isAtLimit
            ? 'text-red-600 dark:text-red-400'
            : isNearLimit
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-gray-900 dark:text-white'
        }`}
      >
        {current}
        {!isUnlimited && `/${limit}`}
      </span>
      {isUnlimited && (
        <span className="text-gray-600 dark:text-gray-400"> (unlimited)</span>
      )}
    </div>
  );
}
