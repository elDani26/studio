'use client';

import { UserNav } from '@/components/dashboard/user-nav';
import { Icons } from '@/components/icons';
import { SettingsDialog } from '@/components/dashboard/settings-dialog';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { locales } from '@/i18n';
import { usePathname, useRouter } from 'next/navigation';

export function DashboardHeader() {
  const t = useTranslations('DashboardHeader');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    // The pathname is like `/es/dashboard`. We need to replace the locale part.
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.replace(newPath);
  };
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="container flex h-16 items-center justify-between p-4 mx-auto">
        <div className="flex items-center gap-2">
          <Icons.logo className="h-6 w-6" />
          <h1 className="text-xl font-bold tracking-tight text-primary">{t('title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
                <span className="sr-only">{t('language')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {locales.map((loc) => (
                <DropdownMenuItem key={loc} onClick={() => handleLocaleChange(loc)}>
                  {t(`languages.${loc}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <SettingsDialog />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
