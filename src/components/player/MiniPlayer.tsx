import { Play, Pause, SkipForward, Heart } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useUserLibrary } from '@/hooks/useUserLibrary';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const MiniPlayer = () => {
  const { currentSong, isPlaying, currentTime, duration, togglePlay, nextSong } = usePlayerStore();
  const { isInMyLibrary, addSongToLibrary, removeSongFromLibrary } = useUserLibrary();
  const navigate = useNavigate();

  if (!currentSong) return null;

  const inLibrary = isInMyLibrary(currentSong.song_id_hash);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inLibrary) {
      await removeSongFromLibrary(currentSong.song_id_hash);
    } else {
      await addSongToLibrary(currentSong);
    }
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30">
      {/* Progress bar on top */}
      <Progress value={progress} className="h-0.5 rounded-none bg-secondary" />
      
      <div 
        className="glass border-t border-border backdrop-blur-xl"
        onClick={() => navigate('/player')}
      >
        <div className="flex items-center gap-3 p-3 cursor-pointer">
          {/* Album Art */}
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex-shrink-0 overflow-hidden">
            {currentSong.cover_url ? (
              <img 
                src={currentSong.cover_url} 
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="text-xl">🎵</span>
              </div>
            )}
          </div>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{currentSong.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavorite}
              className={cn(
                "h-10 w-10 rounded-full",
                inLibrary ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Heart className={cn("h-5 w-5", inLibrary && "fill-current")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="h-12 w-12 rounded-full hover:bg-primary/20"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 fill-current ml-0.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextSong}
              className="h-10 w-10 rounded-full hover:bg-primary/20"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
