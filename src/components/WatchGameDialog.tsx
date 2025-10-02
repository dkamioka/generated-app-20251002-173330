import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/store/userStore';
import { useShallow } from 'zustand/react/shallow';
interface WatchGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (observerName: string) => Promise<void>;
}
export function WatchGameDialog({ isOpen, onClose, onConfirm }: WatchGameDialogProps) {
  const { user, isAuthenticated } = useUserStore(useShallow(s => ({
    user: s.user,
    isAuthenticated: s.isAuthenticated,
  })));
  const [observerName, setObserverName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (isOpen) {
      setObserverName(user?.name || '');
      setError(null);
    }
  }, [isOpen, user]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observerName.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm(observerName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join as observer.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-neon-cyan text-white font-pixel">
        <DialogHeader>
          <DialogTitle className="text-3xl text-glow-cyan">Watch Game</DialogTitle>
          <DialogDescription className="text-gray-400 font-mono">
            Enter your callsign to spectate this match.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Input
              id="observerName"
              placeholder="OBSERVER_NAME"
              value={observerName}
              onChange={(e) => setObserverName(e.target.value)}
              className="bg-gray-900/50 border-neon-magenta text-neon-magenta focus:ring-neon-magenta focus:ring-2 disabled:opacity-70"
              maxLength={20}
              required
              disabled={isAuthenticated}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <DialogFooter>
            <Button type="submit" className="retro-btn w-full" disabled={isLoading}>
              {isLoading ? 'Connecting...' : 'Watch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}