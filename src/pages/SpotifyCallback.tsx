import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpotify } from '@/hooks/useSpotify';
import { Loader2, Music, CheckCircle, XCircle } from 'lucide-react';

const SpotifyCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useSpotify();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      // Check for error from Spotify
      if (errorParam) {
        setStatus('error');
        setError(errorParam === 'access_denied' 
          ? 'Access denied. You need to authorize the app to connect.'
          : `Spotify error: ${errorParam}`);
        return;
      }

      // Validate state
      const storedState = localStorage.getItem('spotify_auth_state');
      if (state !== storedState) {
        setStatus('error');
        setError('Invalid state parameter. Please try again.');
        return;
      }

      localStorage.removeItem('spotify_auth_state');

      if (!code) {
        setStatus('error');
        setError('No authorization code received');
        return;
      }

      const success = await handleCallback(code);
      
      if (success) {
        setStatus('success');
        setTimeout(() => {
          navigate('/profile', { replace: true });
        }, 1500);
      } else {
        setStatus('error');
        setError('Failed to connect Spotify. Please try again.');
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
          {status === 'loading' && (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle className="w-10 h-10 text-green-500" />
          )}
          {status === 'error' && (
            <XCircle className="w-10 h-10 text-destructive" />
          )}
        </div>

        <div className="space-y-2">
          {status === 'loading' && (
            <>
              <h1 className="text-2xl font-bold">Connecting to Spotify...</h1>
              <p className="text-muted-foreground">Please wait while we set up your connection</p>
            </>
          )}
          {status === 'success' && (
            <>
              <h1 className="text-2xl font-bold text-green-500">Connected!</h1>
              <p className="text-muted-foreground">Redirecting you back...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <h1 className="text-2xl font-bold text-destructive">Connection Failed</h1>
              <p className="text-muted-foreground">{error}</p>
              <button 
                onClick={() => navigate('/profile')}
                className="mt-4 text-primary hover:underline"
              >
                Go back to profile
              </button>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Music className="w-4 h-4" />
          <span className="text-sm">Powered by Spotify</span>
        </div>
      </div>
    </div>
  );
};

export default SpotifyCallback;
