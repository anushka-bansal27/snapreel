'use client';
import { useActionState, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateAdminProfile } from '@/lib/actions';
import type { AdminProfile } from '@/lib/types';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, KeyRound, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required.'),
  email: z.string().email('Invalid email address.'),
  username: z.string().min(1, 'Username is required.'),
  currentPassword: z.string().min(1, 'Your current password is required to save changes.'),
  newPassword: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function AdminProfileForm({ initialProfile }: { initialProfile: AdminProfile }) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(updateAdminProfile, { success: false, error: null });
  const [justSaved, setJustSaved] = useState(false);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: initialProfile.displayName,
      email: initialProfile.email,
      username: initialProfile.username,
      currentPassword: '',
      newPassword: '',
    },
  });
  
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Success', description: state.message });
      form.reset({ ...form.getValues(), currentPassword: '', newPassword: '' });
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), 3000);
      return () => clearTimeout(timer);
    } else if (state.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.error,
      });
    }
  }, [state, toast, form]);

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-6">
         <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Account</h1>
            <p className="text-muted-foreground">Manage your admin login credentials and profile.</p>
          </div>
          <Button type="submit" disabled={isSubmitting} className={cn(justSaved && !isSubmitting && 'bg-green-500 hover:bg-green-600')}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : justSaved ? <CheckCircle /> : <Save />}
            {isSubmitting ? 'Saving...' : justSaved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        {state?.error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Update Failed</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
            </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>This information is used for display and login purposes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField name="displayName" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField name="email" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField name="username" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password. Leave the new password field blank to keep your current password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <FormField name="currentPassword" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl><FormDescription>Required to save any changes.</FormDescription><FormMessage /></FormItem>
                )}/>
                <FormField name="newPassword" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} placeholder="Leave blank to keep current password" /></FormControl><FormMessage /></FormItem>
                )}/>
            </CardContent>
        </Card>

      </form>
    </Form>
  );
}
