
'use client';
import React, { useState, useMemo, useEffect, useTransition } from 'react';
import type { CoinPack, MonetizationSettings, Purchase } from '@/lib/types';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, PlusCircle, Save, Loader2, Coins, ArrowLeft, ArrowRight, CheckCircle, Zap, UserCheck } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { getCoinPacks, getMonetizationSettings, getAllPurchases } from '@/lib/data.actions';
import { saveCoinPackAction, deleteCoinPackAction, saveMonetizationSettingsAction } from '@/lib/actions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const currencies = [
    // Major & Popular Currencies
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    // Global & Regional Currencies (Alphabetical)
    { code: 'AFN', symbol: '؋', name: 'Afghan Afghani' },
    { code: 'ALL', symbol: 'L', name: 'Albanian Lek' },
    { code: 'AMD', symbol: '֏', name: 'Armenian Dram' },
    { code: 'ANG', symbol: 'ƒ', name: 'Netherlands Antillean Guilder' },
    { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza' },
    { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
    { code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin' },
    { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat' },
    { code: 'BAM', symbol: 'KM', name: 'Bosnia-Herzegovina Convertible Mark' },
    { code: 'BBD', symbol: '$', name: 'Barbadian Dollar' },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
    { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
    { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar' },
    { code: 'BIF', symbol: 'FBu', name: 'Burundian Franc' },
    { code: 'BMD', symbol: '$', name: 'Bermudan Dollar' },
    { code: 'BND', symbol: '$', name: 'Brunei Dollar' },
    { code: 'BOB', symbol: 'Bs.', name: 'Bolivian Boliviano' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'BSD', symbol: '$', name: 'Bahamian Dollar' },
    { code: 'BWP', symbol: 'P', name: 'Botswanan Pula' },
    { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble' },
    { code: 'BZD', symbol: 'BZ$', name: 'Belize Dollar' },
    { code: 'CDF', symbol: 'FC', name: 'Congolese Franc' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'COP', symbol: '$', name: 'Colombian Peso' },
    { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón' },
    { code: 'CUP', symbol: '₱', name: 'Cuban Peso' },
    { code: 'CVE', symbol: '$', name: 'Cape Verdean Escudo' },
    { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
    { code: 'DJF', symbol: 'Fdj', name: 'Djiboutian Franc' },
    { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
    { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso' },
    { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar' },
    { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
    { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
    { code: 'FJD', symbol: '$', name: 'Fijian Dollar' },
    { code: 'GEL', symbol: '₾', name: 'Georgian Lari' },
    { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
    { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi' },
    { code: 'GNF', symbol: 'FG', name: 'Guinean Franc' },
    { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal' },
    { code: 'GYD', symbol: '$', name: 'Guyanaese Dollar' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'HNL', symbol: 'L', name: 'Honduran Lempira' },
    { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna' },
    { code: 'HTG', symbol: 'G', name: 'Haitian Gourde' },
    { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
    { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar' },
    { code: 'IRR', symbol: '﷼', name: 'Iranian Rial' },
    { code: 'ISK', symbol: 'kr', name: 'Icelandic Króna' },
    { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar' },
    { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
    { code: 'KGS', symbol: 'с', name: 'Kyrgystani Som' },
    { code: 'KHR', symbol: '៛', name: 'Cambodian Riel' },
    { code: 'KMF', symbol: 'CF', name: 'Comorian Franc' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
    { code: 'KYD', symbol: '$', name: 'Cayman Islands Dollar' },
    { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge' },
    { code: 'LAK', symbol: '₭', name: 'Laotian Kip' },
    { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound' },
    { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
    { code: 'LRD', symbol: '$', name: 'Liberian Dollar' },
    { code: 'LSL', symbol: 'L', name: 'Lesotho Loti' },
    { code: 'LYD', symbol: 'ل.د', name: 'Libyan Dinar' },
    { code: 'MDL', symbol: 'L', name: 'Moldovan Leu' },
    { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary' },
    { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar' },
    { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat' },
    { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik' },
    { code: 'MOP', symbol: 'MOP$', name: 'Macanese Pataca' },
    { code: 'MRU', symbol: 'UM', name: 'Mauritanian Ouguiya' },
    { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee' },
    { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa' },
    { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical' },
    { code: 'NAD', symbol: '$', name: 'Namibian Dollar' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Córdoba' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
    { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
    { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial' },
    { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa' },
    { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
    { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
    { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
    { code: 'PYG', symbol: '₲', name: 'Paraguayan Guarani' },
    { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Rial' },
    { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
    { code: 'RSD', symbol: 'дин.', name: 'Serbian Dinar' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
    { code: 'SCR', symbol: '₨', name: 'Seychellois Rupee' },
    { code: 'SDG', symbol: 'ج.س.', name: 'Sudanese Pound' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'SLE', symbol: 'Le', name: 'Sierra Leonean Leone' },
    { code: 'SOS', symbol: 'Sh', name: 'Somali Shilling' },
    { code: 'SRD', symbol: '$', name: 'Surinamese Dollar' },
    { code: 'SSP', symbol: '£', name: 'South Sudanese Pound' },
    { code: 'SYP', symbol: '£', name: 'Syrian Pound' },
    { code: 'SZL', symbol: 'L', name: 'Swazi Lilangeni' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'TJS', symbol: 'SM', name: 'Tajikistani Somoni' },
    { code: 'TMT', symbol: 'T', name: 'Turkmenistani Manat' },
    { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar' },
    { code: 'TOP', symbol: 'T$', name: 'Tongan Paʻanga' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
    { code: 'TTD', symbol: 'TT$', name: 'Trinidad & Tobago Dollar' },
    { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar' },
    { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
    { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
    { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
    { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso' },
    { code: 'UZS', symbol: 'so\'m', name: 'Uzbekistani Som' },
    { code: 'VES', symbol: 'Bs.', name: 'Venezuelan Bolívar' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
    { code: 'VUV', symbol: 'VT', name: 'Vanuatu Vatu' },
    { code: 'WST', symbol: 'WS$', name: 'Samoan Tala' },
    { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc' },
    { code: 'XCD', symbol: '$', name: 'East Caribbean Dollar' },
    { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
    { code: 'XPF', symbol: 'CFP', name: 'CFP Franc' },
    { code: 'YER', symbol: '﷼', name: 'Yemeni Rial' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha' },
    { code: 'ZWL', symbol: '$', name: 'Zimbabwean Dollar' },
];

const membershipDurations = [
    { label: '1 Day', days: 1 },
    { label: '7 Days', days: 7 },
    { label: '15 Days', days: 15 },
    { label: '1 Month', days: 30 },
    { label: '3 Months', days: 90 },
    { label: '6 Months', days: 180 },
    { label: '1 Year', days: 365 },
];

function MonetizationSettingsSection() {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [settings, setSettings] = useState<MonetizationSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const monetizationSchema = z.object({
        episodeCost: z.coerce.number().min(0).default(0),
        isCoinsActive: z.boolean().default(true),
        currency: z.string().default('USD'),
    });

    const form = useForm<z.infer<typeof monetizationSchema>>({
        resolver: zodResolver(monetizationSchema),
        defaultValues: {
            episodeCost: 0,
            isCoinsActive: true,
            currency: 'USD',
        },
    });

    const fetchData = async () => {
        setLoading(true);
        const data = await getMonetizationSettings();
        setSettings(data);
        if (data) {
            form.reset({
                episodeCost: data.episodeCost || 0,
                isCoinsActive: data.isCoinsActive === undefined ? true : data.isCoinsActive,
                currency: data.currency || 'USD',
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onSubmit = async (values: z.infer<typeof monetizationSchema>) => {
        setIsSaving(true);
        setSaveSuccess(false);
        const selectedCurrency = currencies.find(c => c.code === values.currency);
        const data = { 
            episodeCost: values.episodeCost,
            isCoinsActive: values.isCoinsActive,
            currency: selectedCurrency?.code,
            currencySymbol: selectedCurrency?.symbol,
        };
        
        const result = await saveMonetizationSettingsAction(data) as any;
        if (result.success) {
            toast({ title: 'Settings Saved', description: 'Monetization settings have been updated.' });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            fetchData();
        } else {
            toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
        }
        setIsSaving(false);
    };

    if (loading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Global Monetization Settings</CardTitle>
                <CardDescription>Set the prices and costs for your application.</CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <FormField
                                control={form.control}
                                name="episodeCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Episode Unlock Cost</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Coins className="h-5 w-5 text-amber-400" />
                                                <Input type="number" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="currency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Store Currency</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a currency" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="max-h-[300px]">
                                                {currencies.map(c => (
                                                    <SelectItem key={c.code} value={c.code}>
                                                        {c.code} ({c.symbol}){c.name ? ` - ${c.name}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                             />
                        </div>
                        <FormField
                            control={form.control}
                            name="isCoinsActive"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 pt-2">
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="!mt-0">Enable Coin System</FormLabel>
                                </FormItem>
                            )}
                        />

                         <Button type="submit" disabled={isSaving} className={cn(saveSuccess && 'bg-green-500 hover:bg-green-600')}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saveSuccess ? <CheckCircle className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                            {saveSuccess ? 'Saved!' : 'Save Settings'}
                        </Button>
                    </CardContent>
                </form>
            </Form>
        </Card>
    );
}

function CoinPackEditDialog({ pack, onSaved, children }: { pack?: CoinPack | null, onSaved: () => void, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(0);
    const [price, setPrice] = useState(0);
    const [type, setType] = useState<'coins' | 'membership'>('coins');
    const [durationDays, setDurationDays] = useState(30);
    const [googleProductId, setGoogleProductId] = useState('');
    const [appleProductId, setAppleProductId] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(pack?.name || '');
            setDescription(pack?.description || '');
            setAmount(pack?.amount || 0);
            setPrice(pack?.price || 0);
            setType(pack?.type || 'coins');
            setDurationDays(pack?.durationDays || 30);
            setGoogleProductId((pack as any)?.googleProductId || '');
            setAppleProductId((pack as any)?.appleProductId || '');
        }
    }, [isOpen, pack]);

    const handleSaveChanges = async () => {
        if (!name || price < 0) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill out name and price.' });
            return;
        }

        setIsSaving(true);
        const result = await saveCoinPackAction({ 
            id: pack?.id, 
            name, 
            description, 
            amount: type === 'coins' ? Number(amount) : 0, 
            price: Number(price),
            type,
            durationDays: type === 'membership' ? Number(durationDays) : undefined,
            googleProductId: googleProductId.trim() || undefined,
            appleProductId: appleProductId.trim() || undefined,
        }) as any;
        
        if (result.success) {
            toast({ title: pack ? "Pack Updated" : "Pack Added", description: `"${name}" has been saved.` });
            setIsOpen(false);
            onSaved();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{pack ? 'Edit Pack' : 'Add New Pack'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-3">
                        <Label>Pack Type</Label>
                        <RadioGroup value={type} onValueChange={(v: any) => setType(v)} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="coins" id="type-coins" />
                                <Label htmlFor="type-coins" className="cursor-pointer flex items-center gap-1"><Coins className="h-3 w-3" /> Coins</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="membership" id="type-membership" />
                                <Label htmlFor="type-membership" className="cursor-pointer flex items-center gap-1"><UserCheck className="h-3 w-3" /> Membership</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Pack Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'coins' ? "e.g. Starter Pack" : "e.g. Monthly VIP"} />
                    </div>

                    {type === 'membership' && (
                        <div className="space-y-2">
                            <Label>Duration</Label>
                            <Select value={String(durationDays)} onValueChange={(v) => setDurationDays(Number(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {membershipDurations.map(d => (
                                        <SelectItem key={d.days} value={String(d.days)}>{d.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short description of the pack." />
                    </div>

                     <div className="grid grid-cols-2 gap-4">
                        {type === 'coins' ? (
                            <div className="space-y-2">
                                <Label htmlFor="amount">Coin Amount</Label>
                                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                            </div>
                        ) : <div />}
                        <div className="space-y-2">
                            <Label htmlFor="price">Price</Label>
                            <Input id="price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                        </div>
                    </div>

                    {/* In-App Purchase Product IDs */}
                    <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground font-semibold mb-3 uppercase tracking-widest">In-App Purchase IDs</p>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="google-product-id" className="flex items-center gap-1.5">
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                                        <circle cx="12" cy="12" r="10" fill="#34A853" />
                                        <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Google Play Product ID
                                </Label>
                                <Input id="google-product-id" value={googleProductId} onChange={(e) => setGoogleProductId(e.target.value)} placeholder="e.g. coins_100_pack" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="apple-product-id" className="flex items-center gap-1.5">
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                                    </svg>
                                    Apple App Store Product ID
                                </Label>
                                <Input id="apple-product-id" value={appleProductId} onChange={(e) => setAppleProductId(e.target.value)} placeholder="e.g. com.myapp.coins100" />
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CoinPacksList() {
    const { toast } = useToast();
    const [packs, setPacks] = useState<CoinPack[]>([]);
    const [settings, setSettings] = useState<MonetizationSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        const [pData, sData] = await Promise.all([getCoinPacks(), getMonetizationSettings()]);
        setPacks(pData);
        setSettings(sData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id: string) => {
        const result = await deleteCoinPackAction(id) as any;
        if (result.success) {
            toast({ title: 'Pack Deleted' });
            fetchData();
        } else {
            toast({ variant: 'destructive', title: 'Delete Failed', description: result.error });
        }
    };

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Packs</CardTitle>
                    <CardDescription>Create memberships or coin bundles.</CardDescription>
                </div>
                <CoinPackEditDialog onSaved={fetchData}>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Pack</Button>
                </CoinPackEditDialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Benefit</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             Array.from({length: 3}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : packs.map((pack) => (
                            <TableRow key={pack.id}>
                                <TableCell>
                                    <Badge variant="outline" className="gap-1">
                                        {pack.type === 'membership' ? <Zap className="h-3 w-3 text-primary" /> : <Coins className="h-3 w-3 text-amber-500" />}
                                        {pack.type === 'membership' ? 'VIP' : 'Coins'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{pack.name}</TableCell>
                                <TableCell className="font-mono text-xs">
                                    {pack.type === 'membership' 
                                        ? `${pack.durationDays} Days`
                                        : `${pack.amount.toLocaleString()} Coins`
                                    }
                                </TableCell>
                                <TableCell>{settings?.currencySymbol || '$'}{pack.price.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                    <div className="inline-flex gap-1">
                                        <CoinPackEditDialog pack={pack} onSaved={fetchData}>
                                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                                        </CoinPackEditDialog>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete the pack "{pack.name}".</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(pack.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function PurchaseHistorySection() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [settings, setSettings] = useState<MonetizationSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        const [pData, sData] = await Promise.all([getAllPurchases(), getMonetizationSettings()]);
        setPurchases(pData);
        setSettings(sData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Purchase History</CardTitle>
                <CardDescription>View a history of all coin pack purchases.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Pack</TableHead>
                            <TableHead>Benefit</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             Array.from({length: 5}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                </TableRow>
                            ))
                        ) : purchases.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="text-xs">{p.userName || p.userEmail}</TableCell>
                                <TableCell>{p.packName}</TableCell>
                                <TableCell className="font-mono text-xs">{p.amount > 0 ? `${p.amount.toLocaleString()} Coins` : 'VIP Active'}</TableCell>
                                <TableCell className="font-mono">{settings?.currencySymbol || '$'}{p.price.toFixed(2)}</TableCell>
                                <TableCell className="text-[10px] text-muted-foreground">{p.createdAt ? format(new Date(p.createdAt as any), 'PP p') : '...'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function CoinPacksPage() {
  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold">Coins System</h1>
                <p className="text-muted-foreground">Manage coin bundles, memberships, and history.</p>
            </div>
        </div>

        <Tabs defaultValue="packs" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="packs">Manage Packs</TabsTrigger>
                <TabsTrigger value="history">Purchase History</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="packs" className="mt-6">
                <CoinPacksList />
            </TabsContent>
            <TabsContent value="history" className="mt-6">
                <PurchaseHistorySection />
            </TabsContent>
            <TabsContent value="settings" className="mt-6">
                <MonetizationSettingsSection />
            </TabsContent>
        </Tabs>
    </div>
  );
}
