/**
 * Matchmaking API Client
 *
 * Client functions for all matchmaking-related API endpoints.
 * Handles authentication tokens and error responses.
 */

import type { ApiResponse } from '@shared/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('kido-auth-token');
}

/**
 * Make authenticated API request
 */
async function authenticatedFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return await response.json();
}

// ============================================================================
// Types
// ============================================================================

export interface PlayerRating {
  user_id: string;
  rating: number;
  ranked_wins: number;
  ranked_losses: number;
  peak_rating: number;
  current_streak: number;
  best_streak: number;
  total_games: number;
  last_game_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RankedGame {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_rating_before: number;
  player2_rating_before: number;
  player1_rating_after: number;
  player2_rating_after: number;
  winner_id: string | null;
  game_id: string;
  duration_seconds: number | null;
  completed_at: string | null;
  created_at: string;
}

export interface QueueStatus {
  inQueue: boolean;
  position?: number;
  queueSize?: number;
  estimatedWaitTime?: number;
  currentRatingRange?: number;
  waitTime?: number;
  matchFound?: boolean;
  match?: Match;
}

export interface Match {
  id: string;
  player1: {
    userId: string;
    name: string;
    rating: number;
    picture?: string;
  };
  player2: {
    userId: string;
    name: string;
    rating: number;
    picture?: string;
  };
  createdAt: number;
  expiresAt: number;
}

export interface PlayerStats {
  rating: PlayerRating;
  rank: number;
  recentGames: Array<RankedGame & {
    opponent_name: string;
    opponent_rating_before: number;
    rating_change: number;
    result: 'win' | 'loss' | 'draw';
  }>;
}

export interface LeaderboardEntry {
  user_id: string;
  rating: number;
  ranked_wins: number;
  ranked_losses: number;
  total_games: number;
  peak_rating: number;
  user: {
    id: string;
    name: string;
    picture?: string;
    tier: string;
  };
}

export interface JoinQueueResponse {
  inQueue: boolean;
  message?: string;
}

export interface AcceptMatchResponse {
  success: boolean;
  gameReady?: boolean;
  gameId?: string;
  player1SessionId?: string;
  player2SessionId?: string;
  player1PlayerId?: string;
  player2PlayerId?: string;
  waitingForOpponent?: boolean;
  waiting?: boolean;
  message?: string;
}

// ============================================================================
// Matchmaking Queue
// ============================================================================

/**
 * Join the matchmaking queue
 */
export async function joinQueue(): Promise<ApiResponse<JoinQueueResponse>> {
  return authenticatedFetch<JoinQueueResponse>('/matchmaking/join', {
    method: 'POST',
  });
}

/**
 * Leave the matchmaking queue
 */
export async function leaveQueue(): Promise<ApiResponse<{ success: boolean }>> {
  return authenticatedFetch<{ success: boolean }>('/matchmaking/leave', {
    method: 'POST',
  });
}

/**
 * Get current queue status
 */
export async function getQueueStatus(): Promise<ApiResponse<QueueStatus>> {
  return authenticatedFetch<QueueStatus>('/matchmaking/status');
}

/**
 * Accept a match
 */
export async function acceptMatch(matchId: string): Promise<ApiResponse<AcceptMatchResponse>> {
  return authenticatedFetch<AcceptMatchResponse>(`/matchmaking/accept/${matchId}`, {
    method: 'POST',
  });
}

/**
 * Reject a match
 */
export async function rejectMatch(matchId: string): Promise<ApiResponse<{ success: boolean }>> {
  return authenticatedFetch<{ success: boolean }>(`/matchmaking/reject/${matchId}`, {
    method: 'POST',
  });
}

// ============================================================================
// Player Stats & Leaderboard
// ============================================================================

/**
 * Get current user's stats
 */
export async function getMyStats(): Promise<ApiResponse<PlayerStats>> {
  return authenticatedFetch<PlayerStats>('/stats/me');
}

/**
 * Get user stats by ID
 */
export async function getUserStats(userId: string): Promise<ApiResponse<PlayerStats>> {
  return authenticatedFetch<PlayerStats>(`/stats/user/${userId}`);
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit: number = 100): Promise<ApiResponse<LeaderboardEntry[]>> {
  return authenticatedFetch<LeaderboardEntry[]>(`/stats/leaderboard?limit=${limit}`);
}
