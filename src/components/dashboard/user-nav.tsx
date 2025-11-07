'use client';

import { useUser, useAuth as useFirebaseAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useTranslations } from 'next-intl';

export function UserNav() {
  const { user } = useUser();
  const auth = useFirebaseAuth();
  const t = useTranslations('DashboardHeader');

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Button variant="ghost" size="sm" onClick={logout}>
      <LogOut className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">{t('logout')}</span>
    </Button>
  );
}
