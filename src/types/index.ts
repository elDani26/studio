import { type Timestamp } from 'firebase/firestore';

export type WithId<T> = T & { id: string };

export type Transaction = {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  category: string; // This will now be the ID of the category document
  amount: number;
  date: Timestamp;
  description?: string;
  account: string; // This will now be the ID of the sourceAccount document
};

export type TransactionFormData = {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: Date;
  description?: string;
  account?: string;
};

export type User = {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    currency?: string;
};

export interface Category {
  name: string;
  icon: string;
  type: 'income' | 'expense';
}

export interface SourceAccount {
  name: string;
  icon: string;
}
