'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { claimReferralCodeAction } from '@/lib/actions';
import type { UserProfile } from '@/lib/types';
import { 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  Sparkles, 
  Coins, 
  Loader2,
  Ticket
} from 'lucide-react';

interface ReferralCardProps {
  userProfile: UserProfile | null;
  userId?: string;
  onProfileRefresh?: () => void;
}

export function ReferralCard({ userProfile, userId, onProfileRefresh }: ReferralCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const referralCode = userProfile?.referralCode || (userProfile?.publicId ? `SNAP-${userProfile.publicId.substring(0, 6)}` : 'SNAP-FRIEND');
  const hasReferred = !!userProfile?.referredBy;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast({ title: 'Code Copied!', description: 'Your referral code was copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareText = `Join me on SnapReels to watch trending short drama series! Use my invite code ${referralCode} to get free bonus coins! 🎬🍿`;
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join SnapReels',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User dismissed share dialog
      }
    } else {
      // Fallback: Open WhatsApp directly
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast({ variant: 'destructive', title: 'Login Required', description: 'Please login first to redeem an invitation code.' });
      return;
    }
    if (!inputCode.trim()) {
      toast({ variant: 'destructive', title: 'Empty Code', description: 'Please enter a valid referral code.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await claimReferralCodeAction(userId, inputCode.trim());
      if (res.success) {
        toast({ title: 'Success! 🎉', description: res.message });
        setRedeemDialogOpen(false);
        setInputCode('');
        if (onProfileRefresh) onProfileRefresh();
      } else {
        toast({ variant: 'destructive', title: 'Redemption Failed', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to claim code.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-950/40 via-zinc-900 to-black border-purple-500/20 shadow-2xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 blur-3xl -ml-16 -mb-16 pointer-events-none" />

      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30 text-purple-400">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-white italic tracking-tight flex items-center gap-2">
                Invite Friends & Earn Free Coins
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] font-bold">
                  +50 Coins
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Share your referral code with friends. When they join, you both receive bonus coins!
              </CardDescription>
            </div>
          </div>

          {/* Enter Invite Code Dialog */}
          <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 self-start sm:self-auto gap-1.5"
                disabled={hasReferred}
              >
                <Ticket className="h-3.5 w-3.5 text-purple-400" />
                {hasReferred ? `Referred by: ${userProfile?.referredBy}` : 'Have an Invite Code?'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-zinc-950 border-white/10">
              <form onSubmit={handleRedeem}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                    <Sparkles className="h-5 w-5 text-purple-400" /> Redeem Invitation Code
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Enter a referral code sent by a friend to immediately unlock +50 bonus coins.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-3">
                  <Input
                    placeholder="e.g. SNAP-123456"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="font-mono text-center text-lg tracking-widest uppercase bg-black/40 border-white/15 h-12"
                    maxLength={20}
                  />
                  <p className="text-[11px] text-muted-foreground text-center">
                    Each account can only redeem an invitation code once.
                  </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setRedeemDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm" 
                    className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                    disabled={isSubmitting || !inputCode.trim()}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                    Redeem & Claim Coins
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* User's Referral Code Display */}
          <div className="md:col-span-2 p-3 bg-black/40 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                Your Unique Invite Code
              </span>
              <div className="text-xl font-mono font-black text-purple-300 tracking-wider">
                {referralCode}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="h-9 text-xs gap-1.5 font-bold"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleShare}
                className="h-9 text-xs gap-1.5 font-bold bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share Link
              </Button>
            </div>
          </div>

          {/* Referral Stats */}
          <div className="p-3 bg-black/40 rounded-xl border border-white/10 flex items-center justify-around text-center">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-center gap-1">
                <Users className="h-3 w-3 text-purple-400" /> Friends
              </div>
              <div className="text-lg font-black text-white">
                {userProfile?.referralCount || 0}
              </div>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-center gap-1">
                <Coins className="h-3 w-3 text-amber-400" /> Earned
              </div>
              <div className="text-lg font-black text-amber-400">
                {(userProfile?.referralEarnings || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
