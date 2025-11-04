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
import { useSettings } from '@/context/settings-context';

export function DashboardHeader() {
  const t = useTranslations('DashboardHeader');
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { setLocale } = useSettings();

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
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
                <DropdownMenuItem key={loc} onClick={() => handleLocaleChange(loc)} disabled={currentLocale === loc}>
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
