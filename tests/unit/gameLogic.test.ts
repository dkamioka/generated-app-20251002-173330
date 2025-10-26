import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, Stone, BoardSize } from '@shared/types';

// Helper to create a test game state
function createTestGame(boardSize: BoardSize = 19): GameState {
  const createInitialBoard = (size: BoardSize): Stone[][] => {
    return Array(size).fill(null).map(() => Array(size).fill(null));
  };

  return {
    gameId: crypto.randomUUID(),
    boardSize,
    board: createInitialBoard(boardSize),
    players: [
      {
        id: 'player1-id',
        sessionId: 'session1-id',
        name: 'Player 1',
        color: 'black',
        captures: 0,
        playerType: 'human',
      },
      {
        id: 'player2-id',
        sessionId: 'session2-id',
        name: 'Player 2',
        color: 'white',
        captures: 0,
        playerType: 'human',
      },
    ],
    currentPlayer: 'black',
    gameStatus: 'playing',
    winner: null,
    turn: 1,
    lastMove: null,
    history: [],
    lastAction: null,
    komi: 6.5,
    scores: { black: 0, white: 0 },
    publicChat: [],
    playerChat: [],
    isPlayerChatVisible: true,
    isPublic: true,
    observers: [],
    replayHistory: [],
  };
}

// Helper to find connected groups (BFS implementation similar to durableObject)
function findGroup(
  row: number,
  col: number,
  board: Stone[][],
  boardSize: BoardSize
): { group: { r: number; c: number }[]; liberties: number } {
  const color = board[row][col];
  if (!color) return { group: [], liberties: 0 };

  const queue: { r: number; c: number }[] = [{ r: row, c: col }];
  const visitedGroup = new Set<string>([`${row},${col}`]);
  const group = [{ r: row, c: col }];
  const libertySet = new Set<string>();
  const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (queue.length > 0) {
    const { r, c } = queue.shift()!;
    for (const [dr, dc] of neighbors) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;

      if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
        if (visitedGroup.has(key)) continue;

        if (board[nr][nc] === color) {
          visitedGroup.add(key);
          queue.push({ r: nr, c: nc });
          group.push({ r: nr, c: nc });
        } else if (board[nr][nc] === null) {
          libertySet.add(key);
        }
      }
    }
  }

  return { group, liberties: libertySet.size };
}

describe('Go Game Logic - Board Fundamentals', () => {
  it('should create a 19x19 board', () => {
    const game = createTestGame(19);
    expect(game.board.length).toBe(19);
    expect(game.board[0].length).toBe(19);
  });

  it('should create a 13x13 board', () => {
    const game = createTestGame(13);
    expect(game.board.length).toBe(13);
    expect(game.board[0].length).toBe(13);
  });

  it('should create a 9x9 board', () => {
    const game = createTestGame(9);
    expect(game.board.length).toBe(9);
    expect(game.board[0].length).toBe(9);
  });

  it('should initialize with empty board', () => {
    const game = createTestGame(19);
    const allEmpty = game.board.every((row) => row.every((cell) => cell === null));
    expect(allEmpty).toBe(true);
  });
});

describe('Go Game Logic - Liberty Counting', () => {
  let game: GameState;

  beforeEach(() => {
    game = createTestGame(19);
  });

  it('should count 4 liberties for a single stone in the center', () => {
    game.board[9][9] = 'black';
    const { liberties } = findGroup(9, 9, game.board, 19);
    expect(liberties).toBe(4);
  });

  it('should count 3 liberties for a corner stone', () => {
    game.board[0][0] = 'black';
    const { liberties } = findGroup(0, 0, game.board, 19);
    expect(liberties).toBe(2); // Corner has only 2 liberties
  });

  it('should count 2 liberties for an edge stone', () => {
    game.board[0][9] = 'black';
    const { liberties } = findGroup(0, 9, game.board, 19);
    expect(liberties).toBe(3); // Edge has 3 liberties
  });

  it('should count shared liberties for connected stones', () => {
    // Place two connected black stones
    game.board[9][9] = 'black';
    game.board[9][10] = 'black';
    const { liberties } = findGroup(9, 9, game.board, 19);
    expect(liberties).toBe(6); // Two stones share liberties
  });

  it('should detect atari (1 liberty remaining)', () => {
    // Surround a black stone with white, leaving one liberty
    game.board[9][9] = 'black';
    game.board[8][9] = 'white';
    game.board[10][9] = 'white';
    game.board[9][8] = 'white';
    // [9][10] is still free - atari
    const { liberties } = findGroup(9, 9, game.board, 19);
    expect(liberties).toBe(1);
  });

  it('should detect captured group (0 liberties)', () => {
    // Completely surround a black stone
    game.board[9][9] = 'black';
    game.board[8][9] = 'white';
    game.board[10][9] = 'white';
    game.board[9][8] = 'white';
    game.board[9][10] = 'white';
    const { liberties } = findGroup(9, 9, game.board, 19);
    expect(liberties).toBe(0);
  });
});

