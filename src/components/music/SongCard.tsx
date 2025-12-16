import { Song } from '@/store/playerStore';
import { Play, Heart, Info } from 'lucide-react';
import { useUserLibrary } from '@/hooks/useUserLibrary';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SongCardProps {
  song: Song;
  onPlay: (song: Song) => void;
  onViewDetails?: (song: Song) => void;
  showAddToLibrary?: boolean;
  className?: string;
}

const SongCard = ({ song, onPlay, onViewDetails, showAddToLibrary = false, className }: SongCardProps) => {
  const { addSongToLibrary, removeSongFromLibrary, isInMyLibrary } = useUserLibrary();
  const inLibrary = isInMyLibrary(song.song_id_hash);

  const handleLibraryToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inLibrary) {
      await removeSongFromLibrary(song.song_id_hash);
    } else {
      await addSongToLibrary(song);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails?.(song);
  };

  return (
    <div 
      className={cn(
        "group relative bg-card/50 backdrop-blur-sm rounded-xl p-4",
        "border border-border/30 hover:border-primary/30",
        "transition-all duration-300 ease-out cursor-pointer",
        "hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1",
        className
      )}
      onClick={() => onViewDetails ? onViewDetails(song) : onPlay(song)}
    >
      {/* Album Art */}
      <div className="relative mb-3 aspect-square rounded-lg overflow-hidden shadow-lg">
        {song.cover_url ? (
          <img 
            src={song.cover_url} 
            alt={song.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <span className="text-5xl opacity-40">🎵</span>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onPlay(song); }}
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary hover:scale-110 transition-all duration-200 shadow-2xl shadow-primary/40"
          >
            <Play className="h-6 w-6 fill-current ml-0.5" />
          </Button>
          {showAddToLibrary && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleLibraryToggle}
              className={cn(
                "h-11 w-11 rounded-full hover:scale-110 transition-all duration-200",
                inLibrary 
                  ? 'text-primary bg-primary/20 shadow-lg shadow-primary/20' 
                  : 'text-foreground/80 bg-foreground/10 hover:bg-foreground/20'
              )}
            >
              <Heart className={cn("h-5 w-5", inLibrary && "fill-current")} />
            </Button>
          )}
          {onViewDetails && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleViewDetails}
              className="h-11 w-11 rounded-full hover:scale-110 transition-all duration-200 text-foreground/80 bg-foreground/10 hover:bg-accent hover:text-accent-foreground"
            >
              <Info className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Song Info */}
      <div className="space-y-1">
        <h3 className="font-bold text-base truncate text-foreground tracking-tight">
          {song.title}
        </h3>
        <p className="text-sm text-muted-foreground/80 truncate font-medium">
          {song.artist}
        </p>
      </div>

      {/* Subtle glow effect when in library */}
      {inLibrary && (
        <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-primary/20 via-transparent to-accent/20 opacity-50 pointer-events-none" />
      )}
    </div>
  );
};

export default SongCard;
