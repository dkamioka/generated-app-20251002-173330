import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Award,
  Calendar,
  Flame,
} from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useShallow } from 'zustand/react/shallow';
import * as matchmakingApi from '@/lib/matchmakingApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function StatsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useUserStore(useShallow(s => ({
    isAuthenticated: s.isAuthenticated,
  })));

  const [stats, setStats] = useState<matchmakingApi.PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await matchmakingApi.getMyStats();

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to load stats');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center p-4 sm:p-6 font-pixel">
        <div className="w-full max-w-6xl space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-pixel">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-neon-red mb-4">{error || 'No stats available'}</p>
            <Button onClick={loadStats} className="retro-btn bg-neon-green text-black">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const winRate =
    stats.rating.total_games > 0
      ? Math.round((stats.rating.ranked_wins / stats.rating.total_games) * 100)
      : 0;

  const ratingChange = stats.rating.rating - 1200; // Compared to starting rating

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 sm:p-6 font-pixel relative">
      <div className="absolute inset-0 bg-black opacity-50 z-0 pointer-events-none"></div>

      <div className="w-full max-w-6xl z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <Link to="/matchmaking">
              <Button variant="outline" className="retro-btn border-neon-cyan text-neon-cyan">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>

            <h1 className="text-4xl sm:text-5xl text-neon-cyan text-glow-cyan flex items-center gap-3">
              <Target className="h-10 w-10" />
              YOUR STATS
            </h1>

            <Link to="/leaderboard">
              <Button variant="outline" className="retro-btn border-neon-yellow text-neon-yellow">
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Rating */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="crt-monitor bg-black/80 border-neon-green">
              <CardContent className="pt-6 text-center">
                <div className="text-sm text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <Trophy className="h-4 w-4" />
                  Current Rating
                </div>
                <div className="text-5xl font-bold text-neon-green text-glow-green">
                  {stats.rating.rating}
                </div>
                <div className="flex items-center justify-center gap-1 mt-2 text-sm">
                  {ratingChange >= 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-neon-green" />
                      <span className="text-neon-green">+{ratingChange}</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-neon-red" />
                      <span className="text-neon-red">{ratingChange}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Rank */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="crt-monitor bg-black/80 border-neon-yellow">
              <CardContent className="pt-6 text-center">
                <div className="text-sm text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <Award className="h-4 w-4" />
                  Global Rank
                </div>
                <div className="text-5xl font-bold text-neon-yellow text-glow-yellow">
                  #{stats.rank}
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  Top player
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Win Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="crt-monitor bg-black/80 border-neon-cyan">
              <CardContent className="pt-6 text-center">
                <div className="text-sm text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <Target className="h-4 w-4" />
                  Win Rate
                </div>
                <div className="text-5xl font-bold text-neon-cyan text-glow-cyan">
                  {winRate}%
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {stats.rating.ranked_wins}W / {stats.rating.ranked_losses}L
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Streak */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="crt-monitor bg-black/80 border-neon-magenta">
              <CardContent className="pt-6 text-center">
                <div className="text-sm text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <Flame className="h-4 w-4" />
                  Current Streak
                </div>
                <div className={`text-5xl font-bold ${
                  stats.rating.current_streak >= 0 ? 'text-neon-green' : 'text-neon-red'
                }`}>
                  {stats.rating.current_streak >= 0 ? '+' : ''}{stats.rating.current_streak}
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  Best: {stats.rating.best_streak}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="crt-monitor bg-black/80 border-neon-green">
            <CardHeader>
              <CardTitle className="text-lg text-neon-green flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Career Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Games:</span>
                <span className="text-white font-bold">{stats.rating.total_games}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Wins:</span>
                <span className="text-neon-green">{stats.rating.ranked_wins}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Losses:</span>
                <span className="text-neon-red">{stats.rating.ranked_losses}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Win Rate:</span>
                <span className="text-neon-cyan">{winRate}%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="crt-monitor bg-black/80 border-neon-yellow">
            <CardHeader>
              <CardTitle className="text-lg text-neon-yellow flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Rating Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current:</span>
                <span className="text-white font-bold">{stats.rating.rating}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Peak:</span>
                <span className="text-neon-yellow">{stats.rating.peak_rating}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Starting:</span>
                <span className="text-gray-500">1200</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Change:</span>
                <span className={ratingChange >= 0 ? 'text-neon-green' : 'text-neon-red'}>
                  {ratingChange >= 0 ? '+' : ''}{ratingChange}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="crt-monitor bg-black/80 border-neon-magenta">
            <CardHeader>
              <CardTitle className="text-lg text-neon-magenta flex items-center gap-2">
                <Flame className="h-5 w-5" />
                Streaks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current:</span>
                <span className={stats.rating.current_streak >= 0 ? 'text-neon-green' : 'text-neon-red'}>
                  {stats.rating.current_streak >= 0 ? '+' : ''}{stats.rating.current_streak}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Best:</span>
                <span className="text-neon-green">+{stats.rating.best_streak}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Last Game:</span>
                <span className="text-white">
                  {stats.rating.last_game_at
                    ? new Date(stats.rating.last_game_at).toLocaleDateString()
                    : 'Never'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Games */}
        <Card className="crt-monitor bg-black/80 border-neon-cyan">
          <CardHeader>
            <CardTitle className="text-2xl text-neon-cyan text-glow-cyan flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Recent Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentGames.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">No games played yet</p>
                <Link to="/matchmaking">
                  <Button className="mt-4 retro-btn bg-neon-green text-black">
                    Play Your First Game
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neon-cyan/30">
                      <TableHead className="text-neon-cyan">Date</TableHead>
                      <TableHead className="text-neon-cyan">Opponent</TableHead>
                      <TableHead className="text-neon-cyan text-right">Opp. Rating</TableHead>
                      <TableHead className="text-neon-cyan text-center">Result</TableHead>
                      <TableHead className="text-neon-cyan text-right">Rating Change</TableHead>
                      <TableHead className="text-neon-cyan text-right">New Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentGames.map((game, index) => {
                      const isWin = game.result === 'win';
                      const isDraw = game.result === 'draw';
                      const date = new Date(game.created_at).toLocaleDateString();

                      return (
                        <motion.tr
                          key={game.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-neon-cyan/20 hover:bg-neon-cyan/5"
                        >
                          <TableCell className="text-gray-400 text-sm">{date}</TableCell>
                          <TableCell className="text-white">{game.opponent_name}</TableCell>
                          <TableCell className="text-right text-gray-400">
                            {game.opponent_rating_before}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                isWin
                                  ? 'border-neon-green text-neon-green'
                                  : isDraw
                                  ? 'border-gray-400 text-gray-400'
                                  : 'border-neon-red text-neon-red'
                              }
                            >
                              {game.result.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                game.rating_change > 0
                                  ? 'text-neon-green'
                                  : game.rating_change < 0
                                  ? 'text-neon-red'
                                  : 'text-gray-400'
                              }
                            >
                              {game.rating_change > 0 ? '+' : ''}
                              {game.rating_change}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-white font-bold">
                            {game.rating_change > 0 ? game.player1_rating_after : game.player2_rating_after}
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
