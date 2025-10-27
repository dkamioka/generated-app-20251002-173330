import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoBoard } from '@/components/GoBoard';
import { useGameStore } from '@/store/gameStore';
import type { GameState, Stone } from '@shared/types';

// Mock the game store
vi.mock('@/store/gameStore', () => ({
  useGameStore: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('GoBoard Component', () => {
  const mockPlaceStone = vi.fn();
  const mockSetHoveredCell = vi.fn();
  const mockClearHoveredCell = vi.fn();

  const createMockBoard = (size: number): Stone[][] => {
    return Array(size)
      .fill(null)
      .map(() => Array(size).fill(null));
  };

  const defaultStoreState = {
    board: createMockBoard(19),
    boardSize: 19,
    currentPlayer: 'black' as const,
    hoveredCell: null,
    placeStone: mockPlaceStone,
    setHoveredCell: mockSetHoveredCell,
    clearHoveredCell: mockClearHoveredCell,
    myPlayerId: 'player-1',
    players: [
      { id: 'player-1', color: 'black' as const, name: 'Alice' },
      { id: 'player-2', color: 'white' as const, name: 'Bob' },
    ],
    gameStatus: 'playing' as const,
    territory: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as any).mockImplementation((selector: any) =>
      selector(defaultStoreState)
    );
  });

  it('should render 19x19 board by default', () => {
    const { container } = render(<GoBoard />);
    const cells = container.querySelectorAll('[class*="relative flex items-center"]');
    expect(cells.length).toBe(361); // 19x19 = 361
  });

  it('should render 13x13 board', () => {
    const store = {
      ...defaultStoreState,
      boardSize: 13,
      board: createMockBoard(13),
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const cells = container.querySelectorAll('[class*="relative flex items-center"]');
    expect(cells.length).toBe(169); // 13x13 = 169
  });

  it('should render 9x9 board', () => {
    const store = {
      ...defaultStoreState,
      boardSize: 9,
      board: createMockBoard(9),
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const cells = container.querySelectorAll('[class*="relative flex items-center"]');
    expect(cells.length).toBe(81); // 9x9 = 81
  });

  it('should display placed black stones', () => {
    const board = createMockBoard(19);
    board[3][3] = 'black';
    board[15][15] = 'black';

    const store = {
      ...defaultStoreState,
      board,
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const blackStones = container.querySelectorAll('[class*="bg-black"]');
    expect(blackStones.length).toBeGreaterThanOrEqual(2);
  });

  it('should display placed white stones', () => {
    const board = createMockBoard(19);
    board[9][9] = 'white';
    board[10][10] = 'white';

    const store = {
      ...defaultStoreState,
      board,
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const whiteStones = container.querySelectorAll('[class*="bg-white"]');
    expect(whiteStones.length).toBeGreaterThanOrEqual(2);
  });

  it('should call placeStone when empty cell is clicked on player turn', () => {
    const store = {
      ...defaultStoreState,
      currentPlayer: 'black' as const,
      gameStatus: 'playing' as const,
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const cells = container.querySelectorAll('[class*="relative flex items-center"]');

    // Click on cell at position [5][5] (assuming 19x19 board)
    const cellIndex = 5 * 19 + 5; // row * boardSize + col
    fireEvent.click(cells[cellIndex]);

    expect(mockPlaceStone).toHaveBeenCalledWith(5, 5);
  });

  it('should not call placeStone when clicking occupied cell', () => {
    const board = createMockBoard(19);
    board[5][5] = 'black';

    const store = {
      ...defaultStoreState,
      board,
      currentPlayer: 'white' as const,
      myPlayerId: 'player-2',
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const cells = container.querySelectorAll('[class*="relative flex items-center"]');
    const cellIndex = 5 * 19 + 5;

    fireEvent.click(cells[cellIndex]);

    expect(mockPlaceStone).not.toHaveBeenCalled();
  });

  it('should not allow moves when not player turn', () => {
    const store = {
      ...defaultStoreState,
      currentPlayer: 'white' as const,
      myPlayerId: 'player-1', // Black player, but white's turn
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const cells = container.querySelectorAll('[class*="relative flex items-center"]');

    fireEvent.click(cells[100]);

    expect(mockPlaceStone).not.toHaveBeenCalled();
  });

  it('should not allow moves when game is not playing', () => {
    const store = {
      ...defaultStoreState,
      gameStatus: 'finished' as const,
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const cells = container.querySelectorAll('[class*="relative flex items-center"]');

    fireEvent.click(cells[100]);

    expect(mockPlaceStone).not.toHaveBeenCalled();
  });

  it('should call setHoveredCell on mouse enter', () => {
    const { container } = render(<GoBoard />);
    const cells = container.querySelectorAll('[class*="relative flex items-center"]');

    // Hover over cell [3][3]
    const cellIndex = 3 * 19 + 3;
    fireEvent.mouseEnter(cells[cellIndex]);

    expect(mockSetHoveredCell).toHaveBeenCalledWith(3, 3);
  });

  it('should call clearHoveredCell on mouse leave', () => {
    const { container } = render(<GoBoard />);

    fireEvent.mouseLeave(container.firstChild as Element);

    expect(mockClearHoveredCell).toHaveBeenCalled();
  });

  it('should display hover preview for current player color', () => {
    const store = {
      ...defaultStoreState,
      hoveredCell: { row: 9, col: 9 },
      currentPlayer: 'black' as const,
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const hoverPreviews = container.querySelectorAll('[class*="bg-black/70"]');

    expect(hoverPreviews.length).toBeGreaterThan(0);
  });

  it('should render star points on 19x19 board', () => {
    const { container } = render(<GoBoard />);
    const starPoints = container.querySelectorAll('[class*="bg-neon-cyan/50"]');

    // 19x19 board has 9 star points
    expect(starPoints.length).toBe(9);
  });

  it('should render star points on 13x13 board', () => {
    const store = {
      ...defaultStoreState,
      boardSize: 13,
      board: createMockBoard(13),
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const starPoints = container.querySelectorAll('[class*="bg-neon-cyan/50"]');

    // 13x13 board has 5 star points
    expect(starPoints.length).toBe(5);
  });

  it('should render star points on 9x9 board', () => {
    const store = {
      ...defaultStoreState,
      boardSize: 9,
      board: createMockBoard(9),
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const starPoints = container.querySelectorAll('[class*="bg-neon-cyan/50"]');

    // 9x9 board has 5 star points
    expect(starPoints.length).toBe(5);
  });

  it('should display territory markers when game is finished', () => {
    const board = createMockBoard(9);
    const territory = createMockBoard(9);
    territory[0][0] = 'black';
    territory[8][8] = 'white';

    const store = {
      ...defaultStoreState,
      boardSize: 9,
      board,
      territory,
      gameStatus: 'finished' as const,
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const territoryMarkers = container.querySelectorAll('[class*="bg-black/50"], [class*="bg-white/50"]');

    expect(territoryMarkers.length).toBeGreaterThan(0);
  });

  it('should apply cursor pointer only on my turn for empty cells', () => {
    const { container } = render(<GoBoard />);
    const cells = container.querySelectorAll('[class*="cursor-pointer"]');

    // Should have cursor-pointer on empty cells during my turn
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should not apply cursor pointer when not my turn', () => {
    const store = {
      ...defaultStoreState,
      currentPlayer: 'white' as const,
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const cells = container.querySelectorAll('[class*="cursor-pointer"]');

    // No cursor-pointer when it's not my turn
    expect(cells.length).toBe(0);
  });

  it('should handle board with mixed stones', () => {
    const board = createMockBoard(9);
    board[2][2] = 'black';
    board[2][6] = 'black';
    board[6][2] = 'white';
    board[6][6] = 'white';

    const store = {
      ...defaultStoreState,
      boardSize: 9,
      board,
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    const { container } = render(<GoBoard />);
    const blackStones = container.querySelectorAll('[class*="bg-black"]').length;
    const whiteStones = container.querySelectorAll('[class*="bg-white"]').length;

    expect(blackStones).toBeGreaterThanOrEqual(2);
    expect(whiteStones).toBeGreaterThanOrEqual(2);
  });

  it('should render without crashing when observer mode', () => {
    const store = {
      ...defaultStoreState,
      myPlayerId: null, // Observer has no player ID
    };
    (useGameStore as any).mockImplementation((selector: any) => selector(store));

    expect(() => render(<GoBoard />)).not.toThrow();
  });

  it('should apply responsive styling', () => {
    const { container } = render(<GoBoard />);
    const boardElement = container.querySelector('[class*="aspect-square"]');

    expect(boardElement).toBeTruthy();
    expect(boardElement?.className).toContain('max-w-[80vh]');
  });
});
