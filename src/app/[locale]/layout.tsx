import { ReactNode } from "react";
import {unstable_setRequestLocale} from 'next-intl/server';
import {locales} from '../../i18n';
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
    children,
    params: {locale}
  }: {
    children: ReactNode;
    params: {locale: string};
  }) {
    unstable_setRequestLocale(locale);
    const messages = await getMessages();
    
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    );
}
