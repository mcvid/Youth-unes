import { Music, Users, Mic2, Disc3, Radio, Calendar, Tag, Gauge, KeyRound } from 'lucide-react';
import { useSongMetadata } from '@/hooks/useSongSocial';
import { cn } from '@/lib/utils';

interface SongCreditsProps {
  songId: string | undefined;
  songInfo?: {
    title: string;
    artist: string;
    album?: string;
  };
}

const SongCredits = ({ songId, songInfo }: SongCreditsProps) => {
  const { metadata, loading } = useSongMetadata(songId);

  const creditItems = [
    { 
      icon: Mic2, 
      label: 'Artist', 
      value: songInfo?.artist,
      show: !!songInfo?.artist 
    },
    { 
      icon: Disc3, 
      label: 'Album', 
      value: songInfo?.album || 'Unknown Album',
      show: true 
    },
    { 
      icon: Users, 
      label: 'Writers', 
      value: metadata?.writers?.join(', '),
      show: metadata?.writers?.length > 0 
    },
    { 
      icon: Radio, 
      label: 'Producers', 
      value: metadata?.producers?.join(', '),
      show: metadata?.producers?.length > 0 
    },
    { 
      icon: Music, 
      label: 'Instruments', 
      value: metadata?.instruments?.join(', '),
      show: metadata?.instruments?.length > 0 
    },
    { 
      icon: Tag, 
      label: 'Genre', 
      value: metadata?.genre?.join(', '),
      show: metadata?.genre?.length > 0 
    },
    { 
      icon: Calendar, 
      label: 'Released', 
      value: metadata?.release_date,
      show: !!metadata?.release_date 
    },
    { 
      icon: Gauge, 
      label: 'BPM', 
      value: metadata?.bpm?.toString(),
      show: !!metadata?.bpm 
    },
    { 
      icon: KeyRound, 
      label: 'Key', 
      value: metadata?.key,
      show: !!metadata?.key 
    },
  ];

  const visibleItems = creditItems.filter(item => item.show);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-secondary/30 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {visibleItems.map(({ icon: Icon, label, value }) => (
            <div 
              key={label}
              className="flex items-center gap-3 bg-secondary/30 rounded-lg p-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium truncate">{value}</p>
              </div>
            </div>
          ))}

          {metadata?.samples && metadata.samples.length > 0 && (
            <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Samples</p>
              <div className="flex flex-wrap gap-2">
                {metadata.samples.map((sample: string, i: number) => (
                  <span 
                    key={i}
                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                  >
                    {sample}
                  </span>
                ))}
              </div>
            </div>
          )}

          {metadata?.production_notes && (
            <div className="bg-secondary/30 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Production Notes</p>
              <p className="text-sm">{metadata.production_notes}</p>
            </div>
          )}

          {metadata?.recording_info && (
            <div className="bg-secondary/30 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Recording Info</p>
              <p className="text-sm">{metadata.recording_info}</p>
            </div>
          )}

          {!metadata && visibleItems.length <= 2 && (
            <p className="text-center text-muted-foreground text-sm py-4">
              No additional credits available yet
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default SongCredits;
