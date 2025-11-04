'use client';

import { useTranslations, useLocale } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { locales } from '@/i18n';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const LOCALE_STORAGE_KEY = 'NEXT_INTL_LOCALE';

export function LanguageSwitcher() {
  const t = useTranslations('DashboardHeader');
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (savedLocale && savedLocale !== currentLocale) {
      const newPath = pathname.replace(`/${currentLocale}`, `/${savedLocale}`);
      router.replace(newPath);
    }
  }, [currentLocale, pathname, router]);

  const handleLocaleChange = (newLocale: string) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.replace(newPath);
  };
  
  return (
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
  );
}
