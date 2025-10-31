'use client';

import type { Transaction } from '@/types';
import { TRANSACTION_CATEGORIES, SOURCE_ACCOUNTS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Column<T> {
  header: string;
  accessor: keyof T | 'categoryIcon';
  cell: (item: T) => React.ReactNode;
  className?: string;
}

const TransactionCell = ({ transaction }: { transaction: Transaction }) => {
  const categoryInfo = TRANSACTION_CATEGORIES.find(c => c.value === transaction.category);
  const accountInfo = SOURCE_ACCOUNTS.find(a => a.value === transaction.account);
  const Icon = transaction.type === 'income' ? ArrowUp : ArrowDown;
  const iconColor = transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
  const CategoryIcon = categoryInfo?.icon;
  
  return (
    <div className="flex items-center gap-3">
       <div className={`rounded-full p-2 ${iconColor}`}>
        {CategoryIcon ? <CategoryIcon className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
      </div>
      <div>
        <div className="font-medium">{categoryInfo?.label || transaction.category}</div>
        <div className="text-sm text-muted-foreground">{transaction.description || "Sin descripción"}</div>
      </div>
    </div>
  );
};

const AmountCell = ({ type, amount }: { type: 'income' | 'expense'; amount: number }) => {
  const isIncome = type === 'income';
  const color = isIncome ? 'text-green-600' : 'text-red-600';
  const sign = isIncome ? '+' : '-';
  const formattedAmount = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);

  return <div className={`font-semibold ${color}`}>{`${sign}${formattedAmount}`}</div>;
};

const DateCell = ({ date }: { date: any }) => {
    const formattedDate = format(new Date(date), "dd MMM, yyyy", { locale: es });
    return <div className="text-muted-foreground">{formattedDate}</div>;
}

const AccountCell = ({ account }: { account?: string }) => {
    const accountInfo = SOURCE_ACCOUNTS.find(a => a.value === account);
    return <div className="text-muted-foreground">{accountInfo?.label || account || ''}</div>
}


export const columns: Column<Transaction>[] = [
  {
    header: 'Descripción',
    accessor: 'category',
    cell: (item) => <TransactionCell transaction={item} />,
    className: 'w-[300px]',
  },
  {
    header: 'Fecha',
    accessor: 'date',
    cell: (item) => <DateCell date={item.date} />,
    className: 'text-left',
  },
  {
    header: 'Cuenta',
    accessor: 'account',
    cell: (item) => <AccountCell account={item.account} />,
    className: 'text-left',
  },
  {
    header: 'Monto',
    accessor: 'amount',
    cell: (item) => <AmountCell type={item.type} amount={item.amount} />,
    className: 'text-right font-bold',
  },
];
