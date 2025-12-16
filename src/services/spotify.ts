const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
// Dynamically determine redirect URI based on current origin
const REDIRECT_URI = `${window.location.origin}/spotify/callback`;
const SCOPES = [
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-top-read"
].join(" ");

// ... (PKCE helpers remain same)

// ... (redirectToSpotifyAuthorize remains same)

// ... (getAccessToken remains same)

export const fetchProfile = async (token: string) => {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return await result.json();
};

export const searchSpotify = async (token: string, query: string, types: string[] = ['track', 'artist', 'album']) => {
  const params = new URLSearchParams({
    q: query,
    type: types.join(','),
    limit: '20'
  });
  
  const result = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return await result.json();
};

export const fetchUserTopItems = async (token: string, type: 'tracks' | 'artists' = 'tracks') => {
  const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?limit=20`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return await result.json();
};

export const fetchUserSavedTracks = async (token: string) => {
  const result = await fetch("https://api.spotify.com/v1/me/tracks?limit=20", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return await result.json();
};

export const playSpotifyTrack = async (token: string, deviceId: string, uri: string) => {
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ uris: [uri] })
  });
};

