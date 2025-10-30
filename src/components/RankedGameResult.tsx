import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RankedGameResultProps {
  isOpen: boolean;
  winner: 'black' | 'white';
  myColor: 'black' | 'white';
  myRatingBefore: number;
  myRatingAfter: number;
  opponentRatingBefore: number;
  opponentRatingAfter: number;
  onClose: () => void;
}

export function RankedGameResult({
  isOpen,
  winner,
  myColor,
  myRatingBefore,
  myRatingAfter,
  opponentRatingBefore,
  opponentRatingAfter,
  onClose,
}: RankedGameResultProps) {
  const didWin = winner === myColor;
  const ratingChange = myRatingAfter - myRatingBefore;
  const opponentRatingChange = opponentRatingAfter - opponentRatingBefore;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-black border-4 border-neon-cyan font-pixel">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center text-neon-cyan text-glow-cyan mb-2">
            GAME COMPLETE
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            Ranked Match Results
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Result Banner */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`text-center py-4 mb-6 rounded border-2 ${
              didWin
                ? 'border-neon-green bg-neon-green/10'
                : 'border-neon-red bg-neon-red/10'
            }`}
          >
            <Trophy
              className={`h-16 w-16 mx-auto mb-2 ${
                didWin ? 'text-neon-green' : 'text-neon-red'
              }`}
            />
            <h2
              className={`text-3xl font-bold ${
                didWin ? 'text-neon-green' : 'text-neon-red'
              }`}
            >
              {didWin ? 'VICTORY' : 'DEFEAT'}
            </h2>
          </motion.div>

          {/* Rating Changes */}
          <div className="space-y-4 mb-6">
            {/* Your Rating */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="border border-neon-cyan rounded p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">YOUR RATING</span>
                <Badge
                  variant="outline"
                  className={
                    ratingChange > 0
                      ? 'border-neon-green text-neon-green'
                      : 'border-neon-red text-neon-red'
                  }
                >
                  {ratingChange > 0 ? '+' : ''}
                  {ratingChange}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl text-white font-bold">{myRatingBefore}</span>
                <ArrowRight
                  className={ratingChange > 0 ? 'text-neon-green' : 'text-neon-red'}
                />
                <span
                  className={`text-2xl font-bold ${
                    ratingChange > 0 ? 'text-neon-green' : 'text-neon-red'
                  }`}
                >
                  {myRatingAfter}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                {ratingChange > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3" />
                    <span>Rating increased</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3" />
                    <span>Rating decreased</span>
                  </>
                )}
              </div>
            </motion.div>

            {/* Opponent Rating */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="border border-gray-600 rounded p-4 bg-gray-900/30"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">OPPONENT RATING</span>
                <Badge
                  variant="outline"
                  className={
                    opponentRatingChange > 0
                      ? 'border-neon-green text-neon-green'
                      : 'border-neon-red text-neon-red'
                  }
                >
                  {opponentRatingChange > 0 ? '+' : ''}
                  {opponentRatingChange}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xl text-gray-400">{opponentRatingBefore}</span>
                <ArrowRight className="text-gray-500" />
                <span className="text-xl text-gray-300">{opponentRatingAfter}</span>
              </div>
            </motion.div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => {
                onClose();
                window.location.href = '/stats';
              }}
              variant="outline"
              className="retro-btn border-neon-cyan text-neon-cyan"
            >
              View Stats
            </Button>
            <Button
              onClick={() => {
                onClose();
                window.location.href = '/matchmaking';
              }}
              className="retro-btn bg-neon-green text-black hover:bg-neon-green/80"
            >
              Play Again
            </Button>
          </div>

          <div className="text-center mt-4">
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-gray-500 hover:text-white text-sm"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
