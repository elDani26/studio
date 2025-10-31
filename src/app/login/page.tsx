'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth as useFirebaseAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const router = useRouter();

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
           <div className="mx-auto h-16 w-16 mb-4">
            <Icons.logo />
          </div>
          <CardTitle className="text-3xl font-bold">GestionaTuDinero</CardTitle>
          <CardDescription>Your personal finance companion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            <p className="text-center text-muted-foreground">
              Sign in to start managing your finances.
            </p>
            <Button
              onClick={signInWithGoogle}
              disabled={isUserLoading}
              className="w-full"
              size="lg"
            >
              <Icons.google className="mr-2 h-5 w-5" />
              Sign in with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
