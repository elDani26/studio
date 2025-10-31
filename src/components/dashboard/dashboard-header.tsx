import { UserNav } from '@/components/dashboard/user-nav';
import { Icons } from '@/components/icons';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 w-full bg-card">
      <div className="container flex h-16 items-center justify-between p-4 mx-auto">
        <h1 className="text-xl font-bold tracking-tight text-primary">Panel de Finanzas</h1>
        <UserNav />
      </div>
    </header>
  );
}
