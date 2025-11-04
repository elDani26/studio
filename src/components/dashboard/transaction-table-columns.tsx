'use client';

import type { Transaction } from '@/types';
import { ICONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { format } from 'date-fns';
import { useSettings } from '@/context/settings-context';
import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { getLocale } from '@/lib/utils';

interface Column<T> {
  header: string;
  accessor: keyof T | 'categoryIcon' | 'actions';
  cell: (item: T) => React.ReactNode;
  className?: string;
}

const TransactionCell = ({ transaction }: { transaction: Transaction }) => {
  const { categories } = useSettings();
  const t = useTranslations('TransactionTableColumns');
  const categoryInfo = categories.find(c => c.id === transaction.category);
  const Icon = transaction.type === 'income' ? ArrowUp : ArrowDown;
  const iconColor = transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
  const CategoryIcon = categoryInfo ? (ICONS[categoryInfo.icon] || ICONS.MoreHorizontal) : ICONS.MoreHorizontal;
  
  return (
    <div className="flex items-center gap-3">
       <div className={`rounded-full p-2 ${iconColor}`}>
        <CategoryIcon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-medium">{categoryInfo?.name || transaction.category}</div>
        <div className="text-sm text-muted-foreground">{transaction.description || t('noDescription')}</div>
      </div>
    </div>
  );
};

const AmountCell = ({ type, amount }: { type: 'income' | 'expense'; amount: number }) => {
  const { currency } = useSettings();
  const isIncome = type === 'income';
  const color = isIncome ? 'text-green-600' : 'text-red-600';
  const sign = isIncome ? '+' : '-';
  const formattedAmount = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
  }).format(amount);

  return <div className={`font-semibold ${color}`}>{`${sign}${formattedAmount}`}</div>;
};

const DateCell = ({ date }: { date: any }) => {
    const locale = useLocale();
    const dateFnsLocale = getLocale(locale);
    const t = useTranslations('misc');

    let dateObj: Date;
    if (date && typeof date.toDate === 'function') {
        dateObj = date.toDate();
    } else if (date) {
        dateObj = new Date(date);
    } else {
        return <div className="text-muted-foreground">{t('invalidDate')}</div>;
    }
    const formattedDate = format(dateObj, "dd MMM, yyyy", { locale: dateFnsLocale });
    return <div className="text-muted-foreground">{formattedDate}</div>;
}

const AccountCell = ({ accountId }: { accountId?: string }) => {
    const { accounts } = useSettings();
    const t = useTranslations('misc');
    const accountInfo = accounts.find(a => a.id === accountId);
    return <div className="text-muted-foreground">{accountInfo?.name || accountId || t('unknownAccount')}</div>
}


export const getColumns = (
    onEdit: (transaction: Transaction) => void,
    onDelete: (transactionId: string) => void
  ): Column<Transaction>[] => {
    const t = useTranslations('TransactionTableColumns');
    return [
      {
        header: t('description'),
        accessor: 'category',
        cell: (item) => <TransactionCell transaction={item} />,
        className: 'w-[300px]',
      },
      {
        header: t('date'),
        accessor: 'date',
        cell: (item) => <DateCell date={item.date} />,
        className: 'text-left',
      },
      {
        header: t('account'),
        accessor: 'account',
        cell: (item) => <AccountCell accountId={item.account} />,
        className: 'text-left',
      },
      {
        header: t('amount'),
        accessor: 'amount',
        cell: (item) => <AmountCell type={item.type} amount={item.amount} />,
        className: 'text-right font-bold',
      },
    ];
};
