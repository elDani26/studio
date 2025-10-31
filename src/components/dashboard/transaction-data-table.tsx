'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Transaction } from '@/types';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { columns } from './transaction-table-columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddTransactionDialog } from './add-transaction-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';
import { type DateRange } from 'react-day-picker';
import { Skeleton } from '../ui/skeleton';
import { FileDown, ListFilter, PlusCircle } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface TransactionDataTableProps {
  initialTransactions: Transaction[];
}

export function TransactionDataTable({ initialTransactions }: TransactionDataTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [category, setCategory] = useState<string>('all');
  const [type, setType] = useState<string>('all');

  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
  }, [user, firestore]);

  useEffect(() => {
    setTransactions(initialTransactions);
     if (initialTransactions.length > 0) {
      setLoading(false);
    }
  }, [initialTransactions]);

  useEffect(() => {
    if (!transactionsQuery) {
      setLoading(false);
      return;
    };

    setLoading(true);
    const unsubscribe = onSnapshot(transactionsQuery, (querySnapshot) => {
      const userTransactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as any).toDate(),
      })) as Transaction[];
      setTransactions(userTransactions);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [transactionsQuery]);


  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = t.date as unknown as Date;
      const dateFilter = !dateRange || !dateRange.from || (tDate >= dateRange.from && (!dateRange.to || tDate <= dateRange.to));
      const categoryFilter = category === 'all' || t.category === category;
      const typeFilter = type === 'all' || t.type === type;
      return dateFilter && categoryFilter && typeFilter;
    });
  }, [transactions, dateRange, category, type]);

  const uniqueCategories = ['all', ...Array.from(new Set(transactions.map(t => t.category)))];
  const uniqueAccounts = ['all', ...Array.from(new Set(transactions.map(t => t.account).filter(Boolean))) as string[]];


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>Recent Transactions</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
                <DateRangePicker onUpdate={({ range }) => setDateRange(range)} />
                 <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                 </Select>
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {TRANSACTION_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <Button variant="outline" className="gap-1">
                <FileDown className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
            </Button>
            <AddTransactionDialog onTransactionAdded={() => {}} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(column => (
                  <TableHead key={column.header} className={column.className}>{column.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={columns.length} className="p-0">
                           <div className="flex items-center space-x-4 p-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 w-full">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        </TableCell>
                    </TableRow>
                ))
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map(transaction => (
                  <TableRow key={transaction.id}>
                    {columns.map(column => (
                      <TableCell key={column.accessor} className={column.className}>
                        {column.cell(transaction)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
