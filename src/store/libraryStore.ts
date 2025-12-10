import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from './playerStore';

interface LibraryState {
  cloudSongs: Song[];
  myLibrary: Song[]; // Songs added from cloud to personal library
  playlists: Playlist[];
  recentlyPlayed: Song[];
  
  // Actions
  setCloudSongs: (songs: Song[]) => void;
  setMyLibrary: (songs: Song[]) => void;
  addToMyLibrary: (song: Song) => void;
  removeFromMyLibrary: (songId: string) => void;
  isInMyLibrary: (songId: string) => boolean;
  addToRecentlyPlayed: (song: Song) => void;
  createPlaylist: (name: string) => void;
  addSongToPlaylist: (playlistId: string, song: Song) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: Date;
  coverUrl?: string;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      cloudSongs: [],
      myLibrary: [],
      playlists: [],
      recentlyPlayed: [],
      
      setCloudSongs: (songs) => set({ cloudSongs: songs }),
      
      setMyLibrary: (songs) => set({ myLibrary: songs }),
      
      addToMyLibrary: (song) => set((state) => ({
        myLibrary: [...state.myLibrary, song]
      })),
      
      removeFromMyLibrary: (songId) => set((state) => ({
        myLibrary: state.myLibrary.filter(s => s.song_id_hash !== songId)
      })),
      
      isInMyLibrary: (songId) => {
        return get().myLibrary.some(s => s.song_id_hash === songId);
      },
      
      addToRecentlyPlayed: (song) => set((state) => ({
        recentlyPlayed: [
          song,
          ...state.recentlyPlayed.filter(s => s.song_id_hash !== song.song_id_hash)
        ].slice(0, 20)
      })),
      
      createPlaylist: (name) => set((state) => ({
        playlists: [
          ...state.playlists,
          {
            id: `playlist_${Date.now()}`,
            name,
            songs: [],
            createdAt: new Date(),
          }
        ]
      })),
      
      addSongToPlaylist: (playlistId, song) => set((state) => ({
        playlists: state.playlists.map(playlist =>
          playlist.id === playlistId
            ? { ...playlist, songs: [...playlist.songs, song] }
            : playlist
        )
      })),
      
      removeSongFromPlaylist: (playlistId, songId) => set((state) => ({
        playlists: state.playlists.map(playlist =>
          playlist.id === playlistId
            ? { ...playlist, songs: playlist.songs.filter(s => s.song_id_hash !== songId) }
            : playlist
        )
      })),
    }),
    {
      name: 'youth-tunes-library-storage',
      partialize: (state) => ({
        playlists: state.playlists,
        recentlyPlayed: state.recentlyPlayed,
      }),
    }
  )
);