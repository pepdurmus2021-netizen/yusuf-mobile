import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from './locales/tr.json';
import fa from './locales/fa.json';
import ar from './locales/ar.json';

export const SUPPORTED_LANGUAGES = ['tr', 'fa', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export async function getInitialLanguage(): Promise<SupportedLanguage> {
  try {
    const saved = await AsyncStorage.getItem('language');
    if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
      return saved as SupportedLanguage;
    }
  } catch {
    // AsyncStorage okunamazsa varsayılana dus
  }
  return 'tr';
}

let initPromise: Promise<typeof i18n> | null = null;

export function initI18n(): Promise<typeof i18n> {
  if (initPromise) return initPromise;
  initPromise = getInitialLanguage().then(async (lng) => {
    await i18n.use(initReactI18next).init({
      resources: {
        tr: { translation: tr },
        fa: { translation: fa },
        ar: { translation: ar },
      },
      lng,
      fallbackLng: 'tr',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    });
    return i18n;
  });
  return initPromise;
}

export default i18n;
