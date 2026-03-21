

'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitReportAction } from '@/lib/actions';
import type { User as FirebaseUser } from 'firebase/auth';
import type { Series, UserProfile, Episode } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Flag } from 'lucide-react';

const reportSchema = z.object({
  reason: z.string().min(10, 'Please provide a reason with at least 10 characters.'),
});

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: Series;
  episode?: Episode | null;
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
}

export function ReportDialog({ open, onOpenChange, series, episode, user, userProfile }: ReportDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<{ reason: string }>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reason: '' },
  });

  const onSubmit = async (values: { reason: string }) => {
    if (!user || !userProfile) {
        toast({ variant: 'destructive', title: 'Login Required', description: 'You must be logged in to submit a report.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
      const isEpisodeReport = !!episode;
      const reportedContentRef = isEpisodeReport ? `episodes/${episode!.id}` : `series/${series.id}`;
      const reportedContentTitle = isEpisodeReport ? `${series.title} - Ep ${episode!.episodeInSeason}` : series.title;

      const result = await submitReportAction({
        reporterUid: user.uid,
        reporterEmail: userProfile.email,
        reportedContentRef,
        reportedContentTitle,
        seriesId: series.id,
        reason: values.reason,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({ title: 'Report Submitted', description: 'Thank you for your feedback. We will review it shortly.' });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: error.message || 'Could not submit your report. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const dialogTitle = episode ? `Report Episode ${episode.episodeInSeason} of "${series.title}"` : `Report "${series.title}"`;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) form.reset();
        onOpenChange(isOpen);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Please let us know why you are reporting this content. Your feedback is important for our community.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Textarea
            {...form.register('reason')}
            placeholder="e.g., Video not playing, inappropriate content, etc."
            className="min-h-[120px]"
          />
          {form.formState.errors.reason && (
            <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Flag />}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    
