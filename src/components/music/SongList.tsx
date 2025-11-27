import { PlayArrow, MoreVert } from '@mui/icons-material';
import { Song } from '@/store/playerStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SongListProps {
  songs: Song[];
  onPlay: (song: Song) => void;
  className?: string;
}

const SongList = ({ songs, onPlay, className }: SongListProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("space-y-1", className)}>
      {songs.map((song, index) => (
        <div
          key={song.song_id_hash}
          className="group flex items-center gap-3 p-3 rounded-lg hover:bg-card/50 transition-all cursor-pointer"
          onClick={() => onPlay(song)}
        >
          {/* Index / Play Button */}
          <div className="w-8 flex items-center justify-center text-muted-foreground">
            <span className="group-hover:hidden text-sm">{index + 1}</span>
            <PlayArrow className="hidden group-hover:block" />
          </div>

          {/* Album Art */}
          <div className="w-12 h-12 rounded bg-gradient-primary flex-shrink-0 overflow-hidden">
            {song.cover_url ? (
              <img 
                src={song.cover_url} 
                alt={song.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-xl">🎵</span>
              </div>
            )}
          </div>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{song.title}</p>
            <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
          </div>

          {/* Album */}
          <div className="hidden md:block flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{song.album}</p>
          </div>

          {/* Duration */}
          <div className="text-sm text-muted-foreground w-12 text-right">
            {formatDuration(song.duration)}
          </div>

          {/* More Options */}
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open options menu
            }}
          >
            <MoreVert className="h-5 w-5" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default SongList;
