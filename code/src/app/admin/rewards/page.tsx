
'use client';
import React, { useState, useEffect } from 'react';
import type { RewardTask, RewardsSettings } from '@/lib/types';
import { getRewardTasks, getRewardSettings } from '@/lib/data.actions';
import { saveRewardTaskAction, deleteRewardTaskAction, saveRewardSettingsAction } from '@/lib/actions';

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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, PlusCircle, Trash2, Edit, Coins, Link as LinkIcon, Megaphone, Flame, Power, Globe, Smartphone, Apple } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type RewardPlatform = 'website' | 'android' | 'ios';

function RewardTaskEditDialog({ task, platform, onSaved, children }: { task?: RewardTask | null, platform: RewardPlatform, onSaved: () => void, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [title, setTitle] = useState('');
    const [type, setType] = useState<'link' | 'ad'>('link');
    const [coins, setCoins] = useState(10);
    const [url, setUrl] = useState('');
    const [adScript, setAdScript] = useState('');
    const [timerSeconds, setTimerSeconds] = useState(15);
    const [frequency, setFrequency] = useState<'daily' | 'once'>('daily');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setTitle(task?.title || '');
            setType(task?.type || 'link');
            setCoins(task?.coins || 10);
            setUrl(task?.url || '');
            setAdScript(task?.adScript || '');
            setTimerSeconds(task?.timerSeconds || 15);
            setFrequency(task?.frequency || 'daily');
            setIsActive(task?.isActive === undefined ? true : task.isActive);
        }
    }, [isOpen, task]);

    const handleSaveChanges = async () => {
        if (!title || coins <= 0) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill out title and coins.' });
            return;
        }

        setIsSaving(true);
        const result = await saveRewardTaskAction({ 
            id: task?.id, 
            platform,
            title, 
            type: type,
            coins: Number(coins), 
            url, 
            adScript,
            timerSeconds: Number(timerSeconds), 
            frequency, 
            isActive 
        });
        
        if (result.success) {
            toast({ title: task ? "Task Updated" : "Task Added", description: `"${title}" saved successfully.` });
            setIsOpen(false);
            onSaved();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: (result as any).error || 'Could not save task.' });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{task ? 'Edit Reward Task' : 'Add New Reward Task'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Task Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Visit our Facebook Page" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {(platform === 'website' || platform === 'android') && (
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={(v: 'link'|'ad') => setType(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="link">Link Click</SelectItem>
                                    <SelectItem value="ad">Watch Ad</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="coins">Coins Reward</Label>
                            <Input id="coins" type="number" value={coins} onChange={(e) => setCoins(Number(e.target.value))} />
                        </div>
                    </div>

                    {(platform === 'website' || platform === 'android') && type === 'link' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="url">External Link URL</Label>
                                <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://facebook.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="timer">Timer (Seconds)</Label>
                                <Input id="timer" type="number" value={timerSeconds} onChange={(e) => setTimerSeconds(Number(e.target.value))} />
                                <p className="text-[10px] text-muted-foreground">How long the user must stay on the page before claiming.</p>
                            </div>
                        </>
                    )}

                    {platform === 'website' && type === 'ad' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="adScript">Ad Script/HTML</Label>
                                <Textarea id="adScript" value={adScript} onChange={(e) => setAdScript(e.target.value)} placeholder="<script>...</script>" className="min-h-[120px]"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="timer-ad">Skip Timer (Seconds)</Label>
                                <Input id="timer-ad" type="number" value={timerSeconds} onChange={(e) => setTimerSeconds(Number(e.target.value))} />
                                <p className="text-[10px] text-muted-foreground">Time before the user can skip the ad and claim reward.</p>
                            </div>
                        </>
                    )}

                    {platform === 'android' && type === 'ad' && (
                        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-xs text-muted-foreground">
                            This task uses the Rewarded Ad unit configured in Android App Settings. No ad code is required here.
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Select value={frequency} onValueChange={(v: 'daily'|'once') => setFrequency(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Daily Reset</SelectItem>
                                <SelectItem value="once">Once Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
                        <Label htmlFor="is-active">Active</Label>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        Save Task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function RewardsPage() {
    const { toast } = useToast();
    const [tasks, setTasks] = useState<RewardTask[]>([]);
    const [settings, setSettings] = useState<RewardsSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [dailyRewards, setDailyRewards] = useState<number[]>([]);
    const [platform, setPlatform] = useState<RewardPlatform>('website');

    const fetchData = async () => {
        setLoading(true);
        const [tData, sData] = await Promise.all([getRewardTasks(platform), getRewardSettings()]);
        setTasks(tData);
        setSettings(sData);
        setDailyRewards(sData?.dailyRewards || [10, 20, 30, 40, 50, 60, 70]);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [platform]);

    const handleSaveGlobal = async (isEnabled: boolean) => {
        // Optimistic update
        setSettings(prev => prev ? { ...prev, isEnabled } : null);
        
        setIsSavingSettings(true);
        const result = await saveRewardSettingsAction({ isEnabled, dailyRewards });
        if (result.success) {
            toast({ 
                title: isEnabled ? 'Rewards System Online' : 'Rewards System Offline',
                className: isEnabled ? "bg-green-600 text-white border-none" : "bg-red-600 text-white border-none"
            });
        } else {
            // Rollback on error
            setSettings(prev => prev ? { ...prev, isEnabled: !isEnabled } : null);
            toast({ variant: 'destructive', title: 'Error', description: (result as any).error || 'Could not save rewards settings.' });
        }
        setIsSavingSettings(false);
    };

    const handleSaveDailyRewards = async () => {
        setIsSavingSettings(true);
        const result = await saveRewardSettingsAction({ isEnabled: settings?.isEnabled || false, dailyRewards });
        if (result.success) {
            toast({ title: 'Daily Rewards Updated' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: (result as any).error || 'Could not save daily rewards.' });
        }
        setIsSavingSettings(false);
    }

    const handleDailyRewardChange = (index: number, value: string) => {
        const newRewards = [...dailyRewards];
        newRewards[index] = Number(value);
        setDailyRewards(newRewards);
    };

    const handleDelete = async (id: string) => {
        const result = await deleteRewardTaskAction(id);
        if (result.success) {
            toast({ title: 'Task Deleted' });
            fetchData();
        } else {
            toast({ variant: 'destructive', title: 'Delete Failed', description: (result as any).error });
        }
    };

    if (loading) return <div className="space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-80 w-full" /></div>;

    const isSystemActive = settings?.isEnabled || false;

    return (
        <div className="space-y-6">
            {/* Header with Global Switch */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/30 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase">Rewards System</h1>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide">Configure coin rewards and daily check-ins.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    {/* TOP GLOBAL SWITCH */}
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300",
                        isSystemActive ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
                    )}>
                        <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center",
                            isSystemActive ? "bg-green-500/20" : "bg-red-500/20"
                        )}>
                            <Power className={cn("h-4 w-4", isSystemActive ? "text-green-500" : "text-red-500")} />
                        </div>
                        <div className="flex flex-col">
                            <Label htmlFor="global-active" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">System Status</Label>
                            <span className={cn("text-xs font-bold", isSystemActive ? "text-green-500" : "text-red-500")}>
                                {isSystemActive ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        </div>
                        <Switch 
                            id="global-active"
                            checked={isSystemActive} 
                            onCheckedChange={(v) => handleSaveGlobal(v)} 
                            disabled={isSavingSettings}
                            className="ml-2"
                        />
                    </div>

                    <Separator orientation="vertical" className="h-10 hidden md:block" />

                    {platform !== 'ios' && <RewardTaskEditDialog platform={platform} onSaved={fetchData}>
                        <Button className="h-12 px-6 rounded-xl font-bold shadow-lg shadow-primary/20">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                        </Button>
                    </RewardTaskEditDialog>}
                </div>
            </div>

            <Tabs value={platform} onValueChange={v => setPlatform(v as RewardPlatform)}>
                <TabsList className="grid w-full max-w-2xl grid-cols-3">
                    <TabsTrigger value="website" className="gap-2"><Globe className="h-4 w-4" /> Website Ads</TabsTrigger>
                    <TabsTrigger value="android" className="gap-2"><Smartphone className="h-4 w-4" /> Android Ads</TabsTrigger>
                    <TabsTrigger value="ios" className="gap-2"><Apple className="h-4 w-4" /> iOS Ads</TabsTrigger>
                </TabsList>
                <TabsContent value="website" />
                <TabsContent value="android" />
                <TabsContent value="ios" />
            </Tabs>

            {platform === 'ios' ? (
                <Card className="min-h-72 flex items-center justify-center border-dashed">
                    <CardContent className="text-center pt-6">
                        <Apple className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <Badge variant="secondary">UPCOMING</Badge>
                        <h2 className="text-xl font-bold mt-3">iOS Rewards & Ads</h2>
                        <p className="text-sm text-muted-foreground mt-2">iOS reward tasks will be available in a future update.</p>
                    </CardContent>
                </Card>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Check-in Controls */}
                <Card className="lg:col-span-1 border-white/5 bg-card/20 overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                        <CardTitle className="flex items-center gap-2 text-orange-500 italic tracking-tight">
                            <Flame className="h-5 w-5 fill-current" /> DAILY CHECK-IN
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Day 1 to 7 rewards schedule</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-2 gap-3">
                            {dailyRewards.map((reward, i) => (
                                <div key={i} className="space-y-1.5 p-3 rounded-xl bg-black/20 border border-white/5 group hover:border-amber-400/30 transition-colors">
                                    <Label className="text-[9px] font-black uppercase text-muted-foreground group-hover:text-amber-400 transition-colors">Day {i + 1}</Label>
                                    <div className="relative">
                                        <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400" />
                                        <Input 
                                            type="number" 
                                            value={reward} 
                                            onChange={(e) => handleDailyRewardChange(i, e.target.value)} 
                                            className="pl-8 bg-transparent border-white/10 h-10 font-mono font-bold"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <Button 
                            className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-tighter" 
                            onClick={handleSaveDailyRewards} 
                            disabled={isSavingSettings}
                        >
                             {isSavingSettings ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                             Update Schedule
                        </Button>
                    </CardContent>
                </Card>

                {/* General Tasks Table */}
                <Card className="lg:col-span-2 border-white/5 bg-card/20">
                    <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                        <CardTitle className="flex items-center gap-2 italic tracking-tight">
                             REWARD TASKS
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                            {platform === 'android' ? 'Android AdMob rewarded tasks' : 'Website manual tasks'} ({tasks.length})
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-white/10">
                                    <TableHead className="text-[10px] font-black uppercase">Task Title</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Type</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Reward</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic text-xs">
                                            No tasks configured yet.
                                        </TableCell>
                                    </TableRow>
                                ) : tasks.map((task) => (
                                    <TableRow key={task.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <TableCell className="font-bold text-sm text-white/90">{task.title}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "gap-1.5 text-[9px] font-black border-none px-2.5",
                                                task.type === 'link' ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                                            )}>
                                                {task.type === 'link' ? <LinkIcon className="h-3 w-3" /> : <Megaphone className="h-3 w-3" />}
                                                {task.type.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-amber-500 font-black font-mono">
                                            <div className="flex items-center gap-1">
                                                <Coins className="h-3 w-3" />
                                                +{task.coins}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <RewardTaskEditDialog task={task} platform={platform} onSaved={fetchData}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </RewardTaskEditDialog>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" 
                                                    onClick={() => handleDelete(task.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            )}
        </div>
    );
}
