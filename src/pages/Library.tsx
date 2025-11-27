import { useEffect } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore, Song } from '@/store/playerStore';
import { useUserLibrary } from '@/hooks/useUserLibrary';
import SongList from '@/components/music/SongList';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Smartphone, ListMusic, Plus, Music, Cloud } from 'lucide-react';

const Library = () => {
  const { localSongs, myLibrary, cloudSongs, playlists } = useLibraryStore();
  const { setCurrentSong, setQueue } = usePlayerStore();
  const { refreshLibrary } = useUserLibrary();

  useEffect(() => {
    refreshLibrary();
  }, []);

  const handlePlaySong = (song: Song, source: 'local' | 'library' | 'discover') => {
    setCurrentSong(song);
    if (source === 'local') {
      setQueue(localSongs);
    } else if (source === 'library') {
      setQueue(myLibrary);
    } else {
      setQueue(cloudSongs);
    }
  };

  return (
    <div className="pb-32 px-4 pt-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Music className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Your Library</h1>
            <p className="text-sm text-muted-foreground">
              {localSongs.length + myLibrary.length} songs
            </p>
          </div>
        </div>
      </div>

      {/* Library Tabs */}
      <Tabs defaultValue="music" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 h-12">
          <TabsTrigger value="music" className="gap-2 text-sm">
            <Smartphone className="h-4 w-4" />
            My Music
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2 text-sm">
            <Heart className="h-4 w-4" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-2 text-sm">
            <Cloud className="h-4 w-4" />
            Discover
          </TabsTrigger>
          <TabsTrigger value="playlists" className="gap-2 text-sm">
            <ListMusic className="h-4 w-4" />
            Playlists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="music" className="space-y-4">
          {localSongs.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {localSongs.length} songs scanned from your device
                </p>
              </div>
              <SongList 
                songs={localSongs} 
                onPlay={(song) => handlePlaySong(song, 'local')} 
              />
            </>
          ) : (
            <div className="text-center py-20 glass rounded-xl">
              <div className="mb-6">
                <Smartphone className="mx-auto h-20 w-20 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Local Music</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Scan your device to add your personal music collection
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          {myLibrary.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {myLibrary.length} songs in your favorites
                </p>
              </div>
              <SongList 
                songs={myLibrary} 
                onPlay={(song) => handlePlaySong(song, 'library')} 
              />
            </>
          ) : (
            <div className="text-center py-20 glass rounded-xl">
              <div className="mb-6">
                <Heart className="mx-auto h-20 w-20 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Favorites Yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                Add songs from the cloud library to your favorites
              </p>
              <Button onClick={() => document.querySelector('[value="discover"]')?.dispatchEvent(new Event('click'))}>
                Discover Music
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="discover" className="space-y-4">
          {cloudSongs.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {cloudSongs.length} songs available from the community
                </p>
              </div>
              <SongList 
                songs={cloudSongs} 
                onPlay={(song) => handlePlaySong(song, 'discover')} 
              />
            </>
          ) : (
            <div className="text-center py-20 glass rounded-xl">
              <div className="mb-6">
                <Cloud className="mx-auto h-20 w-20 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nothing to Discover</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Be the first to share music with the community!
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="playlists" className="space-y-4">
          <Button className="w-full bg-gradient-primary gap-2 h-12 text-base">
            <Plus className="h-5 w-5" />
            Create New Playlist
          </Button>
          {playlists.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="glass rounded-xl p-4 hover:bg-card/50 transition-all cursor-pointer group"
                >
                  <div className="aspect-square rounded-lg bg-gradient-secondary mb-3 flex items-center justify-center">
                    <ListMusic className="h-12 w-12 text-foreground/50 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {playlist.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {playlist.songs.length} songs
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 glass rounded-xl">
              <div className="mb-6">
                <ListMusic className="mx-auto h-20 w-20 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Playlists Yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Create playlists to organize your favorite tracks
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Library;
