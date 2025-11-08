import {getRequestConfig} from 'next-intl/server';
 
export const locales = ['es', 'en', 'fr', 'it', 'pt', 'zh', 'de'];
export const localePrefix = 'always'; // Default

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    // Optionally, you can redirect to a default locale or show a 404 page.
    // For now, we'll just proceed with the default messages.
  }

  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
