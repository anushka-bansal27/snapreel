
'use client';
import { useMemo, useState, useEffect } from 'react';
import type { Series, Language } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { MoreVertical, Edit, Trash2, PlusCircle, ListVideo, Star, Search, Filter, Zap } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from '@/components/ui/input';
import { getAllSeriesForAdmin, getAllLanguages } from '@/lib/data.actions';
import { deleteSeriesAction } from '@/lib/actions';

function DeleteSeriesAlert({ seriesId, seriesTitle, onConfirm }: { seriesId: string, seriesTitle: string, onConfirm: () => void }) {
    return (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the series
                    <span className="font-bold"> "{seriesTitle}"</span> and all its episodes.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    );
}

export default function AdminSeriesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<{id: string, title: string} | null>(null);
  const [pageSize, setPageSize] = useState('10');
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [languages, setLanguages] = useState<Language[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const [seriesData, languagesData] = await Promise.all([
      getAllSeriesForAdmin(),
      getAllLanguages()
    ]);
    setSeries(seriesData);
    setLanguages(languagesData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const filteredSeries = useMemo(() => {
    return series.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLanguage = languageFilter === 'all' || item.targetLanguages?.includes(languageFilter);
      return matchesSearch && matchesLanguage;
    });
  }, [series, searchQuery, languageFilter]);

  const displayedSeries = useMemo(() => {
    return filteredSeries.slice(0, parseInt(pageSize, 10));
  }, [filteredSeries, pageSize]);

  const handleDeleteClick = (item: {id: string, title: string}) => {
    setSelectedSeries(item);
    setDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!selectedSeries) return;

    const result = await deleteSeriesAction(selectedSeries.id);
    if (result.success) {
        toast({ title: 'Series Deleted' });
        fetchData();
    } else {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: result.error });
    }
    setDialogOpen(false);
    setSelectedSeries(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Series Management</h1>
          <p className="text-muted-foreground">Manage your series catalog.</p>
        </div>
        <Button asChild>
          <Link href="/admin/series/add"><PlusCircle className="mr-2 h-4 w-4" /> Add New Series</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search movies by title..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <div>
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger>
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {languages?.map(lang => (
                        <SelectItem key={lang.id} value={lang.languageCode}>{lang.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results ({filteredSeries.length})</CardTitle>
        </CardHeader>
        <CardContent>
           <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Target Languages</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="w-[50px] h-[75px] rounded-md" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><div className="flex gap-2"><Skeleton className="h-6 w-16 rounded-full" /></div></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                )) : displayedSeries.map((item) => (
                    <TableRow key={item.id}>
                    <TableCell>
                        <div className="relative w-[50px] h-[75px]">
                            <Image
                                src={item.coverUrl}
                                alt={item.title}
                                fill
                                className="rounded-md object-cover"
                            />
                        </div>
                    </TableCell>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <span className="truncate max-w-[200px]">{item.title}</span>
                            <div className="flex gap-1">
                                {item.isFeatured && <span title="Featured"><Star className="h-3 w-3 text-amber-400 fill-amber-400" /></span>}
                                {item.isPremium && <span title="Premium"><Zap className="h-3 w-3 text-primary fill-primary" /></span>}
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex gap-1 flex-wrap">
                        {item.targetLanguages?.map((lang) => (
                            <Badge key={lang} variant="secondary" className="text-[10px] px-1 h-5">
                            {lang.toUpperCase()}
                            </Badge>
                        ))}
                        {(!item.targetLanguages || item.targetLanguages.length === 0) && (
                            <span className="text-xs text-muted-foreground italic">None</span>
                        )}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                            <Link href={`/admin/series/edit/${item.id}`} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/admin/series/${item.id}/episodes`} className="cursor-pointer">
                                    <ListVideo className="mr-2 h-4 w-4" />
                                    Episodes
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleDeleteClick(item)} className="text-destructive focus:text-destructive cursor-pointer">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
             {selectedSeries && <DeleteSeriesAlert seriesId={selectedSeries.id} seriesTitle={selectedSeries.title} onConfirm={handleConfirmDelete} />}
            </AlertDialog>
            {!loading && displayedSeries.length === 0 && (
             <div className="text-center py-20 text-muted-foreground">
               No movies found matching your search.
             </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
