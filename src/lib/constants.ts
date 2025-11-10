import {
  Car, ShoppingBasket, Home, HeartPulse, ShoppingBag, Briefcase, MoreHorizontal, Ticket, Coins, Clapperboard, Landmark, CreditCard, Wallet, Building, Gift, Shirt, Utensils, Plane, BookOpen, PawPrint, ShieldCheck, FileText, Sparkles, Dumbbell, Newspaper, GraduationCap, PiggyBank, Handshake, Repeat, Scale, type LucideIcon
} from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  Car, ShoppingBasket, Home, HeartPulse, ShoppingBag, Briefcase, MoreHorizontal, Ticket, Coins, Clapperboard, Landmark, CreditCard, Wallet, Building, Gift, Shirt, Utensils, Plane, BookOpen, PawPrint, ShieldCheck, FileText, Sparkles, Dumbbell, Newspaper, GraduationCap, PiggyBank, Handshake, Repeat, Scale
};

export const TRANSACTION_CATEGORIES = [
  // Expenses
  { value: 'food', label: 'Alimentación', icon: 'ShoppingBasket', type: 'expense' },
  { value: 'transport', label: 'Transporte', icon: 'Car', type: 'expense' },
  { value: 'housing', label: 'Vivienda', icon: 'Home', type: 'expense' },
  { value: 'bills', label: 'Cuentas y Pagos', icon: 'Ticket', type: 'expense' },
  { value: 'entertainment', label: 'Entretenimiento', icon: 'Clapperboard', type: 'expense' },
  { value: 'health', label: 'Salud', icon: 'HeartPulse', type: 'expense' },
  { value: 'shopping', label: 'Compras', icon: 'ShoppingBag', type: 'expense' },
  { value: 'other_expenses', label: 'Otros', icon: 'MoreHorizontal', type: 'expense' },

  // Incomes
  { value: 'salary', label: 'Salario', icon: 'Briefcase', type: 'income' },
  { value: 'investments', label: 'Inversiones', icon: 'Building', type: 'income' },
  { value: 'gifts_received', label: 'Regalos Recibidos', icon: 'Gift', type: 'income' },
  { value: 'other_income', label: 'Otros', icon: 'Coins', type: 'income' },
];

export const SOURCE_ACCOUNTS = [
    { value: 'bank', label: 'Cuenta de Banco', icon: 'Landmark', type: 'debit' },
    { value: 'cash', label: 'Efectivo', icon: 'Wallet', type: 'debit' },
    { value: 'credit_card_visa', label: 'Tarjeta de Crédito Visa', icon: 'CreditCard', type: 'credit' },
    { value: 'credit_card_mastercard', label: 'Tarjeta de Crédito Mastercard', icon: 'CreditCard', type: 'credit' },
];
