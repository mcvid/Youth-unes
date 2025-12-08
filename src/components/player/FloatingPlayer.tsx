import { useState } from 'react';
import { Play, Pause, X, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/store/playerStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingPlayerProps {
  isMinimized: boolean;
  onMaximize: () => void;
  onClose: () => void;
}

const FloatingPlayer = ({ isMinimized, onMaximize, onClose }: FloatingPlayerProps) => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, togglePlay, currentTime, duration } = usePlayerStore();

  if (!currentSong || !isMinimized) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 z-50",
        "bg-card/95 backdrop-blur-xl rounded-2xl",
        "shadow-2xl shadow-background/50 border border-border/30",
        "transition-all duration-300 ease-out",
        "animate-scale-in"
      )}
    >
      {/* Progress ring around the player */}
      <div className="relative p-3">
        {/* Album Art with progress ring */}
        <div 
          className="relative w-16 h-16 cursor-pointer group"
          onClick={onMaximize}
        >
          {/* Progress ring background */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="30"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
              className="opacity-30"
            />
            <circle
              cx="32"
              cy="32"
              r="30"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeDasharray={`${progress * 1.885} 188.5`}
              className="transition-all duration-300"
            />
          </svg>
          
          {/* Album art */}
          <div className="absolute inset-1 rounded-full overflow-hidden shadow-lg">
            {currentSong.cover_url ? (
              <img
                src={currentSong.cover_url}
                alt={currentSong.title}
                className={cn(
                  "w-full h-full object-cover",
                  isPlaying && "animate-[spin_8s_linear_infinite]"
                )}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-accent/30">
                <span className="text-xl">🎵</span>
              </div>
            )}
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-1 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="h-4 w-4 text-foreground" />
          </div>
        </div>

        {/* Play/Pause button */}
        <Button
          size="icon"
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default FloatingPlayer;
