import { useSpotify } from '@/hooks/useSpotify';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Music, Loader2, Check, Unlink, User } from 'lucide-react';

const SpotifyConnect = () => {
  const { isConnected, isLoading, connectSpotify, disconnectSpotify, user } = useSpotify();

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1DB954]/20 flex items-center justify-center">
            <Music className="w-5 h-5 text-[#1DB954]" />
          </div>
          <div>
            <CardTitle className="text-lg">Spotify</CardTitle>
            <CardDescription>
              {isConnected 
                ? 'Your Spotify account is connected'
                : 'Connect to get personalized recommendations'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex flex-col gap-4">
             {user && (
              <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-md">
                <Avatar>
                  <AvatarImage src={user.images?.[0]?.url} />
                  <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-medium text-sm">{user.display_name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-500">
                <Check className="w-4 h-4" />
                <span>Connected</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={disconnectSpotify}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            onClick={connectSpotify}
            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white"
          >
            <Music className="w-4 h-4 mr-2" />
            Connect Spotify
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SpotifyConnect;
