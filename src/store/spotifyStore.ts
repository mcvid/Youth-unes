import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SpotifyProfile {
  display_name: string;
  email: string;
  images: { url: string }[];
  id: string;
  followers: { total: number };
}

interface SpotifyState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: SpotifyProfile | null;
  setAccessToken: (token: string, expiresIn: number) => void;
  setUser: (user: SpotifyProfile) => void;
  logout: () => void;
}

export const useSpotifyStore = create<SpotifyState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      setAccessToken: (token, expiresIn) => {
        const expiresAt = Date.now() + expiresIn * 1000;
        set({ accessToken: token, expiresAt });
      },
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, expiresAt: null, user: null }),
    }),
    {
      name: 'spotify-storage',
    }
  )
);
