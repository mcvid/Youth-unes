import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, access_token, method = 'GET', body } = await req.json();

    if (!endpoint || !access_token) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint or access_token" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const spotifyUrl = endpoint.startsWith('https://') 
      ? endpoint 
      : `https://api.spotify.com/v1${endpoint}`;

    console.log(`Calling Spotify API: ${method} ${spotifyUrl}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(spotifyUrl, fetchOptions);
    
    if (res.status === 204) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();

    if (!res.ok) {
      console.error("Spotify API error:", data);
      return new Response(
        JSON.stringify({ error: data.error?.message || 'Spotify API error', status: res.status }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in spotify-api function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
