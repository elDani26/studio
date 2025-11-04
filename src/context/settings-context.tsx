'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useUser, useFirestore, useMemoFirebase, errorEmitter } from '@/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { User, Category, SourceAccount, WithId } from '@/types';
import { TRANSACTION_CATEGORIES, SOURCE_ACCOUNTS } from '@/lib/constants';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';


type Currency = 'EUR' | 'USD' | 'PEN' | 'COP';

interface SettingsContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  categories: WithId<Category>[];
  accounts: WithId<SourceAccount>[];
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addAccount: (account: SourceAccount) => Promise<void>;
  updateAccount: (id: string, account: Partial<SourceAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const t = useTranslations('Toasts');
  
  const [currency, setCurrencyState] = useState<Currency>('EUR');
  const [categories, setCategories] = useState<WithId<Category>[]>([]);
  const [accounts, setAccounts] = useState<WithId<SourceAccount>[]>([]);
  
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const categoriesColRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'categories') : null, [user, firestore]);
  const accountsColRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'sourceAccounts') : null, [user, firestore]);


  // Effect for user currency
  useEffect(() => {
    if (!userDocRef) return;
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data() as User;
        if (userData.currency && userData.currency !== currency) {
          setCurrencyState(userData.currency as Currency);
        }
      }
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'get' }));
    });
    return () => unsubscribe();
  }, [userDocRef, currency]);

  // Effect for user categories
  useEffect(() => {
    if (!categoriesColRef) return;
    const unsubscribe = onSnapshot(categoriesColRef, (snapshot) => {
        if (snapshot.empty) {
            // First time user, let's create default categories for them
            const batch = writeBatch(firestore);
            TRANSACTION_CATEGORIES.forEach(cat => {
                const newCatRef = doc(categoriesColRef);
                batch.set(newCatRef, {name: cat.label, icon: cat.icon, type: cat.type});
            });
            batch.commit().catch(e => console.error("Failed to create default categories", e));
        } else {
            const userCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WithId<Category>[];
            setCategories(userCategories);
        }
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: categoriesColRef.path, operation: 'list' }));
    });
    return () => unsubscribe();
  }, [categoriesColRef, firestore]);

   // Effect for user source accounts
  useEffect(() => {
    if (!accountsColRef) return;
    const unsubscribe = onSnapshot(accountsColRef, (snapshot) => {
        if (snapshot.empty) {
            // First time user, let's create default accounts for them
            const batch = writeBatch(firestore);
            SOURCE_ACCOUNTS.forEach(acc => {
                const newAccRef = doc(accountsColRef);
                batch.set(newAccRef, {name: acc.label, icon: acc.icon});
            });
            batch.commit().catch(e => console.error("Failed to create default accounts", e));
        } else {
            const userAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WithId<SourceAccount>[];
            setAccounts(userAccounts);
        }
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: accountsColRef.path, operation: 'list' }));
    });
    return () => unsubscribe();
  }, [accountsColRef, firestore]);


  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    if (userDocRef) {
      const currencyData = { currency: newCurrency };
      setDoc(userDocRef, currencyData, { merge: true })
        .catch((error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: currencyData }));
      });
    }
  };

  const handleError = (operation: string) => (error: any) => {
    toast({ variant: 'destructive', title: t('operationError'), description: t('operationErrorDescription') });
  }

  // Category Management
  const addCategory = async (category: Category) => {
    if (!categoriesColRef) return;
    await addDoc(categoriesColRef, category).catch(handleError('addCategory'));
  }
  const updateCategory = async (id: string, category: Partial<Category>) => {
    if (!user) return;
    const docRef = doc(firestore, 'users', user.uid, 'categories', id);
    await updateDoc(docRef, category).catch(handleError('updateCategory'));
  }
  const deleteCategory = async (id: string) => {
    if (!user) return;
    const docRef = doc(firestore, 'users', user.uid, 'categories', id);
    await deleteDoc(docRef).catch(handleError('deleteCategory'));
  }

  // Account Management
  const addAccount = async (account: SourceAccount) => {
    if (!accountsColRef) return;
    await addDoc(accountsColRef, account).catch(handleError('addAccount'));
  }
  const updateAccount = async (id: string, account: Partial<SourceAccount>) => {
    if (!user) return;
    const docRef = doc(firestore, 'users', user.uid, 'sourceAccounts', id);
    await updateDoc(docRef, account).catch(handleError('updateAccount'));
  }
  const deleteAccount = async (id: string) => {
    if (!user) return;
    const docRef = doc(firestore, 'users', user.uid, 'sourceAccounts', id);
    await deleteDoc(docRef).catch(handleError('deleteAccount'));
  }


  return (
    <SettingsContext.Provider value={{ 
        currency, 
        setCurrency, 
        categories, 
        accounts,
        addCategory,
        updateCategory,
        deleteCategory,
        addAccount,
        updateAccount,
        deleteAccount
    }}>
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
