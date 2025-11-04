import {getRequestConfig} from 'next-intl/server';
 
export const locales = ['es', 'en', 'fr', 'it', 'pt', 'zh'];
export const localePrefix = 'always'; // Default

export default getRequestConfig(async ({locale}) => ({
  locale: locale,
  messages: (await import(`../messages/${locale}.json`)).default
}));
