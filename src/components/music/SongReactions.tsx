import { Button } from '@/components/ui/button';
import { useSongReactions, ReactionType } from '@/hooks/useSongSocial';
import { cn } from '@/lib/utils';

const REACTION_EMOJIS: Record<ReactionType, { emoji: string; label: string }> = {
  fire: { emoji: '🔥', label: 'Fire' },
  love: { emoji: '❤️', label: 'Love' },
  sad: { emoji: '😭', label: 'Sad' },
  mind_blown: { emoji: '🤯', label: 'Mind Blown' },
  vibe: { emoji: '✨', label: 'Vibe' },
  skip: { emoji: '⏭️', label: 'Skip' },
};

interface SongReactionsProps {
  songId: string | undefined;
  compact?: boolean;
}

const SongReactions = ({ songId, compact = false }: SongReactionsProps) => {
  const { reactions, userReaction, toggleReaction, loading } = useSongReactions(songId);

  return (
    <div className={cn(
      "flex items-center gap-1",
      compact ? "flex-wrap" : "justify-between"
    )}>
      {Object.entries(REACTION_EMOJIS).map(([key, { emoji, label }]) => {
        const reaction = reactions.find(r => r.reaction === key);
        const count = reaction?.count || 0;
        const isActive = userReaction === key;

        return (
          <Button
            key={key}
            variant="ghost"
            size={compact ? "sm" : "default"}
            onClick={() => toggleReaction(key as ReactionType)}
            disabled={loading}
            className={cn(
              "flex items-center gap-1 rounded-full transition-all",
              compact ? "h-8 px-2" : "h-10 px-3",
              isActive 
                ? "bg-primary/20 text-primary border border-primary/30" 
                : "hover:bg-secondary/80"
            )}
          >
            <span className={compact ? "text-base" : "text-lg"}>{emoji}</span>
            {count > 0 && (
              <span className={cn(
                "font-medium",
                compact ? "text-xs" : "text-sm"
              )}>
                {count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default SongReactions;
