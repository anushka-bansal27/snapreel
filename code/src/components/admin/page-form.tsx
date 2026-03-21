'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CustomPage } from '@/lib/types';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { savePageAction } from '@/lib/actions';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  slug: z.string().min(2, 'Slug is required.'),
  content: z.string().min(10, 'Content is required.'),
  showInFooter: z.boolean().default(false),
});

type PageFormValues = z.infer<typeof formSchema>;

type PageFormProps = {
  page?: CustomPage;
};

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

export function PageForm({ page }: PageFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<PageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: page || {
      title: '',
      slug: '',
      content: '',
      showInFooter: false,
    },
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('title', e.target.value);
    if (!page?.id) {
        form.setValue('slug', slugify(e.target.value));
    }
  }

  const onSubmit = async (values: PageFormValues) => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    const result = await savePageAction({ ...values, id: page?.id });

    if (result.success) {
        toast({ title: page ? 'Page Updated' : 'Page Added' });
        setSaveSuccess(true);
        setTimeout(() => {
            router.push('/admin/pages');
            router.refresh();
        }, 1000);
    } else {
        toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
    }
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{page ? 'Edit Page' : 'Add New Page'}</CardTitle>
        <CardDescription>Manage the content and settings for this custom page in MongoDB.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Privacy Policy" {...field} onChange={handleTitleChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug (SEO)</FormLabel>
                  <FormControl>
                    <Input placeholder="privacy-policy" {...field} />
                  </FormControl>
                   <FormDescription>This is the URL-friendly version of the title.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Start writing your page content here..."
                      className="min-h-[400px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="showInFooter"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Show in Footer</FormLabel>
                    <FormDescription>
                      If enabled, a link to this page will appear in the site footer.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSaving} className={cn(saveSuccess && "bg-green-500 hover:bg-green-600")}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saveSuccess ? <CheckCircle className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              {saveSuccess ? 'Saved!' : 'Save Page'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
