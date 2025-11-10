'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale } from 'lucide-react';
import { useSettings } from '@/context/settings-context';
import { useTranslations } from 'next-intl';
import type { Transaction } from '@/types';
import { AdjustBalanceDialog } from './adjust-balance-dialog';

interface AccountSummaryDialogProps {
  allTransactions: Transaction[];
}

export function AccountSummaryDialog({ allTransactions }: AccountSummaryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const { accounts, currency } = useSettings();
  const t = useTranslations('AccountSummaryDialog');

  const accountData = useMemo(() => {
    const data: Record<string, { income: number; expenses: number; balance: number; creditHistory: number; currentDebt: number; }> = {};
    
    accounts.forEach(acc => {
        data[acc.id] = { income: 0, expenses: 0, balance: 0, creditHistory: 0, currentDebt: 0 };
    });

    allTransactions.forEach(t => {
      const accountId = t.account;
      if (data[accountId]) {
         if (t.type === 'income') {
            data[accountId].income += t.amount;
         } else { // expense
            if (t.isCreditCardExpense) {
              // This is a credit card expense, it increases debt, not a direct expense from a debit account
            } else {
               data[accountId].expenses += t.amount;
            }
         }
      }

      // Handle credit card debt logic separately
      if (t.isCreditCardExpense && data[t.account]) {
          data[t.account].creditHistory += t.amount;
      }
      if (t.paymentFor && data[t.paymentFor]) {
          // A payment reduces the debt of the card being paid
          data[t.paymentFor].creditHistory -= t.amount;
      }
    });
    
    // Calculate final balances and debts
    accounts.forEach(acc => {
      if (data[acc.id]) {
        if (acc.type === 'debit') {
          data[acc.id].balance = data[acc.id].income - data[acc.id].expenses;
        } else { // credit
          data[acc.id].currentDebt = data[acc.id].creditHistory;
        }
      }
    });

    return data;
  }, [allTransactions, accounts]);
  
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
     accounts.forEach(acc => {
        if(acc.type === 'debit') {
            balances[acc.id] = accountData[acc.id]?.balance || 0;
        }
     });
     return balances;
  }, [accountData, accounts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
  };
  
  const getAccountIncome = (accountId: string) => {
    return allTransactions
      .filter(t => t.account === accountId && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }
  
  const getAccountExpenses = (accountId: string) => {
    return allTransactions
      .filter(t => t.account === accountId && t.type === 'expense' && !t.isCreditCardExpense)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Scale className="h-5 w-5" />
            <span className="sr-only">{t('title')}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4">
            {accounts.map(account => (
              <Card key={account.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {account.type === 'debit' ? (
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-2 rounded-lg bg-green-50">
                            <p className="text-sm text-muted-foreground">{t('totalIncome')}</p>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(getAccountIncome(account.id))}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-red-50">
                            <p className="text-sm text-muted-foreground">{t('totalExpenses')}</p>
                            <p className="text-lg font-bold text-red-600">{formatCurrency(getAccountExpenses(account.id))}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-50">
                            <p className="text-sm text-muted-foreground">{t('currentBalance')}</p>
                            <p className="text-lg font-bold text-blue-600">{formatCurrency(accountData[account.id]?.balance || 0)}</p>
                        </div>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                        <div className="p-2 rounded-lg bg-yellow-50">
                            <p className="text-sm text-muted-foreground">{t('debtHistory')}</p>
                            <p className="text-lg font-bold text-yellow-600">{formatCurrency(allTransactions.filter(t => t.isCreditCardExpense && t.account === account.id).reduce((sum, t) => sum + t.amount, 0))}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-orange-50">
                            <p className="text-sm text-muted-foreground">{t('currentDebt')}</p>
                            <p className="text-lg font-bold text-orange-600">{formatCurrency(accountData[account.id]?.currentDebt || 0)}</p>
                        </div>
                     </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter className="pt-4 mt-auto border-t">
            <Button variant="destructive" onClick={() => setIsAdjusting(true)}>{t('adjustButton')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AdjustBalanceDialog 
        isOpen={isAdjusting} 
        onOpenChange={setIsAdjusting} 
        accountBalances={accountBalances}
      />
    </>
  );
}
