import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SPOTIFY_CLIENT_ID = '93d37596b6cb430a94ec42758eb91f8f';
const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-top-read',
  'user-read-playback-state',
  'user-read-recently-played',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export const useSpotify = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<SpotifyTokens | null>(null);

  // Check if user has Spotify connected
  const checkConnection = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsConnected(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('spotify_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        setIsConnected(false);
        setTokens(null);
      } else {
        setIsConnected(true);
        setTokens({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
        });

        // Check if token needs refresh
        if (new Date(data.expires_at) < new Date()) {
          await refreshToken(data.refresh_token, user.id);
        }
      }
    } catch (err) {
      console.error('Error checking Spotify connection:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Initiate Spotify login
  const connectSpotify = () => {
    const redirectUri = `${window.location.origin}/spotify/callback`;
    const state = crypto.randomUUID();
    
    // Store state for validation
    localStorage.setItem('spotify_auth_state', state);
    
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', SPOTIFY_SCOPES);
    authUrl.searchParams.append('state', state);
    
    window.location.href = authUrl.toString();
  };

  // Handle callback and exchange code for tokens
  const handleCallback = async (code: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: { action: 'exchange', code }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to exchange code');
      }

      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      // Store tokens in database
      const { error: upsertError } = await supabase
        .from('spotify_tokens')
        .upsert({
          user_id: user.id,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: expiresAt,
        });

      if (upsertError) {
        throw upsertError;
      }

      setTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
      });
      setIsConnected(true);
      toast.success('Spotify connected successfully!');

      return true;
    } catch (err: any) {
      console.error('Error handling Spotify callback:', err);
      toast.error(err.message || 'Failed to connect Spotify');
      return false;
    }
  };

  // Refresh access token
  const refreshToken = async (refreshTokenValue: string, userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: { action: 'refresh', refresh_token: refreshTokenValue }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message);
      }

      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      await supabase
        .from('spotify_tokens')
        .update({
          access_token: data.access_token,
          refresh_token: data.refresh_token || refreshTokenValue,
          expires_at: expiresAt,
        })
        .eq('user_id', userId);

      setTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshTokenValue,
        expires_at: expiresAt,
      });

      return data.access_token;
    } catch (err) {
      console.error('Error refreshing token:', err);
      setIsConnected(false);
      setTokens(null);
      return null;
    }
  };

  // Get valid access token (refresh if needed)
  const getAccessToken = async (): Promise<string | null> => {
    if (!tokens) return null;

    if (new Date(tokens.expires_at) < new Date()) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      return await refreshToken(tokens.refresh_token, user.id);
    }

    return tokens.access_token;
  };

  // Call Spotify API
  const callSpotifyApi = async (endpoint: string, method = 'GET', body?: any) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      toast.error('Please connect your Spotify account');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('spotify-api', {
        body: { endpoint, access_token: accessToken, method, body }
      });

      if (error || data?.error) {
        if (data?.status === 401) {
          // Token expired, try refresh
          const { data: { user } } = await supabase.auth.getUser();
          if (user && tokens) {
            const newToken = await refreshToken(tokens.refresh_token, user.id);
            if (newToken) {
              return callSpotifyApi(endpoint, method, body);
            }
          }
        }
        throw new Error(data?.error || error?.message);
      }

      return data;
    } catch (err: any) {
      console.error('Spotify API error:', err);
      toast.error('Failed to fetch from Spotify');
      return null;
    }
  };

  // Disconnect Spotify
  const disconnectSpotify = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('spotify_tokens')
        .delete()
        .eq('user_id', user.id);

      setIsConnected(false);
      setTokens(null);
      toast.success('Spotify disconnected');
    } catch (err) {
      console.error('Error disconnecting Spotify:', err);
      toast.error('Failed to disconnect Spotify');
    }
  };

  return {
    isConnected,
    isLoading,
    connectSpotify,
    handleCallback,
    disconnectSpotify,
    callSpotifyApi,
    checkConnection,
  };
};
