import React from 'react';
import { useReplayStore } from '@/store/replayStore';
import { useShallow } from 'zustand/react/shallow';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
export function ReplayControls() {
  const {
    originalGame,
    currentEventIndex,
    isPlaying,
    play,
    pause,
    stepForward,
    stepBackward,
    goToEvent,
    reset,
  } = useReplayStore(
    useShallow((s) => ({
      originalGame: s.originalGame,
      currentEventIndex: s.currentEventIndex,
      isPlaying: s.isPlaying,
      play: s.play,
      pause: s.pause,
      stepForward: s.stepForward,
      stepBackward: s.stepBackward,
      goToEvent: s.goToEvent,
      reset: s.reset,
    }))
  );
  if (!originalGame) {
    return null;
  }
  const totalEvents = originalGame.replayHistory.length;
  const handleSliderChange = (value: number[]) => {
    goToEvent(value[0] - 1);
  };
  return (
    <div className="w-full max-w-2xl bg-black/50 border border-neon-cyan/20 p-4 rounded-lg flex flex-col items-center gap-4">
      <div className="w-full flex items-center gap-4">
        <span className="font-mono text-neon-cyan text-sm w-16 text-center">
          {currentEventIndex + 1} / {totalEvents}
        </span>
        <Slider
          min={0}
          max={totalEvents}
          step={1}
          value={[currentEventIndex + 1]}
          onValueChange={handleSliderChange}
          className="flex-grow"
        />
      </div>
      <div className="flex items-center justify-center gap-4">
        <Button onClick={reset} variant="ghost" size="icon" className="text-neon-magenta hover:text-neon-magenta/80">
          <RotateCcw size={24} />
        </Button>
        <Button onClick={stepBackward} variant="ghost" size="icon" className="text-neon-cyan hover:text-neon-cyan/80">
          <SkipBack size={24} />
        </Button>
        <Button
          onClick={isPlaying ? pause : play}
          className="retro-btn rounded-full h-16 w-16 flex items-center justify-center"
        >
          {isPlaying ? <Pause size={32} /> : <Play size={32} />}
        </Button>
        <Button onClick={stepForward} variant="ghost" size="icon" className="text-neon-cyan hover:text-neon-cyan/80">
          <SkipForward size={24} />
        </Button>
      </div>
    </div>
  );
}