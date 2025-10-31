'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { SettingsProvider } from '@/context/settings-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
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
    <SettingsProvider>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main>{children}</main>
      </div>
    </SettingsProvider>
  );
}
