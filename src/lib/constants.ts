import { Car, ShoppingBasket, Home, HeartPulse, ShoppingBag, Briefcase, MoreHorizontal, Ticket, Coins } from 'lucide-react';

export const TRANSACTION_CATEGORIES = [
  { value: 'salary', label: 'Salary', icon: Briefcase },
  { value: 'food', label: 'Food', icon: ShoppingBasket },
  { value: 'transport', label: 'Transport', icon: Car },
  { value: 'entertainment', label: 'Entertainment', icon: Ticket },
  { value: 'housing', label: 'Housing', icon: Home },
  { value: 'health', label: 'Health', icon: HeartPulse },
  { value: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { value: 'income', label: 'Income', icon: Coins },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
];
