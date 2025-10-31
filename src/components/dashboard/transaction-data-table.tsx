'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Transaction } from '@/types';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { columns } from './transaction-table-columns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddTransactionDialog } from './add-transaction-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { TRANSACTION_CATEGORIES, SOURCE_ACCOUNTS } from '@/lib/constants';
import { type DateRange } from 'react-day-picker';
import { Skeleton } from '../ui/skeleton';
import { FileDown, PlusCircle } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { es } from 'date-fns/locale';


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
  const [account, setAccount] = useState<string>('all');

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
      const accountFilter = account === 'all' || t.account === account;
      return dateFilter && categoryFilter && typeFilter && accountFilter;
    });
  }, [transactions, dateRange, category, type, account]);

  const uniqueAccounts = useMemo(() => {
    const allAccounts = SOURCE_ACCOUNTS.map(a => a.value);
    const transactionAccounts = Array.from(new Set(transactions.map(t => t.account).filter(Boolean))) as string[];
    return ['all', ...Array.from(new Set([...allAccounts, ...transactionAccounts]))];
  }, [transactions]);


  return (
    <Card className="shadow-lg rounded-2xl">
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Transacciones Recientes</CardTitle>
            <CardDescription>Consulta y gestiona tus movimientos financieros.</CardDescription>
          </div>
          <AddTransactionDialog onTransactionAdded={() => {}} />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-4">
             <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full md:w-[120px]">
                    <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Egreso</SelectItem>
                </SelectContent>
             </Select>
            <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {TRANSACTION_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
            </Select>
             <Select value={account} onValueChange={setAccount}>
                <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Cuenta" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueAccounts.filter(a => a !== 'all').map(a => {
                      const accountInfo = SOURCE_ACCOUNTS.find(sa => sa.value === a);
                      return <SelectItem key={a} value={a}>{accountInfo?.label || a}</SelectItem>
                    })}
                </SelectContent>
             </Select>
            <DateRangePicker onUpdate={({ range }) => setDateRange(range)} locale={es} />
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
                 <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={columns.length + 1}>
                           <div className="flex items-center space-x-4">
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
                    <TableCell className="text-right">
                        {/* Placeholder for edit/delete buttons */}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                    No se encontraron transacciones. Comienza agregando una.
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
