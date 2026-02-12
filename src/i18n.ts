import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
 
export const locales = ['es', 'en', 'fr', 'it', 'pt', 'zh', 'de'];
export const localePrefix = 'always'; // Default

export default getRequestConfig(async ({locale}) => {
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
