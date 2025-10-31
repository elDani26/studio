'use server';

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Transaction, TransactionFormData } from '@/types';

export async function addTransaction(
  userId: string,
  transactionData: TransactionFormData
) {
  try {
    await addDoc(collection(db, 'transactions'), {
      ...transactionData,
      userId,
      date: Timestamp.fromDate(transactionData.date),
    });
  } catch (error) {
    console.error('Error adding transaction: ', error);
    throw new Error('Failed to add transaction.');
  }
}

export async function getTransactions(userId: string): Promise<Transaction[]> {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const transactions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[];
    return transactions;
  } catch (error) {
    console.error('Error getting transactions: ', error);
    return [];
  }
}
