'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore } from '@/firebase';
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
import { SOURCE_ACCOUNTS, ICONS } from '@/lib/constants';
import { Calendar as CalendarIcon, Loader2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useSettings } from '@/context/settings-context';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], { required_error: 'Por favor, selecciona un tipo de transacción.' }),
  amount: z.coerce.number().positive({ message: 'El monto debe ser positivo.' }),
  category: z.string().min(1, { message: 'Por favor, selecciona una categoría.' }),
  date: z.date({ required_error: 'Por favor, selecciona una fecha.' }),
  description: z.string().optional(),
  account: z.string().min(1, { message: 'Por favor, selecciona una cuenta.' }),
});

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { categories } = useSettings();

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
    return categories.filter(c => c.type === transactionType);
  }, [categories, transactionType]);

  useEffect(() => {
    form.setValue('category', '');
  }, [transactionType, form]);

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
          title: '¡Éxito!',
          description: 'Tu transacción ha sido agregada.',
        });
        setOpen(false);
        form.reset({
          type: 'expense',
          amount: 0,
          category: '',
          date: new Date(),
          description: '',
          account: '',
        });
      })
      .catch((error) => {
        console.error('Error adding transaction: ', error);
        const permissionError = new FirestorePermissionError({
            path: collectionRef.path,
            operation: 'create',
            requestResourceData: transactionData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo agregar la transacción. Inténtalo de nuevo.',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Transacción
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Nueva Transacción</DialogTitle>
          <DialogDescription>
            Completa los detalles para agregar un nuevo registro financiero.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipo de Transacción</FormLabel>
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
                        <FormLabel className="font-normal">Ingreso</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="expense" />
                        </FormControl>
                        <FormLabel className="font-normal">Egreso</FormLabel>
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
                  <FormLabel>Monto</FormLabel>
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
                  <FormLabel>Categoría</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map(cat => {
                        const Icon = ICONS[cat.icon] || ICONS.MoreHorizontal;
                        return (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center">
                              <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                              {cat.label}
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
                  <FormLabel>Fecha de Transacción</FormLabel>
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
                          {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Elige una fecha</span>}
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
                        locale={es}
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
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Supermercado" {...field} />
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
                  <FormLabel>Cuenta</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una cuenta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SOURCE_ACCOUNTS.map(acc => (
                        <SelectItem key={acc.value} value={acc.value}>
                           <div className="flex items-center">
                            <acc.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {acc.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agregar Transacción
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
