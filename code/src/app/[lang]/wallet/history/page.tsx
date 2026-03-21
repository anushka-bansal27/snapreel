'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useUser } from '@/firebase';
import type { CoinTransaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, PlusCircle, MinusCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getUserTransactions } from '@/lib/data.actions';

function AllTransactionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center p-4 border rounded-md">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="ml-4 space-y-1 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}


export default function TransactionHistoryPage() {
  const { user } = useUser();
  const [allTransactions, setAllTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user) {
        getUserTransactions(user.uid).then(data => {
            setAllTransactions(data);
            setLoading(false);
        });
    }
  }, [user]);

  const paginatedTransactions = useMemo(() => {
    if (!allTransactions) return [];
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return allTransactions.slice(startIndex, endIndex);
  }, [allTransactions, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    if (!allTransactions || allTransactions.length === 0) return 1;
    return Math.ceil(allTransactions.length / pageSize);
  }, [allTransactions, pageSize]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
        <div className="container mx-auto max-w-5xl py-12 pt-28 md:pt-36">
            <h1 className="text-4xl font-bold mb-8">Transaction History</h1>
            <AllTransactionsSkeleton />
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-12 pt-28 md:pt-36">
      <h1 className="text-4xl font-bold mb-8">Transaction History</h1>
      
      <Card>
        <CardHeader>
           <div className="flex justify-between items-center">
                <div>
                    <CardTitle>All Transactions</CardTitle>
                    <CardDescription>A complete record of your coin activity.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[80px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="500">500</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
           </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {!loading && paginatedTransactions.map((tx) => (
                         <TableRow key={tx.id}>
                            <TableCell>
                                {tx.type === 'purchase' ? (
                                    <PlusCircle className="h-6 w-6 text-green-500" />
                                ) : (
                                    <MinusCircle className="h-6 w-6 text-red-500" />
                                )}
                            </TableCell>
                            <TableCell className="font-medium">{tx.description}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                                {tx.createdAt ? format(new Date(tx.createdAt), 'PP p') : '...'}
                            </TableCell>
                            <TableCell className={cn(
                                "text-right font-semibold font-mono flex items-center justify-end gap-1",
                                tx.type === 'purchase' ? 'text-green-500' : 'text-red-500'
                            )}>
                                <Coins className="h-3 w-3" />
                                {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                            </TableCell>
                         </TableRow>
                     ))}
                </TableBody>
            </Table>

             {!loading && (!paginatedTransactions || paginatedTransactions.length === 0) && (
                <div className="text-center py-20 text-muted-foreground">
                    <p>No transactions found.</p>
                </div>
             )}

             {allTransactions && allTransactions.length > 0 && (
                <div className="flex items-center justify-between pt-6">
                    <Button
                        variant="outline"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                    >
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
             )}
        </CardContent>
      </Card>
    </div>
  );
}
