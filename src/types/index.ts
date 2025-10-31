import { type Timestamp } from 'firebase/firestore';

export type Transaction = {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: Timestamp;
  description?: string;
  account?: string;
};

export type TransactionFormData = {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: Date;
  description?: string;
  account?: string;
};
