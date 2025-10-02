import { create } from 'zustand';
import { GameState, Stone, Player, ChatMessage, GameEvent, ApiResponse, BoardSize, LastAction } from '@shared/types';
import { produce } from 'immer';
import { toast } from 'sonner';
const createInitialBoard = (boardSize: BoardSize): Stone[][] => {
  return Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
};
interface ReplayState {
  originalGame: GameState | null;
  currentReplayState: Partial<GameState>;
  currentEventIndex: number;
  isPlaying: boolean;
  error: string | null;
  fetchAndInitializeReplay: (gameId: string) => Promise<void>;
  goToEvent: (index: number) => void;
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  reset: () => void;
}
export const useReplayStore = create<ReplayState>((set, get) => ({
  originalGame: null,
  currentReplayState: {
    boardSize: 19,
    board: createInitialBoard(19),
    players: [],
    publicChat: [],
    playerChat: [],
    turn: 1,
    currentPlayer: 'black',
  },
  currentEventIndex: -1,
  isPlaying: false,
  error: null,
  fetchAndInitializeReplay: async (gameId: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      const result: ApiResponse<GameState> = await response.json();
      if (result.success && result.data) {
        set({ originalGame: result.data, error: null });
        get().goToEvent(-1); // Initialize to state before first event
      } else {
        throw new Error(result.error || 'Failed to fetch game replay data.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      set({ error: errorMessage });
      toast.error(`Error fetching replay: ${errorMessage}`);
    }
  },
  goToEvent: (index: number) => {
    const { originalGame } = get();
    if (!originalGame) return;
    if (index < -1 || index >= originalGame.replayHistory.length) {
      console.warn(`Invalid event index: ${index}`);
      return;
    }
    let baseState: GameState = produce(originalGame, draft => {
      draft.board = createInitialBoard(originalGame.boardSize);
      draft.players = [];
      draft.publicChat = [];
      draft.playerChat = [];
      draft.turn = 1;
      draft.currentPlayer = 'black';
      draft.gameStatus = 'waiting';
      draft.observers = [];
      draft.winner = null;
      draft.scores = { black: 0, white: 0 };
      draft.territory = undefined;
      draft.lastAction = null;
    });
    let moveCounter = 0;
    const targetState = originalGame.replayHistory.slice(0, index + 1).reduce((state, event) => {
      return produce(state, draft => {
        const payload = event.payload;
        switch (payload.type) {
          case 'GAME_CREATE':
            draft.players.push(payload.player);
            draft.boardSize = payload.boardSize;
            draft.board = createInitialBoard(payload.boardSize);
            break;
          case 'PLAYER_JOIN':
            draft.players.push(payload.player);
            draft.gameStatus = 'playing';
            break;
          case 'OBSERVER_JOIN':
            draft.observers.push(payload.observer);
            break;
          case 'MOVE': {
            const moveRecord = originalGame.history[moveCounter];
            if (moveRecord) {
              draft.board = moveRecord.board;
            }
            draft.currentPlayer = payload.playerColor === 'black' ? 'white' : 'black';
            draft.turn += 1;
            draft.lastAction = 'move';
            moveCounter++;
            break;
          }
          case 'PASS':
            if (draft.lastAction === 'pass') {
              draft.gameStatus = 'finished';
            }
            draft.currentPlayer = payload.playerColor === 'black' ? 'white' : 'black';
            draft.turn += 1;
            draft.lastAction = 'pass';
            break;
          case 'RESIGN':
            draft.gameStatus = 'finished';
            draft.winner = payload.playerColor === 'black' ? 'white' : 'black';
            break;
          case 'CHAT_MESSAGE':
            if (payload.channel === 'public') {
              draft.publicChat.push(payload.message);
            } else {
              draft.playerChat.push(payload.message);
            }
            break;
          case 'VISIBILITY_TOGGLE':
            draft.isPlayerChatVisible = payload.isVisible;
            break;
        }
      });
    }, baseState);
    // If the game is finished at the current event, show final score and territory.
    // This now correctly handles games ending by resignation OR consecutive passes.
    if (targetState.gameStatus === 'finished') {
      targetState.scores = originalGame.scores;
      targetState.territory = originalGame.territory;
      targetState.winner = originalGame.winner;
    }
    set({ currentReplayState: targetState, currentEventIndex: index });
  },
  play: () => {
    set({ isPlaying: true });
    const tick = () => {
      const { isPlaying, currentEventIndex, originalGame } = get();
      if (isPlaying && originalGame && currentEventIndex < originalGame.replayHistory.length - 1) {
        get().stepForward();
        setTimeout(tick, 1000);
      } else {
        set({ isPlaying: false });
      }
    };
    setTimeout(tick, 1000);
  },
  pause: () => set({ isPlaying: false }),
  stepForward: () => {
    const { currentEventIndex, originalGame } = get();
    if (originalGame && currentEventIndex < originalGame.replayHistory.length - 1) {
      get().goToEvent(currentEventIndex + 1);
    } else {
      set({ isPlaying: false });
    }
  },
  stepBackward: () => {
    const { currentEventIndex } = get();
    if (currentEventIndex > -1) {
      get().goToEvent(currentEventIndex - 1);
    }
  },
  reset: () => {
    get().goToEvent(-1);
    set({ isPlaying: false });
  },
}));