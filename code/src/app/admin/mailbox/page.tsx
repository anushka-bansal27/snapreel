
'use client';
import React, { useState, useEffect } from 'react';
import type { ContactMessage } from '@/lib/types';
import { getContactMessages } from '@/lib/data.actions';
import { markContactAsReadAction, deleteContactAction } from '@/lib/actions';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Trash2, MailOpen, Mail } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function MailboxPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const data = await getContactMessages();
    setMessages(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRead = async (m: ContactMessage) => {
    if (m.isRead) return;
    const result = await markContactAsReadAction(m.id);
    if (result.success) {
      fetchData();
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: (result as any).error });
    }
  };
  
  const handleDelete = async (id: string) => {
    const result = await deleteContactAction(id);
    if (result.success) {
        toast({ title: 'Deleted' });
        fetchData();
    } else {
        toast({ variant: 'destructive', title: 'Delete Failed', description: result.error });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Mailbox</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-40 w-full" /> : 
            <Accordion type="multiple" className="w-full">
              {messages.map((m) => (
                <AccordionItem value={m.id} key={m.id} onClick={() => handleRead(m)}>
                  <AccordionTrigger className={`p-4 ${!m.isRead ? 'bg-muted/50' : ''}`}>
                    <div className="flex items-center gap-4 text-left w-full">
                      {!m.isRead ? <Mail className="text-primary" /> : <MailOpen className="text-muted-foreground" />}
                      <div className="font-bold">{m.name}</div>
                      <div className="flex-1 truncate text-muted-foreground">{m.message}</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 space-y-4">
                    <div className="flex justify-between">
                        <div><strong>From:</strong> {m.name} ({m.email})</div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="text-destructive h-4 w-4" /></Button>
                    </div>
                    <p className="whitespace-pre-wrap">{m.message}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          }
        </CardContent>
      </Card>
    </div>
  );
}
