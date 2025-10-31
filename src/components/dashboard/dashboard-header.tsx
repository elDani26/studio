import { UserNav } from '@/components/dashboard/user-nav';
import { Icons } from '@/components/icons';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="container flex h-16 items-center justify-between p-4 mx-auto">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8">
            <Icons.logo />
          </div>
          <h1 className="text-xl font-bold tracking-tight">GestionaTuDinero</h1>
        </div>
        <UserNav />
      </div>
    </header>
  );
}
