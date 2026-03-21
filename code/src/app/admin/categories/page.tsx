
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import type { Category } from '@/lib/types';
import { getCategories } from '@/lib/data.actions';
import { saveCategoryAction, deleteCategoryAction } from '@/lib/actions';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
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
import { Edit, Trash2, PlusCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from '@/components/ui/switch';

const slugify = (text: string) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');

function CategoryEditDialog({ category, onSaved, children }: { category?: Category | null, onSaved: () => void, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [showOnHomepage, setShowOnHomepage] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(category?.name || '');
            setSlug(category?.slug || '');
            setShowOnHomepage(category?.showOnHomepage || false);
        }
    }, [isOpen, category]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        if (!category?.id || !slug) setSlug(slugify(newName));
    };
    
    const handleSaveChanges = async () => {
        if (!name || !slug) {
            toast({ variant: 'destructive', title: 'Error', description: 'Name and slug are required.' });
            return;
        }
        setIsSaving(true);
        const result = await saveCategoryAction({ id: category?.id, name, slug, showOnHomepage });
        if (result.success) {
            toast({ title: "Success" });
            setIsOpen(false);
            onSaved();
        } else {
            toast({ variant: 'destructive', title: 'Failed', description: result.error });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{category ? 'Edit' : 'Add'} Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={name} onChange={handleNameChange} />
                    </div>
                     <div className="space-y-2">
                        <Label>Slug</Label>
                        <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch checked={showOnHomepage} onCheckedChange={setShowOnHomepage} />
                      <Label>Show on Homepage</Label>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const data = await getCategories();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const totalPages = Math.ceil(categories.length / parseInt(pageSize, 10));
  const displayedCategories = useMemo(() => {
      const start = (currentPage - 1) * parseInt(pageSize, 10);
      return categories.slice(start, start + parseInt(pageSize, 10));
  }, [categories, currentPage, pageSize]);

  const handleDelete = async (id: string) => {
    const result = await deleteCategoryAction(id);
    if (result.success) {
        toast({ title: 'Deleted' });
        fetchData();
    } else {
        toast({ variant: 'destructive', title: 'Delete Failed', description: result.error });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">Categories</h1>
            <p className="text-muted-foreground text-sm">Manage genres and classifications.</p>
        </div>
        <CategoryEditDialog onSaved={fetchData}>
            <Button><PlusCircle className="mr-2" /> Add Category</Button>
        </CategoryEditDialog>
      </div>

      <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
              </SelectContent>
          </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Homepage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow> : 
               displayedCategories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                  <TableCell>{c.showOnHomepage ? <span className="text-green-500 font-bold">Yes</span> : 'No'}</TableCell>
                  <TableCell className="text-right">
                    <CategoryEditDialog category={c} onSaved={fetchData}><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></CategoryEditDialog>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                  Page {currentPage} of {totalPages || 1}
              </p>
              <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1}
                  >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
              </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
