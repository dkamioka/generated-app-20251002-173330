import { create } from 'zustand';
import { GameState, Stone, ApiResponse, ChatMessage, Observer, ChatPayload, BoardSize } from '@shared/types';
import { toast } from 'sonner';
const createInitialBoard = (boardSize: BoardSize): Stone[][] => {
  return Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
};
interface GameStoreState extends Partial<GameState> {
  myPlayerId: string | null;
  mySessionId: string | null;
  myObserverId: string | null;
  hoveredCell: { row: number; col: number } | null;
  error: string | null;
  isLoading: boolean;
  fetchGame: (gameId: string) => Promise<boolean>;
  placeStone: (row: number, col: number) => Promise<void>;
  passTurn: () => Promise<void>;
  resignGame: () => Promise<void>;
  sendMessage: (message: string, channel: 'public' | 'player') => Promise<void>;
  togglePlayerChatVisibility: () => Promise<void>;
  watchGame: (gameId: string, observerName: string) => Promise<{ game: GameState; observer: Observer } | null>;
  setPlayerSession: (playerId: string, sessionId: string) => void;
  setObserverSession: (observerId: string) => void;
  loadSession: (gameId: string) => void;
  setHoveredCell: (row: number, col: number) => void;
  clearHoveredCell: () => void;
}
const apiCall = async <T>(url: string, method: string, body?: object): Promise<ApiResponse<T>> => {
    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
};
export const useGameStore = create<GameStoreState>((set, get) => ({
  // Initial empty state
  gameId: undefined,
  boardSize: 19,
  board: createInitialBoard(19),
  players: [],
  currentPlayer: 'black',
  gameStatus: undefined,
  turn: 0,
  myPlayerId: null,
  mySessionId: null,
  myObserverId: null,
  hoveredCell: null,
  error: null,
  isLoading: false,
  komi: 6.5,
  scores: { black: 0, white: 0 },
  territory: undefined,
  publicChat: [],
  playerChat: [],
  isPlayerChatVisible: true,
  isPublic: false,
  observers: [],
  // Actions
  loadSession: (gameId: string) => {
    const sessionKey = `kido-session-${gameId}`;
    try {
      const storedSession = localStorage.getItem(sessionKey);
      if (storedSession) {
        const { playerId, sessionId, observerId } = JSON.parse(storedSession);
        if (playerId && sessionId) {
          set({ myPlayerId: playerId, mySessionId: sessionId, myObserverId: null });
        } else if (observerId) {
          set({ myPlayerId: null, mySessionId: null, myObserverId: observerId });
        }
      }
    } catch (e) {
      console.error("Failed to parse session data:", e);
      localStorage.removeItem(sessionKey);
    }
  },
  setPlayerSession: (playerId: string, sessionId: string) => {
    set({ myPlayerId: playerId, mySessionId: sessionId, myObserverId: null });
  },
  setObserverSession: (observerId: string) => {
    set({ myPlayerId: null, mySessionId: null, myObserverId: observerId });
  },
  fetchGame: async (gameId: string) => {
    const { mySessionId, myObserverId } = get();
    let url = `/api/games/${gameId}`;
    const params = new URLSearchParams();
    if (mySessionId) {
      params.append('sessionId', mySessionId);
    } else if (myObserverId) {
      params.append('observerId', myObserverId);
    }
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Game not found or server error.');
      }
      const result: ApiResponse<GameState> = await response.json();
      if (result.success && result.data) {
        set({ ...result.data, error: null });
        return true;
      } else {
        throw new Error(result.error || 'Failed to fetch game state.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      set({ error: errorMessage });
      console.error("Fetch game error:", errorMessage);
      return false;
    }
  },
  watchGame: async (gameId: string, observerName: string) => {
    try {
      const result = await apiCall<{ game: GameState; observer: Observer }>(`/api/games/${gameId}/watch`, 'POST', { observerName });
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Could not watch game.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
      return null;
    }
  },
  placeStone: async (row: number, col: number) => {
    const { gameId, myPlayerId, mySessionId, gameStatus } = get();
    if (!gameId || !myPlayerId || !mySessionId || gameStatus !== 'playing') {
      toast.error("Cannot make a move right now.");
      return;
    }
    set({ isLoading: true });
    try {
      const result = await apiCall<GameState>(`/api/games/${gameId}/move`, 'POST', {
        playerId: myPlayerId,
        sessionId: mySessionId,
        row,
        col,
      });
      if (result.success && result.data) {
        set({ ...result.data, error: null });
      } else {
        toast.error(result.error || "Invalid move.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Error making move: ${errorMessage}`);
    } finally {
      set({ isLoading: false });
    }
  },
  passTurn: async () => {
    const { gameId, myPlayerId, mySessionId, gameStatus } = get();
    if (!gameId || !myPlayerId || !mySessionId || gameStatus !== 'playing') return;
    try {
      const result = await apiCall<GameState>(`/api/games/${gameId}/pass`, 'POST', {
        playerId: myPlayerId,
        sessionId: mySessionId,
      });
      if (result.success && result.data) {
        set({ ...result.data });
        toast.info("You passed your turn.");
      } else {
        toast.error(result.error || "Failed to pass turn.");
      }
    } catch (error) {
      toast.error("An error occurred while passing turn.");
    }
  },
  resignGame: async () => {
    const { gameId, myPlayerId, mySessionId, gameStatus } = get();
    if (!gameId || !myPlayerId || !mySessionId || gameStatus !== 'playing') return;
    try {
      const result = await apiCall<GameState>(`/api/games/${gameId}/resign`, 'POST', {
        playerId: myPlayerId,
        sessionId: mySessionId,
      });
      if (result.success && result.data) {
        set({ ...result.data });
        toast.warning("You have resigned from the game.");
      } else {
        toast.error(result.error || "Failed to resign.");
      }
    } catch (error) {
      toast.error("An error occurred while resigning.");
    }
  },
  sendMessage: async (message: string, channel: 'public' | 'player') => {
    const { gameId, myPlayerId, mySessionId, myObserverId } = get();
    if (!gameId) return;
    let payload: ChatPayload;
    if (myPlayerId && mySessionId) {
      payload = { playerId: myPlayerId, sessionId: mySessionId, message, channel };
    } else if (myObserverId) {
      if (channel !== 'public') {
        toast.error("Observers can only send public messages.");
        return;
      }
      payload = { observerId: myObserverId, message, channel };
    } else {
      toast.error("You are not authorized to send messages.");
      return;
    }
    try {
      const result = await apiCall<GameState>(`/api/games/${gameId}/chat`, 'POST', payload);
      if (result.success && result.data) {
        set({ publicChat: result.data.publicChat, playerChat: result.data.playerChat });
      } else {
        toast.error(result.error || "Failed to send message.");
      }
    } catch (error) {
      toast.error("An error occurred while sending message.");
    }
  },
  togglePlayerChatVisibility: async () => {
    const { gameId, myPlayerId, mySessionId } = get();
    if (!gameId || !myPlayerId || !mySessionId) return;
    try {
      const result = await apiCall<GameState>(`/api/games/${gameId}/chat/toggle-visibility`, 'POST', {
        playerId: myPlayerId,
        sessionId: mySessionId,
      });
      if (result.success && result.data) {
        set({ isPlayerChatVisible: result.data.isPlayerChatVisible });
        toast.success(`Player chat is now ${result.data.isPlayerChatVisible ? 'visible' : 'hidden'} to observers.`);
      } else {
        toast.error(result.error || "Failed to toggle visibility.");
      }
    } catch (error) {
      toast.error("An error occurred while toggling visibility.");
    }
  },
  setHoveredCell: (row, col) => set({ hoveredCell: { row, col } }),
  clearHoveredCell: () => set({ hoveredCell: null }),
}));