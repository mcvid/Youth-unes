-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create songs table (global shared library)
CREATE TABLE public.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id_hash text UNIQUE NOT NULL,
  title text NOT NULL,
  artist text NOT NULL,
  album text,
  duration integer NOT NULL,
  audio_url text NOT NULL,
  cover_url text,
  uploaded_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on songs
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- Songs policies (all users can view, authenticated can upload)
CREATE POLICY "Songs are viewable by everyone"
  ON public.songs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert songs"
  ON public.songs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Create user_songs table (tracks which songs are in each user's library)
CREATE TABLE public.user_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  song_id uuid REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, song_id)
);

-- Enable RLS on user_songs
ALTER TABLE public.user_songs ENABLE ROW LEVEL SECURITY;

-- User songs policies
CREATE POLICY "Users can view own songs"
  ON public.user_songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add songs to library"
  ON public.user_songs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove songs from library"
  ON public.user_songs FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('songs', 'songs', true);

-- Storage policies for songs bucket
CREATE POLICY "Anyone can view songs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'songs');

CREATE POLICY "Authenticated users can upload songs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'songs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();