import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { GoBoard } from '@/components/GoBoard';
import { GamePanel } from '@/components/GamePanel';
import { ChatPanel } from '@/components/ChatPanel';
import { MobileGameDrawer } from '@/components/MobileGameDrawer';
import { ArrowLeft, Loader, Trophy, History } from 'lucide-react';
import { Toaster, toast } from '@/components/ui/sonner';
import { useShallow } from 'zustand/react/shallow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { LastAction } from '@shared/types';
import { RankedGameResult } from '@/components/RankedGameResult';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [isInitialLoading, setInitialLoading] = useState(true);
  const [showRankedResult, setShowRankedResult] = useState(false);
  const isMobile = useIsMobile();
  const lastActionRef = useRef<LastAction>(null);
  const turnRef = useRef<number>(0);
  const {
    fetchGame,
    gameStatus,
    error,
    loadSession,
    winner,
    players,
    scores,
    myPlayerId,
    lastAction,
    turn,
    currentPlayer,
    game,
  } = useGameStore(
    useShallow((state) => ({
      fetchGame: state.fetchGame,
      gameStatus: state.gameStatus,
      error: state.error,
      loadSession: state.loadSession,
      winner: state.winner,
      players: state.players,
      scores: state.scores,
      myPlayerId: state.myPlayerId,
      lastAction: state.lastAction,
      turn: state.turn,
      currentPlayer: state.currentPlayer,
      game: state.game,
    }))
  );
  useEffect(() => {
    if (gameId) {
      loadSession(gameId);
      const initialFetch = async () => {
        setInitialLoading(true);
        const success = await fetchGame(gameId);
        if (!success) {
          toast.error("Game not found. Returning to lobby.");
          navigate('/');
        } else {
          // Initialize refs after first successful fetch
          const gameState = useGameStore.getState();
          lastActionRef.current = gameState.lastAction;
          turnRef.current = gameState.turn;
        }
        setInitialLoading(false);
      };
      initialFetch();
      const interval = setInterval(() => {
        if (useGameStore.getState().gameStatus !== 'finished') {
          fetchGame(gameId);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [gameId, fetchGame, navigate, loadSession]);
  useEffect(() => {
    const myColor = players.find(p => p.id === myPlayerId)?.color;
    // Check if it's now my turn, the game is playing, the last action was a pass, and the turn number has increased.
    if (
      myColor &&
      currentPlayer === myColor &&
      gameStatus === 'playing' &&
      lastAction === 'pass' &&
      turn > turnRef.current
    ) {
      const opponent = players.find(p => p.color !== myColor);
      toast.info(`${opponent?.name || 'Opponent'} has passed their turn.`);
    }
    // Update refs after processing
    lastActionRef.current = lastAction;
    turnRef.current = turn;
  }, [lastAction, turn, currentPlayer, myPlayerId, players, gameStatus]);
  const winnerPlayer = players.find(p => p.color === winner);
  if (isInitialLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-pixel text-neon-cyan">
        <Loader className="animate-spin h-12 w-12 mb-4" />
        <p className="text-2xl">Loading Game...</p>
      </div>
    );
  }
  if (error && !gameStatus) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-pixel text-red-500">
        <h2 className="text-3xl mb-4">Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="retro-btn mt-8">
          Back to Lobby
        </button>
      </div>
    );
  }
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-pixel relative overflow-hidden">
      <Toaster richColors theme="dark" />
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 retro-btn flex items-center gap-2 z-20"
      >
        <ArrowLeft size={20} /> Lobby
      </button>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="crt-monitor">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="hidden lg:flex lg:col-span-4 items-center justify-center">
              <GamePanel />
            </div>
            <div className="lg:col-span-8 flex items-center justify-center">
              <GoBoard />
            </div>
          </div>
        </div>
      </motion.div>
      <div className="absolute top-1/2 -translate-y-1/2 right-4 lg:right-8 xl:right-16 z-20 hidden lg:block h-[70vh]">
        <ChatPanel />
      </div>
      {isMobile && <MobileGameDrawer />}

      {/* Ranked Game Result Dialog */}
      {game?.isRanked && gameStatus === 'finished' && winner && game.rankedGameProcessed && (
        <RankedGameResult
          isOpen={true}
          winner={winner}
          myColor={players.find(p => p.id === myPlayerId)?.color || 'black'}
          myRatingBefore={
            players.find(p => p.id === myPlayerId)?.color === 'black'
              ? game.player1RatingBefore || 1200
              : game.player2RatingBefore || 1200
          }
          myRatingAfter={
            players.find(p => p.id === myPlayerId)?.color === 'black'
              ? game.player1RatingAfter || 1200
              : game.player2RatingAfter || 1200
          }
          opponentRatingBefore={
            players.find(p => p.id === myPlayerId)?.color === 'black'
              ? game.player2RatingBefore || 1200
              : game.player1RatingBefore || 1200
          }
          opponentRatingAfter={
            players.find(p => p.id === myPlayerId)?.color === 'black'
              ? game.player2RatingAfter || 1200
              : game.player1RatingAfter || 1200
          }
          onClose={() => {}}
        />
      )}

      {/* Regular Game Over Dialog (non-ranked games) */}
      {(!game?.isRanked || !game?.rankedGameProcessed) && (
        <Dialog open={gameStatus === 'finished'}>
          <DialogContent className="bg-black border-neon-green text-white font-pixel">
            <DialogHeader className="items-center">
              <Trophy className="h-16 w-16 text-neon-green text-glow-green mb-4" />
              <DialogTitle className="text-4xl text-glow-green">GAME OVER</DialogTitle>
              <DialogDescription className="text-gray-400 font-mono text-lg">
                {winnerPlayer ? `Winner is ${winnerPlayer.name}!` : 'The game has ended.'}
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 font-mono text-center space-y-2">
              <p className="text-xl">Final Score</p>
              <p className="text-white">Black: <span className="text-glow-cyan">{scores.black.toFixed(1)}</span></p>
              <p className="text-white">White: <span className="text-glow-cyan">{scores.white.toFixed(1)}</span></p>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => navigate(`/replay/${gameId}`)} className="retro-btn border-neon-magenta text-neon-magenta w-full flex items-center justify-center gap-2">
                <History size={16} /> View Replay
              </button>
              <button onClick={() => navigate('/')} className="retro-btn w-full">
                Return to Lobby
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}