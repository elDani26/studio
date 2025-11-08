import { ReactNode } from "react";
import {unstable_setRequestLocale} from 'next-intl/server';

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
