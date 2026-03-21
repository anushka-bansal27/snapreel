import { languageList } from './lib/language-list';

export const i18n = {
  defaultLocale: 'en',
  locales: languageList.map(l => l.code),
} as const;

export type Locale = string;
