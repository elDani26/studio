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
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('SettingsDialog');
  const tMisc = useTranslations('misc');

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency);

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountIcon, setNewAccountIcon] = useState('Landmark');
  const [newAccountType, setNewAccountType] = useState<'debit' | 'credit'>('debit');
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');
  const [newCategoryIcon, setNewCategoryIcon] = useState('ShoppingBasket');

  const [editingItem, setEditingItem] = useState<{id: string, name: string, icon: string, type: 'account' | 'category'} | null>(null);

  const handleSaveCurrency = () => {
    setCurrency(selectedCurrency);
    toast({
      title: t('currencySuccessToast'),
      description: t('currencySuccessDescription'),
    });
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return;
    await addAccount({ name: newAccountName, icon: newAccountIcon, type: newAccountType });
    setNewAccountName('');
    setNewAccountIcon('Landmark');
    setNewAccountType('debit');
    toast({ title: t('accountAddedToast') });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory({ name: newCategoryName, type: newCategoryType, icon: newCategoryIcon });
    setNewCategoryName('');
    setNewCategoryType('expense');
    setNewCategoryIcon('ShoppingBasket');
    toast({ title: t('categoryAddedToast') });
  };
  
  const handleStartEdit = (item: {id: string, name: string, icon: string}, type: 'account' | 'category') => {
    setEditingItem({ ...item, type });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    if (editingItem.type === 'account') {
        const originalAccount = accounts.find(a => a.id === editingItem.id);
        if (originalAccount) {
            await updateAccount(editingItem.id, { name: editingItem.name, icon: editingItem.icon, type: originalAccount.type });
        }
        toast({ title: t('accountUpdatedToast') });
    } else {
        const originalCategory = categories.find(c => c.id === editingItem.id);
        if (originalCategory) {
            await updateCategory(editingItem.id, { name: editingItem.name, icon: editingItem.icon, type: originalCategory.type });
        }
        toast({ title: t('categoryUpdatedToast') });
    }
    setEditingItem(null);
  };


  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">{t('title')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="general">{t('generalTab')}</TabsTrigger>
            <TabsTrigger value="accounts">{t('accountsTab')}</TabsTrigger>
            <TabsTrigger value="categories">{t('categoriesTab')}</TabsTrigger>
          </TabsList>

          <div className="flex-grow overflow-y-auto mt-4 pr-4">
              <TabsContent value="general">
                <div className="space-y-6 py-4">
                  <div>
                    <h3 className="text-lg font-medium">{t('currencySectionTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('currencySectionDescription')}
                    </p>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="currency" className="text-right">
                      {t('currencyLabel')}
                    </Label>
                    <Select
                      value={selectedCurrency}
                      onValueChange={(value) => setSelectedCurrency(value as Currency)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder={t('selectCurrency')} />
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
                        <h3 className="text-lg font-medium">{t('accountsSectionTitle')}</h3>
                        <p className="text-sm text-muted-foreground">
                        {t('accountsSectionDescription')}
                        </p>
                    </div>
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input placeholder={t('newAccountPlaceholder')} value={newAccountName} onChange={e => setNewAccountName(e.target.value)} />
                                <div className="flex gap-2">
                                  <Select value={newAccountType} onValueChange={(v) => setNewAccountType(v as any)}>
                                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="debit">{tMisc('debit')}</SelectItem>
                                      <SelectItem value="credit">{tMisc('credit')}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Select value={newAccountIcon} onValueChange={setNewAccountIcon}>
                                      <SelectTrigger className="w-full sm:w-[180px]">
                                          <SelectValue placeholder={t('icon')} />
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
                          const typeColor = account.type === 'debit' ? 'text-blue-500' : 'text-orange-500';
                          return (
                              <Card key={account.id}>
                                  <CardContent className="p-3 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <Icon className={`h-5 w-5 ${typeColor}`}/>
                                          <div>
                                              <p>{account.name}</p>
                                              <p className={`text-xs ${typeColor}`}>{account.type === 'debit' ? tMisc('debit') : tMisc('credit')}</p>
                                          </div>
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
                        <h3 className="text-lg font-medium">{t('categoriesSectionTitle')}</h3>
                        <p className="text-sm text-muted-foreground">
                        {t('categoriesSectionDescription')}
                        </p>
                    </div>
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input placeholder={t('newCategoryPlaceholder')} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                                <div className="flex gap-2">
                                  <Select value={newCategoryType} onValueChange={(v) => setNewCategoryType(v as any)}>
                                      <SelectTrigger className="w-[120px]">
                                          <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="expense">{t('expense')}</SelectItem>
                                          <SelectItem value="income">{t('income')}</SelectItem>
                                      </SelectContent>
                                  </Select>
                                  <Select value={newCategoryIcon} onValueChange={setNewCategoryIcon}>
                                      <SelectTrigger className="w-[180px]">
                                          <SelectValue placeholder={t('icon')} />
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
                                              <p className={`text-xs ${typeColor}`}>{category.type === 'income' ? t('income') : t('expense')}</p>
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
            {t('closeButton')}
          </Button>
          <Button onClick={handleSaveCurrency}>{t('saveCurrencyButton')}</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>

    {/* Edit Dialog */}
    <Dialog open={!!editingItem} onOpenChange={(isOpen) => !isOpen && setEditingItem(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingItem?.type === 'account' ? t('editAccountTitle') : t('editCategoryTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>{t('nameLabel')}</Label>
                    <Input value={editingItem?.name} onChange={e => setEditingItem(prev => prev ? {...prev, name: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                    <Label>{t('icon')}</Label>
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
                <Button variant="outline" onClick={() => setEditingItem(null)}>{t('cancelButton')}</Button>
                <Button onClick={handleSaveEdit}>{t('saveButton')}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
