'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPluginsSettings } from '@/lib/data.actions';
import ReCAPTCHA from 'react-google-recaptcha';
import { useTranslation } from '@/lib/translation-provider';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
  subject: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ContactPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaConfig, setCaptchaConfig] = useState<{ key: string; version: string } | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useEffect(() => {
    getPluginsSettings().then(settings => {
      if (settings?.captchaProvider === 'google' && settings.recaptchaSiteKey) {
        setCaptchaConfig({
            key: settings.recaptchaSiteKey,
            version: settings.recaptchaVersion || 'v2'
        });
      }
    });
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '', subject: '', message: '' },
  });

  const onSubmit = async (values: FormValues) => {
    let recaptchaToken = null;

    if (captchaConfig) {
        if (captchaConfig.version === 'v2') {
            recaptchaToken = recaptchaRef.current?.getValue();
            if (!recaptchaToken) {
                toast({ variant: 'destructive', title: 'Verification Required', description: 'Please complete the reCAPTCHA challenge.' });
                return;
            }
        } else if (captchaConfig.version === 'v3') {
            // For v3 we execute manually if using the basic react-google-recaptcha
            // Usually requires v3 specific lib, but we'll try execute if available
            recaptchaToken = await (recaptchaRef.current as any)?.executeAsync();
        }
    }

    setIsSubmitting(true);

    try {
        const response = await fetch('/api/mailbox/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, recaptchaToken })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send');
        }

        toast({ title: t('contact_toast_success_title'), description: t('contact_toast_success_desc') });
        form.reset();
        recaptchaRef.current?.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to send message. Please try again.' });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-24 pt-28 md:pt-36">
      <Card className="shadow-xl border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-black">{t('contact_title')}</CardTitle>
          <CardDescription>{t('contact_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contact_name_label')}</FormLabel>
                    <FormControl><Input {...field} placeholder={t('contact_name_placeholder')} className="bg-background/50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contact_email_label')}</FormLabel>
                    <FormControl><Input {...field} placeholder={t('contact_email_placeholder')} className="bg-background/50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contact_subject_label')}</FormLabel>
                    <FormControl><Input {...field} placeholder={t('contact_subject_placeholder')} className="bg-background/50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contact_message_label')}</FormLabel>
                    <FormControl><Textarea {...field} placeholder={t('contact_message_placeholder')} className="min-h-32 bg-background/50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {captchaConfig && (
                  <div className="flex justify-center py-2">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={captchaConfig.key}
                        size={captchaConfig.version === 'v3' ? 'invisible' : 'normal'}
                        theme="dark"
                      />
                  </div>
              )}

              <div className="flex flex-col gap-4">
                <Button type="submit" disabled={isSubmitting} size="lg" className="w-full font-bold shadow-lg shadow-primary/20">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                    {t('contact_send_button')}
                </Button>
                {captchaConfig && (
                    <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground italic">
                        <ShieldCheck className="h-3 w-3" /> {`Protected by Google reCAPTCHA ${captchaConfig.version}`}
                    </div>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
