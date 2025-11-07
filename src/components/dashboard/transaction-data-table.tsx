'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Transaction } from '@/types';
import { useUser, useFirestore, errorEmitter } from '@/firebase';
import { getColumns } from './transaction-table-columns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddTransactionDialog } from './add-transaction-dialog';
import { AddTransferDialog } from './add-transfer-dialog';
import { EditTransactionDialog } from './edit-transaction-dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '../ui/skeleton';
import { ArrowDown, ArrowUp, Pencil, Scale, Trash2, Calendar as CalendarIcon, X, CreditCard, History } from 'lucide-react';
import { doc, deleteDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
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
import { format } from 'date-fns';
import { getLocale } from '@/lib/utils';
import { startOfDay, endOfDay } from 'date-fns';
import { AddCreditCardTransactionDialog } from './add-credit-card-transaction-dialog';
import { PayCreditCardDialog } from './pay-credit-card-dialog';


interface TransactionDataTableProps {
  transactions: Transaction[];
  loading: boolean;
}

export function TransactionDataTable({ 
  transactions, 
  loading, 
}: TransactionDataTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { categories, accounts, currency } = useSettings();
  const t = useTranslations('TransactionDataTable');
  const tDatePicker = useTranslations('TransactionDataTable.datePicker');
  const tToasts = useTranslations('Toasts');
  const tColumns = useTranslations('TransactionTableColumns');
  const tMisc = useTranslations('misc');
  const locale = useLocale();
  const dateFnsLocale = getLocale(locale);

  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const selectedAccount = useMemo(() => accounts.find(a => a.id === accountFilter), [accounts, accountFilter]);
  const isCreditAccountSelected = useMemo(() => selectedAccount?.type === 'credit', [selectedAccount]);
  const isCreditExpenseTypeSelected = useMemo(() => type === 'credit-expense', [type]);

  const filteredCategories = useMemo(() => {
    if (type === 'all' || type === 'transfer') {
      return categories;
    }
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  useEffect(() => {
    if (categoryFilter !== 'all' && !filteredCategories.some(c => c.id === categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [type, filteredCategories, categoryFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      let dateFilterPassed = true;
      if (dateFrom) {
        let tDate;
        if (t.date && typeof (t.date as any).toDate === 'function') {
          tDate = (t.date as any).toDate();
        } else {
          tDate = new Date(t.date as any);
        }
        const fromDate = startOfDay(dateFrom);
        const toDate = dateTo ? endOfDay(dateTo) : endOfDay(fromDate);
        dateFilterPassed = tDate >= fromDate && tDate <= toDate;
      }

      const categoryFilterPassed = categoryFilter === 'all' || t.category === categoryFilter;
      
      let typeFilterPassed = true;
      if (type === 'all') {
        typeFilterPassed = true;
      } else if (type === 'transfer') {
        typeFilterPassed = !!t.transferId;
      } else if (type === 'credit-expense') {
        typeFilterPassed = !!t.isCreditCardExpense;
      } else {
        typeFilterPassed = t.type === type && !t.transferId && !t.isCreditCardExpense;
      }

      const accountFilterPassed = accountFilter === 'all' || t.account === accountFilter;
      return dateFilterPassed && categoryFilterPassed && typeFilterPassed && accountFilterPassed;
    });
  }, [transactions, dateFrom, dateTo, categoryFilter, type, accountFilter]);

  const filteredTotals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income' && !t.transferId)
      .reduce((acc, t) => acc + t.amount, 0);

    const expenses = filteredTransactions
      .filter(t => t.type === 'expense' && !t.transferId && !t.isCreditCardExpense)
      .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expenses;

    // Calculations for the special credit view
    let creditHistoryTotal = 0;
    let currentDebt = 0;
    
    // Determine which transactions to use for credit calculation
    const creditTransactionsSource = isCreditExpenseTypeSelected ? transactions : filteredTransactions;

    if (isCreditAccountSelected) {
        creditHistoryTotal = creditTransactionsSource
            .filter(t => t.isCreditCardExpense && t.account === accountFilter)
            .reduce((acc, t) => acc + t.amount, 0);
        
        currentDebt = creditTransactionsSource
            .filter(t => t.account === accountFilter && t.isCreditCardExpense)
            .reduce((acc, t) => acc + t.amount, 0)
          - creditTransactionsSource
            .filter(t => t.paymentFor === accountFilter)
            .reduce((acc, t) => acc + t.amount, 0);
    } else if (isCreditExpenseTypeSelected) {
        creditHistoryTotal = creditTransactionsSource
            .filter(t => t.isCreditCardExpense)
            .reduce((acc, t) => acc + t.amount, 0);

        currentDebt = creditTransactionsSource
            .filter(t => t.isCreditCardExpense)
            .reduce((acc, t) => acc + t.amount, 0)
          - creditTransactionsSource
            .filter(t => !!t.paymentFor)
            .reduce((acc, t) => acc + t.amount, 0);
    }
    
    return {
      income,
      expenses,
      balance,
      creditHistoryTotal,
      currentDebt,
    };
  }, [filteredTransactions, transactions, isCreditAccountSelected, isCreditExpenseTypeSelected, accountFilter]);
  
  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!user || !transactionToDelete) return;

    try {
        const batch = writeBatch(firestore);

        const mainDocRef = doc(firestore, 'users', user.uid, 'transactions', transactionToDelete.id);
        batch.delete(mainDocRef);

        if (transactionToDelete.transferId) {
            const q = query(
                collection(firestore, 'users', user.uid, 'transactions'),
                where('transferId', '==', transactionToDelete.transferId)
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                if (doc.id !== transactionToDelete.id) {
                    batch.delete(doc.ref);
                }
            });
        }
        
        await batch.commit();

        toast({
            title: 'Success!',
            description: tToasts('transactionDeletedSuccess'),
        });

    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${user.uid}/transactions`,
            operation: 'delete',
        }));
        toast({
            variant: 'destructive',
            title: 'Error',
            description: tToasts('transactionDeletedError'),
        });
    } finally {
        setIsDeleteDialogOpen(false);
        setTransactionToDelete(null);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const columns = getColumns(handleEdit, handleDelete);
  
  const clearDates = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const showCreditView = isCreditAccountSelected || isCreditExpenseTypeSelected;


  return (
    <>
      <Card className="shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <AddCreditCardTransactionDialog />
                <PayCreditCardDialog transactions={transactions} />
                <AddTransferDialog transactions={transactions} />
                <AddTransactionDialog transactions={transactions} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-4">
              <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full sm:w-auto">
                      <SelectValue placeholder={t('filterType')} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      <SelectItem value="income">{t('income')}</SelectItem>
                      <SelectItem value="expense">{t('expense')}</SelectItem>
                      <SelectItem value="credit-expense">{tMisc('creditCardExpense')}</SelectItem>
                      <SelectItem value="transfer">{tMisc('transfer')}</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={type === 'transfer' || type === 'credit-expense'}>
                  <SelectTrigger className="w-full sm:w-auto">
                      <SelectValue placeholder={t('filterCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      {filteredCategories.filter(c => c.name.toLowerCase() !== 'transfer').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
              </Select>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="w-full sm:w-auto">
                      <SelectValue placeholder={t('filterAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full sm:w-auto justify-start text-left font-normal',
                        !dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PPP', { locale: dateFnsLocale }) : <span>{tDatePicker('startDate')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      locale={dateFnsLocale}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full sm:w-auto justify-start text-left font-normal',
                        !dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PPP', { locale: dateFnsLocale }) : <span>{tDatePicker('endDate')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      locale={dateFnsLocale}
                    />
                  </PopoverContent>
                </Popover>
                {(dateFrom || dateTo) && <Button variant="ghost" onClick={clearDates}><X className="mr-2 h-4 w-4"/>{tDatePicker('clearButton')}</Button>}
              </div>
          </div>
        </CardHeader>
        <CardContent>
          {showCreditView ? (
            <div className="grid gap-4 md:grid-cols-2 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('accountHistory')}</CardTitle>
                        <History className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-500">{formatCurrency(filteredTotals.creditHistoryTotal)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('currentAccountDebt')}</CardTitle>
                        <CreditCard className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{formatCurrency(filteredTotals.currentDebt)}</div>
                    </CardContent>
                </Card>
            </div>
          ) : (
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
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(column => (
                    <TableHead key={column.accessor.toString()} className={column.className}>{column.header}</TableHead>
                  ))}
                  <TableHead className="text-right">{tColumns('actions')}</TableHead>
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
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)} disabled={!!transaction.paymentFor}>
                              <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(transaction)}>
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
