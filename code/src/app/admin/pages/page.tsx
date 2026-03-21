'use client';
import React, { useState, useEffect } from 'react';
import type { CustomPage } from '@/lib/types';
import { getCustomPages, getDemoModeStatus } from '@/lib/data.actions';
import { deletePageAction } from '@/lib/actions';
import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, PlusCircle, CheckCircle, XCircle } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function PagesPage() {
  const { toast } = useToast();
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [pagesData, demoStatus] = await Promise.all([
      getCustomPages(),
      getDemoModeStatus()
    ]);
    
    // Filter out installation-setup if in demo mode
    const filteredPages = demoStatus 
      ? pagesData.filter(p => p.slug !== 'installation-setup')
      : pagesData;

    setPages(filteredPages);
    setIsDemoMode(demoStatus);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    const result = await deletePageAction(id);
    if (result.success) {
        toast({ title: 'Page Deleted' });
        fetchData();
    } else {
        toast({ variant: 'destructive', title: 'Delete Failed', description: result.error });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">Manage Pages</h1>
            <p className="text-muted-foreground">Create and manage custom static pages.</p>
        </div>
        <Button asChild>
            <Link href="/admin/pages/add"><PlusCircle /> Add Page</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Pages ({pages?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>In Footer?</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : pages?.map((page) => {
                const isInstallationPage = page.slug === 'installation-setup';
                const pageUrl = isInstallationPage ? `/${page.slug}` : `/p/${page.slug}`;
                const isProtected = isDemoMode && isInstallationPage;

                return (
                    <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.title}</TableCell>
                        <TableCell>
                          <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground font-mono text-xs hover:text-primary hover:underline">
                            {pageUrl}
                          </a>
                        </TableCell>
                        <TableCell>
                            {page.showInFooter ? 
                                <Badge variant="secondary" className="text-green-500 border-green-500/50"><CheckCircle className="mr-1 h-3 w-3" /> Yes</Badge> : 
                                <Badge variant="outline"><XCircle className="mr-1 h-3 w-3"/> No</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="inline-flex gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <div className="inline-block">
                                            <Button asChild={!isProtected} variant="ghost" size="icon" disabled={isProtected}>
                                                {isProtected ? (
                                                    <Edit className="h-4 w-4" />
                                                ) : (
                                                    <Link href={`/admin/pages/edit/${page.id}`}>
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                )}
                                            </Button>
                                          </div>
                                      </TooltipTrigger>
                                      {isProtected && (
                                          <TooltipContent>
                                              <p>This page cannot be edited in demo mode.</p>
                                          </TooltipContent>
                                      )}
                                  </Tooltip>
                                </TooltipProvider>

                                <AlertDialog>
                                  <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="inline-block">
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive" disabled={isProtected}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                            </div>
                                        </TooltipTrigger>
                                        {isProtected && (
                                            <TooltipContent>
                                                <p>This page cannot be deleted in demo mode.</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                  </TooltipProvider>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the page "{page.title}".</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(page.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
