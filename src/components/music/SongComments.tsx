import { useState } from 'react';
import { Send, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSongComments } from '@/hooks/useSongSocial';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SongCommentsProps {
  songId: string | undefined;
  currentTime?: number;
}

const SongComments = ({ songId, currentTime }: SongCommentsProps) => {
  const { comments, addComment, deleteComment, loading } = useSongComments(songId);
  const [newComment, setNewComment] = useState('');
  const [addTimestamp, setAddTimestamp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    await addComment(newComment, addTimestamp ? Math.floor(currentTime || 0) : undefined);
    setNewComment('');
    setAddTimestamp(false);
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="flex-1 bg-secondary/50 border-border/50"
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !newComment.trim()}
            className="h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {currentTime !== undefined && (
          <button
            type="button"
            onClick={() => setAddTimestamp(!addTimestamp)}
            className={cn(
              "flex items-center gap-1 text-xs transition-colors",
              addTimestamp ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="h-3 w-3" />
            {addTimestamp 
              ? `Add timestamp at ${formatTimestamp(Math.floor(currentTime))}` 
              : 'Add timestamp'}
          </button>
        )}
      </form>

      {/* Comments List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            No comments yet. Be the first!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-secondary/30 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                    {comment.profile?.avatar_url ? (
                      <img 
                        src={comment.profile.avatar_url} 
                        alt={comment.profile?.username || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      comment.profile?.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {comment.profile?.username || 'Anonymous'}
                  </span>
                  {comment.timestamp_seconds !== null && (
                    <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {formatTimestamp(comment.timestamp_seconds)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-foreground/90 ml-10">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SongComments;
