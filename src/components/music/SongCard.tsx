import { Song } from '@/store/playerStore';
import { Play, Heart } from 'lucide-react';
import { useUserLibrary } from '@/hooks/useUserLibrary';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SongCardProps {
  song: Song;
  onPlay: (song: Song) => void;
  showAddToLibrary?: boolean;
  className?: string;
}

const SongCard = ({ song, onPlay, showAddToLibrary = false, className }: SongCardProps) => {
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
  return (
    <div 
      className={cn(
        "group relative bg-secondary/40 rounded-md p-3 hover:bg-secondary/60 transition-all cursor-pointer",
        "border border-border/50 hover:border-primary/20",
        className
      )}
      onClick={() => onPlay(song)}
    >
      {/* Album Art */}
      <div className="relative mb-2.5 aspect-square rounded overflow-hidden bg-muted">
        {song.cover_url ? (
          <img 
            src={song.cover_url} 
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-4xl opacity-30">🎵</span>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center hover:scale-110 transition-transform">
            <Play className="h-5 w-5 fill-current" />
          </div>
          {showAddToLibrary && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleLibraryToggle}
              className={cn(
                "h-10 w-10 rounded-full hover:scale-110 transition-transform",
                inLibrary ? 'text-primary bg-primary/20' : 'text-white bg-white/20'
              )}
            >
              <Heart className={cn("h-4 w-4", inLibrary && "fill-current")} />
            </Button>
          )}
        </div>
      </div>

      {/* Song Info */}
      <div className="space-y-0.5">
        <h3 className="font-medium text-sm truncate text-foreground">{song.title}</h3>
        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
      </div>
    </div>
  );
};

export default SongCard;
