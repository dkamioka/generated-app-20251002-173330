import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Users, Hourglass, Eye, LogOut, Gamepad2, Grid } from 'lucide-react';
import { CreateGameDialog } from '@/components/CreateGameDialog';
import { WatchGameDialog } from '@/components/WatchGameDialog';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { useGameStore } from '@/store/gameStore';
import { useUserStore } from '@/store/userStore';
import { useShallow } from 'zustand/react/shallow';
import type { GameSummary, ApiResponse } from '@shared/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
export function LobbyPage() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setJoinDialogOpen] = useState(false);
  const [isWatchDialogOpen, setWatchDialogOpen] = useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const navigate = useNavigate();
  const watchGameAction = useGameStore(state => state.watchGame);
  const { user, isAuthenticated, loadUserProfile, signOut } = useUserStore(useShallow(s => ({
    user: s.user,
    isAuthenticated: s.isAuthenticated,
    loadUserProfile: s.loadUserProfile,
    signOut: s.signOut,
  })));
  useEffect(() => {
    loadUserProfile();
    if (!isAuthenticated) {
      setProfileDialogOpen(true);
    } else {
      setProfileDialogOpen(false);
    }
  }, [isAuthenticated, loadUserProfile]);
  const fetchGames = useCallback(async (isInitialLoad: boolean) => {
    try {
      if (isInitialLoad) setIsLoading(true);
      const response = await fetch('/api/games');
      const result: ApiResponse<GameSummary[]> = await response.json();
      if (result.success && result.data) {
        setGames(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch games.');
      }
    } catch (err) {
      setError('An error occurred while connecting to the server.');
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchGames(true);
    const interval = setInterval(() => fetchGames(false), 5000); // Poll for new games every 5 seconds
    return () => clearInterval(interval);
  }, [fetchGames]);
  const handleJoinClick = (gameId: string) => {
    setSelectedGameId(gameId);
    setJoinDialogOpen(true);
  };
  const handleWatchClick = (gameId: string) => {
    setSelectedGameId(gameId);
    setWatchDialogOpen(true);
  };
  const handleConfirmWatch = async (observerName: string) => {
    if (!selectedGameId) return;
    const result = await watchGameAction(selectedGameId, observerName);
    if (result) {
      const { game, observer } = result;
      const sessionKey = `kido-session-${game.gameId}`;
      localStorage.setItem(sessionKey, JSON.stringify({ observerId: observer.id }));
      navigate(`/game/${game.gameId}`);
    } else {
      throw new Error("Could not watch game. It may be private or no longer exists.");
    }
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
        <h1 className="text-6xl sm:text-7xl md:text-8xl text-neon-cyan text-glow-cyan mb-2">KIDO</h1>
        <p className="text-xl sm:text-2xl text-neon-magenta animate-pulse mb-8 sm:mb-12">The Retro Go Arena</p>
        <div className="crt-monitor">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 px-2 gap-4">
            <h2 className="text-2xl sm:text-3xl text-neon-green text-glow-green">OPEN GAMES</h2>
            <div className="flex items-center gap-2 sm:gap-4">
              {isAuthenticated && user && (
                <Link to="/profile" className="retro-btn border-neon-magenta text-neon-magenta p-2 flex items-center gap-2" title="My Profile">
                  <Avatar className="h-6 w-6 border-2 border-neon-magenta">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline truncate max-w-[100px]">{user.name}</span>
                </Link>
              )}
              {isAuthenticated && (
                <button onClick={signOut} className="retro-btn border-red-500 text-red-500 p-2" title="Sign Out">
                  <LogOut size={20} />
                </button>
              )}
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="retro-btn flex items-center gap-2"
                disabled={!isAuthenticated}
              >
                <PlusCircle size={20} /> <span className="hidden sm:inline">Create Game</span>
              </button>
            </div>
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
                  <Hourglass className="animate-spin mr-4" /> Loading games...
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
                  <p className="text-2xl mb-4">No open games found.</p>
                  <p>Why not start a new one?</p>
                </motion.div>
              )}
              {!isLoading && !error && games.map((game, index) => {
                const isPlayerInGame = isAuthenticated && user && (game.player1Name === user.name || game.player2Name === user.name);
                return (
                  <motion.div
                    key={game.gameId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex flex-col sm:flex-row items-center gap-4 p-4 mb-3 bg-black/30 border border-neon-cyan/20 hover:bg-neon-cyan/10 transition-colors duration-200"
                  >
                    <div className="flex-grow w-full text-left space-y-2 sm:space-y-0">
                      <div className="flex items-center gap-4">
                        <p className="text-neon-cyan truncate text-sm">
                          <span className="text-gray-500">ID:</span> {game.gameId.substring(0, 8)}...
                        </p>
                        <div className="flex items-center gap-2 text-neon-green">
                          <Grid size={16} />
                          <span>{game.boardSize}x{game.boardSize}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-neon-magenta">
                        <Users size={18} />
                        <span className="truncate">{game.player1Name || '...'} vs {game.player2Name || '...'}</span>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto flex-shrink-0">
                      {isPlayerInGame ? (
                        <button
                          onClick={() => navigate(`/game/${game.gameId}`)}
                          className="retro-btn border-neon-green text-neon-green w-full flex items-center justify-center gap-2"
                        >
                          <Gamepad2 size={16} /> Rejoin
                        </button>
                      ) : game.gameStatus === 'waiting' ? (
                        <button
                          onClick={() => handleJoinClick(game.gameId)}
                          className="retro-btn border-neon-green text-neon-green w-full"
                          disabled={!isAuthenticated}
                        >
                          Join
                        </button>
                      ) : game.gameStatus === 'playing' && game.isPublic ? (
                        <button
                          onClick={() => handleWatchClick(game.gameId)}
                          className="retro-btn border-neon-cyan text-neon-cyan w-full flex items-center justify-center gap-2"
                          disabled={!isAuthenticated}
                        >
                          <Eye size={16} /> Watch
                        </button>
                      ) : (
                        <span className="text-gray-500 font-mono uppercase">{game.isPublic ? 'In Progress' : 'Private'}</span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
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
      <UserProfileDialog
        isOpen={isProfileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
      />
      <CreateGameDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onGameCreated={(game) => navigate(`/game/${game.gameId}`)}
        mode="create"
      />
      <CreateGameDialog
        isOpen={isJoinDialogOpen}
        onClose={() => setJoinDialogOpen(false)}
        onGameCreated={(game) => navigate(`/game/${game.gameId}`)}
        mode="join"
        gameId={selectedGameId}
      />
      <WatchGameDialog
        isOpen={isWatchDialogOpen}
        onClose={() => setWatchDialogOpen(false)}
        onConfirm={handleConfirmWatch}
      />
    </div>
  );
}