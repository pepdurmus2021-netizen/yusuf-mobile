import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { safeDateFull } from './config';
import { BRAND } from '../config/brand';
import i18n from '../i18n';

function getReceiptStatus(status: string) {
  if (status === 'completed') {
    return {
      label: 'Ödeme Alındı', color: '#10b981', soft: '#e9fbf3',
      icon: '<path d="M6 12.5l4 4 8-9" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
      note: 'Bu belge geçerli bir ödeme kanıtıdır.',
    };
  }
  if (status === 'pending' || status === 'processing') {
    return {
      label: 'İşlem Sürecinde', color: '#f59e0b', soft: '#fef6e7',
      icon: '<circle cx="12" cy="12" r="7.5" stroke="#fff" stroke-width="2.2" fill="none"/><path d="M12 7.5V12l3 2" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
      note: 'Bu sipariş henüz işlem sürecindedir, tutar bilgilendirme amaçlıdır.',
    };
  }
  return {
    label: 'İptal Edildi', color: '#ef4444', soft: '#fdedec',
    icon: '<path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
    note: 'Bu sipariş iptal edilmiştir, tutar tahsil edilmemiştir/iade edilmiştir.',
  };
}

export function generateReceiptHtml(order: any, forPrint = false): string {
  const orderId = (order.id || '').toString().toUpperCase().slice(-10);
  const date = safeDateFull(order.created_at);
  const phone = order.phone_number || '—';
  const pkg = order.package_name_tr || order.package?.name_tr || 'Paket';
  const operator = order.package_operator || order.package?.operator || '—';
  const amount = parseFloat(order.satis_fiyati || order.amount || 0).toFixed(2);
  const st = getReceiptStatus(order.status);

  const rows = [
    ['Sipariş No', orderId, true],
    ['Tarih & Saat', date, false],
    ['Telefon / Hesap', phone, false],
    ['Operatör', operator, false],
    ['Paket', pkg, false],
  ] as const;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  @page { size: ${forPrint ? 'A4' : '80mm auto'}; margin: ${forPrint ? '16mm' : '0'}; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    background:#eef1f6; width:100%; padding: ${forPrint ? '0' : '28px 14px'};
  }
  .card {
    width: 100%; max-width: 380px; margin: 0 auto; background:#fff;
    border-radius: 28px; overflow:hidden;
    box-shadow: 0 1px 3px rgba(15,23,42,0.04), 0 20px 40px -16px rgba(15,23,42,0.18);
  }
  .top { padding: 28px 28px 22px; text-align:center; }
  .brand-row { display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:22px; }
  .brand-dot { width:7px; height:7px; border-radius:50%; background:#6366f1; }
  .brand-name { color:#334155; font-size:12.5px; font-weight:800; letter-spacing:0.4px; }
  .brand-sub { color:#94a3b8; font-size:10.5px; font-weight:600; }

  .status-icon {
    width:64px; height:64px; border-radius:50%; margin:0 auto 16px;
    display:flex; align-items:center; justify-content:center;
    background: ${st.color};
    box-shadow: 0 10px 24px -8px ${st.color}66;
  }
  .status-label { font-size:15px; font-weight:800; color:${st.color}; margin-bottom:4px; }
  .amount { font-size:42px; font-weight:800; color:#0f172a; letter-spacing:-1.2px; line-height:1.1; }
  .amount sup { font-size:20px; font-weight:700; color:#64748b; margin-left:3px; }

  .cut-row { position:relative; height:0; }
  .notch { position:absolute; top:-14px; width:28px; height:28px; border-radius:50%; background:#eef1f6; }
  .notch.l { left:-14px; } .notch.r { right:-14px; }
  .dashed { border-top:2px dashed #e2e8f0; margin: 0 24px; }

  .details { padding: 24px 28px 8px; }
  .row { display:flex; justify-content:space-between; align-items:baseline; padding:11px 0; }
  .row + .row { border-top: 1px solid #f1f5f9; }
  .k { font-size:12.5px; color:#94a3b8; font-weight:600; }
  .v { font-size:13px; color:#1e293b; font-weight:700; text-align:right; max-width:62%; }
  .v.mono { font-family: 'SF Mono', 'IBM Plex Mono', Consolas, monospace; font-size:12px; color:#6366f1; letter-spacing:0.3px; }

  .foot { padding: 18px 28px 30px; text-align:center; }
  .foot-note { font-size:11.5px; color:#94a3b8; font-weight:500; line-height:1.5; }
</style>
</head>
<body>
<div class="card">
  <div class="top">
    <div class="brand-row">
      <span class="brand-dot"></span>
      <span class="brand-name">${BRAND.displayName}</span>
    </div>
    <div class="status-icon">
      <svg width="26" height="26" viewBox="0 0 24 24">${st.icon}</svg>
    </div>
    <div class="status-label">${st.label}</div>
    <div class="amount">${amount}<sup>₺</sup></div>
  </div>

  <div class="cut-row"><span class="notch l"></span><span class="notch r"></span></div>
  <div class="dashed"></div>

  <div class="details">
    ${rows.map(([k, v, mono]) => `
    <div class="row">
      <span class="k">${k}</span>
      <span class="v${mono ? ' mono' : ''}">${v}</span>
    </div>`).join('')}
  </div>

  <div class="foot">
    <div class="foot-note">${st.note}</div>
  </div>
</div>
</body></html>`;
}

// Web'de expo-print'in printToFileAsync/expo-sharing'i desteklenmiyor — tarayıcının
// kendi yazdırma diyaloğunu (orada "PDF olarak kaydet" seçilebilir) yeni bir sekmede açıyoruz.
function openReceiptInBrowserTab(order: any, autoPrint: boolean) {
  const html = generateReceiptHtml(order, true);
  const win = window.open('', '_blank');
  if (!win) {
    Alert.alert(i18n.t('common.error'), i18n.t('orders.receiptGenerationFailed'));
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  if (autoPrint) {
    win.onload = () => win.print();
    setTimeout(() => { try { win.print(); } catch {} }, 400);
  }
}

export async function downloadReceipt(order: any) {
  if (Platform.OS === 'web') { openReceiptInBrowserTab(order, true); return; }
  try {
    const html = generateReceiptHtml(order, true);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: i18n.t('orders.shareReceipt') });
  } catch (e: any) {
    Alert.alert(i18n.t('common.error'), e.message || i18n.t('orders.receiptGenerationFailed'));
  }
}

// Web'de dekont önizleme modalı (react-native-webview desteklenmiyor) yerine
// direkt yeni bir sekmede gösterilir.
export function viewReceiptOnWeb(order: any) {
  openReceiptInBrowserTab(order, false);
}

export async function printReceipt(order: any) {
  if (Platform.OS === 'web') { openReceiptInBrowserTab(order, true); return; }
  try {
    const html = generateReceiptHtml(order, true);
    await Print.printAsync({ html });
  } catch (e: any) {
    Alert.alert(i18n.t('common.error'), e.message || i18n.t('orders.printFailed'));
  }
}
