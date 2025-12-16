import { useEffect, useState } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore, Song } from '@/store/playerStore';
import { useUserLibrary } from '@/hooks/useUserLibrary';
import { supabase } from '@/integrations/supabase/client';
import SongCard from '@/components/music/SongCard';
import SongDetailsModal from '@/components/music/SongDetailsModal';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSpotifyStore } from '@/store/spotifyStore';
import { fetchUserTopItems, fetchUserSavedTracks, fetchUserPlaylists, fetchRecommendations } from '@/services/spotify';

const Home = () => {
  const { myLibrary, cloudSongs, setCloudSongs } = useLibraryStore();
  const { setCurrentSong, setQueue } = usePlayerStore();
  const { refreshLibrary } = useUserLibrary();
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Spotify Integration


  useEffect(() => {
    refreshLibrary();
  }, []);

  // Spotify Integration State
  const { accessToken } = useSpotifyStore();
  const [spotifyTopTracks, setSpotifyTopTracks] = useState<Song[]>([]);
  const [spotifySavedTracks, setSpotifySavedTracks] = useState<Song[]>([]);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<Song[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    refreshLibrary();
  }, []);

  // Fetch Spotify Data (Top Tracks, Playlists, Recommendations)
  useEffect(() => {
    const fetchSpotifyData = async () => {
        if (!accessToken) return;
        try {
            // 1. Fetch User's Top Tracks
            const topTracks = await fetchUserTopItems(accessToken, 'tracks');
            let topTrackIds: string[] = [];
            
            if (topTracks.items) {
                const mappedTopTracks = topTracks.items.map((t: any) => {
                    topTrackIds.push(t.id); // Collect IDs for seeding recommendations
                    return {
                        song_id_hash: t.id,
                        title: t.name,
                        artist: t.artists[0].name,
                        album: t.album.name,
                        duration: Math.floor(t.duration_ms / 1000),
                        audio_url: t.preview_url || '',
                        cover_url: t.album.images[0]?.url,
                        uploaded_by: 'Spotify'
                    };
                });
                setSpotifyTopTracks(mappedTopTracks);
            }

            // 2. Fetch User's Saved Tracks (Likes)
            const savedTracks = await fetchUserSavedTracks(accessToken);
            if (savedTracks.items) {
                setSpotifySavedTracks(savedTracks.items.map((item: any) => ({
                    song_id_hash: item.track.id,
                    title: item.track.name,
                    artist: item.track.artists[0].name,
                    album: item.track.album.name,
                    duration: Math.floor(item.track.duration_ms / 1000),
                    audio_url: item.track.preview_url || '',
                    cover_url: item.track.album.images[0]?.url,
                    uploaded_by: 'Spotify'
                })));
            }

            // 3. Fetch User's Playlists
            const playlists = await fetchUserPlaylists(accessToken);
            if (playlists.items) {
                setSpotifyPlaylists(playlists.items);
            }

            // 4. Fetch Recommendations (seeded by top tracks)
            // We use the first 5 top tracks as seeds
            if (topTrackIds.length > 0) {
                const recs = await fetchRecommendations(accessToken, topTrackIds);
                if (recs.tracks) {
                    setRecommendations(recs.tracks.map((t: any) => ({
                        song_id_hash: t.id,
                        title: t.name,
                        artist: t.artists[0].name,
                        album: t.album.name,
                        duration: Math.floor(t.duration_ms / 1000),
                        audio_url: t.preview_url || '',
                        cover_url: t.album.images[0]?.url,
                        uploaded_by: 'Spotify'
                    })));
                }
            }

        } catch (e) {
            console.error("Failed to fetch Spotify data", e);
        }
    };
    fetchSpotifyData();
  }, [accessToken]);

  // Fetch cloud songs on mount
  useEffect(() => {
    const fetchCloudSongs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch all songs from database
      const { data: songs } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (songs) {
        // Separate: cloud = songs from other users only
        const otherSongs = songs.filter(s => s.uploaded_by !== user?.id);
        
        setCloudSongs(otherSongs.map(song => ({
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
      
      setLoading(false);
    };

    fetchCloudSongs();
  }, [setCloudSongs]);

  const handlePlaySong = (song: Song) => {
    const allSongs = [...myLibrary, ...cloudSongs];
    setCurrentSong(song);
    setQueue(allSongs);
  };

  const handleViewDetails = (song: Song) => {
    setSelectedSong(song);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4 animate-pulse"></div>
          <p className="text-muted-foreground">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SongDetailsModal 
        song={selectedSong} 
        open={showDetails} 
        onOpenChange={setShowDetails}
        onPlay={handlePlaySong}
      />
      
      <div className="pb-32 px-4 pt-6 animate-fade-in">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">Youth Tunes</span>
          </h1>
          <p className="text-muted-foreground">Discover and stream your music</p>
        </header>

        {/* Favorites */}
        {myLibrary.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Your Favorites</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/library')} className="gap-1">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {myLibrary.slice(0, 6).map((song) => (
                <SongCard
                  key={song.song_id_hash}
                  song={song}
                  onPlay={handlePlaySong}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </section>
        )}

        {/* Spotify Recommendations - Automatically loaded based on top tracks */}
        {recommendations.length > 0 && (
          <section className="mb-8">
             <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                  Recommended for You <span className="text-xs bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded-full">Spotify</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {recommendations.map((song) => (
                <SongCard
                  key={song.song_id_hash}
                  song={song}
                  onPlay={handlePlaySong}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </section>
        )}

        {/* User's Spotify Playlists - Horizontal Scrollable List */}
        {spotifyPlaylists.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                Your Playlists <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Spotify</span>
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {spotifyPlaylists.map((playlist) => (
                    <div 
                        key={playlist.id} 
                        className="flex-shrink-0 w-40 cursor-pointer group"
                        onClick={() => window.open(playlist.external_urls.spotify, '_blank')}
                    >
                        <div className="relative aspect-square mb-2 overflow-hidden rounded-md">
                             <img 
                                src={playlist.images?.[0]?.url || '/placeholder.png'} 
                                alt={playlist.name}
                                className="object-cover w-full h-full transition-transform group-hover:scale-105"
                             />
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <ChevronRight className="text-white w-8 h-8" />
                             </div>
                        </div>
                        <h3 className="font-semibold truncate">{playlist.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                            {playlist.tracks.total} tracks
                        </p>
                    </div>
                ))}
            </div>
          </section>
        )}

        {/* Spotify Top Tracks */}
        {spotifyTopTracks.length > 0 && (
          <section className="mb-8">
             <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                  Your Top Tracks <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Spotify</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {spotifyTopTracks.map((song) => (
                <SongCard
                  key={song.song_id_hash}
                  song={song}
                  onPlay={handlePlaySong}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </section>
        )}

        {/* Spotify Saved Tracks */}
        {spotifySavedTracks.length > 0 && (
          <section className="mb-8">
             <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                  Liked Songs <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Spotify</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {spotifySavedTracks.map((song) => (
                <SongCard
                  key={song.song_id_hash}
                  song={song}
                  onPlay={handlePlaySong}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </section>
        )}

        {/* Discover */}
        {cloudSongs.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Discover</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/search')} className="gap-1">
                Browse All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {cloudSongs.slice(0, 12).map((song) => (
                <SongCard
                  key={song.song_id_hash}
                  song={song}
                  onPlay={handlePlaySong}
                  onViewDetails={handleViewDetails}
                  showAddToLibrary={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {myLibrary.length === 0 && cloudSongs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No music available yet</p>
            <Button onClick={() => navigate('/search')} className="bg-gradient-primary">
              Browse Music
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default Home;