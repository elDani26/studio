'use client';

import { StatCards } from '@/components/dashboard/stat-cards';
import { ExpenseChart } from '@/components/dashboard/expense-chart';
import { AiSummary } from '@/components/dashboard/ai-summary';
import { TransactionDataTable } from '@/components/dashboard/transaction-data-table';
import type { Transaction } from '@/types';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
  }, [user, firestore]);

  useEffect(() => {
    if (!transactionsQuery) {
      setLoading(false);
      return;
    };

    setLoading(true);
    const unsubscribe = onSnapshot(transactionsQuery, (querySnapshot) => {
      const userTransactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as any).toDate(),
      })) as Transaction[];
      setTransactions(userTransactions);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [transactionsQuery]);


  return (
    <div className="p-4 md:p-8 space-y-8">
      <StatCards transactions={transactions} />
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-3">
           <ExpenseChart transactions={transactions} />
        </div>
        <div className="lg:col-span-2">
            <AiSummary transactions={transactions} />
        </div>
      </div>
      <TransactionDataTable initialTransactions={transactions} />
    </div>
  );
}
