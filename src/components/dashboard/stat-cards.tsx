'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, Scale, CreditCard, Eye, EyeOff } from 'lucide-react';
import { useSettings } from '@/context/settings-context';
import { useTranslations } from 'next-intl';

const StatCard = ({
  title,
  value,
  icon: Icon,
  colorClass,
  isVisible,
  onToggleVisibility
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
}) => {
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-x-1">
          <Icon className={`h-4 w-4 ${colorClass}`} />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleVisibility}>
            {isVisible ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl lg:text-xl xl:text-2xl font-bold ${colorClass} leading-tight`}>{formatCurrency(value)}</div>
      </CardContent>
    </Card>
  );
}

interface StatCardsProps {
  transactions: Transaction[];
}

export function StatCards({ transactions }: StatCardsProps) {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [creditCardDebt, setCreditCardDebt] = useState(0);

  const { hasCreditCard, cardsVisibility, updateCardsVisibility } = useSettings();
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
  
  const toggleVisibility = (key: string) => {
    const newVisibility = { ...cardsVisibility, [key]: !cardsVisibility[key] };
    updateCardsVisibility(newVisibility);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatCard 
        title={t('totalIncome')} 
        value={totalIncome} 
        icon={ArrowUp} 
        colorClass="text-green-500" 
        isVisible={cardsVisibility.totalIncome}
        onToggleVisibility={() => toggleVisibility('totalIncome')}
      />
      <StatCard 
        title={t('totalExpenses')} 
        value={totalExpenses} 
        icon={ArrowDown} 
        colorClass="text-red-500"
        isVisible={cardsVisibility.totalExpenses}
        onToggleVisibility={() => toggleVisibility('totalExpenses')}
      />
      {hasCreditCard && (
        <StatCard 
          title={tMisc('creditCardDebt')} 
          value={creditCardDebt} 
          icon={CreditCard} 
          colorClass="text-orange-500"
          isVisible={cardsVisibility.creditCardDebt}
          onToggleVisibility={() => toggleVisibility('creditCardDebt')}
        />
      )}
      <StatCard 
        title={t('currentBalance')} 
        value={balance} 
        icon={Scale} 
        colorClass={balance >= 0 ? 'text-blue-500' : 'text-red-500'}
        isVisible={cardsVisibility.currentBalance}
        onToggleVisibility={() => toggleVisibility('currentBalance')}
      />
    </div>
  );
}
