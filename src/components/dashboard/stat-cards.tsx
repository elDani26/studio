'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, Scale, CreditCard, Eye, EyeOff } from 'lucide-react';
import { useSettings } from '@/context/settings-context';
import { useTranslations } from 'next-intl';

interface StatCardsProps {
  transactions: Transaction[];
}

export function StatCards({ transactions }: StatCardsProps) {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [creditCardDebt, setCreditCardDebt] = useState(0);
  const [showBalances, setShowBalances] = useState(true);

  const { currency, hasCreditCard } = useSettings();
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

  const formatCurrency = (amount: number) => {
    if (!showBalances) {
      return <span className="text-2xl font-semibold">••••••</span>;
    }
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };
  
  const gridCols = hasCreditCard ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <div className="space-y-4">
       <div className="flex justify-end">
            <Button variant="ghost" size="icon" onClick={() => setShowBalances(!showBalances)}>
                {showBalances ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                <span className="sr-only">{showBalances ? "Ocultar saldos" : "Mostrar saldos"}</span>
            </Button>
        </div>
      <div className={`grid gap-4 md:grid-cols-2 ${gridCols}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalIncome')}</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalExpenses')}</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        {hasCreditCard && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tMisc('creditCardDebt')}</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{formatCurrency(creditCardDebt)}</div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('currentBalance')}</CardTitle>
            <Scale className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
