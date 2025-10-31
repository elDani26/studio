'use client';

import { useState } from 'react';
import { useSettings, type Category } from '@/context/settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as Icons from 'lucide-react';

const ALL_ICONS = Object.keys(Icons).filter(key => {
    const Component = (Icons as any)[key];
    return typeof Component === 'object' && Component.displayName;
});


export function CategoryManager() {
  const { categories, addCategory } = useSettings();
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');
  const [newCategoryIcon, setNewCategoryIcon] = useState<keyof typeof Icons>('MoreHorizontal');

  const handleAddCategory = () => {
    if (!newCategoryLabel.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El nombre de la categoría no puede estar vacío.',
      });
      return;
    }

    const newCategory: Category = {
      value: newCategoryLabel.toLowerCase().replace(/\s+/g, '_'),
      label: newCategoryLabel,
      icon: (Icons as any)[newCategoryIcon] || Icons.MoreHorizontal,
      type: newCategoryType,
    };

    addCategory(newCategory);
    setNewCategoryLabel('');
    toast({
      title: '¡Categoría agregada!',
      description: `La categoría "${newCategory.label}" ha sido creada.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Gestionar Categorías</h3>
        <p className="text-sm text-muted-foreground">
          Añade, edita o elimina tus categorías de ingresos y egresos.
        </p>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        <h4 className="font-medium">Agregar Nueva Categoría</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="category-name">Nombre</Label>
                <Input
                    id="category-name"
                    value={newCategoryLabel}
                    onChange={(e) => setNewCategoryLabel(e.target.value)}
                    placeholder="Ej: Comida Rápida"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="category-icon">Icono</Label>
                 <Select
                    value={newCategoryIcon}
                    onValueChange={(value) => setNewCategoryIcon(value as keyof typeof Icons)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un icono" />
                    </SelectTrigger>
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
            </div>
        </div>
        
        <div className="space-y-2">
          <Label>Tipo</Label>
          <RadioGroup
            value={newCategoryType}
            onValueChange={(value: 'income' | 'expense') => setNewCategoryType(value)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="income" id="income" />
              <Label htmlFor="income">Ingreso</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="expense" id="expense" />
              <Label htmlFor="expense">Egreso</Label>
            </div>
          </RadioGroup>
        </div>

        <Button onClick={handleAddCategory} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Categoría
        </Button>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Categorías Existentes</h4>
        <div className="max-h-60 overflow-y-auto rounded-md border">
          {categories.map((category) => (
            <div
              key={category.value}
              className="flex items-center justify-between p-2 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <category.icon className="h-4 w-4 text-muted-foreground" />
                <span>{category.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    category.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {category.type === 'income' ? 'Ingreso' : 'Egreso'}
                </span>
              </div>
               <div className="flex items-center">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pt-2">
          La edición y eliminación de categorías estará disponible próximamente.
        </p>
      </div>
    </div>
  );
}