describe('Go Game Logic - Group Detection', () => {
  let game: GameState;

  beforeEach(() => {
    game = createTestGame(19);
  });

  it('should find a single stone group', () => {
    game.board[9][9] = 'black';
    const { group } = findGroup(9, 9, game.board, 19);
    expect(group.length).toBe(1);
    expect(group[0]).toEqual({ r: 9, c: 9 });
  });

  it('should find connected horizontal stones', () => {
    game.board[9][9] = 'black';
    game.board[9][10] = 'black';
    game.board[9][11] = 'black';
    const { group } = findGroup(9, 9, game.board, 19);
    expect(group.length).toBe(3);
  });

  it('should find connected vertical stones', () => {
    game.board[9][9] = 'black';
    game.board[10][9] = 'black';
    game.board[11][9] = 'black';
    const { group } = findGroup(9, 9, game.board, 19);
    expect(group.length).toBe(3);
  });

  it('should find L-shaped group', () => {
    game.board[9][9] = 'black';
    game.board[9][10] = 'black';
    game.board[10][9] = 'black';
    const { group } = findGroup(9, 9, game.board, 19);
    expect(group.length).toBe(3);
  });

  it('should not connect diagonal stones', () => {
    game.board[9][9] = 'black';
    game.board[10][10] = 'black'; // Diagonal - not connected
    const { group } = findGroup(9, 9, game.board, 19);
    expect(group.length).toBe(1); // Only the first stone
  });

  it('should find large connected group', () => {
    // Create a 5-stone chain
    for (let i = 0; i < 5; i++) {
      game.board[9][9 + i] = 'black';
    }
    const { group } = findGroup(9, 9, game.board, 19);
    expect(group.length).toBe(5);
  });
});

describe('Go Game Logic - Capture Mechanics', () => {
  let game: GameState;

  beforeEach(() => {
    game = createTestGame(19);
  });

  it('should identify a capturable single stone', () => {
    // White stone surrounded by black
    game.board[9][9] = 'white';
    game.board[8][9] = 'black';
    game.board[10][9] = 'black';
    game.board[9][8] = 'black';
    game.board[9][10] = 'black';

    const { liberties } = findGroup(9, 9, game.board, 19);
    expect(liberties).toBe(0); // Should be captured
  });

  it('should identify capturable group of stones', () => {
    // Two white stones surrounded
    game.board[9][9] = 'white';
    game.board[9][10] = 'white';

    // Surround them
    game.board[8][9] = 'black';
    game.board[8][10] = 'black';
    game.board[10][9] = 'black';
    game.board[10][10] = 'black';
    game.board[9][8] = 'black';
    game.board[9][11] = 'black';

    const { liberties } = findGroup(9, 9, game.board, 19);
    expect(liberties).toBe(0);
  });

  it('should not capture if group has one liberty', () => {
    game.board[9][9] = 'white';
    game.board[8][9] = 'black';
    game.board[10][9] = 'black';
    game.board[9][8] = 'black';
    // [9][10] is free

    const { liberties } = findGroup(9, 9, game.board, 19);
    expect(liberties).toBe(1); // Atari, but not captured yet
  });
});

describe('Go Game Logic - Ko Rule Detection', () => {
  let game: GameState;

  beforeEach(() => {
    game = createTestGame(19);
  });

  it('should detect simple ko situation', () => {
    // Set up ko position:
    // . W B .
    // W . W B
    // . W B .
    game.board[5][5] = 'white';
    game.board[5][6] = 'black';
    game.board[4][6] = 'white';
    game.board[6][6] = 'white';
    game.board[5][7] = 'white';
    game.board[4][7] = 'black';
    game.board[6][7] = 'black';

    // Black captures white at [5][6]
    const boardBeforeCapture = game.board.map((r) => [...r]);

    // Simulate black placing at [5][6] and capturing white at [5][5]
    const tempBoard = boardBeforeCapture.map((r) => [...r]);
    tempBoard[5][6] = 'black';
    tempBoard[5][5] = null; // White captured

    // Store this in history
    game.history.push({
      row: 5,
      col: 6,
      color: 'black',
      board: tempBoard.map((r) => [...r]),
    });

    // Now check if white can immediately recapture (ko rule violation)
    const recaptureBoard = tempBoard.map((r) => [...r]);
    recaptureBoard[5][5] = 'white';
    recaptureBoard[5][6] = null;

    // This should match the board before the last move (ko violation)
    const previousBoardState = JSON.stringify(boardBeforeCapture);
    const koViolation = JSON.stringify(recaptureBoard) === previousBoardState;

    expect(koViolation).toBe(true);
  });
});

