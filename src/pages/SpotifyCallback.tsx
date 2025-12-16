import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpotify } from '@/hooks/useSpotify';

const SpotifyCallback = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const { handleCallback } = useSpotify();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      console.error('Spotify auth error:', error);
      navigate('/');
      return;
    }

    if (code) {
      handleCallback(code).then((success) => {
        // Navigate to home regardless of success, toast will show error if any
        navigate('/');
      });
    }
  }, [code, error, handleCallback, navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
};

export default SpotifyCallback;
