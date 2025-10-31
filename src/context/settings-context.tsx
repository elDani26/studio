'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useUser, useFirestore, useMemoFirebase, errorEmitter } from '@/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { User } from '@/types';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';
import { FirestorePermissionError } from '@/firebase/errors';


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
    if (!userDocRef) {
      setCurrencyState('EUR');
      return;
    };

    // Use onSnapshot to listen for real-time updates
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data() as User;
        if (userData.currency && userData.currency !== currency) {
          setCurrencyState(userData.currency as Currency);
        }
      }
    }, (error) => {
      const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'get',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
    
    // Cleanup the listener on component unmount
    return () => unsubscribe();
  }, [userDocRef, currency]);


  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    if (userDocRef) {
      const currencyData = { currency: newCurrency };
      setDoc(userDocRef, currencyData, { merge: true })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: currencyData,
            });
            errorEmitter.emit('permission-error', permissionError);
      });
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
