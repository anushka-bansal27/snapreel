'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bell, Send, Users, User, Loader2, CheckCircle } from 'lucide-react';
import { getAllUsersForAdmin } from '@/lib/data.actions';
import { sendNotificationAction } from '@/lib/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function NotificationsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    
    // Form State
    const [target, setTarget] = useState<'all' | 'specific'>('all');
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        getAllUsersForAdmin().then(data => {
            setUsers(data);
            setLoading(false);
        });
    }, []);

    const handleSend = async () => {
        if (!title || !message) {
            toast({ variant: 'destructive', title: 'Error', description: 'Title and message are required.' });
            return;
        }
        if (target === 'specific' && !selectedUserId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a user.' });
            return;
        }

        setIsSending(true);
        const result = await sendNotificationAction({
            target,
            userId: selectedUserId,
            title,
            message
        });

        if (result.success) {
            toast({ title: 'Success!', description: result.message });
            setTitle('');
            setMessage('');
        } else {
            toast({ variant: 'destructive', title: 'Failed to send', description: result.error });
        }
        setIsSending(false);
    };

    if (loading) return <div className="space-y-6 pt-4"><Skeleton className="h-60 w-full" /></div>;

    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Push Notifications</h1>
                <p className="text-muted-foreground">Send real-time alerts to your users via OneSignal.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Create Notification</CardTitle>
                    <CardDescription>Compose and broadcast messages to your audience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Target Audience</Label>
                            <Select value={target} onValueChange={(v: any) => setTarget(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        <div className="flex items-center gap-2"><Users className="h-4 w-4" /> All Registered Users</div>
                                    </SelectItem>
                                    <SelectItem value="specific">
                                        <div className="flex items-center gap-2"><User className="h-4 w-4" /> Specific Individual</div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {target === 'specific' && (
                            <div className="space-y-2 animate-in fade-in duration-300">
                                <Label>Select User</Label>
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a user..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.displayName || u.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Notification Title</Label>
                            <Input 
                                placeholder="New series added!" 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Message Body</Label>
                            <Textarea 
                                placeholder="Check out our latest release..." 
                                className="min-h-[120px]"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-between border-t p-6 bg-muted/10">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 italic">
                        <CheckCircle className="h-3 w-3" /> Delivery powered by OneSignal REST API
                    </p>
                    <Button onClick={handleSend} disabled={isSending} size="lg" className="min-w-[150px]">
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Broadcast Now
                    </Button>
                </CardFooter>
            </Card>
            
            <Card className="bg-blue-500/5 border-blue-500/20">
                <CardHeader className="py-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /> AUDIENCE STATUS</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                    <div className="flex items-center gap-4">
                        <div className="text-center p-4 bg-background rounded-lg border flex-1">
                            <p className="text-2xl font-black">{users.length}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Users</p>
                        </div>
                        <div className="text-center p-4 bg-background rounded-lg border flex-1">
                            <Badge variant="outline" className="text-green-500 border-green-500/50 mb-1">Live</Badge>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">OneSignal Sync</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
