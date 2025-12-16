import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { supabase } from '@/integrations/supabase/client';
import SongCard from '@/components/music/SongCard';
import { Song } from '@/store/playerStore';
import { useSpotify } from '@/hooks/useSpotify';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const { setCurrentSong, setQueue } = usePlayerStore();
  const { search, isConnected } = useSpotify();

  // Search universal cloud database & Spotify
  useEffect(() => {
    const searchSongs = async () => {
      if (!query.trim()) {
        setSearchResults([]);
        setSpotifyResults([]);
        return;
      }

      setSearching(true);
      const lowerQuery = query.toLowerCase();

      // Parallel search
      const searches = [
        supabase
          .from('songs')
          .select('*')
          .or(`title.ilike.%${lowerQuery}%,artist.ilike.%${lowerQuery}%,album.ilike.%${lowerQuery}%`)
          .limit(20)
          .then(({ data }) => {
            if (data) {
                setSearchResults(data.map(song => ({
                    song_id_hash: song.song_id_hash,
                    title: song.title,
                    artist: song.artist,
                    album: song.album || 'Unknown Album',
                    duration: song.duration,
                    audio_url: song.audio_url,
                    uploaded_by: song.uploaded_by,
                    cover_url: song.cover_url,
                })));
            }
          }),
      ];

      if (isConnected) {
        searches.push(
          search(query).then((data) => {
             if (data?.tracks?.items) {
                 setSpotifyResults(data.tracks.items);
             }
          })
        );
      }

      await Promise.all(searches);
      setSearching(false);
    };

    const debounce = setTimeout(searchSongs, 500);
    return () => clearTimeout(debounce);
  }, [query, isConnected, search]);

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song);
    setQueue(searchResults);
  };

  const handlePlaySpotify = (track: any) => {
      // For now, we can only play if there is a preview url, or we just log it
      if (track.preview_url) {
          const song: Song = {
              song_id_hash: track.id,
              title: track.name,
              artist: track.artists[0].name,
              album: track.album.name,
              duration: Math.floor(track.duration_ms / 1000),
              audio_url: track.preview_url,
              cover_url: track.album.images[0]?.url,
              uploaded_by: 'Spotify'
          };
          setCurrentSong(song);
          // Queueing logic for mixed sources is complex, just play single for now
      } else {
          window.open(track.external_urls.spotify, '_blank');
      }
  };

  return (
    <div className="pb-32 px-4 pt-6 animate-fade-in">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Discover Music</h1>
        <p className="text-muted-foreground mb-6">Search the universal cloud library {isConnected && "& Spotify"}</p>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search songs, artists, albums..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-14 bg-card/50 border-border text-base"
          />
        </div>
      </div>

      {/* Results */}
      {query.trim() ? (
        <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Community Results ({searchResults.length})
                </h2>
              </div>
              
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {searchResults.map((song) => (
                    <SongCard
                      key={song.song_id_hash}
                      song={song}
                      onPlay={handlePlaySong}
                      showAddToLibrary={true}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No community results found.</p>
              )}
            </div>

            {isConnected && spotifyResults.length > 0 && (
                <div>
                     <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                           Spotify Results <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Pro</span>
                        </h2>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {spotifyResults.map((track) => (
                             <SongCard
                                key={track.id}
                                song={{
                                    song_id_hash: track.id,
                                    title: track.name,
                                    artist: track.artists[0].name,
                                    album: track.album.name,
                                    duration: Math.floor(track.duration_ms / 1000),
                                    audio_url: track.preview_url || '',
                                    cover_url: track.album.images[0]?.url,
                                    uploaded_by: 'Spotify'
                                }}
                                onPlay={() => handlePlaySpotify(track)}
                                showAddToLibrary={false} // Different logic needed for adding to library
                              />
                        ))}
                      </div>
                </div>
            )}
        </div>
      ) : (
        <div className="text-center py-20 glass rounded-xl">
          <Search className="mx-auto h-20 w-20 text-muted-foreground/50 mb-6" />
          <h3 className="text-xl font-semibold mb-2">Search the Cloud</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Search millions of songs shared by the community. 
            {isConnected && " Plus millions more from Spotify."}
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
