import {
  Car, ShoppingBasket, Home, HeartPulse, ShoppingBag, Briefcase, MoreHorizontal, Ticket, Coins, Clapperboard, Landmark, CreditCard, Wallet, Building, Gift, Shirt, Utensils, Plane, BookOpen, PawPrint, ShieldCheck, FileText, Sparkles, Dumbbell, Newspaper, type LucideIcon
} from 'lucide-react';
import type { Category } from '@/context/settings-context';

export const ICONS: Record<string, LucideIcon> = {
  Car, ShoppingBasket, Home, HeartPulse, ShoppingBag, Briefcase, MoreHorizontal, Ticket, Coins, Clapperboard, Landmark, CreditCard, Wallet, Building, Gift, Shirt, Utensils, Plane, BookOpen, PawPrint, ShieldCheck, FileText, Sparkles, Dumbbell, Newspaper
};

export const TRANSACTION_CATEGORIES: Category[] = [
  // Expenses
  { value: 'food', label: 'Alimentación', icon: 'ShoppingBasket', type: 'expense' },
  { value: 'transport', label: 'Transporte', icon: 'Car', type: 'expense' },
  { value: 'housing', label: 'Vivienda', icon: 'Home', type: 'expense' },
  { value: 'bills', label: 'Cuentas y Pagos', icon: 'Ticket', type: 'expense' },
  { value: 'entertainment', label: 'Entretenimiento', icon: 'Clapperboard', type: 'expense' },
  { value: 'health', label: 'Salud', icon: 'HeartPulse', type: 'expense' },
  { value: 'shopping', label: 'Compras', icon: 'ShoppingBag', type: 'expense' },
  { value: 'clothing', label: 'Ropa', icon: 'Shirt', type: 'expense' },
  { value: 'restaurants', label: 'Restaurantes', icon: 'Utensils', type: 'expense' },
  { value: 'travel', label: 'Viajes', icon: 'Plane', type: 'expense' },
  { value: 'education', label: 'Educación', icon: 'BookOpen', type: 'expense' },
  { value: 'pets', label: 'Mascotas', icon: 'PawPrint', type: 'expense' },
  { value: 'insurance', label: 'Seguros', icon: 'ShieldCheck', type: 'expense' },
  { value: 'taxes', label: 'Impuestos', icon: 'FileText', type: 'expense' },
  { value: 'personal_care', label: 'Cuidado Personal', icon: 'Sparkles', type: 'expense' },
  { value: 'fitness', label: 'Gimnasio/Fitness', icon: 'Dumbbell', type: 'expense' },
  { value: 'subscriptions', label: 'Suscripciones', icon: 'Newspaper', type: 'expense' },
  { value: 'gifts_sent', label: 'Regalos Hechos', icon: 'Gift', type: 'expense' },
  { value: 'other_expenses', label: 'Otros Egresos', icon: 'MoreHorizontal', type: 'expense' },

  // Incomes
  { value: 'salary', label: 'Salario', icon: 'Briefcase', type: 'income' },
  { value: 'investments', label: 'Inversiones', icon: 'Building', type: 'income' },
  { value: 'freelance', label: 'Freelance', icon: 'Briefcase', type: 'income' },
  { value: 'business', label: 'Negocio', icon: 'Building', type: 'income' },
  { value: 'rental_income', label: 'Ingresos por Alquiler', icon: 'Home', type: 'income' },
  { value: 'gifts_received', label: 'Regalos Recibidos', icon: 'Gift', type: 'income' },
  { value: 'other_income', label: 'Otros Ingresos', icon: 'Coins', type: 'income' },
];

export const SOURCE_ACCOUNTS = [
    { value: 'bank', label: 'Cuenta de Banco', icon: Landmark },
    { value: 'credit_card', label: 'Tarjeta de Crédito', icon: CreditCard },
    { value: 'cash', label: 'Efectivo', icon: Wallet },
    { value: 'other', label: 'Otro', icon: MoreHorizontal },
];
