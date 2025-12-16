const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
// Dynamically determine redirect URI based on current origin
const REDIRECT_URI = `${window.location.origin}/spotify/callback`;
const SCOPES = [
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read"
].join(" ");

// PKCE Helpers
const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input: ArrayBuffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

export const redirectToSpotifyAuthorize = async () => {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  window.localStorage.setItem('code_verifier', codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: REDIRECT_URI,
  });

  console.log("Redirecting to Spotify with URI:", REDIRECT_URI);
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
};

export const getAccessToken = async (code: string) => {
  const codeVerifier = window.localStorage.getItem('code_verifier');

  if (!codeVerifier) {
    throw new Error("No code verifier found");
  }

  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  };

  const response = await fetch("https://accounts.spotify.com/api/token", payload);
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error_description || "Failed to get token");
  }

  return data;
};

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
    limit: '10'
  });
  
  const result = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return await result.json();
};
