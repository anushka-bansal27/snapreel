'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState, useTransition } from 'react';
import type { GeneralSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, KeyRound, CheckCircle } from 'lucide-react';
import { testLicenseAction } from '@/lib/actions';
import { getDemoModeStatus } from '@/lib/data.actions';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  licenseKey: z.string().optional(),
  codecanyonUsername: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function LicenseSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, startTestTransition] = useTransition();

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'general') : null, [firestore]);
  const { data: settings, isLoading: loading } = useDoc<GeneralSettings>(settingsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      licenseKey: '',
      codecanyonUsername: '',
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        licenseKey: settings.licenseKey || '',
        codecanyonUsername: settings.codecanyonUsername || '',
      });
    }
  }, [settings, form]);

  const handleTestLicense = () => {
    const { licenseKey } = form.getValues();
    if (!licenseKey) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please enter a license key.',
        });
        return;
    }

    startTestTransition(async () => {
        const result = await testLicenseAction(licenseKey);
        if (result.success) {
            toast({ title: 'Success', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Activation Failed', description: result.message });
        }
    });
  };

  const onSubmit = async (values: FormValues) => {
    if (!settingsRef) return;
    setIsSaving(true);
    setSaveSuccess(false);
    if (await getDemoModeStatus()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please change DEMO_MODE=true to DEMO_MODE=false in .env file.' });
      setIsSaving(false);
      return;
    }
    setDoc(settingsRef, values, { merge: true })
      .then(() => {
        toast({ title: 'Success', description: 'License settings saved.' });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      })
      .catch((error) => {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' });
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: settingsRef.path,
            operation: 'update',
            requestResourceData: values,
        }));
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">License Activation</h1>
            <p className="text-muted-foreground">Manage and activate your product license.</p>
          </div>
          <Button type="submit" disabled={isSaving || loading} className={cn(saveSuccess && 'bg-green-500 hover:bg-green-600')}>
            {isSaving ? <Loader2 className="animate-spin" /> : saveSuccess ? <CheckCircle/> : <Save />}
            {saveSuccess ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>License Details</CardTitle>
                <CardDescription>Activate your product license to ensure full functionality.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField name="codecanyonUsername" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>CodeCanyon Username</FormLabel><FormControl><Input {...field} placeholder="Your CodeCanyon username" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField name="licenseKey" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>License Key / Purchase Code</FormLabel><FormControl><Input {...field} type="password" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></FormControl><FormMessage /></FormItem>
                )}/>
                 <div className="flex items-center">
                    <FormLabel>Activation Status:&nbsp;</FormLabel>
                    {loading ? <Skeleton className="h-5 w-20" /> : settings?.isLicenseActive ? 
                        <span className="text-green-500 font-medium">Active</span> : 
                        <span className="text-destructive font-medium">Inactive</span>
                    }
                </div>
            </CardContent>
            <CardFooter>
                <Button type="button" variant="secondary" onClick={handleTestLicense} disabled={isTesting}>
                    {isTesting ? <Loader2 className="animate-spin mr-2" /> : <KeyRound className="mr-2"/>}
                    Test & Activate
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
