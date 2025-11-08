'use client';

import { type Timestamp } from 'firebase/firestore';

export type WithId<T> = T & { id: string };

export type Transaction = {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  category: string; 
  amount: number;
  date: Timestamp;
  description?: string;
  account: string; 
  transferId?: string; 
  isCreditCardExpense?: boolean; // Nuevo campo
  paymentFor?: string; // ID de la tarjeta de crédito que se está pagando
};

export type TransactionFormData = {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: Date;
  description?: string;
  account?: string;
  isCreditCardExpense?: boolean;
};

export type User = {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    currency?: string;
    hasCreditCard?: boolean;
};

export interface Category {
  name: string;
  icon: string;
  type: 'income' | 'expense';
}

export interface SourceAccount {
  name: string;
  icon: string;
  type: 'debit' | 'credit';
}
