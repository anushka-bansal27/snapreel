
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, Download, Loader2, Database, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useTransition, useEffect } from 'react';
import { testMongoDbConnectionAction, importDataToMongoAction, exportMongoDataAction } from '@/lib/actions';
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
import { Separator } from '@/components/ui/separator';

type Status = 'idle' | 'pending' | 'success' | 'error';

export default function BackupSettingsPage() {
    const { toast } = useToast();
    const [statuses, setStatuses] = useState<{ mongoTest: Status; mongoImport: Status; mongoExport: Status; }>({
        mongoTest: 'idle',
        mongoImport: 'idle',
        mongoExport: 'idle',
    });
    
    // Transitions
    const [isMongoTesting, startMongoTestTransition] = useTransition();
    const [isMongoImporting, startMongoImportTransition] = useTransition();
    const [isMongoExporting, startMongoExportTransition] = useTransition();

    // MongoDB file state
    const [selectedMongoFile, setSelectedMongoFile] = useState<File | null>(null);
    const [mongoFileContent, setMongoFileContent] = useState<string>('');
    
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    // Reset status after a few seconds
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];
        Object.keys(statuses).forEach((key) => {
            const statusKey = key as keyof typeof statuses;
            if (statuses[statusKey] === 'success' || statuses[statusKey] === 'error') {
                const timer = setTimeout(() => setStatuses(s => ({ ...s, [statusKey]: 'idle' })), 5000);
                timers.push(timer);
            }
        });
        return () => timers.forEach(timer => clearTimeout(timer));
    }, [statuses]);

    const handleTestMongoConnection = () => {
        setStatuses(s => ({ ...s, mongoTest: 'pending' }));
        startMongoTestTransition(async () => {
            const result = await testMongoDbConnectionAction();
            if (result.success) {
                setStatuses(s => ({ ...s, mongoTest: 'success' }));
                toast({ title: "Connection Successful", description: "Connected successfully to the database!" });
            } else {
                setStatuses(s => ({ ...s, mongoTest: 'error' }));
                toast({ variant: 'destructive', title: "Connection Failed", description: result.error });
            }
        });
    };
    
     const handleMongoExport = () => {
        setStatuses(s => ({ ...s, mongoExport: 'pending' }));
        startMongoExportTransition(async () => {
            toast({ title: "Starting Database Export...", description: "This may take a moment." });
            const result = await exportMongoDataAction();
            if (result.success && result.data) {
                const blob = new Blob([result.data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `snapreels_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setStatuses(s => ({ ...s, mongoExport: 'success' }));
                toast({ title: "Export Successful", description: "Backup file has been downloaded." });
            } else {
                setStatuses(s => ({ ...s, mongoExport: 'error' }));
                toast({ variant: 'destructive', title: "Export Failed", description: result.error });
            }
        });
    };

     const handleMongoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedMongoFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setMongoFileContent(event.target?.result as string);
            };
            reader.readAsText(file);
        }
    };

    const handleMongoImport = () => {
        if (!mongoFileContent) {
            toast({ variant: 'destructive', title: "No file selected", description: "Please select a backup file to import." });
            return;
        }
        setStatuses(s => ({ ...s, mongoImport: 'pending' }));
        startMongoImportTransition(async () => {
            toast({ title: "Importing Data...", description: "Clearing current data and restoring from file." });
            const result = await importDataToMongoAction(mongoFileContent);
            if (result.success) {
                setStatuses(s => ({ ...s, mongoImport: 'success' }));
                toast({ title: "Import Successful", description: result.message });
                setSelectedMongoFile(null);
                setMongoFileContent('');
            } else {
                setStatuses(s => ({ ...s, mongoImport: 'error' }));
                toast({ variant: 'destructive', title: "Import Failed", description: result.error });
            }
        });
    }

    const renderButtonIcon = (status: Status, idleIcon: React.ReactNode) => {
        switch (status) {
            case 'pending': return <Loader2 className="mr-2 animate-spin" />;
            case 'success': return <CheckCircle className="mr-2" />;
            case 'error': return <XCircle className="mr-2" />;
            default: return idleIcon;
        }
    };

    const getButtonText = (status: Status, pendingText: string, successText: string, errorText: string, idleText: string) => {
        switch (status) {
            case 'pending': return pendingText;
            case 'success': return successText;
            case 'error': return errorText;
            default: return idleText;
        }
    }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Backup & Restore</h1>
          <p className="text-muted-foreground">Manage your application's data backups.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export your current database, import from a backup file, or test your connection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="space-y-4">
                <Label>Database Connection</Label>
                <div className="flex flex-wrap gap-2">
                    <Button 
                        type="button" 
                        onClick={handleTestMongoConnection} 
                        disabled={statuses.mongoTest !== 'idle'} 
                        variant={statuses.mongoTest === 'error' ? 'destructive' : 'outline'}
                        className={cn('transition-all w-48', { 'bg-green-500 hover:bg-green-600 text-primary-foreground': statuses.mongoTest === 'success' })}
                    >
                        {renderButtonIcon(statuses.mongoTest, <Database className="mr-2"/>)} 
                        {getButtonText(statuses.mongoTest, 'Testing...', 'Connected!', 'Failed!', 'Test Database')}
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground">Verify that the server can connect to your database.</p>
            </div>

            <div className="space-y-4">
                <Label>Backup Data</Label>
                 <div className="flex flex-wrap gap-2">
                     <Button 
                        type="button" 
                        onClick={handleMongoExport} 
                        disabled={statuses.mongoExport !== 'idle'}
                        variant={statuses.mongoExport === 'error' ? 'destructive' : 'default'}
                        className={cn('transition-all w-64', { 'bg-green-500 hover:bg-green-600': statuses.mongoExport === 'success' })}
                    >
                        {renderButtonIcon(statuses.mongoExport, <Download className="mr-2"/>)} 
                        {getButtonText(statuses.mongoExport, 'Exporting...', 'Exported!', 'Failed!', 'Export Database to JSON')}
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground">Download a JSON backup file of your database.</p>
            </div>
            
            <Separator />
            
             <div className="space-y-4">
                <Label className="flex items-center gap-2 font-semibold"><Database /> Restore Database</Label>
                <div className="flex flex-wrap gap-2">
                    <Input type="file" accept=".json" onChange={handleMongoFileChange} disabled={statuses.mongoImport !== 'idle'} className="max-w-xs"/>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" disabled={statuses.mongoImport !== 'idle' || !selectedMongoFile}><FileUp className="mr-2"/> Import to Database</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Restore Database from Backup?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Hadi l-3amaliya ghadi tmseh l-data li 3ndek f-l-base de données kamla u t-zid l-data li f-l-fichiyer backup. Hadi l-haja makat-rj3ch, t-khafch, dir backup l-dakchi li 3ndek daba ila knti khayf.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={handleMongoImport} 
                                        disabled={isMongoImporting || statuses.mongoImport !== 'idle'}
                                        className={cn({
                                            'bg-green-500 hover:bg-green-600': statuses.mongoImport === 'success',
                                            'bg-destructive hover:bg-destructive/90': statuses.mongoImport === 'error',
                                        })}
                                    >
                                        {renderButtonIcon(statuses.mongoImport, <FileUp className="mr-2" />)} 
                                        {getButtonText(statuses.mongoImport, 'Importing...', 'Restored!', 'Failed!', 'Confirm & Restore Now')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                </div>
                <p className="text-sm text-muted-foreground">Restore your database from a previously exported JSON file.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
