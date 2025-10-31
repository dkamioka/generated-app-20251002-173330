// This file is for shared types between the worker and the client
// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
// Kido Go Game Types
export type Stone = 'black' | 'white' | null;
export type PlayerColor = 'black' | 'white';
export type BoardSize = 9 | 13 | 19;
export type PlayerType = 'human' | 'ai';
export type AILevel = 'easy';
export interface Player {
  id: string; // Unique player ID
  sessionId: string; // Unique session ID for authentication
  name: string;
  color: PlayerColor;
  captures: number;
  playerType: PlayerType;
}
export type GameStatus = 'waiting' | 'playing' | 'finished';
export type LastAction = 'move' | 'pass' | null;
export interface ChatMessage {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}
export interface Observer {
  id: string;
  name: string;
}
// Game Event Types for Replay Functionality
export type GameEventPayload =
  | { type: 'GAME_CREATE'; player: Player; isPublic: boolean; boardSize: BoardSize }
  | { type: 'PLAYER_JOIN'; player: Player }
  | { type: 'OBSERVER_JOIN'; observer: Observer }
  | { type: 'MOVE'; playerColor: PlayerColor; row: number; col: number }
  | { type: 'PASS'; playerColor: PlayerColor }
  | { type: 'RESIGN'; playerColor: PlayerColor }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage; channel: 'public' | 'player' }
  | { type: 'VISIBILITY_TOGGLE'; isVisible: boolean };
export interface GameEvent {
  timestamp: string;
  payload: GameEventPayload;
}
export interface GameState {
  gameId: string;
  boardSize: BoardSize;
  board: Stone[][];
  players: Player[];
  currentPlayer: PlayerColor;
  gameStatus: GameStatus;
  winner?: PlayerColor | null;
  turn: number;
  lastMove: { row: number; col: number } | null;
  history: { row: number; col: number; color: PlayerColor; board: Stone[][] }[];
  lastAction: LastAction;
  komi: number;
  scores: {
    black: number;
    white: number;
  };
  territory?: (Stone | 'dame')[][];
  publicChat: ChatMessage[];
  playerChat: ChatMessage[];
  isPlayerChatVisible: boolean;
  isPublic: boolean;
  observers: Observer[];
  replayHistory: GameEvent[];
  aiLevel?: AILevel;

  // Ranked game fields
  isRanked?: boolean;
  matchId?: string;
  player1UserId?: string;
  player2UserId?: string;
  player1RatingBefore?: number;
  player2RatingBefore?: number;
  player1RatingAfter?: number;
  player2RatingAfter?: number;
  rankedGameProcessed?: boolean; // Prevents duplicate rating updates
}
// A summarized version of the game state for lobby listings
export interface GameSummary {
  gameId: string;
  player1Name?: string;
  player2Name?: string;
  gameStatus: GameStatus;
  turn: number;
  isPublic: boolean;
  boardSize: BoardSize;
}
// A summarized version for the user's profile page
export interface UserGameSummary extends GameSummary {
  role: 'player' | 'observer';
}
export type ChatPayload = {
  message: string;
  channel: 'public' | 'player';
} & ({
  playerId: string;
  sessionId: string;
  observerId?: never;
} | {
  playerId?: never;
  sessionId?: never;
  observerId: string;
});

// ============================================================================
// User Management System Types
// ============================================================================

// Role-based access control (RBAC)
export type UserRole = 'admin' | 'moderator' | 'user';

// Subscription tier system
export type UserTier = 'free' | 'paid' | 'lifetime' | 'beta';

// Subscription status
export type SubscriptionStatus = 'active' | 'trialing' | 'cancelled' | 'expired' | 'paused';

// User entity
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  googleId: string;

  // Access control
  role: UserRole;
  tier: UserTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string; // ISO timestamp

  // Stripe integration
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;

  // Special status
  betaUser: boolean;
  foundingMember: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string; // admin user ID

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

// Public user info (safe to expose to other users)
export interface PublicUser {
  id: string;
  name: string;
  picture?: string;
  role: UserRole;
  tier: UserTier;
  foundingMember: boolean;
  createdAt: string;
}

// Session data
export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  lastActivity: string;
  userAgent?: string;
  ipAddress?: string;
}

// Subscription event types
export type SubscriptionEventType =
  | 'subscription_started'
  | 'subscription_renewed'
  | 'subscription_cancelled'
  | 'subscription_expired'
  | 'trial_started'
  | 'trial_converted'
  | 'trial_expired'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'refund_issued';

// Subscription event entity
export interface SubscriptionEvent {
  id: string;
  userId: string;
  eventType: SubscriptionEventType;
  stripeEventId?: string;
  amountCents?: number;
  currency: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Admin action types
export type AdminActionType =
  | 'user_role_changed'
  | 'user_banned'
  | 'user_unbanned'
  | 'user_deleted'
  | 'game_deleted'
  | 'chat_message_deleted'
  | 'subscription_modified';

// Admin action entity
export interface AdminAction {
  id: string;
  adminId: string;
  actionType: AdminActionType;
  targetUserId?: string;
  targetGameId?: string;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Permission definition
export interface Permission {
  key: string;
  description: string;
  requiredRoles?: UserRole[];
  requiredTiers?: UserTier[];
}

// Auth token payload
export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tier: UserTier;
  iat: number; // issued at
  exp: number; // expires at
}

// Google OAuth profile
export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

// API Request/Response types for user management

export interface LoginResponse {
  user: User;
  token: string;
  expiresAt: string;
}

export interface UserUpdateRequest {
  name?: string;
  picture?: string;
}

export interface AdminUserUpdateRequest {
  role?: UserRole;
  tier?: UserTier;
  isBanned?: boolean;
  banReason?: string;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  tier?: UserTier;
  sortBy?: 'created_at' | 'last_login' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminAnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  paidUsers: number;
  totalGames: number;
  gamesInProgress: number;
  monthlyRevenue: number;
  growthRate: number;
}

export interface AdminRevenueMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  lifetimeSales: number;
  conversionRate: number;
  averageLifetimeValue: number;
}