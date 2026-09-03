import type { BrandConfig } from './types';

const hasiptech: BrandConfig = {
  key: 'hasiptech',
  appName: 'Hasip Tech',
  slug: 'HasipTech',
  // DİKKAT: com.bayiwebpanel.HasipTech DEĞİL — Hasip Tech zaten bu paket adıyla
  // build alınmış/gönderilmiş olabilir, paket adını SONRADAN değiştirmek Play
  // Store'da "yeni bir uygulama" sayılır (mevcut kullanıcılar günceleme alamaz).
  // Yeni markalar için şema com.bayiwebpanel.<MarkaAdı> olacak, bu marka istisna.
  androidPackage: 'com.bayiwebpanel.YusufMobile',
  displayName: 'Hasip Tech',
  shortInitials: 'HT',
  logoText: 'HASIP TECH',
  legalCompanyName: 'TECH TELEKOMUNIKASYON YAZILIM',
  supportWhatsapp: '905069690724',
  supportEmail: 'destek@yusufmobile.com',
  organizationId: '00000000-0000-0000-0000-000000000002',
  adaptiveIconBg: '#4f46e5',
  splashBg: '#2d1b69',
};

export default hasiptech;
