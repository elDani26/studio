'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { SettingsProvider, useSettings } from '@/context/settings-context';
import { useLocale } from 'next-intl';
import { locales } from '@/i18n';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { locale: savedLocale, isDataLoading: isSettingsLoading } = useSettings();
  const currentLocale = useLocale();
  const router = useRouter();

  const isLoading = isUserLoading || isSettingsLoading;

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login if not authenticated
      router.push(`/${currentLocale}/login`);
    }
  }, [user, isLoading, router, currentLocale]);

  // If data is loading or user is not available yet, show skeleton.
  if (isLoading || !user) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="flex-1 p-4 md:p-8 space-y-8">
          <Skeleton className="h-12 w-1/4" />
          <div className="grid gap-4 md:grid-cols-3">
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
          </div>
          <Skeleton className="w-full h-64" />
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    );
  }

  // If the saved locale is valid and different from the current one,
  // it means a redirection is about to happen. Show a skeleton
  // to prevent a flash of content in the wrong language.
  if (savedLocale && locales.includes(savedLocale) && currentLocale !== savedLocale) {
     return (
       <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="flex-1 p-4 md:p-8 space-y-8">
          <Skeleton className="h-12 w-1/4" />
          <div className="grid gap-4 md:grid-cols-3">
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
          </div>
          <Skeleton className="w-full h-64" />
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main>{children}</main>
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <LayoutContent>{children}</LayoutContent>
    </SettingsProvider>
  );
}
