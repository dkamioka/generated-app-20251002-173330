import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Check, X, Clock } from 'lucide-react';
import type { Match } from '@/lib/matchmakingApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

interface MatchFoundDialogProps {
  isOpen: boolean;
  match: Match;
  onAccept: (matchId: string) => void;
  onReject: (matchId: string) => void;
}

export function MatchFoundDialog({
  isOpen,
  match,
  onAccept,
  onReject,
}: MatchFoundDialogProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasResponded, setHasResponded] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || hasResponded) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, match.expiresAt - Date.now());
      setTimeLeft(Math.floor(remaining / 1000));

      if (remaining <= 0) {
        handleReject();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, match.expiresAt, hasResponded]);

  const handleAccept = () => {
    setHasResponded(true);
    onAccept(match.id);
  };

  const handleReject = () => {
    setHasResponded(true);
    onReject(match.id);
  };

  const ratingDiff = Math.abs(match.player1.rating - match.player2.rating);
  const progressValue = (timeLeft / 30) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReject()}>
      <DialogContent className="sm:max-w-[600px] bg-black border-4 border-neon-green font-pixel">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center text-neon-green text-glow-green mb-2">
            MATCH FOUND!
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            Accept to start the game
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Timer */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-neon-cyan" />
              <span className="text-neon-cyan text-sm">
                {timeLeft}s remaining
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>

          {/* Players */}
          <div className="grid grid-cols-3 gap-4 items-center mb-6">
            {/* Player 1 */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-center"
            >
              <Avatar className="h-20 w-20 mx-auto mb-2 border-4 border-neon-cyan">
                <AvatarImage src={match.player1.picture} alt={match.player1.name} />
                <AvatarFallback className="text-2xl bg-neon-cyan text-black">
                  {match.player1.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-white font-bold truncate">{match.player1.name}</div>
              <div className="text-neon-cyan text-sm">{match.player1.rating}</div>
            </motion.div>

            {/* VS */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <Swords className="h-12 w-12 mx-auto text-neon-yellow animate-pulse" />
              <div className="text-neon-yellow text-xs mt-2">VS</div>
              <div className="text-gray-400 text-xs mt-1">
                ±{ratingDiff} rating
              </div>
            </motion.div>

            {/* Player 2 */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-center"
            >
              <Avatar className="h-20 w-20 mx-auto mb-2 border-4 border-neon-magenta">
                <AvatarImage src={match.player2.picture} alt={match.player2.name} />
                <AvatarFallback className="text-2xl bg-neon-magenta text-black">
                  {match.player2.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-white font-bold truncate">{match.player2.name}</div>
              <div className="text-neon-magenta text-sm">{match.player2.rating}</div>
            </motion.div>
          </div>

          {/* Match Info */}
          <div className="bg-black/50 border border-neon-green/30 rounded p-4 mb-6">
            <div className="text-center text-sm text-gray-400 space-y-1">
              <p>Ranked Match • Best of 1</p>
              <p>Rating changes based on result</p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleReject}
              disabled={hasResponded}
              variant="outline"
              className="retro-btn border-neon-red text-neon-red hover:bg-neon-red hover:text-black py-6"
            >
              <X className="mr-2 h-5 w-5" />
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              disabled={hasResponded}
              className="retro-btn bg-neon-green text-black hover:bg-neon-green/80 py-6"
            >
              <Check className="mr-2 h-5 w-5" />
              Accept
            </Button>
          </div>

          {hasResponded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-center text-neon-cyan text-sm"
            >
              Waiting for opponent...
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
