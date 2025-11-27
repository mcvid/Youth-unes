import { useEffect, useState } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore, Song } from '@/store/playerStore';
import { useUserLibrary } from '@/hooks/useUserLibrary';
import { supabase } from '@/integrations/supabase/client';
import SongCard from '@/components/music/SongCard';
import FileScannerModal from '@/components/music/FileScannerModal';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { localSongs, myLibrary, cloudSongs, setCloudSongs } = useLibraryStore();
  const { setCurrentSong, setQueue } = usePlayerStore();
  const { refreshLibrary } = useUserLibrary();
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    refreshLibrary();
  }, []);

  // Check if this is first login and show scanner
  useEffect(() => {
    const checkFirstLogin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const hasScanned = localStorage.getItem(`scanned_${user.id}`);
      
      if (!hasScanned) {
        // Check if user has any local songs OR uploaded songs
        const localSongs = useLibraryStore.getState().localSongs;
        const { data: cloudSongs } = await supabase
          .from('songs')
          .select('id')
          .eq('uploaded_by', user.id)
          .limit(1);

        if (localSongs.length === 0 && (!cloudSongs || cloudSongs.length === 0)) {
          setShowScanner(true);
        }
      }

      setLoading(false);
    };

    checkFirstLogin();
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
    };

    fetchCloudSongs();
  }, [setCloudSongs]);

  const handleCloseScanner = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem(`scanned_${user.id}`, 'true');
    }
    setShowScanner(false);
  };

  const handlePlaySong = (song: Song) => {
    const allSongs = [...localSongs, ...cloudSongs];
    setCurrentSong(song);
    setQueue(allSongs);
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
      <FileScannerModal open={showScanner} onClose={handleCloseScanner} />
      
      <div className="pb-32 px-4 pt-6 animate-fade-in">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">Mcvix Music</span>
          </h1>
          <p className="text-muted-foreground">Discover and enjoy your music</p>
        </header>

        {/* My Music (Local) */}
        {localSongs.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">My Music</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/library')} className="gap-1">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {localSongs.slice(0, 6).map((song) => (
                <SongCard
                  key={song.song_id_hash}
                  song={song}
                  onPlay={handlePlaySong}
                />
              ))}
            </div>
          </section>
        )}

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
                  showAddToLibrary={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {localSongs.length === 0 && cloudSongs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No music yet</p>
            <Button onClick={() => setShowScanner(true)} className="bg-gradient-primary">
              Scan Your Music
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default Home;
