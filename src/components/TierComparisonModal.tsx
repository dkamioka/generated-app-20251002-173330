/**
 * Tier Comparison Modal
 *
 * Shows feature comparison between Free and Paid tiers.
 * Encourages users to upgrade to paid subscription.
 *
 * Related: FEATURE_SPEC_USER_MANAGEMENT.md - Phase 2
 */

import { useState } from 'react';
import type { User } from '@shared/types';
import { getTierBadge, isFreeTier } from '@/lib/permissions';

interface TierComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export function TierComparisonModal({ isOpen, onClose, currentUser }: TierComparisonModalProps) {
  if (!isOpen) return null;

  const features = [
    {
      name: 'Public Games',
      free: true,
      paid: true,
    },
    {
      name: 'Private Games',
      free: false,
      paid: true,
    },
    {
      name: 'Concurrent Games',
      free: '3 games',
      paid: 'Unlimited',
    },
    {
      name: 'Game History',
      free: '10 games',
      paid: 'Unlimited',
    },
    {
      name: 'AI Difficulty: Easy',
      free: true,
      paid: true,
    },
    {
      name: 'AI Difficulty: Medium',
      free: false,
      paid: true,
    },
    {
      name: 'AI Difficulty: Hard',
      free: false,
      paid: true,
    },
    {
      name: 'Game Export',
      free: false,
      paid: true,
    },
    {
      name: 'Game Analysis',
      free: false,
      paid: true,
    },
    {
      name: 'Priority Support',
      free: false,
      paid: true,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Choose Your Plan
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Unlock all features with our paid subscription
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Free Tier */}
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Free
                </h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">$0</span>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">/month</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Perfect for casual players
              </p>
              {currentUser && isFreeTier(currentUser) && (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-center font-medium">
                  Current Plan
                </div>
              )}
            </div>

            {/* Paid Tier */}
            <div className="border-2 border-blue-500 dark:border-blue-400 rounded-lg p-6 relative">
              <div className="absolute -top-3 right-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Paid
                </h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">$2</span>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">/month</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Unlock all features + 30-day trial
              </p>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Upgrade Now
              </button>
            </div>
          </div>

          {/* Feature Comparison Table */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Features
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Free
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Paid
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {features.map((feature, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {feature.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {typeof feature.free === 'boolean' ? (
                        feature.free ? (
                          <svg
                            className="h-5 w-5 text-green-500 mx-auto"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">{feature.free}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {typeof feature.paid === 'boolean' ? (
                        feature.paid ? (
                          <svg
                            className="h-5 w-5 text-green-500 mx-auto"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )
                      ) : (
                        <span className="text-gray-900 dark:text-white font-medium">{feature.paid}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Beta Notice */}
          {currentUser && currentUser.tier === 'beta' && (
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Beta User:</strong> You currently have access to all paid features for free during the beta period!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