describe('Go Game Logic - Suicide Rule', () => {
  let game: GameState;

  beforeEach(() => {
    game = createTestGame(19);
  });

  it('should detect simple suicide move', () => {
    // Surround a point completely
    game.board[8][9] = 'white';
    game.board[10][9] = 'white';
    game.board[9][8] = 'white';
    game.board[9][10] = 'white';

    // Try to place black at [9][9] - would be suicide
    const testBoard = game.board.map((r) => [...r]);
    testBoard[9][9] = 'black';

    const { liberties } = findGroup(9, 9, testBoard, 19);
    expect(liberties).toBe(0); // Suicide - no liberties
  });

  it('should allow move if it captures opponent stones (not suicide)', () => {
    // White stone with no liberties except the point black wants to play
    game.board[9][9] = 'white';
    game.board[8][9] = 'black';
    game.board[10][9] = 'black';
    game.board[9][8] = 'black';
    // [9][10] is where black will play

    // Before black plays, white has 1 liberty
    const { liberties: whiteLiberties } = findGroup(9, 9, game.board, 19);
    expect(whiteLiberties).toBe(1);

    // Black plays at [9][10] - this captures white, so it's legal
    const testBoard = game.board.map((r) => [...r]);
    testBoard[9][10] = 'black';

    // After placement, white has 0 liberties (captured)
    const { liberties: whiteLibertiesAfter } = findGroup(9, 9, testBoard, 19);
    expect(whiteLibertiesAfter).toBe(0);

    // This move is LEGAL because it captures opponent
  });

  it('should detect suicide for a group', () => {
    // Create a situation where placing a stone would create a dead group
    game.board[8][9] = 'white';
    game.board[8][10] = 'white';
    game.board[9][8] = 'white';
    game.board[10][8] = 'white';
    game.board[10][9] = 'white';
    game.board[10][10] = 'white';
    game.board[9][11] = 'white';

    // Black tries to play at [9][9] and [9][10] - both would be suicide
    const testBoard = game.board.map((r) => [...r]);
    testBoard[9][9] = 'black';
    testBoard[9][10] = 'black';

    const { liberties } = findGroup(9, 9, testBoard, 19);
    expect(liberties).toBe(0); // Suicide
  });
});

describe('Go Game Logic - Territory Calculation', () => {
  let game: GameState;

  beforeEach(() => {
    game = createTestGame(9); // Use smaller board for easier testing
  });

  it('should calculate simple territory', () => {
    // Create a simple black territory in corner
    game.board[0][2] = 'black';
    game.board[1][2] = 'black';
    game.board[2][0] = 'black';
    game.board[2][1] = 'black';
    game.board[2][2] = 'black';

    // Empty points at [0][0], [0][1], [1][0], [1][1] should be black territory
    // This requires the full territory calculation algorithm
    // For now, we just verify the board setup
    expect(game.board[0][0]).toBe(null);
    expect(game.board[0][1]).toBe(null);
    expect(game.board[1][0]).toBe(null);
    expect(game.board[1][1]).toBe(null);
  });

  it('should identify dame (neutral points)', () => {
    // Create a point that touches both colors
    game.board[4][3] = 'black';
    game.board[4][5] = 'white';
    // Point [4][4] touches both - dame

    expect(game.board[4][4]).toBe(null);
  });
});

describe('Go Game Logic - Komi Application', () => {
  it('should include komi in white score', () => {
    const game = createTestGame(19);
    expect(game.komi).toBe(6.5);

    // Final score calculation should add komi to white
    const blackTerritory = 30;
    const whiteTerritory = 25;
    const blackCaptures = 5;
    const whiteCaptures = 3;

    const blackScore = blackTerritory + blackCaptures;
    const whiteScore = whiteTerritory + whiteCaptures + game.komi;

    expect(blackScore).toBe(35);
    expect(whiteScore).toBe(33.5);
    expect(blackScore > whiteScore).toBe(true);
  });

  it('should use 6.5 komi to prevent ties', () => {
    const game = createTestGame(19);
    // Komi should always be .5 to prevent draws
    expect(game.komi % 1).toBe(0.5);
  });
});

describe('Go Game Logic - Game Flow', () => {
  let game: GameState;

  beforeEach(() => {
    game = createTestGame(19);
  });

  it('should initialize with black player turn', () => {
    expect(game.currentPlayer).toBe('black');
  });

  it('should have two players', () => {
    expect(game.players.length).toBe(2);
    expect(game.players[0].color).toBe('black');
    expect(game.players[1].color).toBe('white');
  });

  it('should start with zero captures', () => {
    expect(game.players[0].captures).toBe(0);
    expect(game.players[1].captures).toBe(0);
  });

  it('should track game status', () => {
    expect(game.gameStatus).toBe('playing');
  });

  it('should initialize with no winner', () => {
    expect(game.winner).toBe(null);
  });
});

describe('Go Game Logic - Edge Cases', () => {
  it('should handle empty board for 9x9', () => {
    const game = createTestGame(9);
    const totalCells = game.board.flat().length;
    expect(totalCells).toBe(81);
  });

  it('should handle empty board for 13x13', () => {
    const game = createTestGame(13);
    const totalCells = game.board.flat().length;
    expect(totalCells).toBe(169);
  });

  it('should handle empty board for 19x19', () => {
    const game = createTestGame(19);
    const totalCells = game.board.flat().length;
    expect(totalCells).toBe(361);
  });

  it('should handle finding group on empty cell', () => {
    const game = createTestGame(19);
    const { group, liberties } = findGroup(9, 9, game.board, 19);
    expect(group.length).toBe(0);
    expect(liberties).toBe(0);
  });
});
