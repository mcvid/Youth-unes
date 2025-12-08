-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications for others"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Add unique constraint to friends to prevent duplicates
ALTER TABLE public.friends 
ADD CONSTRAINT friends_unique_pair UNIQUE (user_id, friend_id);

-- Update friends RLS to allow inserting friendship for both sides via a trigger
-- First, create a function to handle bidirectional friendship
CREATE OR REPLACE FUNCTION public.handle_friend_request()
RETURNS TRIGGER AS $$
BEGIN
  -- When a friend request is accepted, create the reverse friendship
  IF NEW.status = 'accepted' THEN
    INSERT INTO public.friends (user_id, friend_id, status)
    VALUES (NEW.friend_id, NEW.user_id, 'accepted')
    ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted';
    
    -- Create notification for the friend
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT NEW.friend_id, 'friend_accepted', 
           COALESCE(p.username, 'Someone') || ' is now your friend!',
           'You can now chat with them',
           jsonb_build_object('friend_id', NEW.user_id)
    FROM public.profiles p WHERE p.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for friend requests
DROP TRIGGER IF EXISTS on_friend_request ON public.friends;
CREATE TRIGGER on_friend_request
  AFTER INSERT ON public.friends
  FOR EACH ROW EXECUTE FUNCTION public.handle_friend_request();

-- Create function to notify on new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT NEW.receiver_id, 'new_message',
         'New message from ' || COALESCE(p.username, 'Someone'),
         LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
         jsonb_build_object('sender_id', NEW.sender_id, 'message_id', NEW.id)
  FROM public.profiles p WHERE p.id = NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;