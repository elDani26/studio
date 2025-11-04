import createMiddleware from 'next-intl/middleware';
import {locales, localePrefix} from './i18n';

export default createMiddleware({
  defaultLocale: 'es',
  locales,
  localePrefix
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(es|en|fr|it|pt|zh)/:path*']
};