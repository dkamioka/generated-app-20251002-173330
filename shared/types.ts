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