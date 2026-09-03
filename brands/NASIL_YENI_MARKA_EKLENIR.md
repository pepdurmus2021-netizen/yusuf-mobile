# Yeni Marka Ekleme — Adım Adım

Örnek: "Hakan Online" adında yeni bir müşteri/marka ekleniyor.

## Müşteriden/işten alınacak bilgiler
- Marka adı (görünen isim): `Hakan Online`
- Kısaltma (2 harf, splash rozeti): `HO`
- Resmi/yasal şirket unvanı (dekont/faturada): vergi levhasındaki tam isim
- Destek WhatsApp numarası (ülke kodlu, + veya 00 olmadan)
- Destek e-posta adresi
- Uygulama ikonu (1024x1024) + splash görseli (PNG)
- Ana renk teması isteği var mı (yoksa mevcut indigo/mor gradient kullanılır)
- Play Store hesabı: müşterinin kendi Google Play Developer hesabı mı, yoksa bizim hesabımızdan mı yayınlanacak

## Teknik adımlar
1. `brands/hakanonline.js` oluştur — `brands/hasiptech.js`'i kopyala, tüm alanları doldur.
   `androidPackage: 'com.bayiwebpanel.HakanOnline'` (sabit şema, sapma).
   NOT: `.js` (TypeScript değil) — Expo'nun `app.config.js` yükleyicisi sadece
   düz JS require edebiliyor, `.ts` verirsen build config okunamaz (denendi, hata verdi).
2. `brands/index.js` → `BRANDS` listesine `hakanonline` ekle.
3. `assets/brands/hakanonline/` klasörü aç: `icon.png`, `android-icon-foreground.png`,
   `splash-icon.png`, `favicon.png`.
4. `backend/supabase/migrations/0XX_hakan_online_organization.sql` ekle
   (bkz. `027_hasip_tech_organization.sql` örneği), sabit bir UUID üret ve
   `brands/hakanonline.js`'teki `organizationId`'ye aynısını yaz.
5. `eas.json` → `build.hakanonline` profili ekle:
   ```json
   "hakanonline": { "extends": "production", "env": { "APP_BRAND": "hakanonline" } }
   ```
6. Build al ve gönder:
   ```
   eas build --profile hakanonline --platform android
   eas submit --profile hakanonline --platform android
   ```

## Sabit kalanlar (marka bağımsız, dokunma)
- `scheme: "bwpauth"` — Google OAuth redirect buna bağlı
- EAS `projectId` — tüm markalar aynı projede

## Henüz eksik olan (birden fazla marka farklı renk isteyince yapılacak)
Renkler (`#4f46e5` gradient vb.) hâlâ her ekranda sabit kodlu, merkezi bir
token dosyasına taşınmadı. Tek renk teması yeterliyse (Hakan Online de aynı
indigo/mor temayı kullanıyorsa) bu adım gerekmez, ertelenebilir.
