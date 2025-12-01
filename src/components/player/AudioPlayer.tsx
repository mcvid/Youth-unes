import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';

/**
 * AudioPlayer - Hidden component that manages the actual HTML audio element
 * This connects the player store state to the browser's audio API
 */
const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    currentSong,
    isPlaying,
    currentTime,
    volume,
    repeat,
    setCurrentTime,
    setDuration,
    nextSong,
    pause,
  } = usePlayerStore();

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // Set up event listeners
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (repeat === 'all') {
        nextSong();
      } else {
        pause();
      }
    };

    const handleError = (e: ErrorEvent) => {
      console.error('Audio playback error:', e);
      pause();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError as any);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError as any);
      audio.pause();
      audio.src = '';
    };
  }, [setCurrentTime, setDuration, nextSong, pause, repeat]);

  // Handle song changes
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    
    // Only change source if song actually changed
    if (audio.src !== currentSong.audio_url) {
      audio.src = currentSong.audio_url;
      audio.load();
    }

    if (isPlaying) {
      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        pause();
      });
    }
  }, [currentSong?.song_id_hash, isPlaying, pause]);

  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    if (isPlaying) {
      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        pause();
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, pause]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle seek
  useEffect(() => {
    if (audioRef.current && Math.abs(audioRef.current.currentTime - currentTime) > 1) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  return null; // This component doesn't render anything
};

export default AudioPlayer;
