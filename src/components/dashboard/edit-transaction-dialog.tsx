'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, errorEmitter } from '@/firebase';
import { doc, updateDoc, Timestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Calendar as CalendarIcon, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/types';
import { FirestorePermissionError } from '@/firebase/errors';
import { useSettings } from '@/context/settings-context';
import { useTranslations, useLocale } from 'next-intl';
import { getLocale } from '@/lib/utils';

interface EditTransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  transaction: Transaction | null;
  onTransactionUpdated: () => void;
  allTransactions: Transaction[];
}

export function EditTransactionDialog({
  isOpen,
  onOpenChange,
  transaction,
  onTransactionUpdated,
  allTransactions,
}: EditTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | null>(null);

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { categories, accounts, currency } = useSettings();
  const t = useTranslations('EditTransactionDialog');
  const tAdd = useTranslations('AddTransactionDialog');
  const tPay = useTranslations('PayCreditCardDialog');
  const locale = useLocale();
  const dateFnsLocale = getLocale(locale);

  const isTransfer = useMemo(() => !!transaction?.transferId, [transaction]);
  const isPayment = useMemo(() => !!transaction?.paymentFor, [transaction]);

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach(acc => balances[acc.id] = 0);
    allTransactions.forEach(t => {
      if (balances.hasOwnProperty(t.account)) {
        if (t.type === 'income') balances[t.account] += t.amount;
        else balances[t.account] -= t.amount;
      }
    });
    return balances;
  }, [allTransactions, accounts]);

  const maxEditableAmount = useMemo(() => {
    if (!transaction) return 0;
    const balance = accountBalances[transaction.account] || 0;
    return balance + transaction.amount;
  }, [transaction, accountBalances]);


  const transactionSchema = useMemo(() => {
    return z.object({
      type: z.enum(['income', 'expense']),
      amount: z.coerce.number().positive(),
      category: z.string().min(1),
      date: z.date(),
      description: z.string().optional(),
      account: z.string().min(1),
      isCreditCardExpense: z.boolean().optional(),
      paymentFor: z.string().optional(),
    }).refine(data => {
        const selectedAccount = accounts.find(a => a.id === data.account);
        if (data.type === 'expense' && selectedAccount?.type === 'debit') {
            return data.amount <= maxEditableAmount;
        }
        return true;
      }, {
        message: 'El monto del egreso supera el saldo disponible en la cuenta.',
        path: ['amount'],
      });
  }, [accounts, maxEditableAmount]);


  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      amount: 0,
      category: '',
      date: new Date(),
      description: '',
      account: '',
      isCreditCardExpense: false,
      paymentFor: '',
    }
  });

  const filteredCategories = useMemo(() => {
    if (!transactionType) return [];
    return categories.filter(c => c.type === transactionType && c.name.toLowerCase() !== 'transfer' && c.name.toLowerCase() !== 'pago creditos');
  }, [categories, transactionType]);

  useEffect(() => {
    if (isOpen && transaction) {
      const type = transaction.type;
      setTransactionType(type);
      setStep(isTransfer || isPayment ? 2 : 1);
      
      let date;
      if (transaction.date && typeof (transaction.date as any).toDate === 'function') {
        date = (transaction.date as any).toDate();
      } else {
        date = new Date(transaction.date as any);
      }

      form.reset({
        ...transaction,
        date,
        description: transaction.description || '',
        paymentFor: transaction.paymentFor || '',
      });
    }
  }, [transaction, isOpen, form, isTransfer, isPayment]);

  const handleTypeSelect = (type: 'income' | 'expense') => {
    setTransactionType(type);
    form.setValue('type', type);
    if (type !== form.getValues('type')) {
      form.setValue('category', '');
      form.setValue('account', '');
    }
    setStep(2);
  };

  const availableAccounts = useMemo(() => {
    if (transactionType === 'income') {
      return accounts.filter(a => a.type === 'debit');
    }
    return accounts;
  }, [transactionType, accounts]);
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);


  const onSubmit = async (values: z.infer<typeof transactionSchema>) => {
    if (!user || !transaction) return;
    setLoading(true);

    try {
        const batch = writeBatch(firestore);
        
        const selectedAccount = accounts.find(a => a.id === values.account);
        const isCreditExpense = values.type === 'expense' && selectedAccount?.type === 'credit';
        
        let updates: any = {
            amount: values.amount,
            date: Timestamp.fromDate(values.date),
            description: values.description,
            account: values.account, 
            category: values.category, 
            type: values.type,
            isCreditCardExpense: isCreditExpense,
        };

        const mainDocRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);
        batch.update(mainDocRef, updates);
        
        await batch.commit();
        
        toast({
            title: 'Success!',
            description: t('successToast'),
        });
        onTransactionUpdated();
        onOpenChange(false);

    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${user.uid}/transactions`,
            operation: 'update',
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

  if (isTransfer || isPayment) {
    // A simplified form for transfers and payments as they are not fully editable
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                 <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>
                        Las transferencias y pagos de tarjeta solo pueden tener su monto y fecha editados.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(async (values) => {
                         if (!user || !transaction) return;
                         setLoading(true);
                         try {
                            const batch = writeBatch(firestore);
                            const updates = {
                                amount: values.amount,
                                date: Timestamp.fromDate(values.date),
                            };

                            if (transaction.transferId) {
                                const q = query(
                                    collection(firestore, 'users', user.uid, 'transactions'),
                                    where('transferId', '==', transaction.transferId)
                                );
                                const querySnapshot = await getDocs(q);
                                querySnapshot.forEach((doc) => {
                                    batch.update(doc.ref, updates);
                                });
                            } else {
                                const mainDocRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);
                                batch.update(mainDocRef, updates);
                            }
                            await batch.commit();
                            toast({ title: 'Success!', description: t('successToast') });
                            onTransactionUpdated();
                            onOpenChange(false);
                         } catch (e) {
                             toast({ variant: 'destructive', title: 'Error', description: t('errorToast') });
                         } finally {
                            setLoading(false);
                         }
                    })} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{tAdd('amount')}</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
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
                                <FormLabel>{tAdd('date')}</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={'outline'}
                                        className={cn('w-full pl-3 text-left font-normal',!field.value && 'text-muted-foreground')}>
                                        {field.value ? format(field.value, 'PPP', { locale: dateFnsLocale }) : <span>{tAdd('pickDate')}</span>}
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
                        <DialogFooter>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('saveButton')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center">
            {step === 2 && (
              <Button variant="ghost" size="icon" className="mr-2" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
                <DialogTitle>{t('title')}</DialogTitle>
                <DialogDescription>
                    {step === 1 ? tAdd('transactionType') : t('description')}
                </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 1 ? (
            <div className="flex-grow flex flex-col justify-center items-center gap-4 py-8">
                <Button onClick={() => handleTypeSelect('income')} className="w-48 h-16 text-lg bg-green-500 hover:bg-green-600">
                    {tAdd('income')}
                </Button>
                <Button onClick={() => handleTypeSelect('expense')} className="w-48 h-16 text-lg bg-red-500 hover:bg-red-600">
                    {tAdd('expense')}
                </Button>
            </div>
        ) : (
            <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{tAdd('amount')}</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{tAdd('category')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={tAdd('selectCategory')} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {filteredCategories.map(cat => {
                                const Icon = ICONS[cat.icon] || ICONS.MoreHorizontal;
                                return (
                                <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center">
                                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {cat.name}
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
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>{tAdd('date')}</FormLabel>
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
                                {field.value ? format(field.value, 'PPP', { locale: dateFnsLocale }) : <span>{tAdd('pickDate')}</span>}
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
                        <FormLabel>{tAdd('optionalDescription')}</FormLabel>
                        <FormControl>
                            <Input placeholder={tAdd('descriptionPlaceholder')} {...field} value={field.value ?? ''}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="account"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{tAdd('account')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={tAdd('selectAccount')} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {availableAccounts.map(acc => {
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

                    <DialogFooter className="pt-4 sticky bottom-0 bg-background">
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('saveButton')}
                    </Button>
                    </DialogFooter>
                </form>
                </Form>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
