'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, errorEmitter } from '@/firebase';
import { addDoc, collection, Timestamp, query, where, getDocs } from 'firebase/firestore';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useSettings } from '@/context/settings-context';
import { useTranslations } from 'next-intl';

interface AdjustBalanceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  accountBalances: Record<string, number>;
}

export function AdjustBalanceDialog({ isOpen, onOpenChange, accountBalances }: AdjustBalanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { accounts, categories, currency } = useSettings();
  const t = useTranslations('AdjustBalanceDialog');
  
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const adjustmentSchema = useMemo(() => {
    return z.object({
      accountId: z.string().min(1, { message: t('selectAccountError') }),
      actualBalance: z.coerce.number({invalid_type_error: t('invalidAmountError')}),
    });
  }, [t]);

  const form = useForm<z.infer<typeof adjustmentSchema>>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      accountId: '',
      actualBalance: 0,
    },
  });

  const registeredBalance = selectedAccount ? accountBalances[selectedAccount] || 0 : 0;
  const difference = selectedAccount ? form.watch('actualBalance') - registeredBalance : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
  };
  
  const getOrCreateAdjustmentCategory = async (): Promise<string> => {
    if (!user) throw new Error("User not found");
    const adjustmentCategoryName = t('adjustmentCategoryName');
    
    const existingCategory = categories.find(c => c.name === adjustmentCategoryName);
    if (existingCategory) return existingCategory.id;

    const categoriesColRef = collection(firestore, 'users', user.uid, 'categories');
    const q = query(categoriesColRef, where("name", "==", adjustmentCategoryName));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    }

    const newCategory = {
        name: adjustmentCategoryName,
        icon: 'Scale',
        type: 'expense' as 'expense', 
    };
    const docRef = await addDoc(categoriesColRef, newCategory);
    return docRef.id;
  }

  const onSubmit = async (values: z.infer<typeof adjustmentSchema>) => {
    if (!user || !selectedAccount) return;
    setLoading(true);

    const diff = values.actualBalance - registeredBalance;

    if (Math.abs(diff) < 0.01) { 
      toast({ title: t('noChangeToast') });
      setLoading(false);
      onOpenChange(false);
      return;
    }

    try {
        const adjustmentCategoryId = await getOrCreateAdjustmentCategory();

        const transactionType = diff > 0 ? 'income' : 'expense';
        const transactionAmount = Math.abs(diff);

        const newTransaction = {
            userId: user.uid,
            type: transactionType,
            amount: transactionAmount,
            category: adjustmentCategoryId,
            account: selectedAccount,
            date: Timestamp.now(),
            description: t('adjustmentDescription'),
        };
        
        const collectionRef = collection(firestore, 'users', user.uid, 'transactions');
        await addDoc(collectionRef, newTransaction);
        
        toast({ title: t('successToast') });
        onOpenChange(false);
        form.reset();
        setSelectedAccount(null);

    } catch (error) {
       const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}/transactions`,
            operation: 'create',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Error', description: t('errorToast') });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
            form.reset();
            setSelectedAccount(null);
        }
    }}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('selectAccountLabel')}</FormLabel>
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedAccount(value);
                            form.setValue('actualBalance', accountBalances[value] || 0);
                        }} 
                        value={field.value}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={t('selectAccountPlaceholder')} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {accounts.filter(a => a.type === 'debit').map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />

                {selectedAccount && (
                <>
                    <div className="space-y-2">
                        <FormLabel>{t('registeredBalanceLabel')}</FormLabel>
                        <Input readOnly value={formatCurrency(registeredBalance)} className="font-mono bg-muted" />
                    </div>
                    
                    <FormField
                    control={form.control}
                    name="actualBalance"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('actualBalanceLabel', { accountName: accounts.find(a => a.id === selectedAccount)?.name })}</FormLabel>
                        <FormControl>
                            <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <div className="p-3 bg-muted/50 rounded-md text-center">
                        <p className="text-sm text-muted-foreground">{t('differenceLabel')}</p>
                        <p className={`text-lg font-bold ${difference === 0 ? 'text-foreground' : difference > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(difference)}
                        </p>
                    </div>
                </>
                )}

                <DialogFooter className="pt-4 sticky bottom-0 bg-background">
                <Button type="submit" disabled={loading || !selectedAccount} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('saveButton')}
                </Button>
                </DialogFooter>
            </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
