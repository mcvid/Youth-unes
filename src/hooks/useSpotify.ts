import { useSpotifyStore } from '@/store/spotifyStore';
import { redirectToSpotifyAuthorize, getAccessToken, fetchProfile, searchSpotify } from '@/services/spotify';
import { toast } from 'sonner';
import { useState } from 'react';

export const useSpotify = () => {
  const store = useSpotifyStore();
  const [isLoading, setIsLoading] = useState(false);

  const connectSpotify = async () => {
    try {
      await redirectToSpotifyAuthorize();
    } catch (error) {
      console.error(error);
      toast.error("Failed to start login");
    }
  };

  const disconnectSpotify = () => {
    store.logout();
    toast.success("Disconnected");
  };

  const handleCallback = async (code: string) => {
    setIsLoading(true);
    try {
      const data = await getAccessToken(code);
      store.setAccessToken(data.access_token, data.expires_in);
      
      const profile = await fetchProfile(data.access_token);
      store.setUser(profile);
      
      toast.success("Connected to Spotify!");
      return true;
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Login failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const search = async (query: string) => {
    if (!store.accessToken) return null;
    return await searchSpotify(store.accessToken, query);
  };

  return {
    isConnected: !!store.accessToken,
    isLoading,
    user: store.user,
    connectSpotify,
    disconnectSpotify,
    handleCallback,
    search
  };
};
