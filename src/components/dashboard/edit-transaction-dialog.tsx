'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, errorEmitter } from '@/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { ICONS } from '@/lib/constants';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/types';
import { FirestorePermissionError } from '@/firebase/errors';
import { useSettings } from '@/context/settings-context';
import { useTranslations, useLocale } from 'next-intl';
import { getLocale } from '@/lib/utils';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive(),
  category: z.string().min(1),
  date: z.date(),
  description: z.string().optional(),
  account: z.string().min(1),
});

interface EditTransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  transaction: Transaction | null;
  onTransactionUpdated: () => void;
}

export function EditTransactionDialog({
  isOpen,
  onOpenChange,
  transaction,
  onTransactionUpdated,
}: EditTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { categories, accounts } = useSettings();
  const t = useTranslations('EditTransactionDialog');
  const tAdd = useTranslations('AddTransactionDialog');
  const locale = useLocale();
  const dateFnsLocale = getLocale(locale);

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
  });

  const transactionType = form.watch('type');

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === transactionType);
  }, [categories, transactionType]);


  useEffect(() => {
    if (transaction) {
      let date;
      if (transaction.date && typeof (transaction.date as any).toDate === 'function') {
        date = (transaction.date as any).toDate();
      } else {
        date = new Date(transaction.date as any);
      }
      form.reset({
        ...transaction,
        date,
      });
    }
  }, [transaction, isOpen, form]);

  useEffect(() => {
    if (transaction) {
      const currentCategoryValue = form.getValues('category');
      const isCategoryStillValid = filteredCategories.some(c => c.id === currentCategoryValue);

      if (!isCategoryStillValid) {
          form.setValue('category', '');
      }
    }
  }, [transactionType, filteredCategories, form, transaction]);


  const onSubmit = async (values: z.infer<typeof transactionSchema>) => {
    if (!user || !transaction) return;
    setLoading(true);

    const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);

    const transactionData = {
        ...values,
        date: Timestamp.fromDate(values.date),
    };

    updateDoc(transactionRef, transactionData)
        .then(() => {
            toast({
              title: 'Success!',
              description: t('successToast'),
            });
            onTransactionUpdated();
            onOpenChange(false);
        })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: transactionRef.path,
                operation: 'update',
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                  <FormLabel>{tAdd('transactionType')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="income" />
                        </FormControl>
                        <FormLabel className="font-normal">{tAdd('income')}</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="expense" />
                        </FormControl>
                        <FormLabel className="font-normal">{tAdd('expense')}</FormLabel>
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
                    <Input placeholder={tAdd('descriptionPlaceholder')} value={field.value ?? ''} />
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
                      {accounts.map(acc => {
                         const Icon = ICONS[acc.icon] || ICONS.MoreHorizontal;
                        return (
                          <SelectItem key={acc.id} value={acc.id}>
                           <div className="flex items-center">
                            <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {acc.name}
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
                {t('saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
