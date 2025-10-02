import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { User, Shield, Swords, Hourglass, Trophy, LayoutGrid, Eye, Cpu } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import type { Player } from '@shared/types';
import { ScrollArea } from '@/components/ui/scroll-area';
interface PlayerInfoProps {
  player: Player;
  isCurrent: boolean;
  score: number;
}
const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, isCurrent, score }) => (
  <motion.div
    className={cn(
      'border-2 p-4 rounded-lg transition-all duration-300 relative overflow-hidden',
      isCurrent ? 'border-neon-cyan bg-neon-cyan/10' : 'border-gray-700 bg-gray-900/50'
    )}
    animate={{
      boxShadow: isCurrent ? ['none', '0 0 15px #00ffff', 'none'] : 'none'
    }}
    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
  >
    <div className="flex items-center space-x-4">
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center',
        player.color === 'black' ? 'bg-black border-2 border-gray-500' : 'bg-white border-2 border-gray-300'
      )}>
        {player.playerType === 'ai' ? (
          <Cpu className={cn(player.color === 'black' ? 'text-neon-magenta' : 'text-neon-magenta')} size={20} />
        ) : (
          <User className={cn(player.color === 'black' ? 'text-white' : 'text-black')} size={20} />
        )}
      </div>
      <div>
        <h3 className="font-pixel text-2xl text-glow-cyan flex items-center gap-2">
          {player.name}
          {player.playerType === 'ai' && <Cpu size={16} className="text-neon-magenta" />}
        </h3>
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          {player.color} player
        </p>
      </div>
    </div>
    <div className="mt-4 flex justify-between items-center">
      <div className="flex items-center space-x-2" title="Captures">
        <Shield size={18} className="text-neon-magenta" />
        <span className="text-lg font-mono text-glow-magenta">{player.captures}</span>
      </div>
      <div className="flex items-center space-x-2" title="Total Score">
        <LayoutGrid size={18} className="text-neon-green" />
        <span className="text-lg font-mono text-glow-green">{score.toFixed(1)}</span>
      </div>
    </div>
  </motion.div>
);
export function GamePanel() {
  const { players, currentPlayer, turn, gameStatus, passTurn, resignGame, myPlayerId, winner, scores, observers } = useGameStore(
    useShallow((s) => ({
      players: s.players,
      currentPlayer: s.currentPlayer,
      turn: s.turn,
      gameStatus: s.gameStatus,
      passTurn: s.passTurn,
      resignGame: s.resignGame,
      myPlayerId: s.myPlayerId,
      winner: s.winner,
      scores: s.scores,
      observers: s.observers,
    }))
  );
  const myColor = players.find(p => p.id === myPlayerId)?.color;
  const isMyTurn = myColor === currentPlayer && gameStatus === 'playing';
  const isPlayer = !!myPlayerId;
  const winnerPlayer = players.find(p => p.color === winner);
  const blackPlayer = players.find(p => p.color === 'black');
  const whitePlayer = players.find(p => p.color === 'white');
  return (
    <div className="w-full max-w-sm space-y-6 p-4">
      <div className="text-center">
        <h2 className="font-pixel text-5xl text-glow-cyan">KIDO</h2>
        <p className="text-neon-magenta animate-pulse">The Retro Go Arena</p>
      </div>
      {gameStatus === 'playing' && (
        <div className="flex items-center justify-center space-x-4">
          <Swords className="text-neon-green" />
          <p className="font-pixel text-3xl text-glow-green">TURN: {turn}</p>
        </div>
      )}
      {gameStatus === 'waiting' && (
        <div className="flex items-center justify-center space-x-4 p-4 bg-black/50 border border-dashed border-neon-magenta">
          <Hourglass className="text-neon-magenta animate-spin" />
          <p className="font-pixel text-2xl text-glow-magenta">WAITING FOR OPPONENT</p>
        </div>
      )}
      {gameStatus === 'finished' && winnerPlayer && (
        <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-black/50 border border-neon-green">
          <Trophy className="text-neon-green h-8 w-8" />
          <p className="font-pixel text-2xl text-glow-green">WINNER</p>
          <p className="font-pixel text-3xl text-white">{winnerPlayer.name}</p>
        </div>
      )}
      <div className="space-y-4">
        {blackPlayer && <PlayerInfo player={blackPlayer} isCurrent={blackPlayer.color === currentPlayer && gameStatus === 'playing'} score={scores.black} />}
        {whitePlayer && <PlayerInfo player={whitePlayer} isCurrent={whitePlayer.color === currentPlayer && gameStatus === 'playing'} score={scores.white} />}
        {players.length < 2 && gameStatus === 'waiting' && (
          <div className="border-2 border-dashed border-gray-700 p-4 rounded-lg text-center text-gray-500">
            <p>Awaiting Player 2...</p>
          </div>
        )}
      </div>
      {isPlayer && (
        <div className="grid grid-cols-2 gap-4 pt-4">
          <button
            onClick={passTurn}
            className="retro-btn border-neon-magenta text-neon-magenta disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isMyTurn}
          >
            Pass
          </button>
          <button
            onClick={resignGame}
            className="retro-btn border-red-500 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={gameStatus !== 'playing'}
          >
            Resign
          </button>
        </div>
      )}
      {observers && observers.length > 0 && (
        <div className="pt-4">
          <h4 className="font-pixel text-xl text-glow-cyan flex items-center gap-2 mb-2">
            <Eye size={20} /> Observers ({observers.length})
          </h4>
          <ScrollArea className="h-24 bg-black/30 p-2 border border-neon-cyan/20 rounded-md">
            {observers.map(obs => (
              <p key={obs.id} className="text-gray-300 font-mono text-sm truncate">{obs.name}</p>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}