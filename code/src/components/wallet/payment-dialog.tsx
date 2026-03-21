'use client';
import { useState, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { CoinPack, PaymentGatewaySettings, MonetizationSettings } from '@/lib/types';
import { createCheckoutSessionAction } from '@/lib/actions';
import Image from 'next/image';
import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, ExternalLink, ShieldCheck, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/translation-provider';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pack: CoinPack;
  user: User;
  paymentSettings: PaymentGatewaySettings | null;
  monetizationSettings: MonetizationSettings | null;
  onPurchaseSuccess: () => void;
}

export function PaymentDialog({
  open, onOpenChange, pack, user, paymentSettings, monetizationSettings, onPurchaseSuccess
}: PaymentDialogProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const { toast } = useToast();
  const { t } = useTranslation();

  const enabledGateways = useMemo(() => {
    if (!paymentSettings) return [];
    const gateways = [];
    if (paymentSettings.stripeEnabled) gateways.push('stripe');
    if (paymentSettings.paypalEnabled) gateways.push('paypal');
    if (paymentSettings.razorpayEnabled) gateways.push('razorpay');
    if (paymentSettings.flutterwaveEnabled) gateways.push('flutterwave');
    if ((paymentSettings as any).phonepeEnabled) gateways.push('phonepe');
    if ((paymentSettings as any).cashfreeEnabled) gateways.push('cashfree');
    if ((paymentSettings as any).payuEnabled) gateways.push('payu');
    return gateways;
  }, [paymentSettings]);

  const defaultTab = useMemo(() => {
    return enabledGateways[0] || '';
  }, [enabledGateways]);

  const validateKeys = (gateway: string) => {
      if (gateway === 'stripe') {
          return !!paymentSettings?.stripePublishableKey;
      }
      if (gateway === 'paypal') {
          return !!paymentSettings?.paypalClientId;
      }
      if (gateway === 'flutterwave') {
          return !!(paymentSettings?.flutterwaveSecretKey || paymentSettings?.flutterwavePublicKey);
      }
      if (gateway === 'phonepe') {
          return !!(paymentSettings as any)?.phonepeMerchantId;
      }
      if (gateway === 'cashfree') {
          return !!(paymentSettings as any)?.cashfreeAppId;
      }
      if (gateway === 'payu') {
          return !!(paymentSettings as any)?.payuMerchantKey;
      }
      return !!paymentSettings?.razorpayKeyId;
  };

  const handleRedirectToPay = async () => {
    const gateway = selectedGateway || defaultTab;
    
    if (!validateKeys(gateway)) {
        toast({
            variant: 'destructive',
            title: 'Config Error',
            description: `Invalid or missing Keys for ${gateway.toUpperCase()}. Please check your Admin settings.`,
        });
        return;
    }

    setIsRedirecting(true);
    
    try {
        const result = await createCheckoutSessionAction(user.uid, pack.id, gateway);
        
        if (result.success && result.url) {
            window.location.href = result.url;
        } else {
            throw new Error(result.error || 'Could not create checkout session.');
        }
    } catch (error: any) {
        setIsRedirecting(false);
        toast({
            variant: 'destructive',
            title: 'Redirect Failed',
            description: error.message,
        });
    }
  };

  if (enabledGateways.length === 0) {
      return null;
  }

  const symbol = monetizationSettings?.currencySymbol || '$';
  const price = pack.price.toFixed(2);
  const currentTab = selectedGateway || defaultTab;

  const getGatewayLogo = (gateway: string) => {
      if (gateway === 'stripe') return paymentSettings?.stripeLogoUrl || '/img/logo-stripe.png';
      if (gateway === 'paypal') return paymentSettings?.paypalLogoUrl || '/img/logo-paypal.png';
      if (gateway === 'razorpay') return paymentSettings?.razorpayLogoUrl || '/img/logo-razorpay.png';
      if (gateway === 'flutterwave') return paymentSettings?.flutterwaveLogoUrl || '/img/logo-flutterwave.png';
      if (gateway === 'phonepe') return (paymentSettings as any)?.phonepeLogoUrl || '/img/logo-stripe.png';
      if (gateway === 'cashfree') return (paymentSettings as any)?.cashfreeLogoUrl || '/img/logo-stripe.png';
      if (gateway === 'payu') return (paymentSettings as any)?.payuLogoUrl || '/img/logo-stripe.png';
      return '/img/logo-stripe.png';
  }

  const gatewaysList = useMemo(() => [
      { id: 'stripe', name: 'Stripe', logo: getGatewayLogo('stripe') },
      { id: 'paypal', name: 'PayPal', logo: getGatewayLogo('paypal') },
      { id: 'razorpay', name: 'Razorpay', logo: getGatewayLogo('razorpay') },
      { id: 'flutterwave', name: 'Flutterwave', logo: getGatewayLogo('flutterwave') },
      { id: 'phonepe', name: 'PhonePe', logo: getGatewayLogo('phonepe') },
      { id: 'cashfree', name: 'Cashfree', logo: getGatewayLogo('cashfree') },
      { id: 'payu', name: 'PayU', logo: getGatewayLogo('payu') },
  ].filter(g => enabledGateways.includes(g.id)), [enabledGateways, paymentSettings]);

  // To prevent caching during logo updates in admin, add a timestamp
  const logoUrl = getGatewayLogo(currentTab);
  const finalLogoUrl = logoUrl.startsWith('/') ? `${logoUrl}?v=${Date.now()}` : logoUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border border-white/10 text-white p-0 overflow-hidden rounded-[2rem] shadow-2xl">
        <DialogHeader className="px-6 pt-8 md:pt-10">
          <DialogTitle className="text-2xl md:text-3xl font-extrabold tracking-tight text-center leading-none">
              {isRedirecting ? 'Transferring...' : t('payment_dialog_title')}
          </DialogTitle>
          <DialogDescription className="text-white/50 font-medium text-xs text-center mt-2">
            {isRedirecting 
                ? "Please wait while we transfer you to the secure payment page."
                : t('payment_dialog_desc', { packName: pack.name, symbol, price })
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 md:p-6">
            {isRedirecting ? (
                <div className="flex flex-col items-center justify-center py-12 md:py-16 space-y-6">
                    <div className="relative">
                        <Loader2 className="h-16 w-10 md:h-20 md:w-12 animate-spin text-primary" />
                        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <p className="font-semibold text-xs text-white/60 animate-pulse">Establishing Secure Link...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="space-y-2.5">
                        {gatewaysList.map((g) => {
                            const isSelected = currentTab === g.id;
                            const logo = g.logo.startsWith('/') ? `${g.logo}?v=${Date.now()}` : g.logo;
                            return (
                                <div
                                    key={g.id}
                                    onClick={() => setSelectedGateway(g.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3.5 md:p-4 rounded-2xl border cursor-pointer transition-all duration-200 group select-none",
                                        isSelected 
                                            ? "bg-primary/15 border-primary/80 shadow-lg shadow-primary/10" 
                                            : "bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/15"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-16 bg-white/10 rounded-xl flex items-center justify-center p-2 relative overflow-hidden border border-white/5 shrink-0">
                                            <Image 
                                                src={logo} 
                                                alt={g.name} 
                                                fill 
                                                className="object-contain p-1.5" 
                                            />
                                        </div>
                                        <span className={cn(
                                            "text-sm md:text-base font-bold transition-colors",
                                            isSelected ? "text-white font-extrabold" : "text-white/80 group-hover:text-white"
                                        )}>
                                            {g.name}
                                        </span>
                                    </div>

                                    <div className={cn(
                                        "h-6 w-6 rounded-full flex items-center justify-center border transition-all shrink-0",
                                        isSelected 
                                            ? "bg-primary border-primary text-white" 
                                            : "border-white/20 bg-transparent group-hover:border-white/40"
                                    )}>
                                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-2.5 pt-3">
                        <Button onClick={handleRedirectToPay} className="w-full h-12 md:h-13 bg-primary hover:bg-primary/90 font-bold tracking-wide shadow-xl shadow-primary/20 rounded-2xl text-sm md:text-base transition-all duration-300">
                            <span>Continue Payment</span>
                        </Button>
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full h-10 rounded-xl font-medium text-white/40 hover:text-white hover:bg-white/5 text-xs">
                            {t('common_cancel')}
                        </Button>
                    </div>
                </div>
            )}
        </div>

        <div className="bg-white/[0.02] py-3.5 px-6 flex items-center justify-center gap-2 border-t border-white/5 opacity-40">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[9px] font-bold tracking-wider text-white/80">SSL 256-Bit Encrypted Transaction</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
