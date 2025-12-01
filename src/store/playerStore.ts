import { create } from 'zustand';

export interface Song {
  song_id_hash: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  audio_url: string;
  uploaded_by?: string;
  cover_url?: string;
}

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  
  // Actions
  setCurrentSong: (song: Song) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setQueue: (songs: Song[]) => void;
  nextSong: () => void;
  previousSong: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  queue: [],
  currentTime: 0,
  duration: 0,
  volume: 1,
  shuffle: false,
  repeat: 'off',

  setCurrentSong: (song) => set({ currentSong: song, isPlaying: true }),
  
  play: () => set({ isPlaying: true }),
  
  pause: () => set({ isPlaying: false }),
  
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  setQueue: (songs) => set({ queue: songs }),
  
  nextSong: () => {
    const { queue, currentSong, repeat, shuffle } = get();
    if (!currentSong || queue.length === 0) return;
    
    const currentIndex = queue.findIndex(s => s.song_id_hash === currentSong.song_id_hash);
    let nextIndex: number;
    
    if (shuffle) {
      // Pick random song that's not current
      const otherIndices = queue.map((_, i) => i).filter(i => i !== currentIndex);
      if (otherIndices.length === 0) {
        nextIndex = currentIndex;
      } else {
        nextIndex = otherIndices[Math.floor(Math.random() * otherIndices.length)];
      }
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        nextIndex = repeat === 'all' ? 0 : currentIndex;
      }
    }
    
    if (nextIndex !== currentIndex || repeat !== 'off') {
      set({ currentSong: queue[nextIndex], currentTime: 0, isPlaying: true });
    }
  },
  
  previousSong: () => {
    const { queue, currentSong, currentTime } = get();
    if (!currentSong || queue.length === 0) return;
    
    // If more than 3 seconds played, restart current song
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    
    const currentIndex = queue.findIndex(s => s.song_id_hash === currentSong.song_id_hash);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    
    set({ currentSong: queue[prevIndex], currentTime: 0, isPlaying: true });
  },
  
  setCurrentTime: (time) => set({ currentTime: time }),
  
  setDuration: (duration) => set({ duration }),
  
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
  
  toggleRepeat: () => set((state) => ({
    repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off'
  })),
}));
