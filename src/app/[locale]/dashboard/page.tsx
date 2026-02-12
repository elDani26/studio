'use client';

import { StatCards } from '@/components/dashboard/stat-cards';
import { AiSummary } from '@/components/dashboard/ai-summary';
import { TransactionDataTable } from '@/components/dashboard/transaction-data-table';
import type { Transaction } from '@/types';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useSettings } from '@/context/settings-context';
import { DebtChart } from '@/components/dashboard/debt-chart';
import { ExpenseChart } from '@/components/dashboard/expense-chart';
import { IncomeChart } from '@/components/dashboard/income-chart';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, X, PieChart as PieChartIcon, BarChartBig, LineChart as LineChartIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { getLocale } from '@/lib/utils';
import { LineChart, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, CartesianGrid, Line, XAxis, YAxis } from 'recharts';


export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasCreditCard, categories, accounts, currency } = useSettings();

  const [chartDateFrom, setChartDateFrom] = useState<Date | undefined>(subDays(new Date(), 7));
  const [chartDateTo, setChartDateTo] = useState<Date | undefined>(new Date());
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'line'>('pie');
  
  const tMisc = useTranslations('misc');
  const tDatePicker = useTranslations('TransactionDataTable.datePicker');
  const tDashboard = useTranslations('DashboardPage');
  const locale = useLocale();
  const dateFnsLocale = getLocale(locale);

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
      })) as Transaction[];
      setTransactions(userTransactions);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [transactionsQuery]);
  
  // --- Chart Data Calculation ---
  const chartTransactions = useMemo(() => {
    const fromDate = chartDateFrom ? startOfDay(chartDateFrom) : null;
    const toDate = chartDateTo ? endOfDay(chartDateTo) : null;

    if (!fromDate && !toDate) return transactions;

    return transactions.filter(t => {
      let tDate;
      if (t.date && typeof (t.date as any).toDate === 'function') {
        tDate = (t.date as any).toDate();
      } else {
        tDate = new Date(t.date as any);
      }
      return (!fromDate || tDate >= fromDate) && (!toDate || tDate <= toDate);
    });
  }, [transactions, chartDateFrom, chartDateTo]);

  const incomeChartData = useMemo(() => {
    const incomes = chartTransactions.filter(t => t.type === 'income' && !t.transferId);
    const incomeByCategory = incomes.reduce((acc, transaction) => {
      const categoryId = transaction.category;
      if (!acc[categoryId]) acc[categoryId] = 0;
      acc[categoryId] += transaction.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(incomeByCategory).map(categoryId => {
      const categoryInfo = categories.find(c => c.id === categoryId);
      return { name: categoryInfo?.name || categoryId, value: incomeByCategory[categoryId] };
    }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  }, [chartTransactions, categories]);

  const expenseChartData = useMemo(() => {
    const debitExpenses = chartTransactions.filter(t => t.type === 'expense' && !t.transferId && !t.isCreditCardExpense && !t.paymentFor);
    const creditCardPaymentsTotal = chartTransactions.filter(t => !!t.paymentFor).reduce((sum, t) => sum + t.amount, 0);

    const expenseByCategory = debitExpenses.reduce((acc, transaction) => {
      const categoryId = transaction.category;
      if (!acc[categoryId]) acc[categoryId] = 0;
      acc[categoryId] += transaction.amount;
      return acc;
    }, {} as Record<string, number>);

    const data = Object.keys(expenseByCategory).map(categoryId => {
      const categoryInfo = categories.find(c => c.id === categoryId);
      return { name: categoryInfo?.name || categoryId, value: expenseByCategory[categoryId] };
    });

    if (creditCardPaymentsTotal > 0) {
      data.push({ name: tMisc('creditCardPayment'), value: creditCardPaymentsTotal });
    }

    return data.filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  }, [chartTransactions, categories, tMisc]);

  const debtChartData = useMemo(() => {
    if (!hasCreditCard) return [];
    
    const creditCardExpenses = chartTransactions.filter(t => t.isCreditCardExpense);
    
    const debtByCategory = creditCardExpenses.reduce((acc, transaction) => {
        const categoryId = transaction.category;
        const categoryInfo = categories.find(c => c.id === categoryId);
        const categoryName = categoryInfo?.name || tMisc('unknownCategory');
        
        if (!acc[categoryName]) {
            acc[categoryName] = 0;
        }
        acc[categoryName] += transaction.amount;
        
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(debtByCategory)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

  }, [chartTransactions, categories, hasCreditCard, tMisc]);

  const timeSeriesChartData = useMemo(() => {
    const data = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const monthTransactions = transactions.filter(t => {
        let tDate;
        if (t.date && typeof (t.date as any).toDate === 'function') {
            tDate = (t.date as any).toDate();
        } else {
            tDate = new Date(t.date as any);
        }
        return tDate >= monthStart && tDate <= monthEnd;
      });

      const income = monthTransactions
        .filter(t => t.type === 'income' && !t.transferId)
        .reduce((sum, t) => sum + t.amount, 0);

      const debitExpenses = monthTransactions
        .filter(t => t.type === 'expense' && !t.transferId && !t.isCreditCardExpense && !t.paymentFor)
        .reduce((sum, t) => sum + t.amount, 0);

      const creditCardPaymentsTotal = monthTransactions
        .filter(t => !!t.paymentFor)
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = debitExpenses + creditCardPaymentsTotal;

      const debt = monthTransactions
        .filter(t => t.isCreditCardExpense)
        .reduce((sum, t) => sum + t.amount, 0);

      data.push({
        name: format(date, 'MMM yy', { locale: dateFnsLocale }),
        Ingresos: income,
        Egresos: totalExpense,
        Deuda: debt,
      });
    }
    return data;
  }, [transactions, dateFnsLocale]);

  const formatCurrencyForTooltip = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
  };

  const CustomLineChartTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
              <div className="p-2 text-sm bg-background border rounded-md shadow-lg">
                  <p className="font-bold mb-1">{label}</p>
                  {payload.map((pld: any) => (
                      <div key={pld.dataKey} style={{ color: pld.color }}>
                          {`${pld.dataKey}: ${formatCurrencyForTooltip(pld.value)}`}
                      </div>
                  ))}
              </div>
          );
      }
      return null;
  };


  return (
    <>
      <DashboardHeader allTransactions={transactions} />
      <div className="p-4 md:p-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
              <StatCards transactions={transactions} />
          </div>
          <div className="lg:row-span-2 flex flex-col">
              <AiSummary transactions={transactions} />
          </div>
        </div>
        
         <div className="pt-4 border-t">
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
              <h3 className="text-lg font-medium">{tDashboard('chartsTitle')}</h3>
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <Button variant={chartType === 'pie' ? 'secondary' : 'ghost'} size="icon" onClick={() => setChartType('pie')}>
                  <PieChartIcon className="h-5 w-5" />
                </Button>
                <Button variant={chartType === 'bar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setChartType('bar')}>
                  <BarChartBig className="h-5 w-5" />
                </Button>
                <Button variant={chartType === 'line' ? 'secondary' : 'ghost'} size="icon" onClick={() => setChartType('line')}>
                  <LineChartIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
              { chartType !== 'line' && (
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={'outline'}
                                className={cn('w-full sm:w-auto justify-start text-left font-normal', !chartDateFrom && 'text-muted-foreground')}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {chartDateFrom ? format(chartDateFrom, 'LLL dd, y', { locale: dateFnsLocale }) : <span>{tDatePicker('startDate')}</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={chartDateFrom} onSelect={setChartDateFrom} locale={dateFnsLocale} />
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={'outline'}
                                className={cn('w-full sm:w-auto justify-start text-left font-normal', !chartDateTo && 'text-muted-foreground')}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {chartDateTo ? format(chartDateTo, 'LLL dd, y', { locale: dateFnsLocale }) : <span>{tDatePicker('endDate')}</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={chartDateTo} onSelect={setChartDateTo} locale={dateFnsLocale} />
                        </PopoverContent>
                    </Popover>
                    {(chartDateFrom || chartDateTo) && (
                        <Button variant="ghost" onClick={() => { setChartDateFrom(undefined); setChartDateTo(undefined); }}>
                            <X className="mr-2 h-4 w-4" /> {tDatePicker('clearButton')}
                        </Button>
                    )}
                </div>
              )}
          </div>
          <div className={cn(
              "grid gap-8",
              chartType === 'line' ? "grid-cols-1" : (hasCreditCard ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2")
          )}>
            {chartType === 'line' ? (
              <Card>
                  <CardHeader>
                      <CardTitle>{tDashboard('monthlyHistoryTitle')}</CardTitle>
                      <CardDescription>{tDashboard('monthlyHistoryDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                          <LineChart data={timeSeriesChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" />
                              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(value as number)} />
                              <Tooltip content={<CustomLineChartTooltip />} />
                              <Legend />
                              <Line type="monotone" dataKey="Ingresos" stroke="hsl(var(--chart-1))" activeDot={{ r: 8 }} />
                              <Line type="monotone" dataKey="Egresos" stroke="hsl(var(--chart-4))" activeDot={{ r: 8 }} />
                              {hasCreditCard && <Line type="monotone" dataKey="Deuda" stroke="hsl(var(--chart-2))" activeDot={{ r: 8 }} />}
                          </LineChart>
                      </ResponsiveContainer>
                  </CardContent>
              </Card>
            ) : (
                <>
                    <ExpenseChart data={expenseChartData} type={chartType} />
                    <IncomeChart data={incomeChartData} type={chartType} />
                    {hasCreditCard && <DebtChart data={debtChartData} type={chartType} />}
                </>
            )}
          </div>
        </div>
        
        <TransactionDataTable 
          transactions={transactions} 
          loading={loading}
          allTransactions={transactions}
        />
      </div>
    </>
  );
}
