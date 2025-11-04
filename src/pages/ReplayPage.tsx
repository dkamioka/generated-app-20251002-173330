import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useReplayStore } from '@/store/replayStore';
import { GoBoard } from '@/components/GoBoard';
import { GamePanel } from '@/components/GamePanel';
import { ChatPanel } from '@/components/ChatPanel';
import { ReplayControls } from '@/components/ReplayControls';
import { useGameStore } from '@/store/gameStore';
import { ArrowLeft, Loader } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { useShallow } from 'zustand/react/shallow';
export function ReplayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const { fetchAndInitializeReplay, currentReplayState, error, reset } = useReplayStore(
    useShallow((s) => ({
      fetchAndInitializeReplay: s.fetchAndInitializeReplay,
      currentReplayState: s.currentReplayState,
      error: s.error,
      reset: s.reset,
    }))
  );
  useEffect(() => {
    if (gameId) {
      setIsLoading(true);
      fetchAndInitializeReplay(gameId).finally(() => setIsLoading(false));
    }
    // Reset store on component unmount
    return () => {
      reset();
    };
  }, [gameId, fetchAndInitializeReplay, reset]);
  // Sync replay store state to game store for component reuse
  useEffect(() => {
    useGameStore.setState({
      ...currentReplayState,
      myPlayerId: null, // Ensure no actions can be taken
      mySessionId: null,
      myObserverId: null,
    });
  }, [currentReplayState]);
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-pixel text-neon-cyan">
        <Loader className="animate-spin h-12 w-12 mb-4" />
        <p className="text-2xl">Loading Replay...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-pixel text-red-500">
        <h2 className="text-3xl mb-4">Error Loading Replay</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="retro-btn mt-8">
          Back to Lobby
        </button>
      </div>
    );
  }
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-pixel relative">
      <Toaster richColors theme="dark" />
      <button
        onClick={() => navigate(-1)} // Go back to previous page (profile or game)
        className="absolute top-4 left-4 retro-btn flex items-center gap-2 z-20"
      >
        <ArrowLeft size={20} /> Back
      </button>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-8"
      >
        <div className="crt-monitor w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="hidden lg:flex lg:col-span-3 items-center justify-center">
              <GamePanel />
            </div>
            <div className="lg:col-span-6 flex items-center justify-center">
              <GoBoard />
            </div>
            <div className="hidden lg:flex lg:col-span-3 items-center justify-center">
              <ChatPanel />
            </div>
          </div>
        </div>
        <ReplayControls />
      </motion.div>
    </main>
  );
}