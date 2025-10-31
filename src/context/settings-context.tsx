'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';

type Currency = 'EUR' | 'USD' | 'PEN' | 'COP';

export interface Category {
  value: string;
  label: string;
  icon: string; // Icon name as string
  type: 'income' | 'expense';
}

interface SettingsContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  categories: Category[];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [categories, setCategories] = useState<Category[]>(TRANSACTION_CATEGORIES);

  return (
    <SettingsContext.Provider value={{ currency, setCurrency, categories }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
