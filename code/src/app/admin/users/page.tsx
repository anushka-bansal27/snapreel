'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getAllUsersForAdmin, getUserTransactions } from '@/lib/data.actions';
import { updateUserStatusAction, deleteUserAction, adminUpdateUserAction } from '@/lib/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Ban, ShieldCheck, Loader2, Edit, Save, Camera, ChevronLeft, ChevronRight, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // History & Delete Dialog States
  const [deleteUserId, setDeleteUserId] = useState<any>(null);
  const [historyUser, setHistoryUser] = useState<any>(null);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 10;

  useEffect(() => {
      if (historyUser) {
          setLoadingHistory(true);
          getUserTransactions(historyUser.id, 100)
              .then(txs => setHistoryTransactions(txs || []))
              .catch(() => setHistoryTransactions([]))
              .finally(() => setLoadingHistory(false));
      } else {
          setHistoryTransactions([]);
      }
  }, [historyUser]);

  const paginatedHistory = useMemo(() => {
      const startIndex = (historyPage - 1) * HISTORY_PAGE_SIZE;
      return historyTransactions.slice(startIndex, startIndex + HISTORY_PAGE_SIZE);
  }, [historyTransactions, historyPage]);

  const totalHistoryPages = Math.ceil(historyTransactions.length / HISTORY_PAGE_SIZE);

  // Pagination & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUsers = useMemo(() => {
      let filtered = users;
      if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(u => 
              (u.displayName && u.displayName.toLowerCase().includes(q)) ||
              (u.email && u.email.toLowerCase().includes(q)) ||
              (u.publicId && u.publicId.toLowerCase().includes(q)) ||
              (u.id && u.id.toLowerCase().includes(q))
          );
      }
      return filtered;
  }, [users, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / parseInt(pageSize));
  
  const paginatedUsers = useMemo(() => {
      const ps = parseInt(pageSize);
      const start = (currentPage - 1) * ps;
      return filteredUsers.slice(start, start + ps);
  }, [filteredUsers, currentPage, pageSize]);

  // Edit Dialog State - Detached from the loop for stability
  const [isEditDialogOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
      displayName: '',
      email: '',
      phoneNumber: '',
      photoURL: '',
      coins: 0,
      password: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
        const data = await getAllUsersForAdmin();
        setUsers(data || []);
    } catch (e) {
        console.error("Fetch users failed", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        photoURL: user.photoURL || '',
        coins: user.coins || 0,
        password: '',
    });
    setIsEditOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
          const img = document.createElement('img');
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 256;
              let width = img.width;
              let height = img.height;
              if (width > MAX_WIDTH) { height = (height * MAX_WIDTH) / width; width = MAX_WIDTH; }
              canvas.width = width; canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              canvas.toBlob(async (blob) => {
                  if (!blob) { setIsUploading(false); return; }
                  const upData = new FormData();
                  upData.append('file', blob, file.name);
                  try {
                      const res = await fetch('/api/upload', { method: 'POST', body: upData });
                      const data = await res.json();
                      if (data.success && data.url) {
                          setFormData(prev => ({ ...prev, photoURL: data.url }));
                          toast({ title: 'Photo ready!' });
                      } else {
                          throw new Error(data.error || 'Upload failed');
                      }
                  } catch (err: any) { toast({ variant: 'destructive', title: 'Upload failed', description: err.message }); }
                  finally { setIsUploading(false); }
              }, 'image/webp', 0.8);
          };
          img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
  };

  const handleSaveUser = async () => {
      if (!selectedUser) return;
      setIsSaving(true);
      try {
        const result = await adminUpdateUserAction(selectedUser.id, formData);
        if (result.success) {
            toast({ title: 'User Updated', description: `Successfully updated ${formData.displayName}` });
            setIsEditOpen(false);
            setSelectedUser(null);
            fetchData();
        } else {
            toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
        }
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Server communication error' });
      } finally {
        setIsSaving(false);
      }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    setProcessingId(userId);
    const result = await updateUserStatusAction(userId, !currentStatus);
    if (result.success) { toast({ title: !currentStatus ? 'User Banned' : 'User Unbanned' }); fetchData(); }
    else { toast({ variant: 'destructive', title: 'Error', description: result.error }); }
    setProcessingId(null);
  };

  const handleDeleteUser = async (userId: string) => {
    setProcessingId(userId);
    const result = await deleteUserAction(userId);
    if (result.success) { toast({ title: 'User Deleted' }); fetchData(); }
    else { toast({ variant: 'destructive', title: 'Error', description: result.error }); }
    setProcessingId(null);
  };

  const handleToggleStatus = async (user: any) => {
    setProcessingId(user.id);
    const newStatus = !user.disabled;
    const result = await updateUserStatusAction(user.id, newStatus);
    if (result.success) {
      toast({ title: newStatus ? 'User Disabled' : 'User Activated', description: `Account for ${user.displayName || user.email} has been updated.` });
      fetchData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setProcessingId(null);
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold">Manage Users</h1>
            <p className="text-sm text-muted-foreground">Total Accounts: {users?.length || 0}</p>
        </div>
        <div className="flex items-center gap-3">
            <Input 
                placeholder="Search name, email, or ID..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-[250px] bg-white/5 border-white/10 text-white"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">Show:</span>
            <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {['10', '20', '50', '100', '500'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </div>

      <Card className="bg-zinc-950/50 border-white/5 shadow-2xl backdrop-blur-sm w-full">
        <CardContent className="p-0 overflow-x-auto w-full">
        <Table className="min-w-[800px]">
            <TableHeader className="bg-black/40 hover:bg-black/40">
              <TableRow className="border-white/5">
                <TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-black py-5 pl-6">Profile</TableHead>
                <TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-black py-5">Account / ID</TableHead>
                <TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-black py-5">Coins</TableHead>
                <TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-black py-5">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-widest text-muted-foreground font-black py-5 text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/5"><TableCell colSpan={5}><Skeleton className="h-16 w-full bg-white/5" /></TableCell></TableRow>
              )) : paginatedUsers.map((u) => (
                <TableRow key={u.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/20"><AvatarImage src={u.photoURL} /><AvatarFallback className="bg-zinc-800 text-white">{u.displayName?.[0] || u.email?.[0]}</AvatarFallback></Avatar>
                    <div className="flex flex-col">
                        <span className="font-black text-sm text-white tracking-tight">{u.displayName || 'User'}</span>
                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-white/80">{u.email || u.phoneNumber}</span>
                        {u.publicId && (
                            <span className="text-[10px] font-black uppercase text-primary bg-primary/10 w-fit px-2 py-0.5 rounded-sm border border-primary/20">
                                ID: {u.publicId}
                            </span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-amber-500 font-black">
                      <div className="flex items-center gap-1.5">
                          <Coins className="h-3.5 w-3.5 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
                          <span>{u.coins?.toLocaleString() || 0}</span>
                      </div>
                  </TableCell>
                  <TableCell>
                      <Badge variant={u.disabled ? 'destructive' : 'secondary'} className={cn(u.disabled ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-white/5 text-white/70 border-white/10")}>
                          {u.disabled ? 'Blocked' : 'Active'}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" disabled={processingId === u.id}>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-950 border-white/10 text-white z-[100]">
                            <DropdownMenuItem 
                                onSelect={() => { setTimeout(() => openEditDialog(u), 50); }} 
                                className="cursor-pointer hover:bg-white/5 flex items-center"
                            >
                                <Edit className="mr-2 h-4 w-4" /> Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onSelect={() => { setTimeout(() => handleToggleBan(u.id, !!u.disabled), 50); }}
                                className="cursor-pointer hover:bg-white/5 flex items-center"
                            >
                                {u.disabled ? <><ShieldCheck className="mr-2 h-4 w-4 text-green-500" /> Unban User</> : <><Ban className="mr-2 h-4 w-4 text-amber-500" /> Block User</>}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onSelect={() => { setTimeout(() => setHistoryUser(u), 50); }}
                                className="cursor-pointer hover:bg-white/5 flex items-center"
                            >
                                <Coins className="mr-2 h-4 w-4 text-blue-500" /> View History
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onSelect={() => { setTimeout(() => setDeleteUserId(u), 50); }} 
                                className="text-destructive focus:text-destructive cursor-pointer hover:bg-red-500/10 flex items-center"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-8 px-4 pb-4">
              <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Showing Page {currentPage} of {totalPages || 1}</p>
              <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border-white/10 text-white hover:bg-white/5" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border-white/10 text-white hover:bg-white/5" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
              </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Edit Dialog */}
      <Dialog 
          open={isEditDialogOpen} 
          onOpenChange={(open) => { if (!open) { setIsEditOpen(false); setTimeout(() => setSelectedUser(null), 300); } }}
      >
          <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10 text-white shadow-2xl">
              <DialogHeader>
                  <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">Edit Profile</DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium">Modify user details directly in the database.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                  <div className="flex flex-col items-center gap-4 mb-4">
                      <div className="relative group">
                          <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-xl shadow-primary/5">
                              <AvatarImage src={formData.photoURL} />
                              <AvatarFallback className="bg-zinc-800 text-white text-3xl font-black">{formData.displayName?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                              {isUploading ? <Loader2 className="animate-spin text-white h-8 w-8" /> : <Camera className="text-white h-8 w-8" />}
                          </button>
                          <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                      </div>
                      <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Change Avatar</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Display Name</Label>
                        <Input value={formData.displayName} onChange={e => setFormData(p => ({...p, displayName: e.target.value}))} className="bg-white/5 border-white/10 h-11 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Email</Label>
                        <Input value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="bg-white/5 border-white/10 h-11 text-white" />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Phone Number</Label>
                        <Input value={formData.phoneNumber} onChange={e => setFormData(p => ({...p, phoneNumber: e.target.value}))} placeholder="+1234567890" className="bg-white/5 border-white/10 h-11 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">New Password</Label>
                        <Input type="password" value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))} placeholder="Leave blank to keep" className="bg-white/5 border-white/10 h-11 text-white" />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Coins Balance</Label>
                        <div className="relative">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                            <Input type="number" value={formData.coins} onChange={e => setFormData(p => ({...p, coins: Number(e.target.value)}))} className="bg-white/5 border-white/10 h-11 pl-10 font-mono font-bold text-white" />
                        </div>
                      </div>
                  </div>
              </div>
              <DialogFooter className="gap-3 sm:gap-0">
                  <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="hover:bg-white/5 text-muted-foreground font-bold flex-1">Cancel</Button>
                  <Button onClick={handleSaveUser} disabled={isSaving || isUploading} className="flex-[2] bg-primary hover:bg-primary/90 font-black shadow-lg shadow-primary/20">
                      {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                      SAVE CHANGES
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Global Delete Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
          <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-black">Delete user account?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground font-medium">
                      This action cannot be undone. All data for <span className="text-white font-bold">{deleteUserId?.displayName || deleteUserId?.email}</span>, including history and coins, will be permanently removed.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { if (deleteUserId) handleDeleteUser(deleteUserId.id); setDeleteUserId(null); }} className="bg-destructive hover:bg-destructive/90 text-white">Confirm Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {/* Global History Dialog */}
      <Dialog 
          open={!!historyUser} 
          onOpenChange={(open) => { 
              if (!open) { setHistoryUser(null); setHistoryPage(1); }
          }}
      >
          <DialogContent className="sm:max-w-xl bg-zinc-950 border-white/10 text-white shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-none">
                  <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">Transaction History</DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium">
                      Latest transactions for <span className="text-white font-bold">{historyUser?.displayName || historyUser?.email}</span>.
                  </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 py-4">
                  {loadingHistory ? (
                      <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
                  ) : historyTransactions.length === 0 ? (
                      <div className="text-center p-8 text-muted-foreground bg-white/5 rounded-lg border border-white/5">No transactions found for this user.</div>
                  ) : (
                      paginatedHistory.map(tx => (
                          <div key={tx.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                              <div>
                                  <div className="font-bold text-sm text-white">{tx.description}</div>
                                  <div className="text-[10px] text-muted-foreground font-black tracking-widest uppercase mt-0.5">{new Date(tx.createdAt).toLocaleString()}</div>
                              </div>
                              <div className={cn("font-mono font-black", tx.amount > 0 ? "text-green-500" : "text-destructive")}>
                                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                              </div>
                          </div>
                      ))
                  )}
              </div>
              
              {!loadingHistory && historyTransactions.length > HISTORY_PAGE_SIZE && (
                  <div className="flex-none pt-4 border-t border-white/10 flex items-center justify-between">
                      <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-transparent border-white/10 text-white hover:bg-white/5"
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                      >
                          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                      </Button>
                      <span className="text-xs font-bold text-muted-foreground">
                          Page {historyPage} of {totalHistoryPages}
                      </span>
                      <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-transparent border-white/10 text-white hover:bg-white/5"
                          onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                          disabled={historyPage === totalHistoryPages}
                      >
                          Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                  </div>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}
