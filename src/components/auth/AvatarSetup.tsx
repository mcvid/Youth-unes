import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { CameraAlt, Person } from '@mui/icons-material';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AvatarSetupProps {
  userId: string;
  username: string;
  onComplete: () => void;
}

const AvatarSetup = ({ userId, username, onComplete }: AvatarSetupProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

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
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);

      toast({
        title: 'Avatar uploaded!',
        description: 'Your profile picture has been set',
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

  const handleContinue = () => {
    if (!avatarUrl) {
      toast({
        title: 'Avatar required',
        description: 'Please upload a profile picture to continue',
        variant: 'destructive',
      });
      return;
    }
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-dark">
      <Card className="w-full max-w-md glass border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome, {username}!</CardTitle>
          <CardDescription>
            Upload a profile picture so your friends can recognize you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden relative group border-4 border-dashed border-primary/50 hover:border-primary transition-colors"
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Person className="h-16 w-16 text-muted-foreground" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraAlt className="h-8 w-8 text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            {avatarUrl ? 'Looking good! Click to change' : 'Click to upload your photo'}
          </p>

          <Button 
            onClick={handleContinue}
            className="w-full bg-gradient-primary"
            disabled={!avatarUrl || uploading}
          >
            Continue to App
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvatarSetup;
