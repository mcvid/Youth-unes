import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLibraryStore } from '@/store/libraryStore';
import { Song } from '@/store/playerStore';

interface FileScannerModalProps {
  open: boolean;
  onClose: () => void;
}

const FileScannerModal = ({ open, onClose }: FileScannerModalProps) => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { setLocalSongs, setCloudSongs } = useLibraryStore();

  // Auto-trigger scan when modal opens
  useEffect(() => {
    if (open && !scanning) {
      const timer = setTimeout(() => {
        handleScanFiles();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const generateHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer.slice(0, 10000));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const extractMetadata = async (file: File): Promise<Partial<Song>> => {
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    const parts = fileName.split('-').map(p => p.trim());
    
    return {
      title: parts[0] || fileName,
      artist: parts[1] || 'Unknown Artist',
      album: parts[2] || 'Unknown Album',
    };
  };

  const handleScanFiles = async () => {
    try {
      setScanning(true);
      setProgress(0);

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.multiple = true;

      input.onchange = async (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        if (files.length === 0) {
          setScanning(false);
          return;
        }

        const scannedSongs: Song[] = [];
        const filesToUpload: File[] = [];

        // Scan and add to local store immediately
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setProgress(((i + 1) / files.length) * 100);

          try {
            const hash = await generateHash(file);
            const metadata = await extractMetadata(file);
            
            const song: Song = {
              song_id_hash: hash,
              title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
              artist: metadata.artist || 'Unknown Artist',
              album: metadata.album || 'Unknown Album',
              duration: 0,
              audio_url: URL.createObjectURL(file),
            };

            scannedSongs.push(song);
            filesToUpload.push(file);
          } catch (error) {
            console.error('Error processing file:', file.name, error);
          }
        }

        // Add to local store immediately
        setLocalSongs(scannedSongs);
        setScanning(false);
        
        toast({
          title: "Music Added",
          description: `${scannedSongs.length} songs ready to play`,
        });

        // Close modal to show songs
        onClose();

        // Upload to cloud in background silently
        if (filesToUpload.length > 0) {
          handleUploadToCloud(filesToUpload);
        }
      };

      input.click();
    } catch (error) {
      console.error('Error scanning files:', error);
      setScanning(false);
      toast({
        title: "Error",
        description: "Failed to scan files. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUploadToCloud = async (files: File[]) => {
    // Background upload - no UI blocking
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let uploaded = 0;

      for (const file of files) {
        const hash = await generateHash(file);

        // Check if song already exists in cloud
        const { data: existing } = await supabase
          .from('songs')
          .select('id')
          .eq('song_id_hash', hash)
          .single();

        if (existing) {
          console.log('Song already in cloud:', file.name);
          continue;
        }

        // Upload file to storage
        const filePath = `${user.id}/${hash}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('songs')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('songs')
          .getPublicUrl(filePath);

        // Extract metadata
        const metadata = await extractMetadata(file);

        // Insert song record
        const { error: insertError } = await supabase
          .from('songs')
          .insert({
            song_id_hash: hash,
            title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
            artist: metadata.artist || 'Unknown Artist',
            album: metadata.album || 'Unknown Album',
            duration: 0,
            audio_url: publicUrl,
            uploaded_by: user.id,
          });

        if (!insertError) {
          uploaded++;
        }
      }

      // Fetch all cloud songs after upload
      const { data: cloudSongs } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (cloudSongs) {
        // Only set songs from other users as "cloud"
        const otherSongs = cloudSongs.filter(s => s.uploaded_by !== user.id);
        setCloudSongs(otherSongs.map(song => ({
          song_id_hash: song.song_id_hash,
          title: song.title,
          artist: song.artist,
          album: song.album || 'Unknown Album',
          duration: song.duration,
          audio_url: song.audio_url,
          uploaded_by: song.uploaded_by,
          cover_url: song.cover_url,
        })));
      }

      // ... keep existing code (fetch cloud songs)
      
      // Silent background upload complete - no notification
    } catch (error) {
      console.error('Background upload error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Local Music</DialogTitle>
          <DialogDescription>
            Select audio files from your device to add to your library
          </DialogDescription>
        </DialogHeader>

        {!scanning && (
          <div className="space-y-4">
            <Button 
              onClick={handleScanFiles}
              className="w-full"
              size="lg"
            >
              Select Audio Files
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Your songs will be ready to play instantly
            </p>
          </div>
        )}

        {scanning && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">Scanning Files...</p>
              <Progress value={progress} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FileScannerModal;
