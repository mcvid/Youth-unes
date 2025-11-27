import { useState } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Info,
  Share2,
  ListMusic,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/store/playerStore';
import { useUserLibrary } from '@/hooks/useUserLibrary';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import SongReactions from '@/components/music/SongReactions';
import SongComments from '@/components/music/SongComments';
import SongCredits from '@/components/music/SongCredits';
import { toast } from 'sonner';

const NowPlaying = () => {
  const navigate = useNavigate();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    queue,
    togglePlay,
    nextSong,
    previousSong,
    setCurrentTime,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore();

  const { isInMyLibrary, addSongToLibrary, removeSongFromLibrary } = useUserLibrary();
  const [showVolume, setShowVolume] = useState(false);
  const [activeTab, setActiveTab] = useState('reactions');

  if (!currentSong) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="text-6xl">🎵</span>
        <p className="text-muted-foreground">No song playing</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Browse Music
        </Button>
      </div>
    );
  }

  const inLibrary = isInMyLibrary(currentSong.song_id_hash);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0]);
  };

  const handleFavorite = async () => {
    if (inLibrary) {
      await removeSongFromLibrary(currentSong.song_id_hash);
      toast('Removed from library');
    } else {
      await addSongToLibrary(currentSong);
      toast('Added to library');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentSong.title,
          text: `Listen to ${currentSong.title} by ${currentSong.artist}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast('Link copied to clipboard');
    }
  };

  const handleQueue = () => {
    toast(`${queue.length} songs in queue`);
  };

  return (
    <div className="min-h-screen pb-8 pt-4 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full hover:bg-secondary/80"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-sm font-medium text-muted-foreground">Now Playing</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleQueue}
          className="h-10 w-10 rounded-full hover:bg-secondary/80"
        >
          <ListMusic className="h-5 w-5" />
        </Button>
      </div>

      {/* Album Art */}
      <div className="mb-6">
        <div className="aspect-square rounded-xl overflow-hidden bg-muted shadow-card">
          {currentSong.cover_url ? (
            <img
              src={currentSong.cover_url}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-8xl opacity-30">🎵</span>
            </div>
          )}
        </div>
      </div>

      {/* Song Info + Actions */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{currentSong.title}</h1>
          <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFavorite}
            className={cn(
              "h-10 w-10 rounded-full transition-colors",
              inLibrary ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Heart className={cn("h-5 w-5", inLibrary && "fill-current")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          className="mb-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleShuffle}
          className={cn(
            "h-10 w-10 rounded-full transition-colors",
            shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Shuffle className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={previousSong}
            className="h-12 w-12 rounded-full hover:bg-secondary/80 hover:scale-105 transition-all"
          >
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button
            size="icon"
            onClick={togglePlay}
            className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 hover:scale-105 transition-all shadow-glow"
          >
            {isPlaying ? (
              <Pause className="h-7 w-7" />
            ) : (
              <Play className="h-7 w-7 fill-current ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={nextSong}
            className="h-12 w-12 rounded-full hover:bg-secondary/80 hover:scale-105 transition-all"
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleRepeat}
          className={cn(
            "h-10 w-10 rounded-full transition-colors",
            repeat !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {repeat === 'one' ? (
            <Repeat1 className="h-5 w-5" />
          ) : (
            <Repeat className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVolume(volume > 0 ? 0 : 1)}
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          {volume === 0 ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
        <Slider
          value={[volume * 100]}
          max={100}
          step={1}
          onValueChange={(value) => setVolume(value[0] / 100)}
          className="flex-1"
        />
      </div>

      {/* Social & Credits Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-secondary/30 mb-4">
          <TabsTrigger value="reactions" className="text-xs">
            🔥 React
          </TabsTrigger>
          <TabsTrigger value="comments" className="text-xs">
            <MessageCircle className="h-3 w-3 mr-1" />
            Comments
          </TabsTrigger>
          <TabsTrigger value="credits" className="text-xs">
            <Info className="h-3 w-3 mr-1" />
            Credits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reactions" className="mt-0">
          <SongReactions songId={currentSong.song_id_hash} />
        </TabsContent>

        <TabsContent value="comments" className="mt-0">
          <SongComments songId={currentSong.song_id_hash} currentTime={currentTime} />
        </TabsContent>

        <TabsContent value="credits" className="mt-0">
          <SongCredits 
            songId={currentSong.song_id_hash} 
            songInfo={{
              title: currentSong.title,
              artist: currentSong.artist,
              album: currentSong.album
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NowPlaying;
