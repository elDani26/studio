'use client';

import { StatCards } from '@/components/dashboard/stat-cards';
import { AiSummary } from '@/components/dashboard/ai-summary';
import { TransactionDataTable } from '@/components/dashboard/transaction-data-table';
import type { Transaction } from '@/types';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { getLocale, cn } from '@/lib/utils';
import { startOfDay, endOfDay, format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const t = useTranslations('TransactionDataTable');
  const tDatePicker = useTranslations('TransactionDataTable.datePicker');
  const locale = useLocale();
  const dateFnsLocale = getLocale(locale);

  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

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
  
  const filteredTransactionsByDate = useMemo(() => {
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

  const clearDates = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
       <div className="flex flex-col sm:flex-row gap-4">
        <div className="p-4 border rounded-lg flex-grow">
          <h3 className="text-sm font-medium mb-2">{t('filterDate')}</h3>
          <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <StatCards transactions={filteredTransactionsByDate} />
        </div>
        <div className="lg:col-span-1">
          <AiSummary transactions={transactions} />
        </div>
      </div>
      <TransactionDataTable transactions={filteredTransactionsByDate} loading={loading} />
    </div>
  );
}
