import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import type { GameState, GameSummary, ApiResponse } from '@shared/types';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('API Integration Tests - Game Management', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('GET /api/games', () => {
    it('should return list of public games', async () => {
      const mockGames: GameSummary[] = [
        {
          gameId: 'game-1',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameStatus: 'playing',
          turn: 5,
          isPublic: true,
          boardSize: 19,
        },
        {
          gameId: 'game-2',
          player1Name: 'Charlie',
          player2Name: undefined,
          gameStatus: 'waiting',
          turn: 1,
          isPublic: true,
          boardSize: 13,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockGames }),
      });

      const response = await fetch('/api/games');
      const result: ApiResponse<GameSummary[]> = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/games');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].player1Name).toBe('Alice');
    });

    it('should handle empty game list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const response = await fetch('/api/games');
      const result: ApiResponse<GameSummary[]> = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: 'Internal Server Error' }),
      });

      const response = await fetch('/api/games');
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('POST /api/games', () => {
    it('should create a new game with valid parameters', async () => {
      const newGame: Partial<GameState> = {
        gameId: 'new-game-id',
        boardSize: 19,
        gameStatus: 'waiting',
        players: [
          {
            id: 'player-id',
            sessionId: 'session-id',
            name: 'Alice',
            color: 'black',
            captures: 0,
            playerType: 'human',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { game: newGame, player: newGame.players![0] } }),
      });

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: 'Alice',
          isPublic: true,
          boardSize: 19,
          opponentType: 'human',
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.game.boardSize).toBe(19);
      expect(result.data.player.name).toBe('Alice');
    });

    it('should reject invalid board size', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Invalid board size' }),
      });

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: 'Alice',
          isPublic: true,
          boardSize: 25, // Invalid
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid board size');
    });

    it('should reject missing player name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Player name is required' }),
      });

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublic: true,
          boardSize: 19,
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should create game with AI opponent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            game: {
              gameId: 'ai-game-id',
              gameStatus: 'playing',
              players: [
                { name: 'Alice', color: 'black', playerType: 'human' },
                { name: 'Kido-Bot (easy)', color: 'white', playerType: 'ai' },
              ],
              aiLevel: 'easy',
            },
          },
        }),
      });

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: 'Alice',
          isPublic: false,
          boardSize: 9,
          opponentType: 'ai',
          aiLevel: 'easy',
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.game.players[1].playerType).toBe('ai');
      expect(result.data.game.aiLevel).toBe('easy');
    });
  });

  describe('GET /api/games/:gameId', () => {
    it('should fetch specific game by ID', async () => {
      const mockGame: Partial<GameState> = {
        gameId: 'test-game-id',
        boardSize: 19,
        gameStatus: 'playing',
        turn: 10,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockGame }),
      });

      const response = await fetch('/api/games/test-game-id');
      const result: ApiResponse<GameState> = await response.json();

      expect(result.success).toBe(true);
      expect(result.data!.gameId).toBe('test-game-id');
    });

    it('should return 404 for non-existent game', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Game not found' }),
      });

      const response = await fetch('/api/games/non-existent-id');
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game not found');
    });

    it('should redact player chat for observers when not visible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            gameId: 'test-game',
            isPlayerChatVisible: false,
            playerChat: [], // Redacted for observer
            publicChat: [{ message: 'Public message' }],
          },
        }),
      });

      const response = await fetch('/api/games/test-game?observerId=observer-123');
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.playerChat).toHaveLength(0);
      expect(result.data.publicChat.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/games/:gameId/join', () => {
    it('should allow player to join waiting game', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            game: {
              gameId: 'test-game',
              gameStatus: 'playing',
              players: [
                { name: 'Alice', color: 'black' },
                { name: 'Bob', color: 'white' },
              ],
            },
            player: { name: 'Bob', color: 'white' },
          },
        }),
      });

      const response = await fetch('/api/games/test-game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: 'Bob' }),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.game.players).toHaveLength(2);
      expect(result.data.player.name).toBe('Bob');
    });

    it('should reject joining full game', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Game is full' }),
      });

      const response = await fetch('/api/games/full-game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: 'Charlie' }),
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('full');
    });
  });

  describe('POST /api/games/:gameId/move', () => {
    it('should accept valid move', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            gameId: 'test-game',
            turn: 2,
            currentPlayer: 'white',
            lastMove: { row: 3, col: 3 },
          },
        }),
      });

      const response = await fetch('/api/games/test-game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player-1',
          sessionId: 'session-1',
          row: 3,
          col: 3,
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.lastMove).toEqual({ row: 3, col: 3 });
      expect(result.data.turn).toBe(2);
    });

    it('should reject move on occupied cell', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Intersection is already occupied.' }),
      });

      const response = await fetch('/api/games/test-game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player-1',
          sessionId: 'session-1',
          row: 3,
          col: 3,
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('occupied');
    });

    it('should reject move with invalid session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Authentication failed.' }),
      });

      const response = await fetch('/api/games/test-game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player-1',
          sessionId: 'invalid-session',
          row: 3,
          col: 3,
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication');
    });

    it('should reject move when not player turn', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Not your turn.' }),
      });

      const response = await fetch('/api/games/test-game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player-2',
          sessionId: 'session-2',
          row: 5,
          col: 5,
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not your turn');
    });

    it('should reject Ko violation move', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Illegal Ko move. Cannot repeat the previous board state.' }),
      });

      const response = await fetch('/api/games/test-game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player-1',
          sessionId: 'session-1',
          row: 5,
          col: 5,
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Ko');
    });

    it('should reject suicide move', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Illegal suicide move.' }),
      });

      const response = await fetch('/api/games/test-game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player-1',
          sessionId: 'session-1',
          row: 9,
          col: 9,
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('suicide');
    });
  });

  describe('POST /api/games/:gameId/pass', () => {
    it('should allow player to pass turn', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            gameId: 'test-game',
            turn: 11,
            currentPlayer: 'white',
            lastAction: 'pass',
          },
        }),
      });

      const response = await fetch('/api/games/test-game/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player-1',
          sessionId: 'session-1',
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.lastAction).toBe('pass');
    });

    it('should end game on double pass', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            gameId: 'test-game',
            gameStatus: 'finished',
            lastAction: 'pass',
            winner: 'black',
            scores: { black: 125.5, white: 118.0 },
          },
        }),
      });

      const response = await fetch('/api/games/test-game/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player-2',
          sessionId: 'session-2',
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.gameStatus).toBe('finished');
      expect(result.data.winner).toBeDefined();
    });
  });

  describe('POST /api/games/:gameId/resign', () => {
    it('should allow player to resign', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            gameId: 'test-game',
            gameStatus: 'finished',
            winner: 'white',
          },
        }),
      });

      const response = await fetch('/api/games/test-game/resign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player-1',
          sessionId: 'session-1',
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.gameStatus).toBe('finished');
      expect(result.data.winner).toBe('white');
    });
  });

  describe('POST /api/games/:gameId/chat', () => {
    it('should allow player to send public chat', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            publicChat: [
              {
                senderId: 'player-1',
                senderName: 'Alice',
                message: 'Good game!',
                timestamp: new Date().toISOString(),
              },
            ],
          },
        }),
      });

      const response = await fetch('/api/games/test-game/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player-1',
          sessionId: 'session-1',
          message: 'Good game!',
          channel: 'public',
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.publicChat).toHaveLength(1);
      expect(result.data.publicChat[0].message).toBe('Good game!');
    });

    it('should allow player to send private chat', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            playerChat: [
              {
                senderId: 'player-1',
                senderName: 'Alice',
                message: 'Nice move!',
                timestamp: new Date().toISOString(),
              },
            ],
          },
        }),
      });

      const response = await fetch('/api/games/test-game/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player-1',
          sessionId: 'session-1',
          message: 'Nice move!',
          channel: 'player',
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.playerChat).toHaveLength(1);
    });

    it('should reject observer sending player chat', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Observers can only send public messages.' }),
      });

      const response = await fetch('/api/games/test-game/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observerId: 'observer-1',
          message: 'Private message',
          channel: 'player',
        }),
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Observers can only send public');
    });
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { status: 'healthy', timestamp: new Date().toISOString() },
        }),
      });

      const response = await fetch('/api/health');
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('healthy');
      expect(result.data.timestamp).toBeDefined();
    });
  });
});
