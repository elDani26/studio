'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useSettings } from '@/context/settings-context';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ICONS } from '@/lib/constants';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';

type Currency = 'EUR' | 'USD' | 'PEN' | 'COP';

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dólar Americano ($)' },
  { value: 'PEN', label: 'Sol Peruano (S/)' },
  { value: 'COP', label: 'Peso Colombiano ($)' },
];

export function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    currency, 
    setCurrency, 
    accounts, 
    categories,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    updateCategory,
    deleteCategory
  } = useSettings();

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency);

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountIcon, setNewAccountIcon] = useState('Landmark');
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');
  const [newCategoryIcon, setNewCategoryIcon] = useState('ShoppingBasket');

  const [editingItem, setEditingItem] = useState<{id: string, name: string, icon: string, type: 'account' | 'category'} | null>(null);

  const handleSaveCurrency = () => {
    setCurrency(selectedCurrency);
    toast({
      title: '¡Moneda Guardada!',
      description: 'Tu moneda principal ha sido actualizada.',
    });
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return;
    await addAccount({ name: newAccountName, icon: newAccountIcon });
    setNewAccountName('');
    setNewAccountIcon('Landmark');
    toast({ title: '¡Cuenta agregada!' });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory({ name: newCategoryName, type: newCategoryType, icon: newCategoryIcon });
    setNewCategoryName('');
    setNewCategoryType('expense');
    setNewCategoryIcon('ShoppingBasket');
    toast({ title: '¡Categoría agregada!' });
  };
  
  const handleStartEdit = (item: {id: string, name: string, icon: string}, type: 'account' | 'category') => {
    setEditingItem({ ...item, type });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    if (editingItem.type === 'account') {
        await updateAccount(editingItem.id, { name: editingItem.name, icon: editingItem.icon });
        toast({ title: '¡Cuenta actualizada!' });
    } else {
        // Here, we don't update the 'type' of the category as it's not editable in the modal
        const originalCategory = categories.find(c => c.id === editingItem.id);
        if (originalCategory) {
            await updateCategory(editingItem.id, { name: editingItem.name, icon: editingItem.icon, type: originalCategory.type });
        }
        toast({ title: '¡Categoría actualizada!' });
    }
    setEditingItem(null);
  };


  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Ajustes</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configuración</DialogTitle>
          <DialogDescription>
            Personaliza la configuración de tu aplicación, tus cuentas y categorías.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="accounts">Cuentas</TabsTrigger>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
          </TabsList>

          <div className="flex-grow overflow-y-auto mt-4 pr-4">
              <TabsContent value="general">
                <div className="space-y-6 py-4">
                  <div>
                    <h3 className="text-lg font-medium">Moneda</h3>
                    <p className="text-sm text-muted-foreground">
                      Selecciona la moneda principal para tus transacciones.
                    </p>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="currency" className="text-right">
                      Moneda
                    </Label>
                    <Select
                      value={selectedCurrency}
                      onValueChange={(value) => setSelectedCurrency(value as Currency)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecciona una moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="accounts">
                <div className="space-y-4 py-1 h-full flex flex-col">
                    <div>
                        <h3 className="text-lg font-medium">Tus Cuentas</h3>
                        <p className="text-sm text-muted-foreground">
                        Agrega y gestiona las cuentas que usas (ej. Nequi, Bancolombia, Efectivo).
                        </p>
                    </div>
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input placeholder="Nombre de la nueva cuenta" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} />
                                <div className="flex gap-2">
                                  <Select value={newAccountIcon} onValueChange={setNewAccountIcon}>
                                      <SelectTrigger className="w-full sm:w-[180px]">
                                          <SelectValue placeholder="Icono" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {Object.keys(ICONS).map(iconName => {
                                              const Icon = ICONS[iconName];
                                              return (
                                                  <SelectItem key={iconName} value={iconName}>
                                                      <div className='flex items-center gap-2'><Icon /> {iconName}</div>
                                                  </SelectItem>
                                              )
                                          })}
                                      </SelectContent>
                                  </Select>
                                  <Button size="icon" onClick={handleAddAccount}><PlusCircle /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="space-y-2">
                      {accounts.map(account => {
                          const Icon = ICONS[account.icon] || ICONS.MoreHorizontal;
                          return (
                              <Card key={account.id}>
                                  <CardContent className="p-3 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <Icon className="h-5 w-5 text-muted-foreground"/>
                                          <p>{account.name}</p>
                                      </div>
                                      <div className="flex items-center gap-1">
                                          <Button variant="ghost" size="icon" onClick={() => handleStartEdit(account, 'account')}><Edit className="h-4 w-4"/></Button>
                                          <Button variant="ghost" size="icon" onClick={() => deleteAccount(account.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                      </div>
                                  </CardContent>
                              </Card>
                          )
                      })}
                    </div>
                </div>
              </TabsContent>

              <TabsContent value="categories">
                <div className="space-y-4 py-1 h-full flex flex-col">
                    <div>
                        <h3 className="text-lg font-medium">Tus Categorías</h3>
                        <p className="text-sm text-muted-foreground">
                        Organiza tus ingresos y egresos con categorías personalizadas.
                        </p>
                    </div>
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input placeholder="Nombre de la categoría" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                                <div className="flex gap-2">
                                  <Select value={newCategoryType} onValueChange={(v) => setNewCategoryType(v as any)}>
                                      <SelectTrigger className="w-[120px]">
                                          <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="expense">Egreso</SelectItem>
                                          <SelectItem value="income">Ingreso</SelectItem>
                                      </SelectContent>
                                  </Select>
                                  <Select value={newCategoryIcon} onValueChange={setNewCategoryIcon}>
                                      <SelectTrigger className="w-[180px]">
                                          <SelectValue placeholder="Icono" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {Object.keys(ICONS).map(iconName => {
                                            const Icon = ICONS[iconName];
                                            return (
                                                <SelectItem key={iconName} value={iconName}>
                                                    <div className='flex items-center gap-2'><Icon /> {iconName}</div>
                                                </SelectItem>
                                            )
                                        })}
                                      </SelectContent>
                                  </Select>
                                  <Button size="icon" onClick={handleAddCategory}><PlusCircle /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="space-y-2">
                      {categories.map(category => {
                          const Icon = ICONS[category.icon] || ICONS.MoreHorizontal;
                            const typeColor = category.type === 'income' ? 'text-green-500' : 'text-red-500';
                          return (
                              <Card key={category.id}>
                                  <CardContent className="p-3 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <Icon className={`h-5 w-5 ${typeColor}`}/>
                                          <div>
                                              <p>{category.name}</p>
                                              <p className={`text-xs ${typeColor}`}>{category.type === 'income' ? 'Ingreso' : 'Egreso'}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleStartEdit(category, 'category')}><Edit className="h-4 w-4"/></Button>
                                          <Button variant="ghost" size="icon" onClick={() => deleteCategory(category.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                      </div>
                                  </CardContent>
                              </Card>
                          )
                      })}
                    </div>
                </div>
              </TabsContent>
          </div>
        </Tabs>
        
        <DialogFooter className="pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cerrar
          </Button>
          <Button onClick={handleSaveCurrency}>Guardar Moneda</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>

    {/* Edit Dialog */}
    <Dialog open={!!editingItem} onOpenChange={(isOpen) => !isOpen && setEditingItem(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar {editingItem?.type === 'account' ? 'Cuenta' : 'Categoría'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={editingItem?.name} onChange={e => setEditingItem(prev => prev ? {...prev, name: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                    <Label>Icono</Label>
                    <Select value={editingItem?.icon} onValueChange={val => setEditingItem(prev => prev ? {...prev, icon: val} : null)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                             {Object.keys(ICONS).map(iconName => {
                                const Icon = ICONS[iconName];
                                return (
                                    <SelectItem key={iconName} value={iconName}>
                                        <div className='flex items-center gap-2'><Icon /> {iconName}</div>
                                    </SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
                <Button onClick={handleSaveEdit}>Guardar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
