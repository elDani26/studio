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
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('LoginPage');
  const tToast = useTranslations('Toasts');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error('Firebase Auth not available');
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      const userData = {
        id: newUser.uid,
        email: newUser.email,
        currency: 'EUR',
      };
      const userDocRef = doc(firestore, 'users', newUser.uid);
      setDoc(userDocRef, userData)
        .then(() => {
          toast({
            title: tToast('signupSuccessTitle'),
            description: tToast('signupSuccessDescription'),
          });
          setActiveTab('login');
          clearForm();
        })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'create',
                requestResourceData: userData,
            });
            errorEmitter.emit('permission-error', permissionError);
            setError(t('userProfileError'));
        });
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError(t('emailInUseError'));
      } else {
        setError(t('signupError'));
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
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 font-sans">
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
