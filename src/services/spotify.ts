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

// ... (playSpotifyTrack above)

/**
 * Fetch the current user's playlists
 * Useful for displaying "Your Playlists" on Home
 */
export const fetchUserPlaylists = async (token: string) => {
  const result = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return await result.json();
};

/**
 * Fetch recommendations based on seed tracks
 * @param seedTracks - Array of track IDs (max 5)
 */
export const fetchRecommendations = async (token: string, seedTracks: string[]) => {
  if (seedTracks.length === 0) return { tracks: [] };
  
  const params = new URLSearchParams({
    seed_tracks: seedTracks.slice(0, 5).join(','),
    limit: '20'
  });

  const result = await fetch(`https://api.spotify.com/v1/recommendations?${params.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return await result.json();
};

/**
 * Refresh Access Token Placeholder
 * 
 * To implement this permanently:
 * 1. You need a backend service (or Supabase Edge Function) to hold the Client Secret.
 * 2. This function would call that backend with the `refresh_token`.
 * 3. The backend returns a new `access_token`.
 * 
 * Client-side only apps (Implicit/PKCE) often just re-authenticate via redirect.
 */
export const refreshAccessToken = async (refreshToken: string) => {
    console.log("Token refresh not implemented. Redirecting to login if expired.");
    // Implementation would look like: 
    // const response = await fetch('/api/refresh_token', { body: { refreshToken } });
    return null;
};
