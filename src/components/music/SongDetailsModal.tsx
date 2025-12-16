import { Song } from '@/store/playerStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Heart, Share2, Clock, Album, User } from 'lucide-react';
import { useUserLibrary } from '@/hooks/useUserLibrary';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SongDetailsModalProps {
  song: Song | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlay: (song: Song) => void;
}

const SongDetailsModal = ({ song, open, onOpenChange, onPlay }: SongDetailsModalProps) => {
  const { isInMyLibrary, addSongToLibrary, removeSongFromLibrary } = useUserLibrary();
  
  if (!song) return null;
  
  const inLibrary = isInMyLibrary(song.song_id_hash);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFavorite = async () => {
    if (inLibrary) {
      await removeSongFromLibrary(song.song_id_hash);
      toast('Removed from library');
    } else {
      await addSongToLibrary(song);
      toast('Added to library');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: song.title,
          text: `Listen to ${song.title} by ${song.artist}`,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      toast('Link copied to clipboard');
    }
  };

  const handlePlay = () => {
    onPlay(song);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Song Details</DialogTitle>
        </DialogHeader>
        
        {/* Album Art */}
        <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
          {song.cover_url ? (
            <img
              src={song.cover_url}
              alt={song.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-8xl opacity-30">🎵</span>
            </div>
          )}
        </div>

        {/* Song Info */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">{song.title}</h2>
            <p className="text-muted-foreground">{song.artist}</p>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            {song.album && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Album className="h-4 w-4" />
                <span>{song.album}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(song.duration)}</span>
            </div>
            {song.uploaded_by && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Uploaded by user</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handlePlay} className="flex-1 gap-2">
              <Play className="h-4 w-4 fill-current" />
              Play
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleFavorite}
              className={cn(inLibrary && "text-primary border-primary")}
            >
              <Heart className={cn("h-4 w-4", inLibrary && "fill-current")} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SongDetailsModal;
