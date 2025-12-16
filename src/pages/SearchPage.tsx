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
  const [searching, setSearching] = useState(false);
  const { setCurrentSong, setQueue } = usePlayerStore();
  const { search, isConnected } = useSpotify();
  
  // Search universal cloud database & Spotify
  useEffect(() => {
    const searchSongs = async () => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      const lowerQuery = query.toLowerCase();
      
      let combinedResults: Song[] = [];

      // Parallel search
      const searches = [
        supabase
          .from('songs')
          .select('*')
          .or(`title.ilike.%${lowerQuery}%,artist.ilike.%${lowerQuery}%,album.ilike.%${lowerQuery}%`)
          .limit(20)
          .then(({ data }) => {
            if (data) {
                const cloudResults = data.map(song => ({
                    song_id_hash: song.song_id_hash,
                    title: song.title,
                    artist: song.artist,
                    album: song.album || 'Unknown Album',
                    duration: song.duration,
                    audio_url: song.audio_url,
                    uploaded_by: song.uploaded_by,
                    cover_url: song.cover_url,
                }));
                combinedResults = [...combinedResults, ...cloudResults];
            }
          }),
      ];

      if (isConnected) {
        searches.push(
          search(query).then((data) => {
             if (data?.tracks?.items) {
                 const spotifyItems = data.tracks.items.map((track: any) => ({
                    song_id_hash: track.id,
                    title: track.name,
                    artist: track.artists[0].name,
                    album: track.album.name,
                    duration: Math.floor(track.duration_ms / 1000),
                    audio_url: track.preview_url || '',
                    cover_url: track.album.images[0]?.url,
                    uploaded_by: 'Spotify'
                 }));
                 combinedResults = [...combinedResults, ...spotifyItems];
             }
          })
        );
      }

      await Promise.all(searches);
      setSearchResults(combinedResults);
      setSearching(false);
    };

    const debounce = setTimeout(searchSongs, 500);
    return () => clearTimeout(debounce);
  }, [query, isConnected, search]);

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song);
    setQueue(searchResults);
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
                  Results ({searchResults.length})
                </h2>
              </div>
              
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {searchResults.map((song) => (
                    <SongCard
                      key={song.song_id_hash}
                      song={song}
                      onPlay={handlePlaySong}
                      showAddToLibrary={song.uploaded_by !== 'Spotify'}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No results found.</p>
              )}
            </div>
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
