
'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useUser } from '@/firebase';
import type { CoinPack, CoinTransaction, MonetizationSettings, PaymentGatewaySettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, ShoppingCart, AlertCircle, PlusCircle, MinusCircle, ArrowRight, Loader2, Zap, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { PaymentDialog } from '@/components/wallet/payment-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { i18n } from '@/i18n-config';
import { getCoinPacks, getMonetizationSettings, getPaymentSettings, getUserTransactions } from '@/lib/data.actions';
import { verifyAndExecutePurchaseAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/translation-provider';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ReferralCard } from '@/components/referral-card';

function TransactionHistoryCard() {
    const { user } = useUser();
    const { t } = useTranslation();
    const params = useParams();
    const lang = (params?.lang as string) || i18n.defaultLocale;
    const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;
    const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getUserTransactions(user.uid, 5).then(data => {
                setTransactions(data);
                setLoading(false);
            });
        }
    }, [user]);

    return (
        <Card className="bg-card/30 border-white/5">
            <CardHeader>
                <CardTitle>{t('wallet_recent_transactions_title')}</CardTitle>
                <CardDescription>{t('wallet_recent_transactions_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
                {loading && (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                             <div key={i} className="flex items-center">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="ml-4 space-y-1 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                                <Skeleton className="h-5 w-12" />
                            </div>
                        ))}
                    </div>
                )}
                 {!loading && (!transactions || transactions.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>{t('wallet_no_transactions')}</p>
                    </div>
                 )}
                 {!loading && transactions && transactions.length > 0 && (
                     <div className="space-y-4">
                         {transactions.map((tx) => (
                             <div key={tx.id} className="flex items-center">
                                 {tx.type === 'purchase' ? (
                                     <PlusCircle className="h-6 w-6 text-green-500" />
                                 ) : (
                                     <MinusCircle className="h-6 w-6 text-red-500" />
                                 )}
                                 <div className="ml-4 flex-1">
                                     <p className="text-sm font-medium">{tx.description}</p>
                                     <p className="text-xs text-muted-foreground">
                                         {tx.createdAt ? formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true }) : 'just now'}
                                     </p>
                                 </div>
                                 <div className={cn(
                                     "font-semibold font-mono text-sm flex items-center gap-1",
                                     tx.type === 'purchase' ? 'text-green-500' : 'text-red-500'
                                 )}>
                                     <Coins className="h-3 w-3" />
                                     {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
            </CardContent>
            <CardFooter className="justify-center">
                <Button variant="ghost" asChild>
                    <Link href={`${langPrefix}/wallet/history`}>
                        {t('wallet_view_all_transactions')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

function WalletSkeleton() {
  return (
    <div className="container mx-auto max-w-5xl py-32 pt-28 md:pt-36 space-y-12">
      <Card className="text-center">
        <CardHeader>
          <Skeleton className="h-5 w-32 mx-auto" />
          <Skeleton className="h-10 w-48 mx-auto mt-2" />
        </CardHeader>
      </Card>
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { user, userProfile, loading: userLoading, refreshProfile } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || i18n.defaultLocale;
  const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;
  
  const { toast } = useToast();
  const { t } = useTranslation();

  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [monetizationSettings, setMonetizationSettings] = useState<MonetizationSettings | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentGatewaySettings | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const verificationProcessed = useRef(false);

  useEffect(() => {
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id'); 
    const packId = searchParams.get('pack_id');
    const rzpId = searchParams.get('razorpay_payment_id'); 
    const flwId = searchParams.get('transaction_id') || searchParams.get('tx_ref');
    const token = searchParams.get('token');
    const urlGateway = searchParams.get('gateway');

    if (status === 'success' && packId && user && !verificationProcessed.current) {
        verificationProcessed.current = true;
        setIsVerifying(true);

        const idToVerify = sessionId || rzpId || flwId || token || 'WEB_DIRECT';
        const gateway = urlGateway || (rzpId ? 'razorpay' : flwId ? 'flutterwave' : 'stripe');

        verifyAndExecutePurchaseAction(user.uid, packId, gateway, idToVerify)
            .then(result => {
                if (result.success) {
                    toast({ 
                        title: t('payment_dialog_toast_success_title'), 
                        description: 'Success! Your purchase has been processed.',
                        className: "bg-green-600 text-white border-none font-bold"
                    });
                    refreshProfile();
                    router.replace(`${langPrefix}/wallet`);
                } else {
                    toast({ 
                        variant: 'destructive', 
                        title: 'Verification Failed', 
                        description: result.error || 'Something went wrong.' 
                    });
                }
            })
            .catch(() => {
                 toast({ variant: 'destructive', title: 'Error', description: 'Network error during verification.' });
            })
            .finally(() => {
                setIsVerifying(false);
            });
    } else if (status === 'cancel') {
        toast({ 
            variant: 'destructive',
            title: 'Payment Cancelled', 
            description: 'The transaction was not completed.',
            className: "bg-red-600 text-white border-none"
        });
        router.replace(`${langPrefix}/wallet`);
    }
  }, [searchParams, user, router, toast, refreshProfile, t, langPrefix]);

  useEffect(() => {
    const fetchData = async () => {
        setLoadingData(true);
        const [pData, mData, payData] = await Promise.all([
            getCoinPacks(),
            getMonetizationSettings(),
            getPaymentSettings()
        ]);
        setPacks(pData);
        setMonetizationSettings(mData);
        setPaymentSettings(payData);
        setLoadingData(false);
    };
    fetchData();
  }, []);

  const handlePurchaseClick = (pack: CoinPack) => {
    setSelectedPack(pack);
    setIsDialogOpen(true);
  };

  const hasActiveGateway = useMemo(() => {
    if (!paymentSettings) return false;
    return (
      paymentSettings.stripeEnabled ||
      paymentSettings.paypalEnabled ||
      paymentSettings.razorpayEnabled
    );
  }, [paymentSettings]);

  const membershipPacks = useMemo(() => packs.filter(p => p.type === 'membership'), [packs]);
  const coinPacks = useMemo(() => packs.filter(p => p.type === 'coins' || !p.type), [packs]);

  if (loadingData || userLoading) {
    return <WalletSkeleton />;
  }
  
  if (!user) {
    return (
        <div className="container mx-auto max-w-5xl py-32 pt-28 md:pt-36 text-center">
            <h1 className="text-3xl font-bold">{t('common_please_log_in')}</h1>
            <p className="text-muted-foreground mt-2">{t('my_list_login_desc')}</p>
        </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl py-32 pt-28 md:pt-36 space-y-16 relative">
        
        {isVerifying && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                <Card className="max-w-md w-full text-center p-8 space-y-6 animate-in zoom-in duration-300">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            <Crown className="h-6 w-6 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <h2 className="text-2xl font-black">{t('wallet_verifying_title')}</h2>
                        <p className="text-muted-foreground">{t('wallet_verifying_desc')}</p>
                    </div>
                </Card>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-primary/5 border-primary/20 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-700" />
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground flex items-center gap-2">
                        <Coins className="h-3 w-3 text-amber-400" /> {t('wallet_balance_label')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-5xl font-black text-foreground flex items-baseline gap-2">
                        {userProfile?.coins?.toLocaleString() || 0}
                        <span className="text-xs text-muted-foreground font-bold uppercase">Coins</span>
                    </div>
                </CardContent>
            </Card>

            <Card className={cn(
                "border-amber-400/20 shadow-xl relative overflow-hidden group transition-all",
                userProfile?.isVip ? "bg-amber-400/10" : "bg-white/[0.02]"
            )}>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 blur-3xl -mr-16 -mt-16 group-hover:bg-amber-400/20 transition-all duration-700" />
                 <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground flex items-center gap-2">
                        <Crown className={cn("h-3 w-3", userProfile?.isVip ? "text-amber-400 fill-current" : "text-white/20")} /> Membership
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-foreground">
                        {userProfile?.isVip ? (
                            <span className="text-amber-400 italic">VIP ACTIVE</span>
                        ) : (
                            <span className="text-white/40">NO ACTIVE VIP</span>
                        )}
                    </div>
                    {userProfile?.isVip && userProfile.vipExpiry && (
                        <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-widest">
                            Expires: {new Date(userProfile.vipExpiry).toLocaleDateString()}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Viral Referral Program */}
        <ReferralCard userProfile={userProfile} userId={user?.uid} onProfileRefresh={refreshProfile} />

        {/* Memberships Horizontal Carousel */}
        {membershipPacks.length > 0 && (
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-amber-400/10 rounded-2xl flex items-center justify-center border border-amber-400/20">
                        <Crown className="h-5 w-5 text-amber-400 fill-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">VIP Memberships</h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Unlock all premium content instantly</p>
                    </div>
                </div>

                <ScrollArea className="w-full pb-6">
                    <div className="flex gap-4 pr-4">
                        {membershipPacks.map((pack) => (
                            <Card key={pack.id} className="min-w-[280px] md:min-w-[320px] bg-gradient-to-br from-zinc-900 to-black border-amber-400/20 hover:border-amber-400/50 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400" />
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl font-black text-white italic tracking-tight">{pack.name}</CardTitle>
                                            <CardDescription className="text-[10px] font-bold uppercase text-amber-400 tracking-widest">{pack.durationDays} Days Access</CardDescription>
                                        </div>
                                        <Zap className="h-5 w-5 text-amber-400 fill-current animate-pulse" />
                                    </div>
                                </CardHeader>
                                <CardContent className="py-6">
                                    <div className="text-4xl font-black text-white">
                                        {monetizationSettings?.currencySymbol || '$'}{pack.price.toFixed(2)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-4 line-clamp-2 leading-relaxed">
                                        {pack.description || "Get full access to all premium dramas and exclusive features."}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Button 
                                        onClick={() => handlePurchaseClick(pack)}
                                        disabled={!hasActiveGateway}
                                        className="w-full bg-amber-400 hover:bg-amber-500 text-black font-black uppercase tracking-wider rounded-xl py-6"
                                    >
                                        Upgrade Now
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="bg-white/5" />
                </ScrollArea>
            </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                            <ShoppingCart className="text-primary h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Buy Coins</h2>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Refill your wallet to unlock episodes</p>
                        </div>
                    </div>
                    
                    {!hasActiveGateway && (
                        <Alert variant="destructive" className="mb-8 rounded-2xl bg-red-500/10 border-red-500/20">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="font-black italic">{t('wallet_no_payment_methods_title')}</AlertTitle>
                            <AlertDescription className="text-xs">
                                {t('wallet_no_payment_methods_desc')}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {coinPacks.map((pack) => (
                        <Card key={pack.id} className="bg-card/30 border-white/5 hover:border-primary/50 transition-all duration-300 group rounded-3xl overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-black text-white uppercase italic tracking-tighter">{pack.name}</CardTitle>
                                {pack.description && (
                                    <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase truncate">{pack.description}</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
                                <div className="text-5xl font-black flex items-center gap-3 text-amber-400 group-hover:scale-110 transition-transform duration-500">
                                    <div className="p-3 bg-amber-400/10 rounded-2xl border border-amber-400/20">
                                        <Coins className="h-10 w-10 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                                    </div>
                                    <span>{pack.amount.toLocaleString()}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Button
                                    size="lg"
                                    className="w-full bg-white text-black hover:bg-primary hover:text-white font-black text-base rounded-2xl h-14 shadow-2xl transition-all duration-300"
                                    onClick={() => handlePurchaseClick(pack)}
                                    disabled={!hasActiveGateway}
                                >
                                    {monetizationSettings?.currencySymbol || '$'}{pack.price.toFixed(2)}
                                </Button>
                            </CardFooter>
                        </Card>
                        ))}
                    </div>
                    {coinPacks.length === 0 && !loadingData && (
                        <div className="text-center py-24 bg-white/[0.02] rounded-[2.5rem] border-2 border-dashed border-white/5">
                            <div className="p-6 bg-white/5 rounded-full inline-flex mb-6">
                                <Coins className="h-12 w-12 text-white/10" />
                            </div>
                            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">{t('wallet_no_packs')}</p>
                        </div>
                    )}
                </section>
            </div>
            
            <div className="lg:col-span-1">
                <TransactionHistoryCard />
            </div>
        </div>

        {selectedPack && user && (
            <PaymentDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                pack={selectedPack}
                user={user}
                paymentSettings={paymentSettings}
                monetizationSettings={monetizationSettings}
                onPurchaseSuccess={() => {}}
            />
        )}
    </div>
  );
}
