import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Swords, ArrowLeft, Clock, Users, TrendingUp, Volume2, VolumeX } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useShallow } from 'zustand/react/shallow';
import * as matchmakingApi from '@/lib/matchmakingApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { MatchFoundDialog } from '@/components/MatchFoundDialog';
import { notificationManager } from '@/lib/notifications';
import { soundManager } from '@/lib/sounds';

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Don't retry on the last attempt
      if (i === maxRetries - 1) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const delay = initialDelay * Math.pow(2, i);
      console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function MatchmakingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, fullUser } = useUserStore(useShallow(s => ({
    user: s.user,
    isAuthenticated: s.isAuthenticated,
    fullUser: s.fullUser,
  })));

  const [isInQueue, setIsInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<matchmakingApi.QueueStatus | null>(null);
  const [myStats, setMyStats] = useState<matchmakingApi.PlayerStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);

  // Match found state
  const [matchFound, setMatchFound] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<matchmakingApi.Match | null>(null);

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());

  // Redirect to lobby if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Load player stats and request notification permission on mount
  useEffect(() => {
    loadMyStats();

    // Request notification permission (non-blocking)
    if (notificationManager.isSupported()) {
      notificationManager.requestPermission().catch(err => {
        console.warn('Failed to request notification permission:', err);
      });
    }
  }, []);

  // Poll queue status when in queue
  useEffect(() => {
    if (!isInQueue) return;

    const interval = setInterval(async () => {
      try {
        const response = await matchmakingApi.getQueueStatus();
        if (response.success && response.data) {
          setQueueStatus(response.data);

          // Check if match was found
          if (response.data.matchFound && response.data.match) {
            setMatchFound(true);
            setCurrentMatch(response.data.match);
            setIsInQueue(false);

            // Trigger notification and sound
            const opponent = response.data.match.player1.userId === fullUser?.id
              ? response.data.match.player2
              : response.data.match.player1;

            soundManager.play('match-found');
            notificationManager.notifyMatchFound(opponent.userName, opponent.rating);
          }
        }
      } catch (err) {
        console.error('Error polling queue status:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [isInQueue]);

  const loadMyStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await retryWithBackoff(() => matchmakingApi.getMyStats());
      if (response.success && response.data) {
        setMyStats(response.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Failed to load stats. Please refresh the page.');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const handleJoinQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setUpgradePrompt(null);

    try {
      const response = await retryWithBackoff(() => matchmakingApi.joinQueue(), 2);

      if (response.success) {
        setIsInQueue(true);
        setQueueStatus({ inQueue: true });
        soundManager.play('queue-join');
      } else {
        setError(response.error || 'Failed to join queue. Please try again.');

        // Check for upgrade prompt (free tier limit)
        if (response.error?.includes('limit')) {
          setUpgradePrompt('Upgrade to paid tier for unlimited ranked games');
        }
      }
    } catch (err: any) {
      console.error('Error joining queue:', err);
      setError('Failed to join queue. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLeaveQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await matchmakingApi.leaveQueue();

      if (response.success) {
        setIsInQueue(false);
        setQueueStatus(null);
        soundManager.play('queue-leave');
      } else {
        setError(response.error || 'Failed to leave queue');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleMatchAccept = useCallback(async (matchId: string) => {
    try {
      const response = await retryWithBackoff(() => matchmakingApi.acceptMatch(matchId), 2);

      if (response.success && response.data) {
        if (response.data.gameReady && response.data.gameId) {
          // Both players accepted - navigate to game with session info
          // Determine which player we are based on match data
          const isPlayer1 = currentMatch?.player1.userId === fullUser?.id;
          const sessionId = isPlayer1
            ? response.data.player1SessionId
            : response.data.player2SessionId;
          const playerId = isPlayer1
            ? response.data.player1PlayerId
            : response.data.player2PlayerId;

          // Store session info in localStorage
          const sessionKey = `kido-session-${response.data.gameId}`;
          localStorage.setItem(sessionKey, JSON.stringify({
            playerId,
            sessionId,
          }));

          // Play game ready notification
          notificationManager.notifyGameReady();

          // Navigate to game
          navigate(`/game/${response.data.gameId}`);
        } else if (response.data.waitingForOpponent || response.data.waiting) {
          // Waiting for other player
          setError('Waiting for opponent to accept...');
        }
      } else {
        setError(response.error || 'Failed to accept match. The match may have expired.');
      }
    } catch (err: any) {
      console.error('Error accepting match:', err);
      setError('Failed to accept match. Please try again or rejoin the queue.');
    }
  }, [currentMatch, fullUser, navigate]);

  const handleMatchReject = useCallback(async (matchId: string) => {
    try {
      await matchmakingApi.rejectMatch(matchId);
      setMatchFound(false);
      setCurrentMatch(null);
      setError('Match rejected. You can join the queue again.');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  }, []);

  const handleSoundToggle = useCallback(() => {
    const newState = soundManager.toggle();
    setSoundEnabled(newState);
  }, []);

  const winRate = useMemo(() => {
    if (!myStats?.rating) return 0;
    if (myStats.rating.total_games === 0) return 0;
    return Math.round((myStats.rating.ranked_wins / myStats.rating.total_games) * 100);
  }, [myStats]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 sm:p-6 font-pixel relative overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>

      <div className="w-full max-w-6xl z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <Link to="/">
              <Button variant="outline" className="retro-btn border-neon-cyan text-neon-cyan">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Lobby
              </Button>
            </Link>

            <h1 className="text-4xl sm:text-5xl text-neon-cyan text-glow-cyan">
              RANKED MATCHMAKING
            </h1>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleSoundToggle}
                className="retro-btn border-gray-500 text-gray-400 hover:text-white"
                title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Link to="/leaderboard">
                <Button variant="outline" className="retro-btn border-neon-yellow text-neon-yellow">
                  <Trophy className="mr-2 h-4 w-4" />
                  Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4"
            >
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upgrade Prompt */}
        <AnimatePresence>
          {upgradePrompt && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4"
            >
              <Alert className="border-neon-magenta bg-black/50">
                <AlertDescription className="text-neon-magenta">
                  {upgradePrompt}{' '}
                  <Link to="/profile" className="underline">
                    Upgrade Now
                  </Link>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Queue Panel */}
          <div className="lg:col-span-2">
            <Card className="crt-monitor bg-black/80 border-neon-green">
              <CardHeader>
                <CardTitle className="text-2xl text-neon-green text-glow-green flex items-center gap-2">
                  <Swords className="h-6 w-6" />
                  Matchmaking Queue
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Find opponents at your skill level
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isInQueue ? (
                  <div className="text-center py-12">
                    <Swords className="h-16 w-16 mx-auto mb-4 text-neon-green" />
                    <h3 className="text-xl text-white mb-2">Ready to battle?</h3>
                    <p className="text-gray-400 mb-6">
                      Join the ranked queue to find an opponent
                    </p>
                    <Button
                      onClick={handleJoinQueue}
                      disabled={isLoading || isLoadingStats}
                      className="retro-btn bg-neon-green text-black hover:bg-neon-green/80 text-lg px-8 py-6"
                    >
                      {isLoading ? 'Joining...' : isLoadingStats ? 'Loading...' : 'Join Queue'}
                    </Button>
                  </div>
                ) : (
                  <div className="py-8">
                    <div className="text-center mb-6">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="inline-block"
                      >
                        <Users className="h-16 w-16 text-neon-cyan mx-auto mb-4" />
                      </motion.div>
                      <h3 className="text-2xl text-neon-cyan text-glow-cyan mb-2">
                        Searching for opponent...
                      </h3>
                      <p className="text-gray-400">
                        {queueStatus?.queueSize
                          ? `${queueStatus.queueSize} players in queue`
                          : 'Connecting to matchmaking...'}
                      </p>
                    </div>

                    {queueStatus && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 mb-6"
                      >
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Position in queue:</span>
                          <motion.span
                            key={queueStatus.position}
                            initial={{ scale: 1.2, color: '#00ff00' }}
                            animate={{ scale: 1, color: '#00ffff' }}
                            transition={{ duration: 0.3 }}
                            className="text-neon-cyan font-bold"
                          >
                            {queueStatus.position || '...'}
                          </motion.span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Wait time:</span>
                          <span className="text-neon-cyan">
                            {queueStatus.waitTime ? `${Math.floor(queueStatus.waitTime / 1000)}s` : '...'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Rating range:</span>
                          <motion.span
                            key={queueStatus.currentRatingRange}
                            initial={{ scale: 1.1, color: '#ffff00' }}
                            animate={{ scale: 1, color: '#00ffff' }}
                            transition={{ duration: 0.5 }}
                            className="text-neon-cyan font-bold"
                          >
                            ±{queueStatus.currentRatingRange || 100}
                          </motion.span>
                        </div>

                        {queueStatus.estimatedWaitTime && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4"
                          >
                            <p className="text-xs text-gray-400 mb-2">Estimated time</p>
                            <Progress value={50} className="h-2" />
                          </motion.div>
                        )}
                      </motion.div>
                    )}

                    <div className="text-center">
                      <Button
                        onClick={handleLeaveQueue}
                        disabled={isLoading}
                        variant="outline"
                        className="retro-btn border-neon-red text-neon-red hover:bg-neon-red hover:text-black"
                      >
                        Leave Queue
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Player Rating Card */}
            <Card className="crt-monitor bg-black/80 border-neon-cyan">
              <CardHeader>
                <CardTitle className="text-lg text-neon-cyan flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Your Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myStats ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-neon-green text-glow-green mb-2">
                        {myStats.rating.rating}
                      </div>
                      <div className="text-sm text-gray-400">
                        Rank #{myStats.rank}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Win Rate:</span>
                        <span className="text-white">{winRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Wins:</span>
                        <span className="text-neon-green">{myStats.rating.ranked_wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Losses:</span>
                        <span className="text-neon-red">{myStats.rating.ranked_losses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Peak Rating:</span>
                        <span className="text-neon-yellow">{myStats.rating.peak_rating}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Streak:</span>
                        <span className={myStats.rating.current_streak >= 0 ? 'text-neon-green' : 'text-neon-red'}>
                          {myStats.rating.current_streak >= 0 ? '+' : ''}{myStats.rating.current_streak}
                        </span>
                      </div>
                    </div>

                    <Link to="/stats">
                      <Button variant="outline" className="w-full retro-btn border-neon-cyan text-neon-cyan text-xs">
                        View Full Stats
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Skeleton className="h-12 w-24 mx-auto mb-2" />
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tier Info Card */}
            {fullUser && (
              <Card className="crt-monitor bg-black/80 border-neon-magenta">
                <CardHeader>
                  <CardTitle className="text-lg text-neon-magenta flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Your Tier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <Badge className="mb-3 text-lg px-4 py-2" variant="outline">
                      {fullUser.tier?.toUpperCase() || 'FREE'}
                    </Badge>
                    {fullUser.tier === 'free' && (
                      <div className="text-sm text-gray-400 space-y-2">
                        <p>10 ranked games per day</p>
                        <Link to="/profile">
                          <Button
                            variant="outline"
                            className="w-full retro-btn border-neon-magenta text-neon-magenta text-xs mt-2"
                          >
                            Upgrade for Unlimited
                          </Button>
                        </Link>
                      </div>
                    )}
                    {fullUser.tier !== 'free' && (
                      <p className="text-sm text-neon-green">
                        Unlimited ranked games
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Match Found Dialog */}
      {currentMatch && (
        <MatchFoundDialog
          isOpen={matchFound}
          match={currentMatch}
          onAccept={handleMatchAccept}
          onReject={handleMatchReject}
        />
      )}
    </div>
  );
}
