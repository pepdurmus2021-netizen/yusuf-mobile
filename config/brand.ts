import Constants from 'expo-constants';
// @ts-ignore — brands/*.js düz JS (Expo config-loader .ts require edemiyor, bkz. brands/index.js)
import hasiptech from '../brands/hasiptech';

type BrandConfig = {
  displayName: string; shortInitials: string; logoText: string; legalCompanyName: string;
  supportWhatsapp: string; supportEmail: string; organizationId: string;
};

// ÇOKLU MARKA SİSTEMİ — bu dosya artık markayı KENDİSİ TAŞIMIYOR, build zamanında
// app.config.js'in seçtiği markayı (APP_BRAND ortam değişkenine göre, bkz.
// brands/index.js) Constants.expoConfig.extra.brand üzerinden okuyor. Yani bu
// dosyada elle değişiklik yapmana GEREK YOK — yeni marka eklemek için
// brands/<marka>.js oluşturup brands/index.js'e ekle (bkz. oradaki adımlar).
// Constants.expoConfig boş gelebileceği ("expo start" ilk açılış anı gibi) tek
// bir kod yolunu tutmak için fallback olarak hasiptech kullanılıyor.
const fromExtra = (Constants.expoConfig?.extra?.brand as BrandConfig | undefined) ?? hasiptech;

export const BRAND = {
  displayName: fromExtra.displayName,
  shortInitials: fromExtra.shortInitials,
  logoText: fromExtra.logoText,
  legalCompanyName: fromExtra.legalCompanyName,
  supportWhatsapp: fromExtra.supportWhatsapp,
  supportEmail: fromExtra.supportEmail,
  appVersion: '1.0.0',
  organizationId: fromExtra.organizationId,
};

// ============================================================
// YENİ MARKA EKLEME SÜRECİ (artık tamamen dosya bazlı, elle app.json
// değiştirmek YOK):
//
// 1. brands/<marka-key>.js oluştur — brands/hasiptech.js'i kopyala, tüm
//    alanları (displayName, androidPackage, organizationId, renkler vb.)
//    yeni markaya göre doldur. androidPackage şeması: com.bayiwebpanel.<Marka>
// 2. brands/index.js → BRANDS listesine ekle
// 3. assets/brands/<marka-key>/ klasörü aç → icon.png, android-icon-foreground.png,
//    splash-icon.png, favicon.png koy (grafik dosyalar)
// 4. backend/supabase/migrations altına yeni bir organizations satırı migration'ı
//    ekle (bkz. 027_hasip_tech_organization.sql örneği), oradaki UUID'yi
//    brands/<marka-key>.ts içindeki organizationId'ye yaz
// 5. eas.json → build.<marka-key> profili ekle: { "env": { "APP_BRAND": "<marka-key>" } }
// 6. Build al: `eas build --profile <marka-key> --platform android`
//
// SABİT KALAN, MARKA BAĞIMSIZ ŞEYLER (app.config.js'te elle korunuyor):
// - scheme: "bwpauth" — Google OAuth redirect'i buna bağlı, ASLA marka bazlı değiştirme
// - EAS projectId — tüm markalar aynı Expo/EAS projesinde, ayrı proje AÇMA
//
// Renk/tipografi token'ları henüz merkezi değil (bkz. eski not, her ekranın
// kendi StyleSheet'inde sabit) — birden fazla marka gerçekten farklı renk
// isteyince bu dosyaya taşınıp ekranlar oradan okuyacak şekilde refaktör
// edilmesi gerekecek.
// ============================================================
