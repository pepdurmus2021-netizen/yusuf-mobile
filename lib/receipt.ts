import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { safeDateFull } from './config';
import { BRAND } from '../config/brand';
import i18n from '../i18n';

function getReceiptStatus(status: string) {
  if (status === 'completed') {
    return { label: 'Tamamlandı', icon: '✓', color: '#10b981', chipBg: '#ede9fe', chipBorder: '#c4b5fd', chipText: '#6d28d9', amountLabel: 'Ödenen Tutar', amountBg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', amountBorder: '#86efac', amountLabelColor: '#16a34a', amountValueColor: '#15803d' };
  }
  if (status === 'pending' || status === 'processing') {
    return { label: 'Bekliyor', icon: '⏱', color: '#f59e0b', chipBg: '#fffbeb', chipBorder: '#fde68a', chipText: '#b45309', amountLabel: 'Sipariş Tutarı', amountBg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', amountBorder: '#fde68a', amountLabelColor: '#b45309', amountValueColor: '#92400e' };
  }
  return { label: 'İptal Edildi', icon: '✕', color: '#ef4444', chipBg: '#fef2f2', chipBorder: '#fecaca', chipText: '#b91c1c', amountLabel: 'İptal Edilen Tutar', amountBg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', amountBorder: '#fecaca', amountLabelColor: '#b91c1c', amountValueColor: '#991b1b' };
}

export function generateReceiptHtml(order: any, forPrint = false): string {
  const orderId = (order.id || '').toString().toUpperCase().slice(-10);
  const date = safeDateFull(order.created_at);
  const phone = order.phone_number || '—';
  const pkg = order.package_name_tr || order.package?.name_tr || 'Paket';
  const operator = order.package_operator || order.package?.operator || '—';
  const amount = parseFloat(order.satis_fiyati || order.amount || 0).toFixed(2);
  const st = getReceiptStatus(order.status);

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  @page { size: ${forPrint ? 'A4' : '80mm auto'}; margin: ${forPrint ? '20mm' : '0'}; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, Arial, sans-serif; background:#fff; width:${forPrint ? '100%' : '80mm'}; margin:0 auto; }
  .page { width: ${forPrint ? '100%' : '80mm'}; max-width: ${forPrint ? '500px' : '80mm'}; background: #fff; margin: 0 auto; text-align:center; }
  .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%); padding: 22px 28px 18px; text-align: center; position: relative; overflow: hidden; }
  .header::before { content:''; position:absolute; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,0.07); top:-60px; right:-60px; }
  .header::after  { content:''; position:absolute; width:120px; height:120px; border-radius:50%; background:rgba(255,255,255,0.07); bottom:-30px; left:-30px; }
  .brand { color:rgba(255,255,255,0.85); font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; margin-bottom:3px; }
  .brand-name { color:#fff; font-size:22px; font-weight:900; letter-spacing:1px; margin-bottom:2px; }
  .brand-sub { color:rgba(255,255,255,0.65); font-size:11px; font-weight:600; }
  .status-badge { display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,0.18); border:1.5px solid rgba(255,255,255,0.35); border-radius:30px; padding:6px 18px; color:#fff; font-size:13px; font-weight:800; }
  .check { display:inline-block; width:18px; height:18px; background:#10b981; border-radius:50%; color:#fff; font-size:11px; line-height:18px; text-align:center; font-weight:900; }
  .body { padding: 16px; }
  .amount-card { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 2px solid #86efac; border-radius: 20px; padding: 20px; text-align: center; margin-bottom: 24px; }
  .amount-label { color:#16a34a; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px; }
  .amount-value { color:#15803d; font-size:36px; font-weight:900; }
  .section-title { color:#94a3b8; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; margin-bottom:12px; }
  .detail-list { border: 1.5px solid #e2e8f0; border-radius: 16px; overflow: hidden; margin-bottom: 24px; }
  .detail-row { display:flex; justify-content:space-between; align-items:center; padding:13px 16px; border-bottom:1px solid #f1f5f9; }
  .detail-row:last-child { border-bottom:none; }
  .detail-key { color:#94a3b8; font-size:12px; font-weight:700; }
  .detail-val { color:#1e293b; font-size:13px; font-weight:800; text-align:right; max-width:60%; }
  .detail-val.mono { font-family: monospace; font-size:12px; color:#6366f1; }
  .footer { margin-top:8px; background:#f8fafc; border-radius:16px; padding:18px; text-align:center; }
  .footer-line1 { color:#64748b; font-size:12px; font-weight:600; }
  .divider { height:1px; background:linear-gradient(90deg,transparent,#e2e8f0,transparent); margin:8px 0; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">${BRAND.legalCompanyName}</div>
    <div class="brand-name">${BRAND.displayName}</div>
    <div class="brand-sub">Yükleme Dekontu</div>
  </div>
  <div class="body">
    <div class="amount-card" style="background:${st.amountBg}; border-color:${st.amountBorder};">
      <div class="amount-label" style="color:${st.amountLabelColor};">${st.amountLabel}</div>
      <div class="amount-value" style="color:${st.amountValueColor};">${amount} ₺</div>
    </div>
    <div class="section-title">İşlem Bilgileri</div>
    <div class="detail-list">
      <div class="detail-row">
        <span class="detail-key">Sipariş No</span>
        <span class="detail-val mono">${orderId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-key">Tarih & Saat</span>
        <span class="detail-val">${date}</span>
      </div>
      <div class="detail-row">
        <span class="detail-key">Telefon</span>
        <span class="detail-val">${phone}</span>
      </div>
      <div class="detail-row">
        <span class="detail-key">Operatör</span>
        <span class="detail-val">${operator}</span>
      </div>
      <div class="detail-row">
        <span class="detail-key">Paket</span>
        <span class="detail-val">${pkg}</span>
      </div>
    </div>
    <div class="footer">
      <div style="display:inline-flex;align-items:center;gap:9px;background:${st.chipBg};border:2px solid ${st.chipBorder};border-radius:30px;padding:10px 24px;">
        <span style="display:inline-block;width:24px;height:24px;background:${st.color};border-radius:50%;color:#fff;font-size:14px;line-height:24px;text-align:center;font-weight:900;">${st.icon}</span>
        <span style="color:${st.chipText};font-size:16px;font-weight:800;">${st.label}</span>
      </div>
      <div class="divider" style="margin-top:14px;"></div>
      <div class="footer-line1" style="margin-top:10px;">${order.status === 'completed' ? 'Bu belge geçerli bir ödeme kanıtıdır.' : order.status === 'pending' || order.status === 'processing' ? 'Bu sipariş henüz işlem sürecindedir, tutar bilgilendirme amaçlıdır.' : 'Bu sipariş iptal edilmiştir, tutar tahsil edilmemiştir/iade edilmiştir.'}</div>
    </div>
  </div>
</div>
</body></html>`;
}

export async function downloadReceipt(order: any) {
  try {
    const html = generateReceiptHtml(order, true);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: i18n.t('orders.shareReceipt') });
  } catch (e: any) {
    Alert.alert(i18n.t('common.error'), e.message || i18n.t('orders.receiptGenerationFailed'));
  }
}

export async function printReceipt(order: any) {
  try {
    const html = generateReceiptHtml(order, true);
    await Print.printAsync({ html });
  } catch (e: any) {
    Alert.alert(i18n.t('common.error'), e.message || i18n.t('orders.printFailed'));
  }
}
