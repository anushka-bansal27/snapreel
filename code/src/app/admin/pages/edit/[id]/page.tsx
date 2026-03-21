'use client';
import { useState, useEffect } from 'react';
import { PageForm } from '@/components/admin/page-form';
import { notFound, useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getPageById } from '@/lib/data.actions';
import type { CustomPage } from '@/lib/types';

function EditPageSkeleton() {
    return (
        <Card>
            <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
            <CardContent className="space-y-8 pt-6">
                <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                 <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-40 w-full" /></div>
                <Skeleton className="h-10 w-32" />
            </CardContent>
        </Card>
    )
}

export default function EditPage() {
  const { id } = useParams() as { id: string };
  const [page, setPage] = useState<CustomPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      if (id) {
          getPageById(id).then(data => {
              setPage(data);
              setLoading(false);
          });
      }
  }, [id]);

  if (loading) return <EditPageSkeleton />;
  if (!page) notFound();

  return <PageForm page={page} />;
}
