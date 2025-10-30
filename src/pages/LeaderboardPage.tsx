import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Medal, ArrowLeft, TrendingUp, Swords } from 'lucide-react';
import * as matchmakingApi from '@/lib/matchmakingApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<matchmakingApi.LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await matchmakingApi.getLeaderboard(100);

      if (response.success && response.data) {
        setLeaderboard(response.data);
      } else {
        setError(response.error || 'Failed to load leaderboard');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-neon-yellow fill-neon-yellow" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-300 fill-gray-300" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600 fill-amber-600" />;
    return null;
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'beta':
        return 'border-neon-magenta text-neon-magenta';
      case 'paid':
        return 'border-neon-cyan text-neon-cyan';
      default:
        return 'border-gray-500 text-gray-500';
    }
  };

  const getWinRate = (entry: matchmakingApi.LeaderboardEntry) => {
    if (entry.total_games === 0) return 0;
    return Math.round((entry.ranked_wins / entry.total_games) * 100);
  };

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
            <Link to="/matchmaking">
              <Button variant="outline" className="retro-btn border-neon-cyan text-neon-cyan">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>

            <h1 className="text-4xl sm:text-5xl text-neon-yellow text-glow-yellow flex items-center gap-3">
              <Trophy className="h-10 w-10" />
              LEADERBOARD
            </h1>

            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </motion.div>

        {/* Top 3 Podium */}
        {!isLoading && leaderboard.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            {/* 2nd Place */}
            <Card className="crt-monitor bg-black/80 border-gray-300 mt-8">
              <CardContent className="pt-6 text-center">
                <div className="mb-3">
                  <Medal className="h-12 w-12 mx-auto text-gray-300 fill-gray-300" />
                </div>
                <Avatar className="h-20 w-20 mx-auto mb-3 border-4 border-gray-300">
                  <AvatarImage src={leaderboard[1].user.picture} alt={leaderboard[1].user.name} />
                  <AvatarFallback className="text-2xl">{leaderboard[1].user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="text-white font-bold truncate">{leaderboard[1].user.name}</h3>
                <div className="text-3xl font-bold text-gray-300 mt-2">{leaderboard[1].rating}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {leaderboard[1].ranked_wins}W / {leaderboard[1].ranked_losses}L
                </div>
              </CardContent>
            </Card>

            {/* 1st Place */}
            <Card className="crt-monitor bg-black/80 border-neon-yellow">
              <CardContent className="pt-6 text-center">
                <div className="mb-3">
                  <Trophy className="h-16 w-16 mx-auto text-neon-yellow fill-neon-yellow animate-pulse" />
                </div>
                <Avatar className="h-24 w-24 mx-auto mb-3 border-4 border-neon-yellow">
                  <AvatarImage src={leaderboard[0].user.picture} alt={leaderboard[0].user.name} />
                  <AvatarFallback className="text-3xl">{leaderboard[0].user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="text-white font-bold text-lg truncate">{leaderboard[0].user.name}</h3>
                <div className="text-4xl font-bold text-neon-yellow text-glow-yellow mt-2">
                  {leaderboard[0].rating}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {leaderboard[0].ranked_wins}W / {leaderboard[0].ranked_losses}L
                </div>
              </CardContent>
            </Card>

            {/* 3rd Place */}
            <Card className="crt-monitor bg-black/80 border-amber-600 mt-8">
              <CardContent className="pt-6 text-center">
                <div className="mb-3">
                  <Medal className="h-12 w-12 mx-auto text-amber-600 fill-amber-600" />
                </div>
                <Avatar className="h-20 w-20 mx-auto mb-3 border-4 border-amber-600">
                  <AvatarImage src={leaderboard[2].user.picture} alt={leaderboard[2].user.name} />
                  <AvatarFallback className="text-2xl">{leaderboard[2].user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="text-white font-bold truncate">{leaderboard[2].user.name}</h3>
                <div className="text-3xl font-bold text-amber-600 mt-2">{leaderboard[2].rating}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {leaderboard[2].ranked_wins}W / {leaderboard[2].ranked_losses}L
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Full Leaderboard Table */}
        <Card className="crt-monitor bg-black/80 border-neon-green">
          <CardHeader>
            <CardTitle className="text-2xl text-neon-green text-glow-green flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Top Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-neon-red mb-4">{error}</p>
                <Button onClick={loadLeaderboard} className="retro-btn bg-neon-green text-black">
                  Retry
                </Button>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Swords className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">No players yet</p>
                <p className="text-sm text-gray-500 mt-2">Be the first to play ranked!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neon-green/30">
                      <TableHead className="text-neon-green">Rank</TableHead>
                      <TableHead className="text-neon-green">Player</TableHead>
                      <TableHead className="text-neon-green text-right">Rating</TableHead>
                      <TableHead className="text-neon-green text-right">Games</TableHead>
                      <TableHead className="text-neon-green text-right">W/L</TableHead>
                      <TableHead className="text-neon-green text-right">Win Rate</TableHead>
                      <TableHead className="text-neon-green text-right">Peak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry, index) => {
                      const rank = index + 1;
                      const winRate = getWinRate(entry);

                      return (
                        <motion.tr
                          key={entry.user_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-neon-green/20 hover:bg-neon-green/5"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {getRankIcon(rank)}
                              <span className={rank <= 3 ? 'text-neon-yellow' : 'text-white'}>
                                #{rank}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-neon-cyan">
                                <AvatarImage src={entry.user.picture} alt={entry.user.name} />
                                <AvatarFallback>{entry.user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-white font-medium">{entry.user.name}</div>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getTierBadgeColor(entry.user.tier)}`}
                                >
                                  {entry.user.tier.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-neon-cyan font-bold text-lg">
                              {entry.rating}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-gray-400">
                            {entry.total_games}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-neon-green">{entry.ranked_wins}</span>
                            <span className="text-gray-500"> / </span>
                            <span className="text-neon-red">{entry.ranked_losses}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={winRate >= 50 ? 'text-neon-green' : 'text-gray-400'}>
                              {winRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-neon-yellow">
                            {entry.peak_rating}
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

        {/* Stats Summary */}
        {!isLoading && leaderboard.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <Card className="crt-monitor bg-black/80 border-neon-cyan">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-neon-cyan">
                  {leaderboard.length}
                </div>
                <div className="text-sm text-gray-400 mt-1">Total Players</div>
              </CardContent>
            </Card>
            <Card className="crt-monitor bg-black/80 border-neon-green">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-neon-green">
                  {leaderboard[0]?.rating || 0}
                </div>
                <div className="text-sm text-gray-400 mt-1">Highest Rating</div>
              </CardContent>
            </Card>
            <Card className="crt-monitor bg-black/80 border-neon-yellow">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-neon-yellow">
                  {Math.round(
                    leaderboard.reduce((sum, e) => sum + e.total_games, 0) / leaderboard.length
                  )}
                </div>
                <div className="text-sm text-gray-400 mt-1">Avg Games Played</div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
