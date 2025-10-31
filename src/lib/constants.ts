import { Car, ShoppingBasket, Home, HeartPulse, ShoppingBag, Briefcase, MoreHorizontal, Ticket, Coins, Clapperboard } from 'lucide-react';

export const TRANSACTION_CATEGORIES = [
  { value: 'salary', label: 'Salario', icon: Briefcase },
  { value: 'food', label: 'Alimentación', icon: ShoppingBasket },
  { value: 'transport', label: 'Transporte', icon: Car },
  { value: 'entertainment', label: 'Entretenimiento', icon: Clapperboard },
  { value: 'housing', label: 'Vivienda', icon: Home },
  { value: 'health', label: 'Salud', icon: HeartPulse },
  { value: 'shopping', label: 'Compras', icon: ShoppingBag },
  { value: 'income', label: 'Ingresos', icon: Coins },
  { value: 'other', label: 'Otros', icon: MoreHorizontal },
];
