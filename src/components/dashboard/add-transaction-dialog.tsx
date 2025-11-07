'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { ICONS } from '@/lib/constants';
import { Calendar as CalendarIcon, Loader2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useSettings } from '@/context/settings-context';
import { useTranslations, useLocale } from 'next-intl';
import { getLocale } from '@/lib/utils';
import { Transaction } from '@/types';

interface AddTransactionDialogProps {
  transactions: Transaction[];
}


export function AddTransactionDialog({ transactions }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { categories, accounts, currency } = useSettings();
  const t = useTranslations('AddTransactionDialog');
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

  const transactionSchema = useMemo(() => {
    return z.object({
      type: z.enum(['income', 'expense'], { required_error: 'Por favor, selecciona un tipo de transacción.' }),
      amount: z.coerce.number().positive({ message: 'El monto debe ser positivo.' }),
      category: z.string().min(1, { message: 'Por favor, selecciona una categoría.' }),
      date: z.date({ required_error: 'Por favor, selecciona una fecha.' }),
      description: z.string().optional(),
      account: z.string().min(1, { message: 'Por favor, selecciona una cuenta.' }),
    }).refine(data => {
      const account = accounts.find(a => a.id === data.account);
      if (account?.type === 'debit' && data.type === 'expense') {
        const balance = accountBalances[data.account] || 0;
        return data.amount <= balance;
      }
      return true;
    }, {
      message: 'El monto supera el saldo disponible en esta cuenta.',
      path: ['amount'],
    });
  }, [accounts, accountBalances]);


  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      amount: 0,
      category: '',
      date: new Date(),
      description: '',
      account: '',
    },
  });
  
  const transactionType = form.watch('type');

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === transactionType && c.name.toLowerCase() !== 'transfer');
  }, [categories, transactionType]);


  useEffect(() => {
    const currentCategory = form.getValues('category');
    if (currentCategory && !filteredCategories.some(c => c.id === currentCategory)) {
        form.setValue('category', '');
    }
  }, [transactionType, form, filteredCategories]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);

  const onSubmit = async (values: z.infer<typeof transactionSchema>) => {
    if (!user) return;
    setLoading(true);

    const transactionData = {
        ...values,
        userId: user.uid,
        date: Timestamp.fromDate(values.date),
    };

    const collectionRef = collection(firestore, 'users', user.uid, 'transactions');
    
    addDoc(collectionRef, transactionData)
      .then(() => {
        toast({
          title: 'Success!',
          description: t('successToast'),
        });
        setOpen(false);
        form.reset();
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: collectionRef.path,
            operation: 'create',
            requestResourceData: transactionData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: t('errorToast'),
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
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
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{t('transactionType')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="income" />
                        </FormControl>
                        <FormLabel className="font-normal">{t('income')}</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="expense" />
                        </FormControl>
                        <FormLabel className="font-normal">{t('expense')}</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('category')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectCategory')} />
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
                    <Input placeholder={t('descriptionPlaceholder')} {...field} value={field.value ?? ''}/>
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
                  <FormLabel>{t('account')}</FormLabel>
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

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('addButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
