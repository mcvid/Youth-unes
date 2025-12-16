import { useEffect, useState } from 'react';
import { useSpotifyStore } from '@/store/spotifyStore';
import { usePlayerStore } from '@/store/playerStore';
import { playSpotifyTrack } from '@/services/spotify';
import { toast } from 'sonner';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: any;
  }
}

const SpotifyPlayer = () => {
  const accessToken = useSpotifyStore(state => state.accessToken);
  const { 
    currentSong, 
    activeDevice, 
    isPlaying, 
    setSpotifyDeviceId, 
    nextSong, 
    setCurrentTime,
    setDuration,
    pause
  } = usePlayerStore();
  
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    if (!window.Spotify) {
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Harmony Hub Web Player',
        getOAuthToken: (cb: any) => { cb(accessToken); },
        volume: 0.5
      });

      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id);
        setSpotifyDeviceId(device_id);
        setIsReady(true);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
        setIsReady(false);
      });

      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        
        setCurrentTime(state.position / 1000);
        setDuration(state.duration / 1000);
        
        if (state.paused && isPlaying && activeDevice === 'spotify') {
             // Sync pause state if paused externally? 
             // Ideally we control this, but for now we just listen
        }
        
        if (state.paused && state.position === 0 && state.restrictions.disallow_resuming_reasons && state.restrictions.disallow_resuming_reasons[0] === "not_paused") {
             // Track finished
             nextSong();
        }
      });
      
      spotifyPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
          console.error(message);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
          console.error(message);
      });

      spotifyPlayer.addListener('account_error', ({ message }: { message: string }) => {
          console.error(message);
          toast.error("Spotify Premium required for playback");
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };
    
    return () => {
        if (player) {
            player.disconnect();
        }
    };
  }, [accessToken]);

  // Handle Playback Control
  useEffect(() => {
    if (!player || !isReady || activeDevice !== 'spotify' || !currentSong) return;

    const playTrack = async () => {
        // Need to extract Spotify URI or ID. 
        // If it's a "Spotify" song from our app, song_id_hash is the Spotify ID.
        // We need to form a uri: spotify:track:ID
        const trackUri = `spotify:track:${currentSong.song_id_hash}`;
        
        try {
            if (isPlaying) {
                 // Check if it's already the current track in player state to avoid restarting?
                 // For now, simpler to just command play
                 // We use the Web API to start playback on this device
                 const deviceId = usePlayerStore.getState().spotifyDeviceId;
                 if (deviceId) {
                    await playSpotifyTrack(accessToken!, deviceId, trackUri);
                 }
            } else {
                player.pause();
            }
        } catch (e) {
            console.error("Playback failed", e);
        }
    };

    playTrack();
  }, [currentSong?.song_id_hash, isPlaying, activeDevice, isReady, player]);

  // Handle Volume (optional sync)

  return null;
};

export default SpotifyPlayer;
