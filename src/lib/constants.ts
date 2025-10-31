import { Car, ShoppingBasket, Home, HeartPulse, ShoppingBag, Briefcase, MoreHorizontal, Ticket, Coins, Clapperboard, Landmark, CreditCard, Wallet, Building, Gift } from 'lucide-react';

export const TRANSACTION_CATEGORIES = [
  { value: 'food', label: 'Alimentación', icon: ShoppingBasket },
  { value: 'transport', label: 'Transporte', icon: Car },
  { value: 'housing', label: 'Vivienda', icon: Home },
  { value: 'bills', label: 'Cuentas y Pagos', icon: Ticket },
  { value: 'entertainment', label: 'Entretenimiento', icon: Clapperboard },
  { value: 'health', label: 'Salud', icon: HeartPulse },
  { value: 'shopping', label: 'Compras', icon: ShoppingBag },
  { value: 'salary', label: 'Salario', icon: Briefcase },
  { value: 'investments', label: 'Inversiones', icon: Building },
  { value: 'gifts', label: 'Regalos', icon: Gift },
  { value: 'income', label: 'Otros Ingresos', icon: Coins },
  { value: 'other', label: 'Otros', icon: MoreHorizontal },
];

export const SOURCE_ACCOUNTS = [
    { value: 'bank', label: 'Cuenta de Banco', icon: Landmark },
    { value: 'credit_card', label: 'Tarjeta de Crédito', icon: CreditCard },
    { value: 'cash', label: 'Efectivo', icon: Wallet },
    { value: 'other', label: 'Otro', icon: MoreHorizontal },
];
