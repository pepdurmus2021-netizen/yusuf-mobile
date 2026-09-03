import hasiptech from './hasiptech';
import type { BrandConfig } from './types';

// YENİ MARKA EKLERKEN:
// 1. brands/<marka-key>.ts oluştur (hasiptech.ts'i kopyala, alanları doldur)
// 2. Aşağıdaki BRANDS listesine ekle
// 3. assets/brands/<marka-key>/ klasörüne icon.png, android-icon-foreground.png,
//    splash-icon.png, favicon.png koy
// 4. backend/supabase/migrations'a yeni bir organizations satırı migration'ı ekle
//    (bkz. 027_hasip_tech_organization.sql), organizationId'yi brands dosyasına yaz
// 5. eas.json'a bu marka için bir build profili ekle (env: { APP_BRAND: "<key>" })
// Detaylı süreç: bkz. brands/NASIL_YENI_MARKA_EKLENIR.md
export const BRANDS: Record<string, BrandConfig> = {
  hasiptech,
};

export const DEFAULT_BRAND_KEY = 'hasiptech';

export function getBrand(key?: string): BrandConfig {
  return BRANDS[key || DEFAULT_BRAND_KEY] || BRANDS[DEFAULT_BRAND_KEY];
}
