import createMiddleware from 'next-intl/middleware';
import {locales, localePrefix} from './i18n';

const LOCALE_STORAGE_KEY = 'NEXT_INTL_LOCALE';

export default createMiddleware({
  defaultLocale: 'es',
  locales,
  localePrefix,
  localeDetection: (request) => {
    // Try to get locale from cookie
    const cookieLocale = request.cookies.get(LOCALE_STORAGE_KEY)?.value;
    if (cookieLocale && locales.includes(cookieLocale)) {
      return cookieLocale;
    }
    
    // Fallback to default detection
    return undefined;
  }
});

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
