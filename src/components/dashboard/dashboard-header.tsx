import { UserNav } from '@/components/dashboard/user-nav';
import { Icons } from '@/components/icons';
import { SettingsDialog } from '@/components/dashboard/settings-dialog';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="container flex h-16 items-center justify-between p-4 mx-auto">
        <div className="flex items-center gap-2">
            <Icons.logo className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight text-primary">GestionaTuDinero</h1>
        </div>
        <div className="flex items-center gap-2">
            <SettingsDialog />
            <UserNav />
        </div>
      </div>
    </header>
  );
}
