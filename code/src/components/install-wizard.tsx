'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Database, ShieldCheck, Loader2, Server, ArrowRight, Save, Rocket, Globe, Type, User, KeyRound } from 'lucide-react';
import { testMongoDbConnectionAction, installInitializeDbAction, installSetupAdminAction, installSaveSiteConfigAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function InstallWizard() {
    const { toast } = useToast();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: License Activation
    const [purchaseCode, setPurchaseCode] = useState('');
    const [domain, setDomain] = useState('');
    const [licenseStatus, setLicenseStatus] = useState<'idle' | 'activating' | 'success' | 'error'>('idle');
    const [licenseMessage, setLicenseMessage] = useState('');
    
    // Step 2: Database Test
    const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [dbMessage, setDbStatusMessage] = useState('');

    // Step 3: Auto Import
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'done'>('idle');

    // Step 4: Website Config
    const [siteName, setSiteName] = useState('SnapReels');
    const [siteUrl, setSiteUrl] = useState('');

    // Step 5: Admin Account
    const [adminUsername, setAdminUsername] = useState('admin');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [isSetupDone, setIsSetupDone] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setDomain(window.location.hostname);
            setSiteUrl(window.location.origin);
        }
    }, []);

    const handleVerifyLicense = async () => {
        if (!purchaseCode || !domain) {
            toast({ variant: 'destructive', title: 'Required', description: 'Please enter purchase code and domain.' });
            return;
        }
        setLicenseStatus('activating');
        setLicenseMessage('Connecting to activation server...');

        try {
            const res = await fetch('/api/install/activate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ purchaseCode, domain }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setLicenseStatus('success');
                setLicenseMessage(data.message || 'License activated successfully!');
                toast({ title: 'Success', description: 'License verified and saved.' });
            } else {
                setLicenseStatus('error');
                setLicenseMessage(data.error || 'Failed to activate license.');
                toast({ variant: 'destructive', title: 'Verification Failed', description: data.error });
            }
        } catch (error: any) {
            setLicenseStatus('error');
            setLicenseMessage(error.message || 'An error occurred during verification.');
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleTestDb = async () => {
        setDbStatus('testing');
        const result = await testMongoDbConnectionAction();
        if (result.success) {
            setDbStatus('success');
            setDbStatusMessage('Connection to MongoDB established successfully!');
            toast({ title: 'Success', description: result.message });
        } else {
            setDbStatus('error');
            setDbStatusMessage(result.error || 'Failed to connect. Check your .env file.');
            toast({ variant: 'destructive', title: 'Connection Failed', description: result.error });
        }
    };

    const handleAutoImport = async () => {
        setImportStatus('processing');
        setImportProgress(0);
        
        // Fake progress for UI feel
        const interval = setInterval(() => {
            setImportProgress(prev => {
                if (prev >= 95) { clearInterval(interval); return 95; }
                return prev + 5;
            });
        }, 200);

        const result = await installInitializeDbAction();
        
        setTimeout(() => {
            clearInterval(interval);
            if (result.success) {
                setImportProgress(100);
                setImportStatus('done');
                toast({ title: 'Success', description: 'Database seeded with default content.' });
            } else {
                setImportStatus('idle');
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        }, 4000); // 4 seconds total
    };

    const handleSaveSiteConfig = async () => {
        if (!siteName || !siteUrl) {
            toast({ variant: 'destructive', title: 'Required', description: 'Please enter site name and URL.' });
            return;
        }
        setIsLoading(true);
        try {
            const result = await installSaveSiteConfigAction({ siteName, siteUrl });
            if (result.success) {
                setStep(5);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to save configuration.' });
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetupAdmin = async () => {
        if (!adminUsername || !adminEmail || !adminPassword) {
            toast({ variant: 'destructive', title: 'Required', description: 'Please fill all admin credentials.' });
            return;
        }
        setIsLoading(true);
        try {
            const result = await installSetupAdminAction({ 
                username: adminUsername,
                email: adminEmail, 
                password: adminPassword 
            });
            if (result.success) {
                setIsSetupDone(true);
                toast({ title: 'Installation Complete!', description: 'Your admin account is ready.' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Setup failed.' });
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-xl w-full space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4 animate-bounce">
                        <Rocket className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">SnapReels Setup</h1>
                    <p className="text-slate-400">Platform Initialization Wizard</p>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-between px-2 mb-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500",
                                step >= i ? "bg-primary text-white shadow-[0_0_15px_rgba(248,87,166,0.5)]" : "bg-slate-800 text-slate-500"
                            )}>
                                {step > i ? <CheckCircle2 className="h-6 w-6" /> : i}
                            </div>
                            {i < 5 && <div className={cn("w-12 h-1 mx-1 rounded", step > i ? "bg-primary" : "bg-slate-800")} />}
                        </div>
                    ))}
                </div>

                <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
                    {/* STEP 1: License Activation */}
                    {step === 1 && (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <KeyRound className="h-5 w-5 text-pink-400" />
                                    Step 1: License Activation
                                </CardTitle>
                                <CardDescription>Activate your product license using your Envato Purchase Code.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="purchaseCode">Envato Purchase Code</Label>
                                    <Input 
                                        id="purchaseCode" 
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
                                        value={purchaseCode} 
                                        onChange={e => setPurchaseCode(e.target.value)} 
                                        className="bg-slate-800/50 border-slate-700"
                                        disabled={licenseStatus === 'success'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="domain">Current Domain</Label>
                                    <Input 
                                        id="domain" 
                                        placeholder="yourdomain.com" 
                                        value={domain} 
                                        onChange={e => setDomain(e.target.value)} 
                                        className="bg-slate-800/50 border-slate-700"
                                        disabled={licenseStatus === 'success'}
                                    />
                                </div>

                                <div className={cn(
                                    "p-4 rounded-xl border flex flex-col gap-2 text-xs",
                                    licenseStatus === 'success' ? "bg-green-500/10 border-green-500/30 text-green-400" : 
                                    licenseStatus === 'error' ? "bg-red-500/10 border-red-500/30 text-red-400" : "hidden"
                                )}>
                                    <p className="font-semibold">{licenseStatus === 'success' ? 'Verification Success' : 'Verification Failed'}</p>
                                    <p>{licenseMessage}</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-4">
                                <Button 
                                    className="flex-1" 
                                    onClick={handleVerifyLicense} 
                                    disabled={licenseStatus === 'activating' || licenseStatus === 'success'}
                                >
                                    {licenseStatus === 'activating' ? <Loader2 className="animate-spin mr-2" /> : null}
                                    {licenseStatus === 'success' ? 'License Activated' : 'Verify & Activate'}
                                </Button>
                                <Button 
                                    className="flex-1" 
                                    disabled={licenseStatus !== 'success'} 
                                    onClick={() => setStep(2)}
                                >
                                    Next: Connect Database <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </>
                    )}

                    {/* STEP 2: Database Connection */}
                    {step === 2 && (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-blue-400" />
                                    Step 2: Database Connection
                                </CardTitle>
                                <CardDescription>Test your MongoDB connection defined in your environment.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className={cn(
                                    "p-4 rounded-xl border flex flex-col gap-3",
                                    dbStatus === 'success' ? "bg-green-500/10 border-green-500/30" : 
                                    dbStatus === 'error' ? "bg-red-500/10 border-red-500/30" : "bg-slate-800/50 border-slate-700"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-lg flex items-center justify-center",
                                            dbStatus === 'success' ? "bg-green-500/20" : 
                                            dbStatus === 'error' ? "bg-red-500/20" : "bg-slate-700"
                                        )}>
                                            <Server className={cn("h-5 w-5", dbStatus === 'success' ? "text-green-500" : "text-slate-400")} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white">MongoDB Status</p>
                                            <p className="text-xs text-slate-400">Testing connection...</p>
                                        </div>
                                        <Button size="sm" onClick={handleTestDb} disabled={dbStatus === 'testing'}>
                                            {dbStatus === 'testing' ? <Loader2 className="animate-spin" /> : 'Test Connection'}
                                        </Button>
                                    </div>
                                    {dbMessage && <p className={cn("text-xs font-medium", dbStatus === 'success' ? "text-green-400" : "text-red-400")}>{dbMessage}</p>}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" disabled={dbStatus !== 'success'} onClick={() => setStep(3)}>
                                    Next: Initialize Data <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </>
                    )}

                    {/* STEP 3: Auto Import */}
                    {step === 3 && (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Rocket className="h-5 w-5 text-amber-400" />
                                    Step 3: Database Initialization
                                </CardTitle>
                                <CardDescription>Creating default settings, categories, and languages.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {importStatus === 'idle' ? (
                                    <div className="space-y-6 py-4 text-center">
                                        <div className="bg-amber-500/10 p-6 rounded-full inline-flex">
                                            <Database className="h-12 w-12 text-amber-500" />
                                        </div>
                                        <p className="text-sm text-slate-300">Click below to automatically create essential tables and populate them with initial data.</p>
                                        <Button onClick={handleAutoImport} className="w-full bg-amber-500 hover:bg-amber-600 font-bold">
                                            Start Auto-Initialization
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6 py-10">
                                        <div className="flex justify-between text-sm text-white font-bold">
                                            <span>{importStatus === 'processing' ? 'Setting up database...' : 'Initialization Complete!'}</span>
                                            <span>{importProgress}%</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500 transition-all duration-1000 ease-in-out" style={{ width: `${importProgress}%` }} />
                                        </div>
                                        <p className="text-center text-xs text-slate-400">Please wait, do not refresh this page...</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" disabled={importStatus !== 'done'} onClick={() => setStep(4)}>
                                    Next: Site Config <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </>
                    )}

                    {/* STEP 4: Web Config */}
                    {step === 4 && (
                         <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-purple-400" />
                                    Step 4: Website Details
                                </CardTitle>
                                <CardDescription>Basic branding for your streaming platform.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="siteName">Site Name</Label>
                                    <div className="relative">
                                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <Input id="siteName" value={siteName} onChange={e => setSiteName(e.target.value)} className="bg-slate-800/50 border-slate-700 pl-10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="siteUrl">Primary URL (Domain)</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <Input id="siteUrl" placeholder="https://yourdomain.com" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} className="bg-slate-800/50 border-slate-700 pl-10" />
                                    </div>
                                    <p className="text-[10px] text-slate-500 italic">Example: https://yourdomain.com</p>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={handleSaveSiteConfig} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : 'Save & Continue'}
                                </Button>
                            </CardFooter>
                         </>
                    )}

                    {/* STEP 5: Admin Setup */}
                    {step === 5 && (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-green-400" />
                                    Step 5: Create Administrator
                                </CardTitle>
                                <CardDescription>Set up the credentials for your dashboard access.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Admin Username</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <Input id="username" placeholder="admin" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} disabled={isSetupDone} className="bg-slate-800/50 border-slate-700 pl-10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Admin Email</Label>
                                    <Input id="email" type="email" placeholder="admin@example.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} disabled={isSetupDone} className="bg-slate-800/50 border-slate-700" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Admin Password</Label>
                                    <Input id="password" type="password" placeholder="••••••••" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} disabled={isSetupDone} className="bg-slate-800/50 border-slate-700" />
                                </div>
                            </CardContent>
                            <CardFooter className="flex-col gap-4">
                                {!isSetupDone ? (
                                    <Button className="w-full" onClick={handleSetupAdmin} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                                        Finalize & Install
                                    </Button>
                                ) : (
                                    <Button onClick={() => router.push('/admin')} className="w-full bg-green-600 hover:bg-green-700 text-white font-black animate-pulse">
                                        GO TO ADMIN PANEL <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </CardFooter>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}

