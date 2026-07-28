import { I18nManager } from 'react-native';
import i18n from '../i18n';
import type { SupportedLanguage } from '../i18n';

const RTL_LANGUAGES: SupportedLanguage[] = ['fa', 'ar'];

/**
 * Dili değiştirir; RTL/LTR yönü değişmesi gerekiyorsa I18nManager'i günceller
 * ve reload gerektiğini (true) döner. RN, forceRTL sonrası JS reload olmadan
 * layonutu güncellemez.
 */
export async function applyRTLIfNeeded(lang: SupportedLanguage): Promise<boolean> {
  await i18n.changeLanguage(lang);

  const shouldBeRTL = RTL_LANGUAGES.includes(lang);
  if (I18nManager.isRTL === shouldBeRTL) {
    return false;
  }

  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  return true;
}

export async function reloadApp(): Promise<void> {
  try {
    const Updates = await import('expo-updates');
    if (Updates.isEnabled) {
      await Updates.reloadAsync();
      return;
    }
  } catch {
    // expo-updates kullanilamiyor (ör. Expo Go) - asagida manuel uyari beklenir
  }
  throw new Error('MANUAL_RESTART_REQUIRED');
}
