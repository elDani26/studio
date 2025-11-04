import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { es, enUS, fr, it, pt, zhCN, de } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLocale(locale: string) {
  switch (locale) {
    case 'es': return es;
    case 'en': return enUS;
    case 'fr': return fr;
    case 'it': return it;
    case 'pt': return pt;
    case 'zh': return zhCN;
    case 'de': return de;
    default: return es;
  }
}
