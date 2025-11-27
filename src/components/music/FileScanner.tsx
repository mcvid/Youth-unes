import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, CloudUpload, CheckCircle } from '@mui/icons-material';
import { useLibraryStore } from '@/store/libraryStore';
import { Song } from '@/store/playerStore';

const FileScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scannedFiles, setScannedFiles] = useState<File[]>([]);
  const { setLocalSongs } = useLibraryStore();

  // Generate hash for duplicate detection
  const generateHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer.slice(0, 10000)); // Hash first 10KB
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Extract metadata from audio file
  const extractMetadata = async (file: File): Promise<Partial<Song>> => {
    // In a real app, you'd use a library like music-metadata-browser
    // For now, we'll extract basic info from filename
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    const parts = fileName.split('-').map(p => p.trim());
    
    return {
      title: parts[0] || fileName,
      artist: parts[1] || 'Unknown Artist',
      album: parts[2] || 'Unknown Album',
      duration: 0, // Would be extracted from actual audio metadata
    };
  };

  const handleScanFiles = async () => {
    setScanning(true);
    setProgress(0);

    try {
      // Request file access
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'audio/*';
      
      input.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        const files = Array.from(target.files || []);
        
        if (files.length === 0) {
          setScanning(false);
          return;
        }

        setScannedFiles(files);
        
        // Process files
        const songs: Song[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setProgress(((i + 1) / files.length) * 100);

          const hash = await generateHash(file);
          const metadata = await extractMetadata(file);
          
          // Create local URL for playback
          const audioUrl = URL.createObjectURL(file);
          
          songs.push({
            song_id_hash: hash,
            title: metadata.title || file.name,
            artist: metadata.artist || 'Unknown Artist',
            album: metadata.album || 'Unknown Album',
            duration: metadata.duration || 0,
            audio_url: audioUrl,
          });
        }

        setLocalSongs(songs);
        
        toast({
          title: 'Scan Complete!',
          description: `Found ${files.length} audio files`,
        });
        
        setScanning(false);
      };

      input.click();
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: 'Scan Failed',
        description: 'Could not access audio files',
        variant: 'destructive',
      });
      setScanning(false);
    }
  };

  const handleUploadToCloud = async () => {
    if (scannedFiles.length === 0) {
      toast({
        title: 'No files to upload',
        description: 'Please scan for files first',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let uploaded = 0;
      for (let i = 0; i < scannedFiles.length; i++) {
        const file = scannedFiles[i];
        const hash = await generateHash(file);
        
        // Check if song already exists
        const { data: existing } = await supabase
          .from('songs')
          .select('*')
          .eq('song_id_hash', hash)
          .single();

        if (existing) {
          console.log(`Song ${file.name} already exists, skipping...`);
          continue;
        }

        // Upload file to storage
        const filePath = `${user.id}/${hash}${file.name.substring(file.name.lastIndexOf('.'))}`;
        const { error: uploadError } = await supabase.storage
          .from('songs')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('songs')
          .getPublicUrl(filePath);

        // Extract metadata
        const metadata = await extractMetadata(file);

        // Insert into database
        const { error: dbError } = await supabase
          .from('songs')
          .insert({
            song_id_hash: hash,
            title: metadata.title || file.name,
            artist: metadata.artist || 'Unknown Artist',
            album: metadata.album || 'Unknown Album',
            duration: metadata.duration || 180,
            audio_url: publicUrl,
            uploaded_by: user.id,
          });

        if (dbError) throw dbError;

        uploaded++;
        setProgress(((i + 1) / scannedFiles.length) * 100);
      }

      toast({
        title: 'Upload Complete!',
        description: `Uploaded ${uploaded} new songs to cloud`,
      });
      
      setUploading(false);
      setScannedFiles([]);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
      setUploading(false);
    }
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          File Scanner
        </CardTitle>
        <CardDescription>
          Scan your device for audio files and upload them to your cloud library
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={handleScanFiles}
            disabled={scanning || uploading}
            className="bg-gradient-primary"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            {scanning ? 'Scanning...' : 'Scan Device'}
          </Button>
          
          <Button
            onClick={handleUploadToCloud}
            disabled={scanning || uploading || scannedFiles.length === 0}
            variant="outline"
          >
            <CloudUpload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : `Upload to Cloud (${scannedFiles.length})`}
          </Button>
        </div>

        {(scanning || uploading) && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}

        {scannedFiles.length > 0 && !scanning && !uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {scannedFiles.length} files ready to upload
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileScanner;
