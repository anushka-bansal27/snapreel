'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Lock, LogIn, User, Loader2, ShieldCheck, Facebook, Apple } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type User as FirebaseUser,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useTranslation } from '@/lib/translation-provider';
import { useSettings } from '@/lib/settings-provider';
import { getPluginsSettings } from '@/lib/data.actions';

const signUpSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email address.' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

const signInSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const phoneSchema = z.object({
  phoneNumber: z.string().min(8, { message: 'Enter a valid phone number with country code (e.g., +1234567890).' }),
});

const otpSchema = z.object({
  otp: z.string().min(6, { message: 'Enter the 6-digit OTP.' }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

export function AuthDialog({ isMobile = false }: { isMobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [isRecaptchaActive, setIsRecaptchaActive] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'email' | 'google' | 'facebook' | 'apple' | 'phone' | 'forgot' | null>(null);
  const [view, setView] = useState<'signin' | 'signup' | 'forgot' | 'phone' | 'otp'>('signin');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resetSent, setResetSent] = useState(false);
  
  const settings = useSettings();
  const { toast } = useToast();
  const auth = useAuth();
  const { t } = useTranslation();

  // Use settings directly from the provider (Instant load)
  const emailEnabled = settings?.emailLoginEnabled !== false;
  const googleEnabled = settings?.googleLoginEnabled !== false;
  const facebookEnabled = settings?.facebookLoginEnabled === true;
  const appleEnabled = settings?.appleLoginEnabled === true;
  const phoneEnabled = settings?.phoneLoginEnabled === true;

  useEffect(() => {
    // Only fetch plugin-specific things like captcha
    getPluginsSettings().then(pSettings => {
        if (pSettings?.captchaProvider === 'google' && pSettings.recaptchaSiteKey) {
            setIsRecaptchaActive(true);
        }
    });
  }, []);

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: '' },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const createUserProfileDocument = async (user: FirebaseUser) => {
    try {
      await fetch('/api/user/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          phoneNumber: user.phoneNumber,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }),
      });
    } catch (error) {
      console.error('Error creating user profile in MongoDB', error);
    }
  };

  const getAuthErrorMessage = (error: any) => {
      switch (error.code) {
          case 'auth/invalid-credential':
              return 'Email or password is incorrect.';
          case 'auth/user-not-found':
              return 'No account found with this email.';
          case 'auth/wrong-password':
              return 'Incorrect password.';
          case 'auth/email-already-in-use':
              return 'This email is already registered.';
          default:
              return error.message;
      }
  };

  const handleEmailSignIn = async (values: z.infer<typeof signInSchema>) => {
    setLoadingProvider('email');
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: t('auth_toast_signin_success_title'), description: t('auth_toast_signin_success_desc') });
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('auth_toast_signin_fail_title'), description: getAuthErrorMessage(error) });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setLoadingProvider('email');
    try {
      const cred = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await createUserProfileDocument(cred.user);
      toast({ title: t('auth_toast_signup_success_title'), description: t('auth_toast_signup_success_desc') });
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('auth_toast_signup_fail_title'), description: getAuthErrorMessage(error) });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGoogleSignIn = async () => {
      setLoadingProvider('google');
      const provider = new GoogleAuthProvider();
      try {
          const result = await signInWithPopup(auth, provider);
          await createUserProfileDocument(result.user);
          setOpen(false);
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Google Sign In Failed', description: getAuthErrorMessage(error) });
      } finally {
          setLoadingProvider(null);
      }
  };

  const handleFacebookSignIn = async () => {
    setLoadingProvider('facebook');
    const provider = new FacebookAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        await createUserProfileDocument(result.user);
        setOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Facebook Sign In Failed', description: getAuthErrorMessage(error) });
    } finally {
        setLoadingProvider(null);
    }
  };

  const handleAppleSignIn = async () => {
    setLoadingProvider('apple');
    const provider = new OAuthProvider('apple.com');
    try {
        const result = await signInWithPopup(auth, provider);
        await createUserProfileDocument(result.user);
        setOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Apple Sign In Failed', description: getAuthErrorMessage(error) });
    } finally {
        setLoadingProvider(null);
    }
  };

  const handlePhoneSubmit = async (values: z.infer<typeof phoneSchema>) => {
    setLoadingProvider('phone');
    try {
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
        });
      }
      const confirmation = await signInWithPhoneNumber(auth, values.phoneNumber, (window as any).recaptchaVerifier);
      setConfirmationResult(confirmation);
      setView('otp');
      toast({ title: 'OTP Sent', description: 'Check your phone for the verification code.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to send OTP', description: error.message });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    if (!confirmationResult) return;
    setLoadingProvider('phone');
    try {
      const result = await confirmationResult.confirm(values.otp);
      await createUserProfileDocument(result.user);
      toast({ title: 'Phone Sign In Success', description: 'You are now logged in.' });
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The code you entered is incorrect.' });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleForgotPassword = async (values: z.infer<typeof forgotPasswordSchema>) => {
    setLoadingProvider('forgot');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email');
      setResetSent(true);
      toast({ title: 'Email Sent', description: data.message });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoadingProvider(null);
    }
  };

  const TriggerButton = (
    <Button
      variant={isMobile ? 'ghost' : 'default'}
      className={isMobile ? 'w-full justify-start text-lg font-medium' : 'text-white hover:bg-white/10'}
      size={isMobile ? 'lg' : 'icon'}
    >
      <User className={isMobile ? 'mr-3' : ''} />
      {isMobile ? 'Login' : ''}
    </Button>
  );

  const showSocials = googleEnabled || facebookEnabled || appleEnabled;

  return (
    <Dialog open={open} onOpenChange={(val) => { 
        setOpen(val); 
        if(!val) { 
            signInForm.reset(); signUpForm.reset(); phoneForm.reset(); otpForm.reset(); forgotPasswordForm.reset();
            setView('signin');
            setResetSent(false);
        } 
    }}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-black">{t('auth_welcome_title')}</DialogTitle>
          <DialogDescription className="text-center">
            {t('auth_welcome_desc')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div id="recaptcha-container"></div>
          {view === 'forgot' ? (
              resetSent ? (
                  <div className="text-center space-y-4">
                      <p className="text-sm text-muted-foreground">Check your email for a password reset link.</p>
                      <Button variant="outline" className="w-full" onClick={() => { setView('signin'); setResetSent(false); }}>Back to Login</Button>
                  </div>
              ) : (
                  <Form {...forgotPasswordForm}>
                    <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                        <FormField control={forgotPasswordForm.control} name="email" render={({ field }) => (
                            <FormItem><Label>{t('auth_email_label')}</Label><FormControl><Input placeholder="m@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <Button type="submit" className="w-full" disabled={loadingProvider !== null}>
                            {loadingProvider === 'forgot' ? <Loader2 className="animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                            Send Reset Link
                        </Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={() => setView('signin')}>Back to Login</Button>
                    </form>
                  </Form>
              )
          ) : view === 'phone' ? (
              <Form key="phone-form" {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4">
                    <FormField control={phoneForm.control} name="phoneNumber" render={({ field }) => (
                        <FormItem><Label>Phone Number</Label><FormControl><Input placeholder="+1234567890" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <Button type="submit" className="w-full" disabled={loadingProvider !== null}>
                        {loadingProvider === 'phone' ? <Loader2 className="animate-spin" /> : 'Send OTP'}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setView('signin')}>Back to Email</Button>
                </form>
              </Form>
          ) : view === 'otp' ? (
              <Form key="otp-form" {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
                    <FormField control={otpForm.control} name="otp" render={({ field }) => (
                        <FormItem><Label>6-Digit OTP</Label><FormControl><Input placeholder="123456" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <Button type="submit" className="w-full" disabled={loadingProvider !== null}>
                        {loadingProvider === 'phone' ? <Loader2 className="animate-spin" /> : 'Verify Code'}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setView('phone')}>Resend Code / Change Number</Button>
                </form>
              </Form>
          ) : (
            <>
              {emailEnabled && (
                <Tabs value={view} onValueChange={(v: string) => setView(v as 'signin'|'signup')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">{t('auth_signin_tab')}</TabsTrigger>
                    <TabsTrigger value="signup">{t('auth_signup_tab')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="signin">
                        <Form {...signInForm}>
                        <form onSubmit={signInForm.handleSubmit(handleEmailSignIn)} className="space-y-4 pt-4">
                            <FormField control={signInForm.control} name="email" render={({ field }) => (
                                <FormItem><Label>{t('auth_email_label')}</Label><FormControl><Input placeholder="m@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={signInForm.control} name="password" render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <Label>{t('auth_password_label')}</Label>
                                        <button type="button" onClick={() => setView('forgot')} className="text-xs text-blue-500 hover:underline">Forgot password?</button>
                                    </div>
                                    <FormControl><Input type="password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <Button type="submit" className="w-full" disabled={loadingProvider !== null}>
                                {loadingProvider === 'email' ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2" />}
                                {t('auth_signin_button')}
                            </Button>
                        </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="signup">
                        <Form {...signUpForm}>
                        <form onSubmit={signUpForm.handleSubmit(handleEmailSignUp)} className="space-y-4 pt-4">
                            <FormField control={signUpForm.control} name="email" render={({ field }) => (
                                <FormItem><Label>{t('auth_email_label')}</Label><FormControl><Input placeholder="m@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={signUpForm.control} name="password" render={({ field }) => (
                                <FormItem><Label>{t('auth_password_label')}</Label><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={signUpForm.control} name="confirmPassword" render={({ field }) => (
                                <FormItem><Label>{t('auth_confirm_password_label')}</Label><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <Button type="submit" className="w-full" disabled={loadingProvider !== null}>
                                {loadingProvider === 'email' ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2" />}
                                {t('auth_create_account_button')}
                            </Button>
                        </form>
                        </Form>
                    </TabsContent>
                </Tabs>
              )}
            </>
          )}

          {view !== 'forgot' && view !== 'phone' && view !== 'otp' && emailEnabled && showSocials && (
              <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t('auth_or_continue_with')}</span></div>
              </div>
          )}

          {view !== 'forgot' && view !== 'phone' && view !== 'otp' && (
            <div className="grid grid-cols-1 gap-3">
              {phoneEnabled && (
                  <Button variant="outline" type="button" className="w-full" onClick={() => setView('phone')}>
                       Sign in with Phone
                  </Button>
              )}
              {googleEnabled && (
                  <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={loadingProvider !== null}>
                       {loadingProvider === 'google' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : (
                           <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                       )}
                       Google
                  </Button>
              )}
              {facebookEnabled && (
                  <Button variant="outline" type="button" className="w-full border-blue-600/20 hover:bg-blue-600/10 text-blue-600" onClick={handleFacebookSignIn} disabled={loadingProvider !== null}>
                      {loadingProvider === 'facebook' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Facebook className="mr-2 h-4 w-4 fill-current" />}
                      Facebook
                  </Button>
              )}
              {appleEnabled && (
                  <Button variant="outline" type="button" className="w-full border-white/20 hover:bg-white/5" onClick={handleAppleSignIn} disabled={loadingProvider !== null}>
                      {loadingProvider === 'apple' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Apple className="mr-2 h-4 w-4 fill-current" />}
                      Apple
                  </Button>
              )}
            </div>
          )}
        </div>
        {isRecaptchaActive && (
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground italic mt-2">
                <ShieldCheck className="h-3 w-3" /> Protected by Google reCAPTCHA
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


