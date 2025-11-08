import { ReactNode } from "react";
import {unstable_setRequestLocale} from 'next-intl/server';
import {locales} from '../../i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default function LocaleLayout({
    children,
    params: {locale}
  }: {
    children: ReactNode;
    params: {locale: string};
  }) {
    unstable_setRequestLocale(locale);
    
    return children;
}
