'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useUser, useFirestore, errorEmitter } from '@/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { User, Category, SourceAccount, WithId, CardsVisibility } from '@/types';
import { TRANSACTION_CATEGORIES, SOURCE_ACCOUNTS } from '@/lib/constants';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

const initialVisibilityState: CardsVisibility = {
  totalIncome: true,
  totalExpenses: true,
  creditCardDebt: true,
  currentBalance: true,
  filteredIncome: true,
  filteredExpenses: true,
  filteredBalance: true,
};

type Currency = 'EUR' | 'USD' | 'PEN' | 'COP';

interface SettingsContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  hasCreditCard: boolean;
  setHasCreditCard: (hasCreditCard: boolean) => void;
  isDataLoading: boolean;
  categories: WithId<Category>[];
  accounts: WithId<SourceAccount>[];
  cardsVisibility: CardsVisibility;
  updateCardsVisibility: (visibility: CardsVisibility) => void;
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
  const [hasCreditCard, setHasCreditCardState] = useState(true);
  const [categories, setCategories] = useState<WithId<Category>[]>([]);
  const [accounts, setAccounts] = useState<WithId<SourceAccount>[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [cardsVisibility, setCardsVisibility] = useState<CardsVisibility>(initialVisibilityState);


  useEffect(() => {
    if (!user || !firestore) {
      setIsDataLoading(false);
      return;
    }
    
    setIsDataLoading(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const categoriesColRef = collection(firestore, 'users', user.uid, 'categories');
    const accountsColRef = collection(firestore, 'users', user.uid, 'sourceAccounts');

    const unsubscribes = [
      onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          if (userData.currency) setCurrencyState(userData.currency as Currency);
          setHasCreditCardState(userData.hasCreditCard === false ? false : true);
          setCardsVisibility({ ...initialVisibilityState, ...(userData.cardsVisibility || {}) });
        } else {
            // First time user, create their document
            const initialUserData: User = { 
                id: user.uid, 
                email: user.email!, 
                currency: 'EUR', 
                hasCreditCard: true,
                cardsVisibility: initialVisibilityState
            };
            setDoc(userDocRef, initialUserData)
                .catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'create', requestResourceData: initialUserData })));
        }
      }, (error) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'get' }))),

      onSnapshot(categoriesColRef, (snapshot) => {
          if (snapshot.empty) {
              const batch = writeBatch(firestore);
              [
                ...TRANSACTION_CATEGORIES, 
                { value: 'transfer', label: 'Transfer', icon: 'Repeat', type: 'expense' },
                { value: 'transfer', label: 'Transfer', icon: 'Repeat', type: 'income' },
                { value: 'credit_card_payment', label: 'Pago creditos', icon: 'CreditCard', type: 'expense' }
              ].forEach(cat => {
                  const newCatRef = doc(collection(firestore, 'users', user.uid, 'categories'));
                  batch.set(newCatRef, {name: cat.label, icon: cat.icon, type: cat.type});
              });
              batch.commit().catch(e => console.error("Failed to create default categories", e));
          } else {
              setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WithId<Category>[]);
          }
          setIsDataLoading(false);
      }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: categoriesColRef.path, operation: 'list' }));
        setIsDataLoading(false);
      }),

      onSnapshot(accountsColRef, (snapshot) => {
          if (snapshot.empty) {
              const batch = writeBatch(firestore);
              SOURCE_ACCOUNTS.forEach(acc => {
                  const newAccRef = doc(collection(firestore, 'users', user.uid, 'sourceAccounts'));
                  batch.set(newAccRef, {name: acc.label, icon: acc.icon, type: acc.type as 'debit' | 'credit'});
              });
              batch.commit().catch(e => console.error("Failed to create default accounts", e));
          } else {
            const userAccounts = snapshot.docs.map(doc => {
              const data = doc.data() as SourceAccount;
              // If an old account doesn't have a type, default it to 'debit'
              if (!data.type) {
                data.type = 'debit';
              }
              return { id: doc.id, ...data };
            }) as WithId<SourceAccount>[];
            setAccounts(userAccounts);
          }
      }, (error) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: accountsColRef.path, operation: 'list' })))
    ];

    return () => unsubscribes.forEach(unsub => unsub());

  }, [user, firestore]);

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      const data = { currency: newCurrency };
      setDoc(userDocRef, data, { merge: true })
        .catch((error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: data }));
      });
    }
  };
  
  const setHasCreditCard = async (hasCC: boolean) => {
    setHasCreditCardState(hasCC);
    if (user && firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const data = { hasCreditCard: hasCC };
        setDoc(userDocRef, data, { merge: true })
            .catch((error) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: data }));
            });
    }
  };

  const updateCardsVisibility = (visibility: CardsVisibility) => {
    setCardsVisibility(visibility);
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      const data = { cardsVisibility: visibility };
      setDoc(userDocRef, data, { merge: true })
        .catch((error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: data }));
        });
    }
  };


  const handleError = (operation: string) => (error: any) => {
    toast({ variant: 'destructive', title: t('operationError'), description: t('operationErrorDescription') });
  }

  const addCategory = async (category: Category) => {
    if (!user || !firestore) return;
    const categoriesColRef = collection(firestore, 'users', user.uid, 'categories');
    await addDoc(categoriesColRef, category).catch(handleError('addCategory'));
  }
  const updateCategory = async (id: string, category: Partial<Category>) => {
    if (!user || !firestore) return;
    const docRef = doc(firestore, 'users', user.uid, 'categories', id);
    await updateDoc(docRef, category).catch(handleError('updateCategory'));
  }
  const deleteCategory = async (id: string) => {
    if (!user || !firestore) return;
    const docRef = doc(firestore, 'users', user.uid, 'categories', id);
    await deleteDoc(docRef).catch(handleError('deleteCategory'));
  }

  const addAccount = async (account: SourceAccount) => {
    if (!user || !firestore) return;
    const accountsColRef = collection(firestore, 'users', user.uid, 'sourceAccounts');
    await addDoc(accountsColRef, account).catch(handleError('addAccount'));
  }
  const updateAccount = async (id: string, account: Partial<SourceAccount>) => {
    if (!user || !firestore) return;
    const docRef = doc(firestore, 'users', user.uid, 'sourceAccounts', id);
    await updateDoc(docRef, account).catch(handleError('updateAccount'));
  }
  const deleteAccount = async (id: string) => {
    if (!user || !firestore) return;
    const docRef = doc(firestore, 'users', user.uid, 'sourceAccounts', id);
    await deleteDoc(docRef).catch(handleError('deleteAccount'));
  }


  return (
    <SettingsContext.Provider value={{ 
        currency, 
        setCurrency, 
        hasCreditCard,
        setHasCreditCard,
        isDataLoading,
        categories, 
        accounts,
        cardsVisibility,
        updateCardsVisibility,
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
