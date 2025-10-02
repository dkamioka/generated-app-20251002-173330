import { Hono } from "hono";
import { Env } from './core-utils';
import type { GameState, ApiResponse, GameSummary, Player, Observer, ChatPayload, UserGameSummary, BoardSize, AILevel } from '@shared/types';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // List all available games
    app.get('/api/games', async (c) => {
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.listGames();
        return c.json({ success: true, data } satisfies ApiResponse<GameSummary[]>);
    });
    // Get games for a specific user
    app.get('/api/user/games', async (c) => {
        const { userName } = c.req.query();
        if (!userName) {
            return c.json({ success: false, error: 'User name is required' }, 400);
        }
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.getUserGames(userName);
        return c.json({ success: true, data } satisfies ApiResponse<UserGameSummary[]>);
    });
    // Create a new game
    app.post('/api/games', async (c) => {
        const { playerName, isPublic, boardSize, opponentType = 'human', aiLevel = 'easy' } = await c.req.json<{ playerName: string; isPublic: boolean; boardSize: BoardSize; opponentType?: 'human' | 'ai'; aiLevel?: AILevel }>();
        if (!playerName) {
            return c.json({ success: false, error: 'Player name is required' }, 400);
        }
        if (![9, 13, 19].includes(boardSize)) {
            return c.json({ success: false, error: 'Invalid board size' }, 400);
        }
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.createGame(playerName, isPublic, boardSize, opponentType, aiLevel);
        return c.json({ success: true, data } satisfies ApiResponse<{ game: GameState; player: Player }>);
    });
    // Get a specific game's state
    app.get('/api/games/:gameId', async (c) => {
        const { gameId } = c.req.param();
        const { sessionId, observerId } = c.req.query();
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.getGame(gameId);
        if (!data) {
            return c.json({ success: false, error: 'Game not found' }, 404);
        }
        const isPlayer = data.players.some(p => p.sessionId === sessionId);
        const isObserver = data.observers.some(o => o.id === observerId);
        // Redact player chat for observers if it's not visible, but never for players.
        if (!isPlayer && !data.isPlayerChatVisible) {
            // Create a copy to avoid modifying the in-memory state
            const redactedData = { ...data, playerChat: [] };
            return c.json({ success: true, data: redactedData } satisfies ApiResponse<GameState>);
        }
        return c.json({ success: true, data } satisfies ApiResponse<GameState>);
    });
    // Join a game
    app.post('/api/games/:gameId/join', async (c) => {
        const { gameId } = c.req.param();
        const { playerName } = await c.req.json<{ playerName: string }>();
        if (!playerName) {
            return c.json({ success: false, error: 'Player name is required' }, 400);
        }
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.joinGame(gameId, playerName);
        if (!data) {
            return c.json({ success: false, error: 'Failed to join game. It might be full or does not exist.' }, 400);
        }
        return c.json({ success: true, data } satisfies ApiResponse<{ game: GameState; player: Player }>);
    });
    // Watch a game
    app.post('/api/games/:gameId/watch', async (c) => {
        const { gameId } = c.req.param();
        const { observerName } = await c.req.json<{ observerName: string }>();
        if (!observerName) {
            return c.json({ success: false, error: 'Observer name is required' }, 400);
        }
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.watchGame(gameId, observerName);
        if (!data) {
            return c.json({ success: false, error: 'Failed to watch game. It might be private or does not exist.' }, 400);
        }
        return c.json({ success: true, data } satisfies ApiResponse<{ game: GameState; observer: Observer }>);
    });
    // Make a move
    app.post('/api/games/:gameId/move', async (c) => {
        const { gameId } = c.req.param();
        const { playerId, sessionId, row, col } = await c.req.json<{ playerId: string; sessionId: string; row: number; col: number }>();
        if (!playerId || !sessionId || row === undefined || col === undefined) {
            return c.json({ success: false, error: 'Missing required move parameters' }, 400);
        }
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const result = await durableObjectStub.makeMove(gameId, playerId, sessionId, row, col);
        if ('error' in result) {
            return c.json({ success: false, error: result.error }, 400);
        }
        return c.json({ success: true, data: result } satisfies ApiResponse<GameState>);
    });
    // Pass a turn
    app.post('/api/games/:gameId/pass', async (c) => {
        const { gameId } = c.req.param();
        const { playerId, sessionId } = await c.req.json<{ playerId: string; sessionId: string }>();
        if (!playerId || !sessionId) {
            return c.json({ success: false, error: 'Player ID and Session ID are required' }, 400);
        }
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const result = await durableObjectStub.passTurn(gameId, playerId, sessionId);
        if ('error' in result) {
            return c.json({ success: false, error: result.error }, 400);
        }
        return c.json({ success: true, data: result } satisfies ApiResponse<GameState>);
    });
    // Resign from a game
    app.post('/api/games/:gameId/resign', async (c) => {
        const { gameId } = c.req.param();
        const { playerId, sessionId } = await c.req.json<{ playerId: string; sessionId: string }>();
        if (!playerId || !sessionId) {
            return c.json({ success: false, error: 'Player ID and Session ID are required' }, 400);
        }
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const result = await durableObjectStub.resignGame(gameId, playerId, sessionId);
        if ('error' in result) {
            return c.json({ success: false, error: result.error }, 400);
        }
        return c.json({ success: true, data: result } satisfies ApiResponse<GameState>);
    });
    // Send a chat message
    app.post('/api/games/:gameId/chat', async (c) => {
        const { gameId } = c.req.param();
        const payload = await c.req.json<ChatPayload>();
        if (!payload.message || !payload.channel) {
            return c.json({ success: false, error: 'Missing required chat parameters' }, 400);
        }
        if (!payload.playerId && !payload.observerId) {
            return c.json({ success: false, error: 'Missing sender credentials' }, 400);
        }
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const result = await durableObjectStub.addChatMessage(gameId, payload);
        if ('error' in result) {
            return c.json({ success: false, error: result.error }, 400);
        }
        return c.json({ success: true, data: result } satisfies ApiResponse<GameState>);
    });
    // Toggle player chat visibility
    app.post('/api/games/:gameId/chat/toggle-visibility', async (c) => {
        const { gameId } = c.req.param();
        const { playerId, sessionId } = await c.req.json<{ playerId: string; sessionId: string }>();
        if (!playerId || !sessionId) {
            return c.json({ success: false, error: 'Player ID and Session ID are required' }, 400);
        }
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const result = await durableObjectStub.togglePlayerChatVisibility(gameId, playerId, sessionId);
        if ('error' in result) {
            return c.json({ success: false, error: result.error }, 400);
        }
        return c.json({ success: true, data: result } satisfies ApiResponse<GameState>);
    });
}