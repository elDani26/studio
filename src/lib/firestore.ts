'use server';

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  doc,
  getFirestore,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { Transaction, TransactionFormData } from '@/types';

export async function addTransaction(
  userId: string,
  transactionData: TransactionFormData
) {
  const { firestore } = initializeFirebase();
  try {
    await addDoc(collection(firestore, 'users', userId, 'transactions'), {
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
  const { firestore } = initializeFirebase();
  try {
    const q = query(
      collection(firestore, 'users', userId, 'transactions'),
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
