'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as Icons from 'lucide-react';
import { useSettings, type Category } from '@/context/settings-context';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ALL_ICONS = Object.keys(Icons).filter(key => {
    const Component = (Icons as any)[key];
    return typeof Component === 'object' && Component.displayName;
});

const getIconName = (IconComponent: React.ElementType): keyof typeof Icons | 'MoreHorizontal' => {
  for (const name in Icons) {
    if ((Icons as any)[name] === IconComponent) {
      return name as keyof typeof Icons;
    }
  }
  return 'MoreHorizontal';
};

const categorySchema = z.object({
  label: z.string().min(1, { message: 'El nombre de la categoría es requerido.' }),
  icon: z.string().min(1, { message: 'Por favor, selecciona un icono.' }),
});


interface EditCategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category: Category;
  onCategoryUpdated: () => void;
}

export function EditCategoryDialog({
  isOpen,
  onOpenChange,
  category,
  onCategoryUpdated,
}: EditCategoryDialogProps) {
  const { updateCategory } = useSettings();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
  });
  
  useEffect(() => {
    if (category) {
      form.reset({
        label: category.label,
        icon: getIconName(category.icon),
      });
    }
  }, [category, form]);

  const onSubmit = (values: z.infer<typeof categorySchema>) => {
    setLoading(true);
    
    try {
      const updatedCategoryData = {
        label: values.label,
        icon: (Icons as any)[values.icon as keyof typeof Icons] || Icons.MoreHorizontal,
      };

      updateCategory(category.value, updatedCategoryData);

      toast({
        title: '¡Categoría actualizada!',
        description: `La categoría "${values.label}" ha sido guardada.`,
      });
      onCategoryUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar la categoría.',
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Categoría</DialogTitle>
          <DialogDescription>
            Cambia el nombre o el icono de tu categoría. El tipo y el valor no se pueden cambiar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Categoría</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Comida" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icono</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un icono" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      {ALL_ICONS.map(iconName => {
                          const IconComponent = (Icons as any)[iconName];
                          return (
                              <SelectItem key={iconName} value={iconName}>
                                  <div className="flex items-center gap-2">
                                      <IconComponent className="h-4 w-4" />
                                      <span>{iconName}</span>
                                  </div>
                              </SelectItem>
                          )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
