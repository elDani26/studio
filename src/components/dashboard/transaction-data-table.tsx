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
import { ArrowDown, ArrowUp, Pencil, Scale, Trash2, Calendar as CalendarIcon, X, CreditCard, History, FileDown } from 'lucide-react';
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
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { getLocale } from '@/lib/utils';
import { PayCreditCardDialog } from './pay-credit-card-dialog';


interface TransactionDataTableProps {
  transactions: Transaction[];
  loading: boolean;
  allTransactions: Transaction[];
}

export function TransactionDataTable({ 
  transactions, 
  loading, 
  allTransactions,
}: TransactionDataTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { categories, accounts, currency, hasCreditCard } = useSettings();
  const t = useTranslations('TransactionDataTable');
  const tToasts = useTranslations('Toasts');
  const tColumns = useTranslations('TransactionTableColumns');
  const tMisc = useTranslations('misc');
  const tDatePicker = useTranslations('TransactionDataTable.datePicker');
  const locale = useLocale();
  const dateFnsLocale = getLocale(locale);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const selectedAccount = useMemo(() => accounts.find(a => a.id === accountFilter), [accounts, accountFilter]);
  const isCreditAccountSelected = useMemo(() => selectedAccount?.type === 'credit', [selectedAccount]);

  const filteredCategories = useMemo(() => {
    if (type === 'all' || type === 'transfer') {
      return categories;
    }
    return categories.filter(c => c.type === type);
  }, [categories, type]);
  
  const availableAccountsForFilter = useMemo(() => {
    if (type === 'credit-expense') {
        return accounts.filter(a => a.type === 'credit');
    }
    if (type === 'expense') {
        return accounts.filter(a => a.type === 'debit');
    }
    return accounts;
  }, [accounts, type]);

  const clearDates = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };
  
  const escapeCsvField = (field: any) => {
    const stringField = String(field ?? '').replace(/"/g, '""');
    return `"${stringField}"`;
  };

  const exportTransactionsToCSV = () => {
    const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]));
    const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
    const transfers: Record<string, Transaction[]> = {};

    allTransactions.forEach(t => {
      if (t.transferId) {
        if (!transfers[t.transferId]) transfers[t.transferId] = [];
        transfers[t.transferId].push(t);
      }
    });

    const headers = [
        "Fecha", "Tipo transaccion", "Cuenta Origen", 
        "Cuenta de destino", "Monto", "Categoria", "Descripcion"
    ].join(';');

    const csvRows = [headers];
    const processedTransfers = new Set<string>();

    allTransactions.forEach(t => {
        let row: string[] = [];
        let date;
        try {
            date = format((t.date as any).toDate(), 'yyyy-MM-dd');
        } catch (e) {
            date = 'Fecha inválida';
        }

        if (t.transferId) {
            if (processedTransfers.has(t.transferId)) return;
            const pair = transfers[t.transferId];
            if (pair && pair.length === 2) {
                const expense = pair.find(tr => tr.type === 'expense');
                const income = pair.find(tr => tr.type === 'income');
                if (expense && income) {
                    row = [
                        date,
                        "Transferencia",
                        accountMap.get(expense.account) || tMisc('unknownAccount'),
                        accountMap.get(income.account) || tMisc('unknownAccount'),
                        String(expense.amount),
                        tMisc('transfer'),
                        expense.description?.split('(')[0].trim() || '-'
                    ];
                    processedTransfers.add(t.transferId);
                }
            }
        } else if (t.paymentFor) {
            row = [
                date,
                "Pago de Tarjeta",
                accountMap.get(t.account) || tMisc('unknownAccount'),
                accountMap.get(t.paymentFor) || tMisc('unknownAccount'),
                String(t.amount),
                categoryMap.get(t.category) || tMisc('unknownCategory'),
                t.description || '-'
            ];
        } else {
             row = [
                date,
                t.type === 'income' ? 'Ingreso' : 'Egreso',
                accountMap.get(t.account) || tMisc('unknownAccount'),
                '', // No destination account
                String(t.amount),
                categoryMap.get(t.category) || tMisc('unknownCategory'),
                t.description || '-'
            ];
        }
        
        if (row.length > 0) {
            csvRows.push(row.join(';'));
        }
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const today = format(new Date(), 'yyyy-MM-dd');
    link.setAttribute('href', url);
    link.setAttribute('download', `GestionaTuDinero_Transacciones_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


  useEffect(() => {
    if (categoryFilter !== 'all' && !filteredCategories.some(c => c.id === categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [type, filteredCategories, categoryFilter]);
  
  useEffect(() => {
    if (accountFilter !== 'all' && !availableAccountsForFilter.some(a => a.id === accountFilter)) {
      setAccountFilter('all');
    }
  }, [type, availableAccountsForFilter, accountFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const categoryFilterPassed = categoryFilter === 'all' || t.category === categoryFilter;
      
      let tDate;
      if (t.date && typeof (t.date as any).toDate === 'function') {
        tDate = (t.date as any).toDate();
      } else {
        tDate = new Date(t.date as any);
      }
      
      const fromDate = dateFrom ? startOfDay(dateFrom) : null;
      const toDate = dateTo ? endOfDay(dateTo) : null;

      const dateFilterPassed = (!fromDate || tDate >= fromDate) && (!toDate || tDate <= toDate);
      
      let typeFilterPassed = true;
      if (type === 'all') {
        typeFilterPassed = true;
      } else if (type === 'transfer') {
        typeFilterPassed = !!t.transferId;
      } else if (type === 'credit-expense') {
        typeFilterPassed = t.isCreditCardExpense || !!t.paymentFor;
      } else if (type === 'expense') {
        typeFilterPassed = t.type === 'expense' && !t.transferId && !t.isCreditCardExpense;
      } else { // income
        typeFilterPassed = t.type === 'income' && !t.transferId;
      }

      // Special logic for account filter when a credit account is selected
      if (accountFilter !== 'all' && isCreditAccountSelected) {
        // Show expenses made WITH this card OR payments made TO this card
        return (t.account === accountFilter || t.paymentFor === accountFilter) && dateFilterPassed;
      }
      
      const accountFilterPassed = accountFilter === 'all' || t.account === accountFilter;

      return categoryFilterPassed && typeFilterPassed && accountFilterPassed && dateFilterPassed;
    });
  }, [transactions, categoryFilter, type, accountFilter, isCreditAccountSelected, dateFrom, dateTo]);

  const filteredTotals = useMemo(() => {
    const relevantTransactions = filteredTransactions;

    const income = relevantTransactions
      .filter(t => t.type === 'income' && (accountFilter === 'all' ? !t.transferId : true))
      .reduce((acc, t) => acc + t.amount, 0);

    const expenses = relevantTransactions
      .filter(t => t.type === 'expense' && !t.isCreditCardExpense && (accountFilter === 'all' ? !t.transferId : true))
      .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expenses;
    
    const creditTransactionsSource = filteredTransactions;

    const creditHistoryTotal = creditTransactionsSource
        .filter(t => t.isCreditCardExpense && (accountFilter === 'all' || t.account === accountFilter))
        .reduce((acc, t) => acc + t.amount, 0);
        
    const currentDebt = creditTransactionsSource
        .filter(t => t.isCreditCardExpense && (accountFilter === 'all' || t.account === accountFilter))
        .reduce((acc, t) => acc + t.amount, 0)
      - creditTransactionsSource
        .filter(t => (!!t.paymentFor) && (accountFilter === 'all' || t.paymentFor === accountFilter))
        .reduce((acc, t) => acc + t.amount, 0);
    
    return {
      income,
      expenses,
      balance,
      creditHistoryTotal,
      currentDebt,
    };
  }, [filteredTransactions, accountFilter, isCreditAccountSelected]);
  
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

        // If it's a transfer, find and delete the sibling transaction
        if (transactionToDelete.transferId) {
            const q = query(
                collection(firestore, 'users', user.uid, 'transactions'),
                where('transferId', '==', transactionToDelete.transferId)
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                if (doc.id !== transactionToDelete.id) { // Don't delete the one we already are
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
        const path = transactionToDelete.transferId 
            ? `users/${user.uid}/transactions/{multiple}` 
            : `users/${user.uid}/transactions/${transactionToDelete.id}`;

        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: path,
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
  
  const showCreditCardView = (type === 'credit-expense' || isCreditAccountSelected) && hasCreditCard;


  return (
    <>
      <Card className="shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-2 w-full lg:w-auto">
                <Button variant="outline" onClick={exportTransactionsToCSV} className="w-full">
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar a CSV
                </Button>
                {hasCreditCard && <PayCreditCardDialog transactions={allTransactions} />}
                <AddTransferDialog transactions={allTransactions} />
                <AddTransactionDialog transactions={allTransactions} />
            </div>
          </div>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 pt-4">
              <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue placeholder={t('filterType')} /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      <SelectItem value="income">{t('income')}</SelectItem>
                      <SelectItem value="expense">{t('expense')}</SelectItem>
                      {hasCreditCard && <SelectItem value="credit-expense">{tMisc('creditCardDebt')}</SelectItem>}
                      <SelectItem value="transfer">{tMisc('transfer')}</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={type === 'transfer' || type === 'credit-expense'}>
                  <SelectTrigger><SelectValue placeholder={t('filterCategory')} /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      {filteredCategories.filter(c => c.name.toLowerCase() !== 'transfer').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
              </Select>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger><SelectValue placeholder={t('filterAccount')} /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      {availableAccountsForFilter.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
              </Select>
             <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn( 'w-full justify-start text-left font-normal', !dateFrom && 'text-muted-foreground' )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'LLL dd, y') : <span>{tDatePicker('startDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    locale={dateFnsLocale}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn( 'w-full justify-start text-left font-normal', !dateTo && 'text-muted-foreground' )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'LLL dd, y') : <span>{tDatePicker('endDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    locale={dateFnsLocale}
                  />
                </PopoverContent>
              </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 mb-6 md:grid-cols-2 lg:grid-cols-3">
            {showCreditCardView ? (
              <>
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
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(column => (
                    <TableHead key={column.accessor.toString()} className={cn(column.className, 'text-xs md:text-sm')}>
                      {column.header}
                    </TableHead>
                  ))}
                  <TableHead className="text-right text-xs md:text-sm">{tColumns('actions')}</TableHead>
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
          allTransactions={allTransactions}
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

    
