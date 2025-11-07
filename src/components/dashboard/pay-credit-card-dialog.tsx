'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, errorEmitter } from '@/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
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
import { Calendar as CalendarIcon, Loader2, HandCoins } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useSettings } from '@/context/settings-context';
import { useTranslations, useLocale } from 'next-intl';
import { getLocale } from '@/lib/utils';
import type { Transaction } from '@/types';

interface PayCreditCardDialogProps {
  transactions: Transaction[];
}

export function PayCreditCardDialog({ transactions }: PayCreditCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { accounts, currency } = useSettings();
  const t = useTranslations('PayCreditCardDialog');
  const tMisc = useTranslations('misc');
  const locale = useLocale();
  const dateFnsLocale = getLocale(locale);

  const debitAccounts = useMemo(() => accounts.filter(a => a.type === 'debit'), [accounts]);
  const creditAccounts = useMemo(() => accounts.filter(a => a.type === 'credit'), [accounts]);

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

  const creditCardDebts = useMemo(() => {
    const debts: Record<string, number> = {};
    creditAccounts.forEach(acc => debts[acc.id] = 0);
    
    transactions.forEach(t => {
      if (t.isCreditCardExpense && debts.hasOwnProperty(t.account)) {
        debts[t.account] += t.amount;
      }
      if (t.paymentFor && debts.hasOwnProperty(t.paymentFor)) {
         debts[t.paymentFor] -= t.amount;
      }
    });

    return debts;
  }, [transactions, creditAccounts]);
  
  const totalDebt = useMemo(() => Object.values(creditCardDebts).reduce((sum, debt) => sum + debt, 0), [creditCardDebts]);

  const creditAccountsWithDebt = useMemo(() => {
    return creditAccounts.filter(acc => creditCardDebts[acc.id] > 0);
  }, [creditAccounts, creditCardDebts]);

  const paymentSchema = useMemo(() => {
    return z.object({
      amount: z.coerce.number().positive({ message: 'El monto debe ser positivo.' }),
      date: z.date({ required_error: 'Por favor, selecciona una fecha.' }),
      fromAccount: z.string().min(1, { message: 'Selecciona la cuenta de origen (débito).' }),
      toAccount: z.string().min(1, { message: 'Selecciona la tarjeta de crédito a pagar.' }),
      description: z.string().optional(),
    }).refine(data => {
        const debt = creditCardDebts[data.toAccount] || 0;
        return data.amount <= debt;
    }, {
        message: 'El monto a pagar no puede ser mayor que la deuda de la tarjeta.',
        path: ['amount'],
    }).refine(data => {
        const balance = accountBalances[data.fromAccount] || 0;
        return data.amount <= balance;
    }, {
        message: 'El monto a pagar supera el saldo disponible en la cuenta de débito.',
        path: ['amount'],
    });
  }, [creditCardDebts, accountBalances]);

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      date: new Date(),
      fromAccount: '',
      toAccount: '',
      description: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (!user) return;
    setLoading(true);

    const paymentTransaction = {
      userId: user.uid,
      type: 'expense' as const,
      category: 'credit_card_payment', // You might want a dedicated category
      amount: values.amount,
      date: Timestamp.fromDate(values.date),
      account: values.fromAccount, // Egress from debit account
      paymentFor: values.toAccount, // Links the payment to the credit account
      description: values.description || `${t('paymentFor')} ${creditAccounts.find(c => c.id === values.toAccount)?.name}`,
    };

    const collectionRef = collection(firestore, 'users', user.uid, 'transactions');
    addDoc(collectionRef, paymentTransaction)
      .then(() => {
        toast({ title: t('successToast') });
        setOpen(false);
        form.reset();
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: collectionRef.path,
            operation: 'create',
            requestResourceData: paymentTransaction,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Error', description: t('errorToast') });
      })
      .finally(() => setLoading(false));
  };
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <HandCoins className="mr-2 h-4 w-4" />
          {t('title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-4">
          <div className="my-4 space-y-2">
              <h4 className="font-semibold">{t('debtSummary')}</h4>
              <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                  {creditAccounts.map(acc => (
                      creditCardDebts[acc.id] > 0 && (
                          <div key={acc.id} className="flex justify-between">
                              <span>{acc.name}:</span>
                              <span className="font-medium text-orange-500">{formatCurrency(creditCardDebts[acc.id])}</span>
                          </div>
                      )
                  ))}
                  <div className="flex justify-between font-bold border-t pt-1 mt-1">
                      <span>{t('totalDebt')}:</span>
                      <span className="text-orange-500">{formatCurrency(totalDebt)}</span>
                  </div>
              </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="toAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('toCreditCard')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t('selectCreditCard')} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {creditAccountsWithDebt.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            <div className="flex items-center justify-between w-full">
                              {acc.name}
                              <span className="text-xs text-muted-foreground">{formatCurrency(creditCardDebts[acc.id])}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fromAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fromAccount')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t('selectDebitAccount')} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {debitAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            <div className="flex items-center justify-between w-full">
                              {acc.name}
                              <span className="text-xs text-muted-foreground">{formatCurrency(accountBalances[acc.id])}</span>
                            </div>
                          </SelectItem>
                        ))}
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
                    <FormLabel>{t('amountToPay')}</FormLabel>
                    <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('paymentDate')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                            {field.value ? format(field.value, 'PPP', { locale: dateFnsLocale }) : <span>{tMisc('pickDate')}</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1900-01-01')} initialFocus locale={dateFnsLocale} />
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
                    <FormLabel>{tMisc('optionalDescription')}</FormLabel>
                    <FormControl><Input placeholder={tMisc('descriptionPlaceholder')} {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="sticky bottom-0 bg-background pt-4">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('payButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
