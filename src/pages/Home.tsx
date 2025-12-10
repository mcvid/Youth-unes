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

const Home = () => {
  const { myLibrary, cloudSongs, setCloudSongs } = useLibraryStore();
  const { setCurrentSong, setQueue } = usePlayerStore();
  const { refreshLibrary } = useUserLibrary();
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    refreshLibrary();
  }, []);

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