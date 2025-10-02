import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Hourglass, Users, Eye, ArrowLeft, Gamepad2, Tv2, History } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useShallow } from 'zustand/react/shallow';
import type { UserGameSummary, ApiResponse } from '@shared/types';
import { cn } from '@/lib/utils';
export function ProfilePage() {
  const [games, setGames] = useState<UserGameSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, loadUserProfile } = useUserStore(useShallow(s => ({
    user: s.user,
    isAuthenticated: s.isAuthenticated,
    loadUserProfile: s.loadUserProfile,
  })));
  useEffect(() => {
    loadUserProfile();
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, loadUserProfile, navigate]);
  const fetchUserGames = useCallback(async () => {
    if (!user?.name) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/games?userName=${encodeURIComponent(user.name)}`);
      const result: ApiResponse<UserGameSummary[]> = await response.json();
      if (result.success && result.data) {
        setGames(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch your games.');
      }
    } catch (err) {
      setError('An error occurred while connecting to the server.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.name]);
  useEffect(() => {
    if (user?.name) {
      fetchUserGames();
    }
  }, [user, fetchUserGames]);
  const handleRejoin = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };
  const handleReplay = (gameId: string) => {
    navigate(`/replay/${gameId}`);
  };
  const renderGameAction = (game: UserGameSummary) => {
    if (game.gameStatus === 'finished') {
      return (
        <button
          onClick={() => handleReplay(game.gameId)}
          className="retro-btn border-neon-magenta text-neon-magenta w-full flex items-center justify-center gap-2"
        >
          <History size={16} /> Replay
        </button>
      );
    }
    return (
      <button
        onClick={() => handleRejoin(game.gameId)}
        className="retro-btn border-neon-green text-neon-green w-full flex items-center justify-center gap-2"
      >
        {game.role === 'player' ? <><Gamepad2 size={16} /> Rejoin</> : <><Eye size={16} /> Watch</>}
      </button>
    );
  };
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-pixel relative overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl text-center z-10"
      >
        <h1 className="text-5xl sm:text-6xl md:text-7xl text-neon-cyan text-glow-cyan mb-2">PROFILE</h1>
        <p className="text-xl sm:text-2xl text-neon-magenta animate-pulse mb-8 sm:mb-12">{user?.name}</p>
        <div className="crt-monitor">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 px-2 gap-4">
            <h2 className="text-2xl sm:text-3xl text-neon-green text-glow-green">GAME HISTORY</h2>
            <Link to="/" className="retro-btn flex items-center gap-2">
              <ArrowLeft size={20} /> Back to Lobby
            </Link>
          </div>
          <div className="h-[50vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#00ffff #0d0d0d' }}>
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-full text-neon-cyan"
                >
                  <Hourglass className="animate-spin mr-4" /> Loading your games...
                </motion.div>
              )}
              {!isLoading && error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-red-500 text-center"
                >
                  {error}
                </motion.div>
              )}
              {!isLoading && !error && games.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-gray-400 py-10"
                >
                  <p className="text-2xl mb-4">No games found.</p>
                  <p>Join or create a game from the lobby!</p>
                </motion.div>
              )}
              {!isLoading && !error && games.map((game, index) => (
                <motion.div
                  key={game.gameId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex flex-col sm:flex-row items-center gap-4 p-4 mb-3 bg-black/30 border border-neon-cyan/20 hover:bg-neon-cyan/10 transition-colors duration-200"
                >
                  <div className="flex-grow w-full text-left space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-6">
                    <div className={cn("flex items-center gap-2", game.gameStatus === 'finished' ? 'text-gray-500' : 'text-neon-cyan')}>
                      {game.role === 'player' ? <Gamepad2 size={18} /> : <Tv2 size={18} />}
                      <span className="uppercase">{game.role}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neon-magenta">
                      <Users size={18} />
                      <span className="truncate">{game.player1Name || '...'} vs {game.player2Name || '...'}</span>
                    </div>
                    <div className={cn("flex items-center gap-2 font-mono text-sm", game.gameStatus === 'finished' ? 'text-gray-400' : 'text-neon-green')}>
                      STATUS: {game.gameStatus.toUpperCase()}
                    </div>
                  </div>
                  <div className="w-full sm:w-auto flex-shrink-0">
                    {renderGameAction(game)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <footer className="mt-8 text-center text-gray-500 text-sm space-y-1">
            <p>Built with ❤️ at Cloudflare</p>
            <p>
              <a href="https://github.com/dkamioka/kido" target="_blank" rel="noopener noreferrer" className="hover:text-neon-cyan transition-colors">
                View Source on GitHub
              </a>
            </p>
        </footer>
      </motion.div>
    </div>
  );
}