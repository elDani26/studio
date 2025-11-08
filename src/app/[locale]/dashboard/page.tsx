'use client';

import { StatCards } from '@/components/dashboard/stat-cards';
import { AiSummary } from '@/components/dashboard/ai-summary';
import { TransactionDataTable } from '@/components/dashboard/transaction-data-table';
import type { Transaction } from '@/types';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { useSettings } from '@/context/settings-context';
import { DebtChart } from '@/components/dashboard/debt-chart';
import { ExpenseChart } from '@/components/dashboard/expense-chart';
import { IncomeChart } from '@/components/dashboard/income-chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getLocale } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasCreditCard, categories, accounts } = useSettings();
  
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const tDatePicker = useTranslations('TransactionDataTable.datePicker');
  const tMisc = useTranslations('misc');
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

  // --- Chart Data Calculation ---
  const incomeChartData = useMemo(() => {
    const incomes = filteredChartTransactions.filter(t => t.type === 'income' && !t.transferId);
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
  }, [filteredChartTransactions, categories]);

  const expenseChartData = useMemo(() => {
    const debitExpenses = filteredChartTransactions.filter(t => t.type === 'expense' && !t.transferId && !t.isCreditCardExpense && !t.paymentFor);
    const creditCardPaymentsTotal = filteredChartTransactions.filter(t => !!t.paymentFor).reduce((sum, t) => sum + t.amount, 0);

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
  }, [filteredChartTransactions, categories, tMisc]);

  const debtChartData = useMemo(() => {
    if (!hasCreditCard) return [];
    
    // Get all expenses made with credit cards
    const creditCardExpenses = filteredChartTransactions.filter(t => t.isCreditCardExpense);
    
    // Group them by category
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

    // Format for the chart
    return Object.entries(debtByCategory)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

  }, [filteredChartTransactions, categories, hasCreditCard, tMisc]);


  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <StatCards transactions={transactions} />
        </div>
        <div className="lg:row-span-2">
            <AiSummary transactions={transactions} />
        </div>
      </div>
      
       <div className="pt-4 border-t">
        <div className="flex flex-wrap items-center gap-2 mb-8">
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

        <div className={cn(
            "grid gap-8",
            hasCreditCard ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2"
        )}>
            <ExpenseChart data={expenseChartData} />
            <IncomeChart data={incomeChartData} />
            {hasCreditCard && <DebtChart data={debtChartData} />}
        </div>
      </div>
      
      <TransactionDataTable 
        transactions={filteredChartTransactions} 
        loading={loading}
        allTransactions={transactions}
      />
    </div>
  );
}
