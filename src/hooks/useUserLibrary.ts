import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLibraryStore } from '@/store/libraryStore';
import { Song } from '@/store/playerStore';
import { toast } from '@/hooks/use-toast';

export const useUserLibrary = () => {
  const { setMyLibrary, addToMyLibrary, removeFromMyLibrary, isInMyLibrary } = useLibraryStore();

  // Fetch user's library on mount
  useEffect(() => {
    fetchUserLibrary();
  }, []);

  const fetchUserLibrary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userSongs } = await supabase
      .from('user_songs')
      .select(`
        song_id,
        songs (*)
      `)
      .eq('user_id', user.id);

    if (userSongs) {
      const librarySongs: Song[] = userSongs
        .filter(us => us.songs)
        .map(us => {
          const song = us.songs as any;
          return {
            song_id_hash: song.song_id_hash,
            title: song.title,
            artist: song.artist,
            album: song.album || 'Unknown Album',
            duration: song.duration,
            audio_url: song.audio_url,
            uploaded_by: song.uploaded_by,
            cover_url: song.cover_url,
          };
        });
      
      setMyLibrary(librarySongs);
    }
  };

  const addSongToLibrary = async (song: Song) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add songs to your library",
        variant: "destructive",
      });
      return;
    }

    // Check if song exists in database
    const { data: existingSong } = await supabase
      .from('songs')
      .select('id')
      .eq('song_id_hash', song.song_id_hash)
      .single();

    if (!existingSong) {
      toast({
        title: "Song not found",
        description: "This song hasn't been uploaded to the cloud yet",
        variant: "destructive",
      });
      return;
    }

    // Check if already in library
    const { data: existing } = await supabase
      .from('user_songs')
      .select('id')
      .eq('user_id', user.id)
      .eq('song_id', existingSong.id)
      .maybeSingle();

    if (existing) {
      toast({
        title: "Already in library",
        description: "This song is already in your library",
      });
      return;
    }

    // Add to user_songs
    const { error } = await supabase
      .from('user_songs')
      .insert({
        user_id: user.id,
        song_id: existingSong.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add song to library",
        variant: "destructive",
      });
      return;
    }

    addToMyLibrary(song);
    toast({
      title: "Added to library",
      description: `${song.title} added to your library`,
    });
  };

  const removeSongFromLibrary = async (songIdHash: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get song id
    const { data: existingSong } = await supabase
      .from('songs')
      .select('id, title')
      .eq('song_id_hash', songIdHash)
      .maybeSingle();

    if (!existingSong) return;

    // Remove from user_songs
    const { error } = await supabase
      .from('user_songs')
      .delete()
      .eq('user_id', user.id)
      .eq('song_id', existingSong.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove song from library",
        variant: "destructive",
      });
      return;
    }

    removeFromMyLibrary(songIdHash);
  };

  return {
    addSongToLibrary,
    removeSongFromLibrary,
    isInMyLibrary,
    refreshLibrary: fetchUserLibrary,
  };
};
