'use client';

import { useEffect, useState } from 'react';
import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, Scale, CreditCard, Eye, EyeOff } from 'lucide-react';
import { useSettings } from '@/context/settings-context';
import { useTranslations } from 'next-intl';

interface StatCardsProps {
  transactions: Transaction[];
}

const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string; value: number; icon: React.ElementType; colorClass: string; }) => {
  const [isVisible, setIsVisible] = useState(true);
  const { currency } = useSettings();

  const formatCurrency = (amount: number) => {
    if (!isVisible) {
      return <span className="text-2xl sm:text-3xl font-semibold">••••••</span>;
    }
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-x-1">
          <Icon className={`h-4 w-4 ${colorClass}`} />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsVisible(!isVisible)}>
            {isVisible ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex items-end">
        <div className={`text-2xl lg:text-xl xl:text-2xl font-bold ${colorClass} leading-tight`}>{formatCurrency(value)}</div>
      </CardContent>
    </Card>
  );
}


export function StatCards({ transactions }: StatCardsProps) {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [creditCardDebt, setCreditCardDebt] = useState(0);

  const { hasCreditCard } = useSettings();
  const t = useTranslations('StatCards');
  const tMisc = useTranslations('misc');

  useEffect(() => {
    const income = transactions
      .filter(t => t.type === 'income' && !t.transferId)
      .reduce((acc, t) => acc + t.amount, 0);

    const expenses = transactions
      .filter(t => 
        t.type === 'expense' && 
        !t.transferId &&
        !t.isCreditCardExpense
      )
      .reduce((acc, t) => acc + t.amount, 0);

    const debt = transactions
      .filter(t => t.isCreditCardExpense === true)
      .reduce((acc, t) => acc + t.amount, 0);

    const payments = transactions
      .filter(t => !!t.paymentFor)
      .reduce((acc, t) => acc + t.amount, 0);

    setTotalIncome(income);
    setTotalExpenses(expenses);
    setCreditCardDebt(debt - payments);
  }, [transactions]);
  
  const balance = totalIncome - totalExpenses;
  
  return (
    <div className="w-full space-y-4">
      <StatCard title={t('totalIncome')} value={totalIncome} icon={ArrowUp} colorClass="text-green-500" />
      <StatCard title={t('totalExpenses')} value={totalExpenses} icon={ArrowDown} colorClass="text-red-500" />
      {hasCreditCard && <StatCard title={tMisc('creditCardDebt')} value={creditCardDebt} icon={CreditCard} colorClass="text-orange-500" />}
      <StatCard title={t('currentBalance')} value={balance} icon={Scale} colorClass={balance >= 0 ? 'text-blue-500' : 'text-red-500'} />
    </div>
  );
}
