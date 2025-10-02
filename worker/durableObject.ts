import { DurableObject } from "cloudflare:workers";
import type { GameState, Player, Stone, GameSummary, PlayerColor, ChatMessage, Observer, ChatPayload, UserGameSummary, GameEvent, GameEventPayload, BoardSize, AILevel, PlayerType } from '@shared/types';
const KOMI = 6.5;
const createInitialBoard = (boardSize: BoardSize): Stone[][] => {
  return Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
};
export class GlobalDurableObject extends DurableObject {
    private games: Map<string, GameState> = new Map();
    constructor(state: DurableObjectState, env: any) {
        super(state, env);
        this.ctx.blockConcurrencyWhile(async () => {
            const storedGames = await this.ctx.storage.get<Map<string, GameState>>("games");
            if (storedGames) {
                this.games = storedGames;
            }
        });
    }
    private async saveState() {
        await this.ctx.storage.put("games", this.games);
    }
    private logEvent(game: GameState, payload: GameEventPayload) {
        const event: GameEvent = {
            timestamp: new Date().toISOString(),
            payload,
        };
        game.replayHistory.push(event);
    }
    async createGame(playerName: string, isPublic: boolean, boardSize: BoardSize, opponentType: 'human' | 'ai', aiLevel: AILevel): Promise<{ game: GameState; player: Player }> {
        const gameId = crypto.randomUUID();
        const player1: Player = {
            id: crypto.randomUUID(),
            sessionId: crypto.randomUUID(),
            name: playerName,
            color: 'black',
            captures: 0,
            playerType: 'human',
        };
        const newGame: GameState = {
            gameId,
            boardSize,
            board: createInitialBoard(boardSize),
            players: [player1],
            currentPlayer: 'black',
            gameStatus: 'waiting',
            turn: 1,
            winner: null,
            lastMove: null,
            history: [],
            lastAction: null,
            komi: KOMI,
            scores: { black: 0, white: 0 },
            publicChat: [],
            playerChat: [],
            isPlayerChatVisible: true,
            isPublic,
            observers: [],
            replayHistory: [],
            aiLevel: opponentType === 'ai' ? aiLevel : undefined,
        };
        this.logEvent(newGame, { type: 'GAME_CREATE', player: player1, isPublic, boardSize });
        if (opponentType === 'ai') {
            const aiPlayer: Player = {
                id: crypto.randomUUID(),
                sessionId: 'ai-session', // AI doesn't need a real session
                name: `Kido-Bot (${aiLevel})`,
                color: 'white',
                captures: 0,
                playerType: 'ai',
            };
            newGame.players.push(aiPlayer);
            newGame.gameStatus = 'playing';
            this.logEvent(newGame, { type: 'PLAYER_JOIN', player: aiPlayer });
        }
        this.games.set(gameId, newGame);
        await this.saveState();
        return { game: newGame, player: player1 };
    }
    async joinGame(gameId: string, playerName: string): Promise<{ game: GameState; player: Player } | null> {
        const game = this.games.get(gameId);
        if (!game || game.players.length >= 2) {
            return null;
        }
        const player2: Player = {
            id: crypto.randomUUID(),
            sessionId: crypto.randomUUID(),
            name: playerName,
            color: 'white',
            captures: 0,
            playerType: 'human',
        };
        game.players.push(player2);
        game.gameStatus = 'playing';
        this.logEvent(game, { type: 'PLAYER_JOIN', player: player2 });
        this.games.set(gameId, game);
        await this.saveState();
        return { game, player: player2 };
    }
    async watchGame(gameId: string, observerName: string): Promise<{ game: GameState; observer: Observer } | null> {
        const game = this.games.get(gameId);
        if (!game || !game.isPublic) {
            return null;
        }
        const newObserver: Observer = {
            id: crypto.randomUUID(),
            name: observerName,
        };
        game.observers.push(newObserver);
        this.logEvent(game, { type: 'OBSERVER_JOIN', observer: newObserver });
        this.games.set(gameId, game);
        await this.saveState();
        return { game, observer: newObserver };
    }
    async getGame(gameId: string): Promise<GameState | null> {
        return this.games.get(gameId) || null;
    }
    async listGames(): Promise<GameSummary[]> {
        return Array.from(this.games.values())
            .filter(game => game.gameStatus !== 'finished')
            .map(game => ({
                gameId: game.gameId,
                player1Name: game.players[0]?.name,
                player2Name: game.players[1]?.name,
                gameStatus: game.gameStatus,
                turn: game.turn,
                isPublic: game.isPublic,
                boardSize: game.boardSize,
            }));
    }
    async getUserGames(userName: string): Promise<UserGameSummary[]> {
        return Array.from(this.games.values())
            .filter(game => {
                const isPlayer = game.players.some(p => p.name === userName);
                const isObserver = game.observers.some(o => o.name === userName);
                return isPlayer || isObserver;
            })
            .map(game => {
                const isPlayer = game.players.some(p => p.name === userName);
                return {
                    gameId: game.gameId,
                    player1Name: game.players[0]?.name,
                    player2Name: game.players[1]?.name,
                    gameStatus: game.gameStatus,
                    turn: game.turn,
                    isPublic: game.isPublic,
                    boardSize: game.boardSize,
                    role: isPlayer ? 'player' : 'observer',
                };
            });
    }
    private _isValidMove(board: Stone[][], row: number, col: number, color: PlayerColor, history: GameState['history'], boardSize: BoardSize): boolean {
        if (row < 0 || row >= boardSize || col < 0 || col >= boardSize || board[row][col] !== null) {
            return false;
        }
        const tempBoard = board.map(r => [...r]);
        tempBoard[row][col] = color;
        const opponentColor = color === 'black' ? 'white' : 'black';
        let capturedStones = 0;
        const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of neighbors) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && tempBoard[nr][nc] === opponentColor) {
                const { group, liberties } = this.findGroup(nr, nc, tempBoard, boardSize);
                if (liberties === 0) {
                    capturedStones += group.length;
                    for (const { r, c } of group) {
                        tempBoard[r][c] = null;
                    }
                }
            }
        }
        if (capturedStones > 0) {
            if (history.length > 0) {
                const previousBoardState = JSON.stringify(history[history.length - 1].board);
                if (JSON.stringify(tempBoard) === previousBoardState) {
                    return false; // Ko rule
                }
            }
            return true;
        }
        const { liberties } = this.findGroup(row, col, tempBoard, boardSize);
        if (liberties === 0) {
            return false; // Suicide rule
        }
        return true;
    }
    private async _makeAiMove(game: GameState) {
        const aiPlayer = game.players.find(p => p.playerType === 'ai');
        if (!aiPlayer || aiPlayer.color !== game.currentPlayer) return;
        const opponentColor = aiPlayer.color === 'black' ? 'white' : 'black';
        const possibleMoves: { row: number, col: number, score: number }[] = [];
        for (let r = 0; r < game.boardSize; r++) {
            for (let c = 0; c < game.boardSize; c++) {
                if (game.board[r][c] === null) {
                    if (!this._isValidMove(game.board, r, c, aiPlayer.color, game.history, game.boardSize)) {
                        continue;
                    }
                    let score = 1; // Base score for any valid move
                    const tempBoard = game.board.map(row => [...row]);
                    tempBoard[r][c] = aiPlayer.color;
                    const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                    // 1. Check for captures
                    let captures = 0;
                    for (const [dr, dc] of neighbors) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < game.boardSize && nc >= 0 && nc < game.boardSize && tempBoard[nr][nc] === opponentColor) {
                            const { group, liberties } = this.findGroup(nr, nc, tempBoard, game.boardSize);
                            if (liberties === 0) captures += group.length;
                        }
                    }
                    if (captures > 0) score += 100 * captures;
                    // 2. Check to save own group from atari
                    for (const [dr, dc] of neighbors) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < game.boardSize && nc >= 0 && nc < game.boardSize && tempBoard[nr][nc] === aiPlayer.color) {
                            const { group, liberties } = this.findGroup(nr, nc, game.board, game.boardSize);
                            if (liberties === 1) {
                                const { liberties: newLiberties } = this.findGroup(nr, nc, tempBoard, game.boardSize);
                                if (newLiberties > 1) score += 80 * group.length;
                            }
                        }
                    }
                    // 3. Check to put opponent group in atari
                    for (const [dr, dc] of neighbors) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < game.boardSize && nc >= 0 && nc < game.boardSize && tempBoard[nr][nc] === opponentColor) {
                            const { group, liberties } = this.findGroup(nr, nc, tempBoard, game.boardSize);
                            if (liberties === 1) score += 50 * group.length;
                        }
                    }
                    // 4. Avoid self-atari unless it's a capture
                    if (captures === 0) {
                        const { liberties } = this.findGroup(r, c, tempBoard, game.boardSize);
                        if (liberties === 1) score -= 60;
                    }
                    // 5. Add score for connecting to friendly stones
                    for (const [dr, dc] of neighbors) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < game.boardSize && nc >= 0 && nc < game.boardSize && game.board[nr][nc] === aiPlayer.color) {
                            score += 10;
                        }
                    }
                    // Add a small random factor to break ties
                    score += Math.random();
                    possibleMoves.push({ row: r, col: c, score });
                }
            }
        }
        if (possibleMoves.length === 0) {
            await this.passTurn(game.gameId, aiPlayer.id, aiPlayer.sessionId);
            return;
        }
        possibleMoves.sort((a, b) => b.score - a.score);
        for (const move of possibleMoves) {
            const result = await this.makeMove(game.gameId, aiPlayer.id, aiPlayer.sessionId, move.row, move.col, true);
            if (!('error' in result)) {
                return; // Successful move
            }
        }
        // If all scored moves fail for some reason, pass.
        await this.passTurn(game.gameId, aiPlayer.id, aiPlayer.sessionId);
    }
    async makeMove(gameId: string, playerId: string, sessionId: string, row: number, col: number, isAiMove: boolean = false): Promise<GameState | { error: string }> {
        const game = this.games.get(gameId);
        if (!game) return { error: "Game not found." };
        if (game.gameStatus !== 'playing') return { error: "Game is not active." };
        const player = game.players.find(p => p.id === playerId);
        if (!player) return { error: "Player not found in this game." };
        if (player.sessionId !== sessionId) return { error: "Authentication failed." };
        if (player.color !== game.currentPlayer) return { error: "Not your turn." };
        if (row < 0 || row >= game.boardSize || col < 0 || col >= game.boardSize) return { error: "Invalid coordinates." };
        if (game.board[row][col]) return { error: "Intersection is already occupied." };
        const tempBoardForKo = game.board.map(r => [...r]);
        tempBoardForKo[row][col] = player.color;
        const opponentColor = player.color === 'black' ? 'white' : 'black';
        const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of neighbors) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < game.boardSize && nc >= 0 && nc < game.boardSize && tempBoardForKo[nr][nc] === opponentColor) {
                const { group, liberties } = this.findGroup(nr, nc, tempBoardForKo, game.boardSize);
                if (liberties === 0) {
                    for (const { r, c } of group) {
                        tempBoardForKo[r][c] = null;
                    }
                }
            }
        }
        if (game.history.length > 0) {
            const previousState = game.history[game.history.length - 1];
            if (previousState) {
                const previousBoardState = JSON.stringify(previousState.board);
                if (JSON.stringify(tempBoardForKo) === previousBoardState) {
                    return { error: "Illegal Ko move. Cannot repeat the previous board state." };
                }
            }
        }
        const tempBoard = game.board.map(r => [...r]);
        tempBoard[row][col] = player.color;
        let capturedStones = 0;
        for (const [dr, dc] of neighbors) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < game.boardSize && nc >= 0 && nc < game.boardSize && tempBoard[nr][nc] === opponentColor) {
                const { group, liberties } = this.findGroup(nr, nc, tempBoard, game.boardSize);
                if (liberties === 0) {
                    capturedStones += group.length;
                    for (const { r, c } of group) {
                        tempBoard[r][c] = null;
                    }
                }
            }
        }
        if (capturedStones > 0) {
            player.captures += capturedStones;
        } else {
            const { liberties } = this.findGroup(row, col, tempBoard, game.boardSize);
            if (liberties === 0) {
                return { error: "Illegal suicide move." };
            }
        }
        game.board = tempBoard;
        game.currentPlayer = opponentColor;
        game.turn += 1;
        game.lastMove = { row, col };
        game.history.push({ row, col, color: player.color, board: game.board.map(r => [...r]) });
        game.lastAction = 'move';
        this.logEvent(game, { type: 'MOVE', playerColor: player.color, row, col });
        this.games.set(gameId, game);
        // Check if it's now AI's turn
        const nextPlayer = game.players.find(p => p.color === game.currentPlayer);
        if (nextPlayer?.playerType === 'ai') {
            // Use `this.ctx.waitUntil` to avoid blocking the response to the user
            this.ctx.waitUntil(this._makeAiMove(game));
        }
        await this.saveState();
        return game;
    }
    async passTurn(gameId: string, playerId: string, sessionId: string): Promise<GameState | { error: string }> {
        const game = this.games.get(gameId);
        if (!game) return { error: "Game not found." };
        if (game.gameStatus !== 'playing') return { error: "Game is not active." };
        const player = game.players.find(p => p.id === playerId);
        if (!player) return { error: "Player not found." };
        if (player.sessionId !== sessionId) return { error: "Authentication failed." };
        if (player.color !== game.currentPlayer) return { error: "Not your turn." };
        this.logEvent(game, { type: 'PASS', playerColor: player.color });
        if (game.lastAction === 'pass') {
            game.gameStatus = 'finished';
            this.calculateTerritoryAndFinalScore(game);
        } else {
            game.lastAction = 'pass';
        }
        game.currentPlayer = player.color === 'black' ? 'white' : 'black';
        game.turn += 1;
        this.games.set(gameId, game);
        // Check if it's now AI's turn
        const nextPlayer = game.players.find(p => p.color === game.currentPlayer);
        if (nextPlayer?.playerType === 'ai' && game.gameStatus === 'playing') {
            this.ctx.waitUntil(this._makeAiMove(game));
        }
        await this.saveState();
        return game;
    }
    async resignGame(gameId: string, playerId: string, sessionId: string): Promise<GameState | { error: string }> {
        const game = this.games.get(gameId);
        if (!game) return { error: "Game not found." };
        if (game.gameStatus !== 'playing') return { error: "Game is not active." };
        const player = game.players.find(p => p.id === playerId);
        if (!player) return { error: "Player not found." };
        if (player.sessionId !== sessionId) return { error: "Authentication failed." };
        game.gameStatus = 'finished';
        game.winner = player.color === 'black' ? 'white' : 'black';
        this.logEvent(game, { type: 'RESIGN', playerColor: player.color });
        this.games.set(gameId, game);
        await this.saveState();
        return game;
    }
    async addChatMessage(gameId: string, payload: ChatPayload): Promise<GameState | { error: string }> {
        const game = this.games.get(gameId);
        if (!game) return { error: "Game not found." };
        let senderId: string | undefined;
        let senderName: string | undefined;
        if (payload.playerId && payload.sessionId) {
            const player = game.players.find(p => p.id === payload.playerId);
            if (!player || player.sessionId !== payload.sessionId) {
                return { error: "Player authentication failed." };
            }
            senderId = player.id;
            senderName = player.name;
        } else if (payload.observerId) {
            const observer = game.observers.find(o => o.id === payload.observerId);
            if (!observer) {
                return { error: "Observer not found." };
            }
            if (payload.channel !== 'public') {
                return { error: "Observers can only send public messages." };
            }
            senderId = observer.id;
            senderName = observer.name;
        } else {
            return { error: "Invalid chat payload." };
        }
        if (!senderId || !senderName) {
            return { error: "Could not identify sender." };
        }
        const chatMessage: ChatMessage = {
            senderId,
            senderName,
            message: payload.message,
            timestamp: new Date().toISOString(),
        };
        if (payload.channel === 'public') {
            game.publicChat.push(chatMessage);
        } else {
            game.playerChat.push(chatMessage);
        }
        this.logEvent(game, { type: 'CHAT_MESSAGE', message: chatMessage, channel: payload.channel });
        this.games.set(gameId, game);
        await this.saveState();
        return game;
    }
    async togglePlayerChatVisibility(gameId: string, playerId: string, sessionId: string): Promise<GameState | { error: string }> {
        const game = this.games.get(gameId);
        if (!game) return { error: "Game not found." };
        const player = game.players.find(p => p.id === playerId);
        if (!player) return { error: "Player not found." };
        if (player.sessionId !== sessionId) return { error: "Authentication failed." };
        game.isPlayerChatVisible = !game.isPlayerChatVisible;
        this.logEvent(game, { type: 'VISIBILITY_TOGGLE', isVisible: game.isPlayerChatVisible });
        this.games.set(gameId, game);
        await this.saveState();
        return game;
    }
    private findGroup(row: number, col: number, board: Stone[][], boardSize: BoardSize): { group: { r: number, c: number }[], liberties: number } {
        const color = board[row][col];
        if (!color) return { group: [], liberties: 0 };
        const q: { r: number, c: number }[] = [{ r: row, c: col }];
        const visitedGroup = new Set<string>([`${row},${col}`]);
        const group = [{ r: row, c: col }];
        const libertySet = new Set<string>();
        const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        while (q.length > 0) {
            const { r, c } = q.shift()!;
            for (const [dr, dc] of neighbors) {
                const nr = r + dr;
                const nc = c + dc;
                const key = `${nr},${nc}`;
                if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
                    if (visitedGroup.has(key)) continue;
                    if (board[nr][nc] === color) {
                        visitedGroup.add(key);
                        q.push({ r: nr, c: nc });
                        group.push({ r: nr, c: nc });
                    } else if (board[nr][nc] === null) {
                        libertySet.add(key);
                    }
                }
            }
        }
        return { group, liberties: libertySet.size };
    }
    private calculateTerritoryAndFinalScore(game: GameState) {
        const { board, boardSize } = game;
        const territory: (Stone | 'dame')[][] = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
        const visited = Array(boardSize).fill(false).map(() => Array(boardSize).fill(false));
        let blackTerritory = 0;
        let whiteTerritory = 0;
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === null && !visited[r][c]) {
                    const group: { r: number, c: number }[] = [];
                    const q: { r: number, c: number }[] = [{ r, c }];
                    visited[r][c] = true;
                    let touchesBlack = false;
                    let touchesWhite = false;
                    while (q.length > 0) {
                        const current = q.shift()!;
                        group.push(current);
                        const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                        for (const [dr, dc] of neighbors) {
                            const nr = current.r + dr;
                            const nc = current.c + dc;
                            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
                                if (board[nr][nc] === 'black') {
                                    touchesBlack = true;
                                } else if (board[nr][nc] === 'white') {
                                    touchesWhite = true;
                                } else if (!visited[nr][nc]) {
                                    visited[nr][nc] = true;
                                    q.push({ r: nr, c: nc });
                                }
                            }
                        }
                    }
                    if (touchesBlack && !touchesWhite) {
                        blackTerritory += group.length;
                        group.forEach(p => territory[p.r][p.c] = 'black');
                    } else if (!touchesBlack && touchesWhite) {
                        whiteTerritory += group.length;
                        group.forEach(p => territory[p.r][p.c] = 'white');
                    } else {
                        group.forEach(p => territory[p.r][p.c] = 'dame');
                    }
                }
            }
        }
        game.territory = territory;
        const blackPlayer = game.players.find(p => p.color === 'black');
        const whitePlayer = game.players.find(p => p.color === 'white');
        const blackScore = blackTerritory + (blackPlayer?.captures || 0);
        const whiteScore = whiteTerritory + (whitePlayer?.captures || 0) + game.komi;
        game.scores = { black: blackScore, white: whiteScore };
        game.winner = whiteScore > blackScore ? 'white' : 'black';
    }
}