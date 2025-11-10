'use client';

import { UserNav } from '@/components/dashboard/user-nav';
import { Icons } from '@/components/icons';
import { SettingsDialog } from '@/components/dashboard/settings-dialog';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { CalculatorDialog } from './calculator-dialog';
import { AccountSummaryDialog } from './account-summary-dialog';
import type { Transaction } from '@/types';

export function DashboardHeader({ allTransactions }: { allTransactions: Transaction[] }) {
  const t = useTranslations('DashboardHeader');
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="container flex h-16 items-center justify-between p-4 mx-auto">
        <div className="flex items-center gap-2">
          <Icons.logo className="h-6 w-6" />
          <h1 className="text-xl font-bold tracking-tight text-primary">{t('title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <CalculatorDialog />
          <AccountSummaryDialog allTransactions={allTransactions} />
          <SettingsDialog />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
