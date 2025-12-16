import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { 
  Person, 
  CloudSync, 
  Storage, 
  Info,
  Brightness4,
  Logout,
  CameraAlt,
  Chat
} from '@mui/icons-material';
import NotificationBell from '@/components/notifications/NotificationBell';
import SpotifyConnect from '@/components/spotify/SpotifyConnect';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudSync, setCloudSync] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          fetchProfile(session.user.id);
        }
      }
    );

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (user) {
        fetchProfile(user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();
    
    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage
        .from('avatars')
        .remove([`${user.id}/avatar.png`, `${user.id}/avatar.jpg`, `${user.id}/avatar.jpeg`, `${user.id}/avatar.webp`]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl + '?t=' + Date.now()); // Cache bust

      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated',
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload avatar',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Logout Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Logged out',
        description: 'See you next time!',
      });
      navigate('/auth');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 pt-6 animate-fade-in max-w-2xl mx-auto">
      {/* Header with Notification Bell */}
      <div className="flex justify-end mb-4">
        <NotificationBell />
      </div>
      
      {/* Profile Header */}
      <div className="mb-8 text-center">
        <div className="relative inline-block">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <button
            onClick={handleAvatarClick}
            disabled={uploading}
            className="w-24 h-24 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center overflow-hidden relative group"
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <Person className="h-12 w-12" />
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <CameraAlt className="h-6 w-6 text-white" />
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
          <p className="text-xs text-muted-foreground">Tap to change</p>
        </div>
        <h1 className="text-2xl font-bold mb-1">{user?.user_metadata?.username || 'Music Lover'}</h1>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>

      {/* Friends & Messages */}
      <section className="glass rounded-lg p-4 mb-6">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3"
          onClick={() => navigate('/chat')}
        >
          <div className="flex items-center gap-3 flex-1">
            <Chat className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Friends & Messages</p>
              <p className="text-sm text-muted-foreground">Chat with your friends</p>
            </div>
          </div>
        </Button>
      </section>

      {/* Spotify Integration */}
      <section className="mb-6">
        <SpotifyConnect />
      </section>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Account */}
        <section className="glass rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Cloud Sync</p>
                <p className="text-sm text-muted-foreground">
                  Automatically sync your music to the cloud
                </p>
              </div>
              <Switch checked={cloudSync} onCheckedChange={setCloudSync} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Offline Mode</p>
                <p className="text-sm text-muted-foreground">
                  Only play downloaded music
                </p>
              </div>
              <Switch checked={offlineMode} onCheckedChange={setOfflineMode} />
            </div>
          </div>
        </section>

        {/* Storage */}
        <section className="glass rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Storage className="h-5 w-5" />
            Storage
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Local Storage</span>
              <span className="font-medium">245 MB / 5 GB</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-primary w-[12%]" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cloud Storage</span>
              <span className="font-medium">0 MB / 5 GB</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-secondary w-0" />
            </div>
            <Button variant="outline" className="w-full mt-4">
              Clear Cache
            </Button>
          </div>
        </section>

        {/* Actions */}
        <section className="glass rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2">
              <CloudSync className="h-5 w-5" />
              Rescan Local Files
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Brightness4 className="h-5 w-5" />
              Theme: Dark Mode
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Info className="h-5 w-5" />
              About Youth Tunes
            </Button>
          </div>
        </section>

        {/* Logout */}
        <Button 
          variant="destructive" 
          className="w-full gap-2"
          onClick={handleLogout}
        >
          <Logout className="h-5 w-5" />
          Sign Out
        </Button>

        {/* App Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Youth Tunes v1.0.0</p>
          <p>Made with ♥ for music lovers</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
