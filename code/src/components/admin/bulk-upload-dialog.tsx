'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { saveBulkEpisodesAction } from '@/lib/actions';
import { 
  UploadCloud, 
  Film, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowUpDown
} from 'lucide-react';

interface QueueItem {
  id: string;
  file: File;
  episodeNumber: number;
  quality: string;
  status: 'pending' | 'uploading' | 'saving' | 'done' | 'error';
  progress: number;
  error?: string;
  uploadedUrl?: string;
}

interface BulkUploadDialogProps {
  seriesId: string;
  nextEpisodeNumber: number;
  onSaved: () => void;
  disabled?: boolean;
}

export function BulkUploadDialog({ seriesId, nextEpisodeNumber, onSaved, disabled }: BulkUploadDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [startEpisodeNumber, setStartEpisodeNumber] = useState<number>(nextEpisodeNumber);
  const [defaultQuality, setDefaultQuality] = useState<string>('720p');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<{ [key: string]: XMLHttpRequest }>({});

  const handleOpenChange = (open: boolean) => {
    if (!open && isProcessing) {
      if (!confirm('Uploads are still in progress. Are you sure you want to exit? Active uploads will be cancelled.')) {
        return;
      }
      Object.values(abortControllersRef.current).forEach(xhr => xhr.abort());
      abortControllersRef.current = {};
      setIsProcessing(false);
    }
    if (open) {
      setStartEpisodeNumber(nextEpisodeNumber);
      setQueue([]);
    }
    setIsOpen(open);
  };

  const addFilesToQueue = (files: FileList | File[]) => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const fileArray = Array.from(files).filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'm3u8', 'ts'].includes(ext || '');
    });

    if (fileArray.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid Files', description: 'Please select valid video files (.mp4, .mov, .webm, .mkv, .m3u8).' });
      return;
    }

    fileArray.sort((a, b) => collator.compare(a.name, b.name));

    const currentLastNumber = queue.length > 0
      ? Math.max(...queue.map(q => q.episodeNumber))
      : startEpisodeNumber - 1;

    const newItems: QueueItem[] = fileArray.map((file, index) => ({
      id: `bulk-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      episodeNumber: currentLastNumber + index + 1,
      quality: defaultQuality,
      status: 'pending',
      progress: 0,
    }));

    setQueue(prev => [...prev, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      e.target.value = '';
    }
  };

  const removeItem = (id: string) => {
    if (isProcessing) return;
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const updateItemEpisodeNumber = (id: string, num: number) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, episodeNumber: num } : item));
  };

  const updateItemQuality = (id: string, quality: string) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, quality } : item));
  };

  const renumberQueue = () => {
    setQueue(prev => prev.map((item, idx) => ({
      ...item,
      episodeNumber: startEpisodeNumber + idx,
    })));
  };

  const uploadSingleFile = (item: QueueItem): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      abortControllersRef.current[item.id] = xhr;

      const formData = new FormData();
      formData.append('file', item.file);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = (event.loaded / event.total) * 100;
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: percent } : q));
        }
      };

      xhr.onload = () => {
        delete abortControllersRef.current[item.id];
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.url) {
              resolve(res.url);
            } else {
              reject(new Error(res.error || 'Server did not return a file URL.'));
            }
          } catch {
            reject(new Error('Invalid response from upload server.'));
          }
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            reject(new Error(res.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        delete abortControllersRef.current[item.id];
        reject(new Error('Network error during file upload.'));
      };

      xhr.onabort = () => {
        delete abortControllersRef.current[item.id];
        reject(new Error('Upload cancelled.'));
      };

      xhr.open('POST', '/api/upload', true);
      xhr.send(formData);
    });
  };

  const startBulkUpload = async () => {
    if (queue.length === 0) return;
    setIsProcessing(true);

    const pendingItems = queue.filter(q => q.status === 'pending' || q.status === 'error');
    if (pendingItems.length === 0) {
      toast({ title: 'Already Complete', description: 'All queued items have already been uploaded.' });
      setIsProcessing(false);
      return;
    }

    const CONCURRENCY = 2;
    let nextIndex = 0;
    const uploadedResults: { episodeInSeason: number; quality: string; url: string }[] = [];

    const worker = async () => {
      while (nextIndex < pendingItems.length) {
        const item = pendingItems[nextIndex++];
        if (!item) break;

        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading', progress: 0, error: undefined } : q));

        try {
          const url = await uploadSingleFile(item);
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'done', progress: 100, uploadedUrl: url } : q));
          uploadedResults.push({
            episodeInSeason: item.episodeNumber,
            quality: item.quality,
            url,
          });
        } catch (err: any) {
          console.error(`Upload failed for ${item.file.name}:`, err);
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: err.message || 'Upload failed' } : q));
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, pendingItems.length) }).map(() => worker());
    await Promise.all(workers);

    setIsProcessing(false);

    if (uploadedResults.length > 0) {
      try {
        const episodesToSave = uploadedResults.map(res => ({
          episodeInSeason: res.episodeInSeason,
          videoSources: [{ quality: res.quality, url: res.url }],
        }));

        const saveRes = await saveBulkEpisodesAction(seriesId, episodesToSave);
        if (saveRes.success) {
          toast({ 
            title: 'Bulk Upload Successful! 🎉', 
            description: `Successfully added ${saveRes.count} new episodes to this drama series.` 
          });
          onSaved();
        } else {
          toast({ 
            variant: 'destructive', 
            title: 'Database Save Warning', 
            description: saveRes.error || 'Videos uploaded, but failed to register some episodes.' 
          });
        }
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Save Error', description: err.message || 'Error saving to database.' });
      }
    }
  };

  const totalCount = queue.length;
  const doneCount = queue.filter(q => q.status === 'done').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  const overallProgress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled} 
          className="border-primary/40 text-primary hover:bg-primary/10 gap-2 font-medium"
        >
          <UploadCloud className="h-4 w-4" />
          Bulk Upload Episodes
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur border-white/10">
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                Bulk Episodes Video Uploader
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Drop multiple episode videos at once. Files are automatically sorted numerically and indexed sequentially.
              </DialogDescription>
            </div>
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-xs px-2.5 py-1">
                {doneCount} / {totalCount} Completed
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Global Configuration Bar */}
        <div className="p-4 bg-muted/20 border-b border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-[11px]">Start Episode #</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={startEpisodeNumber}
                onChange={(e) => setStartEpisodeNumber(parseInt(e.target.value) || 1)}
                disabled={isProcessing}
                className="h-8 text-xs bg-black/20"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={renumberQueue} 
                disabled={isProcessing || queue.length === 0}
                className="h-8 px-2 text-[11px]" 
                title="Re-index queue starting from this number"
              >
                <ArrowUpDown className="h-3 w-3 mr-1" /> Re-index
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-[11px]">Default Video Quality</Label>
            <Select value={defaultQuality} onValueChange={setDefaultQuality} disabled={isProcessing}>
              <SelectTrigger className="h-8 text-xs bg-black/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="720p">720p (HD - Recommended)</SelectItem>
                <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                <SelectItem value="480p">480p (SD)</SelectItem>
                <SelectItem value="Original">Original Quality</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col justify-end">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/mp4,video/x-m4v,video/*,.m3u8,.ts"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="h-8 text-xs gap-1.5"
            >
              <Film className="h-3.5 w-3.5" />
              Browse Videos...
            </Button>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        {queue.length === 0 && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`m-6 p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 text-center ${
              isDragOver 
                ? 'border-primary bg-primary/10 scale-[0.99]' 
                : 'border-white/15 hover:border-primary/50 hover:bg-white/[0.02]'
            }`}
          >
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h4 className="text-base font-semibold mb-1">Drag & Drop Multiple Episodes Here</h4>
            <p className="text-xs text-muted-foreground max-w-sm mb-4">
              Select 10, 50, or 100 videos at once. Files will be auto-sorted naturally (e.g. 1.mp4, 2.mp4, ..., 10.mp4) without manual naming.
            </p>
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-white/10">
              Supports MP4, MOV, MKV, WEBM, M3U8, TS
            </Badge>
          </div>
        )}

        {/* Active Queue List */}
        {queue.length > 0 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Overall Progress Bar */}
            {isProcessing && (
              <div className="px-6 py-2 bg-primary/5 border-b border-primary/20 space-y-1 animate-in fade-in">
                <div className="flex justify-between text-[11px] font-medium text-primary">
                  <span>Uploading Queue (2 parallel workers)...</span>
                  <span>{doneCount} of {totalCount} ({overallProgress.toFixed(0)}%)</span>
                </div>
                <Progress value={overallProgress} className="h-1.5" />
              </div>
            )}

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-2">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-all flex items-center gap-3 ${
                      item.status === 'done'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : item.status === 'error'
                        ? 'bg-destructive/10 border-destructive/30'
                        : item.status === 'uploading'
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-black/20 border-white/5'
                    }`}
                  >
                    {/* Episode Number badge/input */}
                    <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                      <span className="text-[11px] text-muted-foreground font-mono">Ep:</span>
                      <Input
                        type="number"
                        min={1}
                        value={item.episodeNumber}
                        onChange={(e) => updateItemEpisodeNumber(item.id, parseInt(e.target.value) || 1)}
                        disabled={isProcessing || item.status === 'done'}
                        className="h-7 text-xs w-16 font-bold bg-black/40 px-1.5 text-center"
                      />
                    </div>

                    {/* File details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium truncate text-foreground/90 font-mono">
                          {item.file.name}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>

                      {/* Progress bar during upload */}
                      {item.status === 'uploading' && (
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={item.progress} className="h-1 flex-1" />
                          <span className="text-[10px] font-mono text-primary flex-shrink-0">
                            {item.progress.toFixed(0)}%
                          </span>
                        </div>
                      )}

                      {/* Error message */}
                      {item.status === 'error' && (
                        <p className="text-[10px] text-destructive flex items-center gap-1 mt-0.5">
                          <AlertCircle className="h-3 w-3" /> {item.error || 'Upload error'}
                        </p>
                      )}
                    </div>

                    {/* Quality selector */}
                    <div className="w-24 flex-shrink-0">
                      <Select
                        value={item.quality}
                        onValueChange={(val) => updateItemQuality(item.id, val)}
                        disabled={isProcessing || item.status === 'done'}
                      >
                        <SelectTrigger className="h-7 text-[11px] bg-black/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="720p">720p</SelectItem>
                          <SelectItem value="1080p">1080p</SelectItem>
                          <SelectItem value="480p">480p</SelectItem>
                          <SelectItem value="Original">Orig</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status indicator */}
                    <div className="w-24 flex items-center justify-end flex-shrink-0">
                      {item.status === 'pending' && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Pending</Badge>
                      )}
                      {item.status === 'uploading' && (
                        <Badge variant="default" className="text-[10px] bg-primary gap-1 animate-pulse">
                          <Loader2 className="h-3 w-3 animate-spin" /> Uploading
                        </Badge>
                      )}
                      {item.status === 'done' && (
                        <Badge variant="default" className="text-[10px] bg-emerald-600 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </Badge>
                      )}
                      {item.status === 'error' && (
                        <Badge variant="destructive" className="text-[10px] gap-1">Failed</Badge>
                      )}
                    </div>

                    {/* Remove Action */}
                    {!isProcessing && item.status !== 'done' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-white/10 flex items-center justify-between sm:justify-between bg-muted/10">
          <div className="flex items-center gap-2">
            {queue.length > 0 && !isProcessing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQueue([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
            )}
            {errorCount > 0 && !isProcessing && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {errorCount} failed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isProcessing}
              className="text-xs"
            >
              {doneCount > 0 ? 'Close' : 'Cancel'}
            </Button>

            {queue.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={startBulkUpload}
                disabled={isProcessing || queue.every(q => q.status === 'done')}
                className="text-xs gap-1.5 bg-primary hover:bg-primary/90"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading ({doneCount}/{totalCount})...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5" />
                    {doneCount > 0 && doneCount < totalCount ? 'Resume Remaining Uploads' : `Upload ${queue.length} Episodes`}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
