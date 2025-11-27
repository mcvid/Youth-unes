-- Extended song metadata for Music Encyclopedia
CREATE TABLE public.song_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  writers TEXT[],
  producers TEXT[],
  instruments TEXT[],
  samples TEXT[],
  production_notes TEXT,
  recording_info TEXT,
  label TEXT,
  release_date DATE,
  genre TEXT[],
  bpm INTEGER,
  key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(song_id)
);

ALTER TABLE public.song_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Song metadata is viewable by everyone"
ON public.song_metadata FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add metadata"
ON public.song_metadata FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Uploaders can update metadata"
ON public.song_metadata FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.songs WHERE songs.id = song_metadata.song_id AND songs.uploaded_by = auth.uid())
);

-- Song reactions (🔥😭🤯 etc.)
CREATE TABLE public.song_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('fire', 'love', 'sad', 'mind_blown', 'vibe', 'skip')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(song_id, user_id)
);

ALTER TABLE public.song_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are viewable by everyone"
ON public.song_reactions FOR SELECT USING (true);

CREATE POLICY "Users can add reactions"
ON public.song_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
ON public.song_reactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
ON public.song_reactions FOR DELETE USING (auth.uid() = user_id);

-- Song comments
CREATE TABLE public.song_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  timestamp_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.song_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
ON public.song_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add comments"
ON public.song_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
ON public.song_comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.song_comments FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on comments
CREATE TRIGGER update_song_comments_updated_at
BEFORE UPDATE ON public.song_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Now Playing status for "what's playing nearby"
CREATE TABLE public.now_playing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.now_playing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public now playing is viewable"
ON public.now_playing FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage own status"
ON public.now_playing FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status"
ON public.now_playing FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own status"
ON public.now_playing FOR DELETE USING (auth.uid() = user_id);