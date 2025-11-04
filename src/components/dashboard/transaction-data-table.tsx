'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Transaction } from '@/types';
import { useUser, useFirestore, errorEmitter } from '@/firebase';
import { getColumns } from './transaction-table-columns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddTransactionDialog } from './add-transaction-dialog';
import { EditTransactionDialog } from './edit-transaction-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { type DateRange } from 'react-day-picker';
import { Skeleton } from '../ui/skeleton';
import { ArrowDown, ArrowUp, Pencil, Scale, Trash2 } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FirestorePermissionError } from '@/firebase/errors';
import { useSettings } from '@/context/settings-context';
import { useTranslations, useLocale } from 'next-intl';
import { getLocale } from '@/lib/utils';

interface TransactionDataTableProps {
  transactions: Transaction[];
  loading: boolean;
}

export function TransactionDataTable({ transactions, loading }: TransactionDataTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { categories, accounts, currency } = useSettings();
  const t = useTranslations('TransactionDataTable');
  const tToasts = useTranslations('Toasts');
  const locale = useLocale();
  const dateFnsLocale = getLocale(locale);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (type === 'all') {
      return categories;
    }
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  useEffect(() => {
    // Reset category filter when type changes and the selected category is no longer valid
    if (categoryFilter !== 'all' && !filteredCategories.some(c => c.id === categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [type, filteredCategories, categoryFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      let tDate;
      if (t.date && typeof (t.date as any).toDate === 'function') {
        tDate = (t.date as any).toDate();
      } else {
        tDate = new Date(t.date as any);
      }
      
      const dateFilter = !dateRange || !dateRange.from || (tDate >= dateRange.from && (!dateRange.to || tDate <= dateRange.to));
      const categoryFilterPassed = categoryFilter === 'all' || t.category === categoryFilter;
      const typeFilter = type === 'all' || t.type === type;
      const accountFilterPassed = accountFilter === 'all' || t.account === accountFilter;
      return dateFilter && categoryFilterPassed && typeFilter && accountFilterPassed;
    });
  }, [transactions, dateRange, categoryFilter, type, accountFilter]);

  const filteredTotals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [filteredTransactions]);
  
  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!user || !transactionToDelete) return;
    const docRef = doc(firestore, 'users', user.uid, 'transactions', transactionToDelete);
    deleteDoc(docRef)
      .then(() => {
        toast({
          title: 'Success!',
          description: tToasts('transactionDeletedSuccess'),
        });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: tToasts('transactionDeletedError'),
        });
      })
      .finally(() => {
        setIsDeleteDialogOpen(false);
        setTransactionToDelete(null);
      });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const columns = getColumns(handleEdit, handleDelete);


  return (
    <>
      <Card className="shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            <AddTransactionDialog />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-4">
              <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full md:w-[120px]">
                      <SelectValue placeholder={t('filterType')} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      <SelectItem value="income">{t('income')}</SelectItem>
                      <SelectItem value="expense">{t('expense')}</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder={t('filterCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      {filteredCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
              </Select>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder={t('filterAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
              </Select>
              <DateRangePicker onUpdate={({ range }) => setDateRange(range)} locale={dateFnsLocale} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('filteredIncome')}</CardTitle>
                <ArrowUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{formatCurrency(filteredTotals.income)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('filteredExpenses')}</CardTitle>
                <ArrowDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{formatCurrency(filteredTotals.expenses)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('filteredBalance')}</CardTitle>
                <Scale className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${filteredTotals.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {formatCurrency(filteredTotals.balance)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(column => (
                    <TableHead key={column.accessor.toString()} className={column.className}>{column.header}</TableHead>
                  ))}
                  <TableHead className="text-right">{t('TransactionTableColumns.actions')}</TableHead>
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
                        <TableCell key={column.accessor.toString()} className={column.className}>
                          {column.cell(transaction)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)}>
                              <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(transaction.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                      {t('noTransactions')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {selectedTransaction && (
        <EditTransactionDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          transaction={selectedTransaction}
          onTransactionUpdated={() => {
            setIsEditDialogOpen(false);
            setSelectedTransaction(null);
          }}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
