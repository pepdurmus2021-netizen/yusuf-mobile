export type BrandConfig = {
  // Bu marka dosyasının dosya adıyla aynı olmalı (app.config.js APP_BRAND env
  // değişkeniyle bunu eşleştirir) ve assets/brands/<key>/ klasörüyle eşleşmeli.
  key: string;
  // app.json eşdeğerleri (build zamanı):
  appName: string;      // telefonda görünen uygulama adı
  slug: string;         // Expo slug (benzersiz olmalı)
  androidPackage: string; // com.bayiwebpanel.<Marka> şeması — bkz. brands/hasiptech.ts notu
  adaptiveIconBg: string; // Android adaptive icon arka plan rengi
  splashBg: string;       // splash ekranı arka plan rengi (açık mod)
  // config/BRAND eşdeğerleri (çalışma zamanı, app.tsx'te Constants üzerinden okunur):
  displayName: string;
  shortInitials: string;
  logoText: string;
  legalCompanyName: string;
  supportWhatsapp: string;
  supportEmail: string;
  organizationId: string;
};
