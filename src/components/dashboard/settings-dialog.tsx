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
import { Settings } from 'lucide-react';
import { useSettings } from '@/context/settings-context';
import { toast } from '@/hooks/use-toast';

type Currency = 'EUR' | 'USD' | 'PEN' | 'COP';

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dólar Americano ($)' },
  { value: 'PEN', label: 'Sol Peruano (S/)' },
  { value: 'COP', label: 'Peso Colombiano ($)' },
];

export function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { currency, setCurrency } = useSettings();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency);

  const handleSave = () => {
    setCurrency(selectedCurrency);
    toast({
      title: '¡Guardado!',
      description: 'Tu configuración ha sido actualizada.',
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Ajustes</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configuración</DialogTitle>
          <DialogDescription>
            Personaliza la configuración de tu aplicación.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
        <DialogFooter>
          <Button onClick={handleSave}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
