'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth as useFirebaseAuth, errorEmitter } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { useTranslations, useLocale } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SOURCE_ACCOUNTS, TRANSACTION_CATEGORIES } from '@/lib/constants';

// Special test account credentials
const TEST_USER_EMAIL = 'test@test.com';
const TEST_USER_PASS = 'Password123!';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('LoginPage');
  const tToast = useTranslations('Toasts');
  const locale = useLocale();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  // --- Test Account Reset Logic ---
  const resetTestAccountData = async (userId: string) => {
    try {
      const batch = writeBatch(firestore);

      // 1. Delete all existing data
      const transactionsRef = collection(firestore, 'users', userId, 'transactions');
      const categoriesRef = collection(firestore, 'users', userId, 'categories');
      const accountsRef = collection(firestore, 'users', userId, 'sourceAccounts');

      const [transactionsSnap, categoriesSnap, accountsSnap] = await Promise.all([
        getDocs(transactionsRef),
        getDocs(categoriesRef),
        getDocs(accountsRef),
      ]);

      transactionsSnap.forEach(doc => batch.delete(doc.ref));
      categoriesSnap.forEach(doc => batch.delete(doc.ref));
      accountsSnap.forEach(doc => batch.delete(doc.ref));
      
      // 2. Add default data back
      [
        ...TRANSACTION_CATEGORIES, 
        { value: 'transfer', label: 'Transfer', icon: 'Repeat', type: 'expense' },
        { value: 'transfer', label: 'Transfer', icon: 'Repeat', type: 'income' },
        { value: 'credit_card_payment', label: 'Pago creditos', icon: 'CreditCard', type: 'expense' }
      ].forEach(cat => {
          const newCatRef = doc(collection(firestore, 'users', userId, 'categories'));
          batch.set(newCatRef, {name: cat.label, icon: cat.icon, type: cat.type});
      });

      SOURCE_ACCOUNTS.forEach(acc => {
          const newAccRef = doc(collection(firestore, 'users', userId, 'sourceAccounts'));
          batch.set(newAccRef, {name: acc.label, icon: acc.icon, type: acc.type as 'debit' | 'credit'});
      });
      
      const userDocRef = doc(firestore, 'users', userId);
      batch.set(userDocRef, { email: TEST_USER_EMAIL, id: userId, currency: 'EUR', hasCreditCard: true }, { merge: true });

      await batch.commit();

    } catch (e) {
      console.error("Failed to reset test account data:", e);
      // We don't block the login if reset fails, but we log it.
    }
  }

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error('Firebase Auth not available');
      let userCredential;

      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInError: any) {
        // If login fails because the test user doesn't exist, create it.
        if (signInError.code === 'auth/user-not-found' && email === TEST_USER_EMAIL && password === TEST_USER_PASS) {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } else {
          // For any other error, re-throw to be caught by the outer catch block.
          throw signInError;
        }
      }

      // If it's the test user, reset their data before navigating
      if (userCredential.user && userCredential.user.email === TEST_USER_EMAIL) {
        await resetTestAccountData(userCredential.user.uid);
      }

      router.push(`/${locale}/dashboard`);
    } catch (error: any) {
      setError(t('invalidCredentialsError'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignUp = async () => {
    setLoading(true);
    setError(null);

    if (email !== confirmEmail) {
      setError(t('emailMismatchError'));
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordMismatchError'));
      setLoading(false);
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(t('weakPasswordError'));
      setLoading(false);
      return;
    }

    try {
      if (!auth) throw new Error('Firebase Auth not available');
      
      // If the user tries to sign up with the test email, ensure they use the correct password.
      if (email === TEST_USER_EMAIL && password !== TEST_USER_PASS) {
        setError(t('passwordMismatchError'));
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      const userData = {
        id: newUser.uid,
        email: newUser.email,
        currency: 'EUR',
      };
      const userDocRef = doc(firestore, 'users', newUser.uid);
      
      await setDoc(userDocRef, userData);

      // If the test user is being created, reset their data immediately.
      if (email === TEST_USER_EMAIL) {
        await resetTestAccountData(newUser.uid);
      }
      
      toast({
        title: tToast('signupSuccessTitle'),
        description: tToast('signupSuccessDescription'),
      });
      setActiveTab('login');
      clearForm();

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError(t('emailInUseError'));
      } else {
        const permissionError = new FirestorePermissionError({
            path: `users/${(auth.currentUser?.uid || 'unknown')}`,
            operation: 'create',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(t('userProfileError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setConfirmEmail('');
    setConfirmPassword('');
    setError(null);
  }

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push(`/${locale}/dashboard`);
    }
  }, [user, isUserLoading, router, locale]);

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 font-sans">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md shadow-2xl rounded-2xl">
        <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
                <Icons.logo className="h-12 w-12 text-primary"/>
            </div>
          <CardTitle className="text-3xl font-bold">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => {
                setActiveTab(value);
                clearForm();
            }}
            className="w-full"
           >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('loginTab')}</TabsTrigger>
              <TabsTrigger value="signup">{t('signupTab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">{t('emailLabel')}</Label>
                  <Input id="email-login" type="email" placeholder={t('emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login">{t('passwordLabel')}</Label>
                  <Input id="password-login" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={handleSignIn} disabled={loading || isUserLoading} className="w-full">
                  {loading ? t('loggingInButton') : t('loginButton')}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="signup">
               <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup">{t('emailLabel')}</Label>
                  <Input id="email-signup" type="email" placeholder={t('emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="confirm-email-signup">{t('confirmEmailLabel')}</Label>
                  <Input id="confirm-email-signup" type="email" placeholder={t('emailPlaceholder')} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">{t('passwordLabel')}</Label>
                  <Input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                   <p className="text-xs text-muted-foreground pt-1">
                    {t('passwordHint')}
                  </p>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="confirm-password-signup">{t('confirmPasswordLabel')}</Label>
                  <Input id="confirm-password-signup" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={handleSignUp} disabled={loading || isUserLoading} className="w-full">
                   {loading ? t('signingUpButton') : t('signupButton')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
