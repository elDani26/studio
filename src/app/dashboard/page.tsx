import { getTransactions } from '@/lib/firestore';
import { auth } from '@/lib/firebase';
import { StatCards } from '@/components/dashboard/stat-cards';
import { ExpenseChart } from '@/components/dashboard/expense-chart';
import { AiSummary } from '@/components/dashboard/ai-summary';
import { TransactionDataTable } from '@/components/dashboard/transaction-data-table';
import type { Transaction } from '@/types';

// Helper to convert Firestore Timestamps to JSON-serializable format
const serializeTransactions = (transactions: Transaction[]): any[] => {
  return transactions.map(t => ({
    ...t,
    date: t.date.toDate().toISOString(),
  }));
};

const deserializeTransactions = (transactions: any[]): Transaction[] => {
    return transactions.map(t => ({
      ...t,
      date: new Date(t.date),
    }));
};

export default async function DashboardPage() {
  // This is a server component, but Firebase Auth state is client-side.
  // The layout ensures user is logged in. We can assume auth.currentUser is available on client.
  // For server-side data fetching, we need a way to get the user ID.
  // In a real app with server-side sessions, we'd get the user ID here.
  // For this demo, we will fetch data on the client side.
  // Let's pass an empty array and let the client handle it.
  const initialTransactions: Transaction[] = [];

  return (
    <div className="p-4 md:p-8 space-y-8">
      <StatCards transactions={initialTransactions} />
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-3">
           <ExpenseChart transactions={initialTransactions} />
        </div>
        <div className="lg:col-span-2">
            <AiSummary transactions={initialTransactions} />
        </div>
      </div>
      <TransactionDataTable initialTransactions={initialTransactions} />
    </div>
  );
}
