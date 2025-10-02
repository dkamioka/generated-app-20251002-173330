import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';
import { BoardSize } from '@shared/types';
const getStarPoints = (size: BoardSize): { r: number; c: number }[] => {
  if (size === 19) {
    return [
      { r: 3, c: 3 }, { r: 3, c: 9 }, { r: 3, c: 15 },
      { r: 9, c: 3 }, { r: 9, c: 9 }, { r: 9, c: 15 },
      { r: 15, c: 3 }, { r: 15, c: 9 }, { r: 15, c: 15 },
    ];
  }
  if (size === 13) {
    return [
      { r: 3, c: 3 }, { r: 3, c: 9 }, { r: 6, c: 6 },
      { r: 9, c: 3 }, { r: 9, c: 9 },
    ];
  }
  if (size === 9) {
    return [
      { r: 2, c: 2 }, { r: 2, c: 6 }, { r: 4, c: 4 },
      { r: 6, c: 2 }, { r: 6, c: 6 },
    ];
  }
  return [];
};
export function GoBoard() {
  const {
    board,
    boardSize,
    currentPlayer,
    hoveredCell,
    placeStone,
    setHoveredCell,
    clearHoveredCell,
    myPlayerId,
    players,
    gameStatus,
    territory,
  } = useGameStore(
    useShallow((s) => ({
      board: s.board,
      boardSize: s.boardSize || 19,
      currentPlayer: s.currentPlayer,
      hoveredCell: s.hoveredCell,
      placeStone: s.placeStone,
      setHoveredCell: s.setHoveredCell,
      clearHoveredCell: s.clearHoveredCell,
      myPlayerId: s.myPlayerId,
      players: s.players,
      gameStatus: s.gameStatus,
      territory: s.territory,
    }))
  );
  const myColor = players.find(p => p.id === myPlayerId)?.color;
  const isMyTurn = myColor === currentPlayer && gameStatus === 'playing';
  const starPoints = getStarPoints(boardSize);
  const handleCellClick = (row: number, col: number) => {
    if (isMyTurn && board[row]?.[col] === null) {
      placeStone(row, col);
    }
  };
  return (
    <div
      className="relative aspect-square w-full max-w-[80vh] bg-[#1a1a1a] rounded-md shadow-lg"
      style={{
        padding: `calc(100% / (2 * ${boardSize}))`,
        boxShadow: 'inset 0 0 15px rgba(0,0,0,0.8), 0 0 10px rgba(0, 255, 255, 0.1)',
      }}
      onMouseLeave={clearHoveredCell}
    >
      <div
        className="grid w-full h-full"
        style={{
          gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
          gridTemplateRows: `repeat(${boardSize}, 1fr)`,
        }}
      >
        {Array.from({ length: boardSize * boardSize }).map((_, i) => {
          const row = Math.floor(i / boardSize);
          const col = i % boardSize;
          const stone = board[row]?.[col];
          const territoryOwner = territory?.[row]?.[col];
          const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
          const isStarPoint = starPoints.some(p => p.r === row && p.c === col);
          return (
            <div
              key={`${row}-${col}`}
              className={cn(
                "relative flex items-center justify-center",
                "before:content-[''] before:absolute before:bg-neon-cyan/20 before:w-full before:h-[1px] before:top-1/2 before:-translate-y-1/2",
                "after:content-[''] after:absolute after:bg-neon-cyan/20 after:h-full after:w-[1px] after:left-1/2 after:-translate-x-1/2",
                isMyTurn && !stone ? "cursor-pointer" : ""
              )}
              onMouseEnter={() => setHoveredCell(row, col)}
              onClick={() => handleCellClick(row, col)}
            >
              {isStarPoint && (
                <div className="absolute h-1.5 w-1.5 rounded-full bg-neon-cyan/50 z-10" />
              )}
              {stone && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'absolute h-[95%] w-[95%] rounded-full z-20',
                    stone === 'black' ? 'bg-black' : 'bg-white',
                  )}
                  style={{
                    boxShadow: stone === 'black'
                      ? 'inset 2px 2px 5px rgba(255,255,255,0.3), inset -2px -2px 5px rgba(0,0,0,0.8)'
                      : 'inset 2px 2px 5px rgba(255,255,255,1), inset -2px -2px 5px rgba(0,0,0,0.4)',
                  }}
                />
              )}
              {isHovered && !stone && isMyTurn && (
                <div
                  className={cn(
                    'absolute h-[95%] w-[95%] rounded-full transition-opacity duration-100 z-20',
                    currentPlayer === 'black' ? 'bg-black/70' : 'bg-white/70',
                  )}
                />
              )}
              {gameStatus === 'finished' && territoryOwner && territoryOwner !== 'dame' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className={cn(
                    'absolute h-1/2 w-1/2 z-10',
                    territoryOwner === 'black' ? 'bg-black/50' : 'bg-white/50'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}