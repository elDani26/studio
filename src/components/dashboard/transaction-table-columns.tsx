'use client';

import type { Transaction } from '@/types';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface Column<T> {
  header: string;
  accessor: keyof T | 'categoryIcon';
  cell: (item: T) => React.ReactNode;
  className?: string;
}

const CategoryCell = ({ category }: { category: string }) => {
  const categoryInfo = TRANSACTION_CATEGORIES.find(c => c.value === category);
  const Icon = categoryInfo?.icon;
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-6 w-6 text-muted-foreground p-1 bg-muted rounded-full" />}
      <span className="font-medium">{categoryInfo?.label || category}</span>
    </div>
  );
};

const AmountCell = ({ type, amount }: { type: 'income' | 'expense'; amount: number }) => {
  const isIncome = type === 'income';
  const color = isIncome ? 'text-green-600' : 'text-red-600';
  const sign = isIncome ? '+' : '-';
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  return <div className={`font-semibold ${color}`}>{`${sign} ${formattedAmount}`}</div>;
};

export const columns: Column<Transaction>[] = [
  {
    header: 'Transaction',
    accessor: 'category',
    cell: (item) => <CategoryCell category={item.category} />,
    className: 'w-[250px]',
  },
  {
    header: 'Amount',
    accessor: 'amount',
    cell: (item) => <AmountCell type={item.type} amount={item.amount} />,
    className: 'text-right',
  },
  {
    header: 'Type',
    accessor: 'type',
    cell: (item) => <Badge variant={item.type === 'income' ? 'default': 'secondary'} className={`capitalize ${item.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.type}</Badge>,
  },
  {
    header: 'Account',
    accessor: 'account',
    cell: (item) => item.account || <span className="text-muted-foreground">N/A</span>,
  },
  {
    header: 'Date',
    accessor: 'date',
    cell: (item) => new Date(item.date as any).toLocaleDateString(),
    className: 'hidden md:table-cell',
  },
];
