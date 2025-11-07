'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, errorEmitter } from '@/firebase';
import { collection, writeBatch, Timestamp, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ICONS } from '@/lib/constants';
import { Calendar as CalendarIcon, Loader2, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useSettings } from '@/context/settings-context';
import { useTranslations, useLocale } from 'next-intl';
import { getLocale } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '@/types';

interface AddTransferDialogProps {
  transactions: Transaction[];
}

export function AddTransferDialog({ transactions }: AddTransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { accounts, currency } = useSettings();
  const t = useTranslations('AddTransferDialog');
  const tMisc = useTranslations('misc');
  const locale = useLocale();
  const dateFnsLocale = getLocale(locale);

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach(acc => balances[acc.id] = 0);

    transactions.forEach(t => {
      if (balances.hasOwnProperty(t.account)) {
        if (t.type === 'income') {
          balances[t.account] += t.amount;
        } else {
          balances[t.account] -= t.amount;
        }
      }
    });
    return balances;
  }, [transactions, accounts]);

  const transferSchema = useMemo(() => {
    return z.object({
      fromAccount: z.string().min(1, { message: 'Por favor, selecciona una cuenta de origen.' }),
      toAccount: z.string().min(1, { message: 'Por favor, selecciona una cuenta de destino.' }),
      amount: z.coerce.number().positive({ message: 'El monto debe ser positivo.' }),
      date: z.date({ required_error: 'Por favor, selecciona una fecha.' }),
      description: z.string().optional(),
    }).refine(data => data.fromAccount !== data.toAccount, {
      message: 'La cuenta de origen y destino no pueden ser la misma.',
      path: ['toAccount'],
    }).refine(data => {
      const fromAccount = accounts.find(a => a.id === data.fromAccount);
      if (fromAccount?.type === 'debit') {
        const balance = accountBalances[data.fromAccount] || 0;
        return data.amount <= balance;
      }
      return true;
    }, {
      message: 'El monto de la transferencia supera el saldo disponible en la cuenta de origen.',
      path: ['amount'],
    });
  }, [accounts, accountBalances]);

  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccount: '',
      toAccount: '',
      amount: 0,
      date: new Date(),
      description: '',
    },
  });
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);

  const onSubmit = async (values: z.infer<typeof transferSchema>) => {
    if (!user) return;
    setLoading(true);

    const transferId = uuidv4();
    const fromAccountName = accounts.find(a => a.id === values.fromAccount)?.name;
    const toAccountName = accounts.find(a => a.id === values.toAccount)?.name;
    const batch = writeBatch(firestore);
    
    const expenseTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
    const expenseTransaction = {
      userId: user.uid,
      type: 'expense',
      category: 'transfer',
      account: values.fromAccount,
      amount: values.amount,
      date: Timestamp.fromDate(values.date),
      description: `${values.description || ''} (${tMisc('transferTo')} ${toAccountName})`.trim(),
      transferId: transferId,
    };
    batch.set(expenseTransactionRef, expenseTransaction);

    const incomeTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
    const incomeTransaction = {
        userId: user.uid,
        type: 'income',
        category: 'transfer',
        account: values.toAccount,
        amount: values.amount,
        date: Timestamp.fromDate(values.date),
        description: `${values.description || ''} (${tMisc('transferFrom')} ${fromAccountName})`.trim(),
        transferId: transferId,
    };
    batch.set(incomeTransactionRef, incomeTransaction);

    try {
        await batch.commit();
        toast({
          title: 'Success!',
          description: t('successToast'),
        });
        setOpen(false);
        form.reset();
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${user.uid}/transactions`,
            operation: 'create',
            requestResourceData: [expenseTransaction, incomeTransaction]
        }));
        toast({
            variant: 'destructive',
            title: 'Error',
            description: t('errorToast'),
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
            <Repeat className="mr-2 h-4 w-4" />
            {t('title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="fromAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fromAccount')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectAccount')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map(acc => {
                        const Icon = ICONS[acc.icon] || ICONS.MoreHorizontal;
                        const balance = accountBalances[acc.id];
                        const isDebit = acc.type === 'debit';
                        return (
                          <SelectItem key={acc.id} value={acc.id}>
                           <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                              {acc.name}
                            </div>
                            {isDebit && <span className="text-xs text-muted-foreground">{formatCurrency(balance)}</span>}
                          </div>
                        </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('toAccount')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectAccount')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map(acc => {
                        const Icon = ICONS[acc.icon] || ICONS.MoreHorizontal;
                        const balance = accountBalances[acc.id];
                        const isDebit = acc.type === 'debit';
                        return (
                          <SelectItem key={acc.id} value={acc.id}>
                           <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                              {acc.name}
                            </div>
                            {isDebit && <span className="text-xs text-muted-foreground">{formatCurrency(balance)}</span>}
                          </div>
                        </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('amount')}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('date')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP', { locale: dateFnsLocale }) : <span>{t('pickDate')}</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                        locale={dateFnsLocale}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('optionalDescription')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('descriptionPlaceholder')} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('transferButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
