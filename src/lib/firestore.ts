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
