import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GameState, ApiResponse, Player, BoardSize, AILevel } from '@shared/types';
import { useUserStore } from '@/store/userStore';
import { useShallow } from 'zustand/react/shallow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { canCreatePrivateGame, canAccessAIDifficulty } from '@/lib/permissions';
import { UpgradePrompt, FeatureLockBadge } from '@/components/UpgradePrompt';
import { TierComparisonModal } from '@/components/TierComparisonModal';

interface CreateGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGameCreated: (game: GameState) => void;
  mode: 'create' | 'join';
  gameId?: string | null;
}
export function CreateGameDialog({ isOpen, onClose, onGameCreated, mode, gameId }: CreateGameDialogProps) {
  const { user, isAuthenticated, fullUser } = useUserStore(useShallow(s => ({
    user: s.user,
    isAuthenticated: s.isAuthenticated,
    fullUser: s.fullUser,
  })));
  const [playerName, setPlayerName] = useState(user?.name || '');
  const [isPublic, setIsPublic] = useState(true);
  const [boardSize, setBoardSize] = useState<BoardSize>(19);
  const [opponentType, setOpponentType] = useState<'human' | 'ai'>('human');
  const [aiLevel, setAiLevel] = useState<AILevel>('easy');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);

  // Check permissions
  const canMakePrivate = canCreatePrivateGame(fullUser);
  const canUseEasyAI = canAccessAIDifficulty(fullUser, 'easy');
  const canUseMediumAI = canAccessAIDifficulty(fullUser, 'medium');
  const canUseHardAI = canAccessAIDifficulty(fullUser, 'hard');
  useEffect(() => {
    if (isOpen) {
      setPlayerName(user?.name || '');
      setError(null);
      setBoardSize(19);
      setIsPublic(true);
      setOpponentType('human');
      setAiLevel('easy');
    }
  }, [isOpen, user]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const url = mode === 'create' ? '/api/games' : `/api/games/${gameId}/join`;
      const body = mode === 'create' ? { playerName, isPublic, boardSize, opponentType, aiLevel } : { playerName };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result: ApiResponse<{ game: GameState; player: Player }> = await response.json();
      if (response.ok && result.success && result.data) {
        const { game, player } = result.data;
        const sessionKey = `kido-session-${game.gameId}`;
        localStorage.setItem(sessionKey, JSON.stringify({ playerId: player.id, sessionId: player.sessionId }));
        onGameCreated(game);
        onClose();
      } else {
        setError(result.error || `Failed to ${mode} game.`);
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-neon-cyan text-white font-pixel">
        <DialogHeader>
          <DialogTitle className="text-3xl text-glow-cyan">{mode === 'create' ? 'Create New Game' : 'Join Game'}</DialogTitle>
          <DialogDescription className="text-gray-400 font-mono">
            Enter your callsign to {mode === 'create' ? 'start a new session' : 'enter the arena'}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Input
              id="playerName"
              placeholder="PLAYER_NAME"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="bg-gray-900/50 border-neon-magenta text-neon-magenta focus:ring-neon-magenta focus:ring-2 disabled:opacity-70"
              maxLength={20}
              required
              disabled={isAuthenticated}
            />
            {mode === 'create' && (
              <Tabs defaultValue="human" onValueChange={(value) => setOpponentType(value as 'human' | 'ai')}>
                <TabsList className="grid w-full grid-cols-2 bg-gray-900/50">
                  <TabsTrigger value="human">vs. Human</TabsTrigger>
                  <TabsTrigger value="ai">vs. AI</TabsTrigger>
                </TabsList>
                <TabsContent value="human" className="mt-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="public-game"
                      checked={isPublic}
                      onCheckedChange={(checked) => {
                        if (!checked && !canMakePrivate) {
                          setShowTierModal(true);
                          return;
                        }
                        setIsPublic(checked);
                      }}
                    />
                    <Label htmlFor="public-game" className="text-gray-400 font-mono">
                      <FeatureLockBadge locked={!canMakePrivate}>
                        Allow spectators (make public)
                      </FeatureLockBadge>
                    </Label>
                  </div>
                  {!canMakePrivate && !isPublic && (
                    <UpgradePrompt feature="privateGames" className="mt-2" />
                  )}
                </TabsContent>
                <TabsContent value="ai" className="mt-4 space-y-4">
                  <div>
                    <Label className="text-gray-400 font-mono">AI Level</Label>
                    <RadioGroup
                      defaultValue="easy"
                      onValueChange={(v) => setAiLevel(v as AILevel)}
                      className="flex flex-col space-y-2 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="easy" id="ai-easy" disabled={!canUseEasyAI} />
                        <Label htmlFor="ai-easy">Easy</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="ai-medium" disabled={!canUseMediumAI} />
                        <Label htmlFor="ai-medium">
                          <FeatureLockBadge locked={!canUseMediumAI}>
                            Medium
                          </FeatureLockBadge>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hard" id="ai-hard" disabled={!canUseHardAI} />
                        <Label htmlFor="ai-hard">
                          <FeatureLockBadge locked={!canUseHardAI}>
                            Hard
                          </FeatureLockBadge>
                        </Label>
                      </div>
                    </RadioGroup>
                    {(!canUseMediumAI || !canUseHardAI) && (
                      <UpgradePrompt feature="aiMedium" className="mt-2" />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
            {mode === 'create' && (
              <div className="space-y-2 pt-4">
                <Label className="text-gray-400 font-mono">Board Size</Label>
                <RadioGroup defaultValue="19" onValueChange={(v) => setBoardSize(Number(v) as BoardSize)} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="9" id="size-9" />
                    <Label htmlFor="size-9">9x9</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="13" id="size-13" />
                    <Label htmlFor="size-13">13x13</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="19" id="size-19" />
                    <Label htmlFor="size-19">19x19</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <DialogFooter>
            <button type="submit" className="retro-btn w-full" disabled={isLoading}>
              {isLoading ? 'Connecting...' : (mode === 'create' ? 'Launch' : 'Join')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
      <TierComparisonModal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
        currentUser={fullUser}
      />
    </Dialog>
  );
}