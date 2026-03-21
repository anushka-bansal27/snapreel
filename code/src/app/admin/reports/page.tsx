
'use client';
import React, { useState, useEffect } from 'react';
import type { Report } from '@/lib/types';
import { getReports } from '@/lib/data.actions';
import { updateReportStatusAction, deleteReportAction } from '@/lib/actions';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Trash2, ShieldCheck, ShieldX, MoreVertical } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function ReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const data = await getReports();
    setReports(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatus = async (id: string, s: string) => {
    const result = await updateReportStatusAction(id, s);
    if (result.success) {
      toast({ title: 'Updated' });
      fetchData();
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: (result as any).error });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteReportAction(id);
    if (result.success) {
      toast({ title: 'Deleted' });
      fetchData();
    } else {
      toast({ variant: 'destructive', title: 'Delete Failed', description: (result as any).error });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Content Reports</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-40 w-full" /> : 
            <Accordion type="multiple" className="w-full">
              {reports.map((r) => (
                <AccordionItem value={r.id} key={r.id}>
                  <AccordionTrigger className="p-4">
                    <div className="flex items-center gap-4 text-left w-full">
                      <div className="font-bold">{r.reportedContentTitle}</div>
                      <Badge variant={r.status === 'open' ? 'destructive' : 'default'}>{r.status}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 space-y-4">
                    <div className="flex justify-between">
                        <div><strong>Reason:</strong> {r.reason}</div>
                        <div className="flex gap-2">
                             <Button size="sm" variant="outline" onClick={() => handleStatus(r.id, 'resolved')}>Resolve</Button>
                             <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    </div>
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
