'use client';

import { useState, useMemo } from 'react';
import type { Transaction } from '@/types';
import { useUser, useFirestore } from '@/firebase';
import { getColumns } from './transaction-table-columns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddTransactionDialog } from './add-transaction-dialog';
import { EditTransactionDialog } from './edit-transaction-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { SOURCE_ACCOUNTS } from '@/lib/constants';
import { type DateRange } from 'react-day-picker';
import { Skeleton } from '../ui/skeleton';
import { Pencil, Trash2 } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { es } from 'date-fns/locale';
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
import { useSettings } from '@/context/settings-context';

interface TransactionDataTableProps {
  transactions: Transaction[];
  loading: boolean;
}

export function TransactionDataTable({ transactions, loading }: TransactionDataTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { categories } = useSettings();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [category, setCategory] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [account, setAccount] = useState<string>('all');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      let tDate;
      if (t.date && typeof (t.date as any).toDate === 'function') {
        tDate = (t.date as any).toDate();
      } else {
        tDate = new Date(t.date as any);
      }
      
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
    try {
      await deleteDoc(doc(firestore, 'users', user.uid, 'transactions', transactionToDelete));
      toast({
        title: '¡Éxito!',
        description: 'La transacción ha sido eliminada.',
      });
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar la transacción. Inténtalo de nuevo.',
      });
      console.error("Error deleting transaction: ", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const columns = getColumns(handleEdit, handleDelete);


  return (
    <>
      <Card className="shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>Transacciones Recientes</CardTitle>
              <CardDescription>Consulta y gestiona tus movimientos financieros.</CardDescription>
            </div>
            <AddTransactionDialog />
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
                      {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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
                    <TableHead key={column.accessor.toString()} className={column.className}>{column.header}</TableHead>
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
                      No se encontraron transacciones. Comienza agregando una.
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
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la transacción de tus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
