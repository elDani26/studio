import { Car, ShoppingBasket, Home, HeartPulse, ShoppingBag, Briefcase, MoreHorizontal, Ticket, Coins, Clapperboard, Landmark, CreditCard, Wallet } from 'lucide-react';

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

export const SOURCE_ACCOUNTS = [
    { value: 'bank', label: 'Cuenta de Banco', icon: Landmark },
    { value: 'credit_card', label: 'Tarjeta de Crédito', icon: CreditCard },
    { value: 'cash', label: 'Efectivo', icon: Wallet },
    { value: 'other', label: 'Otro', icon: MoreHorizontal },
];
