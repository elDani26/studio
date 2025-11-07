'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Scale, Calendar as CalendarIcon, X, CreditCard } from 'lucide-react';
import { ExpenseChart } from './expense-chart';
import { IncomeChart } from './income-chart';
import { useSettings } from '@/context/settings-context';
import { useTranslations, useLocale } from 'next-intl';
import { format, startOfDay, endOfDay } from 'date-fns';
import { getLocale } from '@/lib/utils';

interface StatCardsProps {
  transactions: Transaction[];
}

export function StatCards({ transactions }: StatCardsProps) {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [creditCardDebt, setCreditCardDebt] = useState(0);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { currency } = useSettings();
  const t = useTranslations('StatCards');
  const tMisc = useTranslations('misc');
  const tDatePicker = useTranslations('TransactionDataTable.datePicker');
  const locale = useLocale();
  const dateFnsLocale = getLocale(locale);

  useEffect(() => {
    // Total income is all transactions of type 'income' that are not transfers
    const income = transactions
      .filter(t => t.type === 'income' && !t.transferId)
      .reduce((acc, t) => acc + t.amount, 0);

    // Total expenses are REAL money out of debit accounts.
    // This includes expenses from debit accounts AND payments to credit cards.
    // It EXCLUDES expenses made with a credit card, as that money hasn't left yet.
    const expenses = transactions
      .filter(t => t.type === 'expense' && !t.transferId && !t.isCreditCardExpense)
      .reduce((acc, t) => acc + t.amount, 0);

    // Credit card debt is the sum of expenses made with a credit card...
    const debt = transactions
      .filter(t => t.isCreditCardExpense === true)
      .reduce((acc, t) => acc + t.amount, 0);

    // ...minus the sum of payments made to credit cards.
    const payments = transactions
      .filter(t => !!t.paymentFor)
      .reduce((acc, t) => acc + t.amount, 0);

    setTotalIncome(income);
    setTotalExpenses(expenses);
    setCreditCardDebt(debt - payments);
  }, [transactions]);
  
  const balance = totalIncome - totalExpenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };
  
  const clearDates = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const filteredChartTransactions = useMemo(() => {
    if (!dateFrom) {
      return transactions;
    }
    return transactions.filter(t => {
      let tDate;
      if (t.date && typeof (t.date as any).toDate === 'function') {
        tDate = (t.date as any).toDate();
      } else {
        tDate = new Date(t.date as any);
      }
      
      const fromDate = startOfDay(dateFrom);
      const toDate = dateTo ? endOfDay(dateTo) : endOfDay(dateFrom);
      return tDate >= fromDate && tDate <= toDate;
    });
  }, [transactions, dateFrom, dateTo]);


  return (
    <div className="grid gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tMisc('creditCardDebt')}</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(creditCardDebt)}</div>
          </CardContent>
        </Card>
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

      <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
        <span className="text-sm font-medium text-muted-foreground">{tDatePicker('placeholder')}:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={'outline'}
              className={cn(
                'w-full sm:w-auto justify-start text-left font-normal',
                !dateFrom && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, 'PPP', { locale: dateFnsLocale }) : <span>{tDatePicker('startDate')}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              locale={dateFnsLocale}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={'outline'}
              className={cn(
                'w-full sm:w-auto justify-start text-left font-normal',
                !dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, 'PPP', { locale: dateFnsLocale }) : <span>{tDatePicker('endDate')}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              locale={dateFnsLocale}
            />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && <Button variant="ghost" onClick={clearDates}><X className="mr-2 h-4 w-4"/>{tDatePicker('clearButton')}</Button>}
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
          <ExpenseChart transactions={filteredChartTransactions} />
          <IncomeChart transactions={filteredChartTransactions} />
      </div>
    </div>
  );
}
