'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from '@/types';
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
  const { user } = useUser();
  const firestore = useFirestore();
  const [currency, setCurrencyState] = useState<Currency>('EUR');
  const [categories, setCategories] = useState<Category[]>(TRANSACTION_CATEGORIES);
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  useEffect(() => {
    const fetchUserSettings = async () => {
      if (userDocRef) {
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            if (userData.currency) {
              setCurrencyState(userData.currency as Currency);
            }
          }
        } catch (error) {
          console.error("Error fetching user settings:", error);
        }
      }
    };

    fetchUserSettings();
  }, [userDocRef]);


  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    if (userDocRef) {
      try {
        await setDoc(userDocRef, { currency: newCurrency }, { merge: true });
      } catch (error) {
        console.error("Error saving currency:", error);
      }
    }
  };

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
