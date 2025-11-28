import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLibraryStore } from '@/store/libraryStore';
import { Song } from '@/store/playerStore';
import { MusicNote, FolderOpen } from '@mui/icons-material';

interface FileScannerModalProps {
  open: boolean;
  onClose: () => void;
}

// Supported audio formats with MIME types for mobile compatibility
const AUDIO_MIME_TYPES = [
  'audio/mpeg',           // .mp3
  'audio/mp4',            // .m4a
  'audio/aac',            // .aac
  'audio/wav',            // .wav
  'audio/ogg',            // .ogg
  'audio/flac',           // .flac
  'audio/opus',           // .opus
  'audio/x-m4a',          // .m4a alternate
  'audio/x-aiff',         // .aiff
  'audio/aiff',           // .aiff
  'audio/webm',           // .webm
  'audio/*',              // fallback
];

const AUDIO_EXTENSIONS = '.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus,.alac,.aiff,.webm';

const FileScannerModal = ({ open, onClose }: FileScannerModalProps) => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { setLocalSongs, localSongs, setCloudSongs } = useLibraryStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const isAudioFile = (file: File): boolean => {
    // Check MIME type
    if (file.type.startsWith('audio/')) return true;
    
    // Fallback: check file extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return AUDIO_EXTENSIONS.split(',').includes(ext);
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(isAudioFile);
    
    if (fileArray.length === 0) {
      toast({
        title: "No audio files",
        description: "Please select audio files (.mp3, .m4a, .aac, .wav, .ogg, .flac, .opus)",
        variant: "destructive",
      });
      setScanning(false);
      return;
    }

    const scannedSongs: Song[] = [];
    const filesToUpload: File[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setProgress(((i + 1) / fileArray.length) * 100);

      try {
        const hash = await generateHash(file);
        const metadata = await extractMetadata(file);
        
        // Check if song already exists in local library
        const exists = localSongs.some(s => s.song_id_hash === hash);
        if (exists) {
          console.log('Song already in library:', file.name);
          continue;
        }
        
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

    if (scannedSongs.length > 0) {
      // Merge with existing local songs
      setLocalSongs([...localSongs, ...scannedSongs]);
      
      toast({
        title: "Music Added",
        description: `${scannedSongs.length} new songs ready to play`,
      });

      // Upload to cloud in background silently
      if (filesToUpload.length > 0) {
        handleUploadToCloud(filesToUpload);
      }
    } else {
      toast({
        title: "No new songs",
        description: "All selected songs are already in your library",
      });
    }

    setScanning(false);
    onClose();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setScanning(false);
      return;
    }

    setScanning(true);
    setProgress(0);
    await processFiles(files);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleUploadToCloud = async (files: File[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const file of files) {
        const hash = await generateHash(file);

        // Check if song already exists in cloud
        const { data: existing } = await supabase
          .from('songs')
          .select('id')
          .eq('song_id_hash', hash)
          .single();

        if (existing) {
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
        await supabase
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
      }

      // Fetch all cloud songs after upload
      const { data: cloudSongs } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (cloudSongs) {
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
    } catch (error) {
      console.error('Background upload error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MusicNote className="h-5 w-5 text-primary" />
            Add Music
          </DialogTitle>
          <DialogDescription>
            Select audio files from your device
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file input with mobile-optimized accept attribute */}
        <input
          ref={fileInputRef}
          type="file"
          accept={`${AUDIO_EXTENSIONS},${AUDIO_MIME_TYPES.join(',')}`}
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          // capture attribute removed to allow file picker on mobile
        />

        {!scanning ? (
          <div className="space-y-4">
            <Button 
              onClick={handleSelectFiles}
              className="w-full h-32 flex flex-col gap-2 bg-secondary hover:bg-secondary/80"
              size="lg"
            >
              <FolderOpen className="h-8 w-8" />
              <span>Browse Files</span>
            </Button>
            
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Supported: MP3, M4A, AAC, WAV, OGG, FLAC, OPUS, AIFF
              </p>
              <p className="text-xs text-muted-foreground">
                Tip: Name files as "Title - Artist - Album" for auto-tagging
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                <MusicNote className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <p className="text-lg font-semibold mb-2">Processing...</p>
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
