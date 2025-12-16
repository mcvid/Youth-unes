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
  Minimize2,
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
import FloatingPlayer from '@/components/player/FloatingPlayer';
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
  const [isFloating, setIsFloating] = useState(false);

  if (!currentSong) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="w-24 h-24 rounded-2xl bg-card flex items-center justify-center shadow-xl">
          <span className="text-5xl">🎵</span>
        </div>
        <p className="text-muted-foreground font-medium">No song playing</p>
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="rounded-full px-6"
        >
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

  // Floating player mode
  if (isFloating) {
    return (
      <FloatingPlayer 
        isMinimized={isFloating}
        onMaximize={() => setIsFloating(false)}
        onClose={() => setIsFloating(false)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Premium Card Container */}
      <div className="max-w-md mx-auto px-4 pt-4">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-11 w-11 rounded-full bg-card/80 hover:bg-card shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Now Playing
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFloating(true)}
            className="h-11 w-11 rounded-full bg-card/80 hover:bg-card shadow-sm"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Player Card */}
        <div className="bg-card rounded-3xl p-6 shadow-2xl shadow-background/50 border border-border/20">
          
          {/* Album Art */}
          <div className="mb-6">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-xl shadow-primary/10 border-4 border-background/50">
              {currentSong.cover_url ? (
                <img
                  src={currentSong.cover_url}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/10 to-secondary">
                  <span className="text-8xl opacity-40">🎵</span>
                </div>
              )}
            </div>
          </div>

          {/* Song Info - Centered */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight truncate mb-1">
              {currentSong.title}
            </h1>
            <p className="text-sm text-muted-foreground font-medium truncate">
              {currentSong.artist}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="mb-3"
            />
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Panel */}
          <div className="flex items-center justify-between mb-6">
            {/* Heart / Like */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavorite}
              className={cn(
                "h-12 w-12 rounded-full transition-all duration-200",
                inLibrary 
                  ? "text-primary bg-primary/10 hover:bg-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-card"
              )}
            >
              <Heart className={cn("h-5 w-5", inLibrary && "fill-current")} />
            </Button>

            {/* Previous */}
            <Button
              variant="ghost"
              size="icon"
              onClick={previousSong}
              className="h-12 w-12 rounded-full hover:bg-secondary/80 hover:scale-105 transition-all"
            >
              <SkipBack className="h-6 w-6" />
            </Button>

            {/* Play/Pause - Main Button */}
            <Button
              size="icon"
              onClick={togglePlay}
              className="h-16 w-16 rounded-full bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-all shadow-xl"
            >
              {isPlaying ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="h-7 w-7 fill-current ml-1" />
              )}
            </Button>

            {/* Next */}
            <Button
              variant="ghost"
              size="icon"
              onClick={nextSong}
              className="h-12 w-12 rounded-full hover:bg-secondary/80 hover:scale-105 transition-all"
            >
              <SkipForward className="h-6 w-6" />
            </Button>

            {/* Queue / Info */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleQueue}
              className="h-12 w-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-card"
            >
              <ListMusic className="h-5 w-5" />
            </Button>
          </div>

          {/* Secondary Controls */}
          <div className="flex items-center justify-center gap-6 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              className={cn(
                "h-10 w-10 rounded-full transition-colors",
                shuffle ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              className={cn(
                "h-10 w-10 rounded-full transition-colors",
                repeat !== 'off' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {repeat === 'one' ? (
                <Repeat1 className="h-4 w-4" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVolume(!showVolume)}
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Volume Slider (Collapsible) */}
          {showVolume && (
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary/30 rounded-xl animate-fade-in">
              <VolumeX className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0] / 100)}
                className="flex-1"
              />
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Social & Credits Section */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-card/50 rounded-2xl p-1 mb-4">
              <TabsTrigger 
                value="reactions" 
                className="rounded-xl text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                🔥 React
              </TabsTrigger>
              <TabsTrigger 
                value="comments" 
                className="rounded-xl text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Comments
              </TabsTrigger>
              <TabsTrigger 
                value="credits" 
                className="rounded-xl text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <Info className="h-3 w-3 mr-1" />
                Credits
              </TabsTrigger>
            </TabsList>

            <div className="bg-card/30 rounded-2xl p-4">
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
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default NowPlaying;
