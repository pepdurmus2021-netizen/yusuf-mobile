// TEK MARKA AYAR DOSYASI — bu yazılım farklı müşterilere farklı isimlerle
// satılacağı için (bugün Hasip Tech, yarın Hakan Tech vb.) tüm marka bilgisi
// buraya toplandı. Yeni bir müşteri için rebrand yaparken SADECE bu dosyayı
// (+ aşağıdaki "app.json'da elle değiştir" notundaki alanları) değiştirmen yeterli.
export const BRAND = {
  // Uygulama içinde görünen isim (splash, giriş logosu, profil footer, dekont başlığı)
  displayName: 'Hasip Tech',
  // Splash ekranındaki rozette görünen kısaltma (2 harf öneri — uzun isimler sığmaz)
  shortInitials: 'HT',
  // Giriş ekranındaki büyük logo yazısı (boşluk/büyük harf serbest, Orbitron fontuyla basılıyor)
  logoText: 'HASIP TECH',
  // Şirketin resmi/yasal adı — dekont gibi resmi belgelerde ayrıca gösteriliyor, marka adından FARKLI olabilir
  legalCompanyName: 'TECH TELEKOMUNIKASYON YAZILIM',
  supportWhatsapp: '905069690724', // ülke koduyla, başında + veya 00 olmadan
  supportEmail: 'destek@yusufmobile.com',
  appVersion: '1.0.0',
};

// ============================================================
// REBRAND CHECKLIST — bu dosyayı değiştirdikten sonra AYRICA elle
// değiştirilmesi gereken yerler (bunlar platform seviyesinde statik
// olduğu için kod içinden otomatik okunamıyor):
//
// 1. app.json → "name" (telefonda görünen uygulama adı), "slug"
// 2. app.json → android.package / ios.bundleIdentifier — SADECE henüz
//    Play Store/App Store'a hiç yayınlanmadıysa değiştir. Yayınlandıktan
//    sonra bunu değiştirmek yeni bir uygulama olarak sayılır (eski
//    kullanıcılar güncelleme alamaz, sıfırdan kurulum gerekir).
// 3. app.json → "scheme" — BİLİNÇLİ OLARAK MARKA ADINDAN BAĞIMSIZ TUTULUYOR
//    ("bwpauth", sabit). Google OAuth redirect'i buna bağlı olduğu için
//    her rebrand'de değiştirilirse Supabase Dashboard'daki Redirect URL
//    listesini de güncellemek gerekirdi — bu tekrarlayan baş ağrısını
//    önlemek için scheme marka adından ayrıldı. REBRAND'DE BU SATIRA
//    DOKUNMA, hep "bwpauth" kalsın.
// 4. assets/images/icon.png, android-icon-foreground.png, splash-icon.png,
//    favicon.png — uygulama ikonu/splash görseli (grafik dosyalar, kod değil)
// ============================================================
