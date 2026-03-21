'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, ShieldAlert, Loader2, CheckCircle2, Globe, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ActivatePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [purchaseCode, setPurchaseCode] = useState('');
    const [domain, setDomain] = useState('');
    const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setDomain(window.location.hostname);
        }
    }, []);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!purchaseCode || !domain) {
            toast({ variant: 'destructive', title: 'Required', description: 'Please fill out your purchase code.' });
            return;
        }

        setStatus('verifying');
        setMessage('Verifying your purchase key with DevSnaplix central server...');

        try {
            const res = await fetch('/api/install/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchaseCode, domain })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setStatus('success');
                setMessage('License activated successfully! Redirecting to platform...');
                toast({ title: 'Success', description: 'License verified and registered.' });
                setTimeout(() => {
                    router.push('/');
                    router.refresh();
                }, 2000);
            } else {
                setStatus('error');
                setMessage(data.error || 'Failed to verify license key.');
                toast({ variant: 'destructive', title: 'Activation Failed', description: data.error });
            }
        } catch (error: any) {
            setStatus('error');
            setMessage(error.message || 'An error occurred during verification.');
            toast({ variant: 'destructive', title: 'Connection Error', description: error.message });
        }
    };

    return (
        <div className="min-h-screen bg-[#080b11] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-pink-500/10 mb-2 border border-pink-500/20 shadow-[0_0_20px_rgba(248,87,166,0.15)] animate-pulse">
                        <KeyRound className="h-10 w-10 text-pink-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">License Required</h1>
                    <p className="text-slate-400 text-sm">Please activate your product license to restore access.</p>
                </div>

                <Card className="bg-[#0f131a]/80 border-slate-800/80 shadow-2xl backdrop-blur-xl rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-slate-800/50 pb-6">
                        <CardTitle className="text-xl font-bold text-white text-center flex items-center justify-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-pink-400" />
                            License Activation
                        </CardTitle>
                        <CardDescription className="text-center text-slate-400">
                            Activate your product license using your Envato Purchase Code.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleActivate}>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="purchaseCode" className="text-slate-300 font-bold text-xs uppercase tracking-wider">Envato Purchase Code</Label>
                                <Input
                                    id="purchaseCode"
                                    type="text"
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    value={purchaseCode}
                                    onChange={(e: any) => setPurchaseCode(e.target.value)}
                                    className="bg-slate-900/50 border-slate-800 focus:border-pink-500 focus:ring-pink-500 text-white h-11 rounded-xl"
                                    disabled={status === 'success' || status === 'verifying'}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="domain" className="text-slate-300 font-bold text-xs uppercase tracking-wider">Current Domain</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="domain"
                                        type="text"
                                        value={domain}
                                        className="bg-slate-900/30 border-slate-800/50 text-slate-400 pl-10 h-11 rounded-xl cursor-not-allowed"
                                        disabled
                                    />
                                </div>
                            </div>

                            {status !== 'idle' && (
                                <div className={cn(
                                    "p-4 rounded-xl border flex flex-col gap-2 text-xs",
                                    status === 'success' ? "bg-green-500/10 border-green-500/30 text-green-400" :
                                    status === 'verifying' ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" :
                                    "bg-red-500/10 border-red-500/30 text-red-400"
                                )}>
                                    <div className="flex items-center gap-2">
                                        {status === 'verifying' ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : null}
                                        {status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                                        <p className="font-semibold">
                                            {status === 'success' ? 'Verification Success' : 
                                             status === 'verifying' ? 'Verifying Key...' : 
                                             'Verification Failed'}
                                        </p>
                                    </div>
                                    <p>{message}</p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="border-t border-slate-800/50 pt-6">
                            {status === 'success' ? (
                                <Button
                                    disabled
                                    className="w-full bg-green-600 text-white font-bold h-11 rounded-xl shadow-lg shadow-green-500/20"
                                >
                                    Access Restored <CheckCircle2 className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    disabled={status === 'verifying'}
                                    className="w-full bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-pink-500/20"
                                >
                                    {status === 'verifying' ? (
                                        <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Activating...</>
                                    ) : (
                                        <>Verify & Activate <ArrowRight className="ml-2 h-4 w-4" /></>
                                    )}
                                </Button>
                            )}
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
