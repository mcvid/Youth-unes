import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ReactionType = 'fire' | 'love' | 'sad' | 'mind_blown' | 'vibe' | 'skip';

interface Reaction {
  id: string;
  song_id: string;
  user_id: string;
  reaction: ReactionType;
  created_at: string;
}

interface Comment {
  id: string;
  song_id: string;
  user_id: string;
  content: string;
  timestamp_seconds: number | null;
  created_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface ReactionCount {
  reaction: ReactionType;
  count: number;
}

export const useSongReactions = (songId: string | undefined) => {
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchReactions = useCallback(async () => {
    if (!songId) return;
    
    try {
      // Get song UUID from song_id_hash
      const { data: song } = await supabase
        .from('songs')
        .select('id')
        .eq('song_id_hash', songId)
        .maybeSingle();
      
      if (!song) return;

      // Get all reactions for this song
      const { data: allReactions } = await supabase
        .from('song_reactions')
        .select('reaction')
        .eq('song_id', song.id);

      if (allReactions) {
        const counts: Record<ReactionType, number> = {
          fire: 0, love: 0, sad: 0, mind_blown: 0, vibe: 0, skip: 0
        };
        allReactions.forEach(r => {
          counts[r.reaction as ReactionType]++;
        });
        setReactions(Object.entries(counts).map(([reaction, count]) => ({
          reaction: reaction as ReactionType,
          count
        })));
      }

      // Get current user's reaction
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userReactionData } = await supabase
          .from('song_reactions')
          .select('reaction')
          .eq('song_id', song.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setUserReaction(userReactionData?.reaction as ReactionType || null);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  }, [songId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const toggleReaction = async (reaction: ReactionType) => {
    if (!songId) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Sign in to react', variant: 'destructive' });
        return;
      }

      const { data: song } = await supabase
        .from('songs')
        .select('id')
        .eq('song_id_hash', songId)
        .maybeSingle();
      
      if (!song) return;

      if (userReaction === reaction) {
        // Remove reaction
        await supabase
          .from('song_reactions')
          .delete()
          .eq('song_id', song.id)
          .eq('user_id', user.id);
        setUserReaction(null);
      } else if (userReaction) {
        // Update reaction
        await supabase
          .from('song_reactions')
          .update({ reaction })
          .eq('song_id', song.id)
          .eq('user_id', user.id);
        setUserReaction(reaction);
      } else {
        // Insert new reaction
        await supabase
          .from('song_reactions')
          .insert({ song_id: song.id, user_id: user.id, reaction });
        setUserReaction(reaction);
      }

      fetchReactions();
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return { reactions, userReaction, toggleReaction, loading };
};

export const useSongComments = (songId: string | undefined) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    if (!songId) return;

    try {
      const { data: song } = await supabase
        .from('songs')
        .select('id')
        .eq('song_id_hash', songId)
        .maybeSingle();
      
      if (!song) return;

      const { data: commentsData } = await supabase
        .from('song_comments')
        .select(`
          id,
          song_id,
          user_id,
          content,
          timestamp_seconds,
          created_at
        `)
        .eq('song_id', song.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (commentsData) {
        // Fetch profiles separately
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));
        
        setComments(commentsData.map(c => ({
          ...c,
          profile: profileMap.get(c.user_id) || { username: null, avatar_url: null }
        })));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [songId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = async (content: string, timestampSeconds?: number) => {
    if (!songId || !content.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Sign in to comment', variant: 'destructive' });
        return;
      }

      const { data: song } = await supabase
        .from('songs')
        .select('id')
        .eq('song_id_hash', songId)
        .maybeSingle();
      
      if (!song) return;

      await supabase
        .from('song_comments')
        .insert({
          song_id: song.id,
          user_id: user.id,
          content: content.trim(),
          timestamp_seconds: timestampSeconds || null
        });

      toast({ title: 'Comment added' });
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await supabase.from('song_comments').delete().eq('id', commentId);
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return { comments, addComment, deleteComment, loading, refetch: fetchComments };
};

export const useSongMetadata = (songId: string | undefined) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!songId) return;
      setLoading(true);

      try {
        const { data: song } = await supabase
          .from('songs')
          .select('id')
          .eq('song_id_hash', songId)
          .maybeSingle();
        
        if (!song) return;

        const { data } = await supabase
          .from('song_metadata')
          .select('*')
          .eq('song_id', song.id)
          .maybeSingle();

        setMetadata(data);
      } catch (error) {
        console.error('Error fetching metadata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [songId]);

  return { metadata, loading };
};
