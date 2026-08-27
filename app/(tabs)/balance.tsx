import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Image, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import AppModal from '../../components/AppModal';
import { useFocusEffect } from 'expo-router';
import { safeDate, safeDateFull } from '../../lib/config';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

const BANKS = [
  { id: 'vakif',   name: 'VAKIFBANK',      holder: 'Tech Telekomünikasyon Yazılım Danışmanlık Hiz.Tic.San.Ltd.Şti.', iban: 'TR07 0001 5001 5800 7314 5932 76', logo: require('../../assets/images/vakifbank.jpg'),  colors: ['#00a651','#007a3d'] as [string,string] },
  { id: 'is',      name: 'İŞ BANKASI',     holder: 'Tech Telekomünikasyon Yazılım Danışmanlık Hiz.Tic.San.Ltd.Şti.', iban: 'TR31 0006 4000 0011 1211 2263 26', logo: require('../../assets/images/isbank.png'),    colors: ['#003087','#0057b7'] as [string,string] },
  { id: 'yapi',    name: 'YAPIKREDİ',      holder: 'Tech Telekomünikasyon Yazılım Danışmanlık Hiz.Tic.San.Ltd.Şti.', iban: 'TR09 0006 7010 0000 0079 9873 97', logo: require('../../assets/images/yapikredi.jpg'), colors: ['#003087','#1d4ed8'] as [string,string] },
  { id: 'garanti', name: 'GARANTİ BBVA',   holder: 'Tech Telekomünikasyon Yazılım Danışmanlık Hiz.Tic.San.Ltd.Şti.', iban: 'TR76 0006 2000 7470 0006 2963 50', logo: require('../../assets/images/garanti.jpg'),  colors: ['#00a651','#059669'] as [string,string] },
  { id: 'ziraat',  name: 'ZİRAAT BANKASI', holder: 'DURMUŞ ÇAKIR',                                                    iban: 'TR12 0001 0024 6852 8651 1550 19', logo: require('../../assets/images/ziraat.jpg'),   colors: ['#ef4444','#dc2626'] as [string,string] },
];

const QUICK = ['100', '500', '1000', '5000'];

const BANK_LOGOS: Record<string, any> = {
  'VAKIFBANK':      require('../../assets/images/vakifbank.jpg'),
  'İŞ BANKASI':     require('../../assets/images/isbank.png'),
  'YAPIKREDİ':      require('../../assets/images/yapikredi.jpg'),
  'GARANTİ BBVA':   require('../../assets/images/garanti.jpg'),
  'ZİRAAT BANKASI': require('../../assets/images/ziraat.jpg'),
};

function statusInfo(status: string) {
  if (status === 'approved') return { label: i18n.t('balance.approved'), color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle' };
  if (status === 'pending')  return { label: i18n.t('home.pending'),  color: '#f59e0b', bg: '#fef3c7', icon: 'time' };
  return                            { label: i18n.t('balance.rejected'),color: '#ef4444', bg: '#fee2e2', icon: 'close-circle' };
}

export default function BalanceScreen() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const { sendBalanceRequest, balanceRequests, fetchBalanceRequests } = useAppStore();
  const [tab, setTab] = useState<'yukle' | 'gecmis'>('yukle');
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [appModal, setAppModal] = useState<{ type: 'success' | 'pending' | 'error'; title: string; message: string } | null>(null);

  useFocusEffect(useCallback(() => {
    if (token) fetchBalanceRequests(token);
  }, [token]));

  const copy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text.replace(/\s/g, ''));
    setAppModal({ type: 'success', title: t('balance.copiedTitle'), message: t('balance.copiedMessage', { label: label }) });
  };

  const handleSubmit = async () => {
    if (!amount || !bank) { setAppModal({ type: 'error', title: t('balance.missingInfoTitle'), message: t('balance.missingInfoMessage') }); return; }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.id) { setAppModal({ type: 'error', title: t('common.error'), message: t('balance.loginRequired') }); return; }
    setLoading(true);
    try {
      await sendBalanceRequest(authUser.id, parseFloat(amount), bank, user?.currency || 'TRY');
      setAppModal({ type: 'pending', title: t('balance.requestReceivedTitle'), message: t('balance.requestReceivedMessage') });
      setAmount(''); setBank(null);
      if (token) fetchBalanceRequests(token);
    } catch (e: any) { setAppModal({ type: 'error', title: t('common.error'), message: e?.message || t('login.actionFailed') }); }
    finally { setLoading(false); }
  };

  const balance = parseFloat(user?.balance?.toString() || '0');
  const ready = !!amount && !!bank;

  return (
    <View style={s.root}>
      <AppModal
        visible={!!appModal}
        type={appModal?.type || 'error'}
        title={appModal?.title || ''}
        message={appModal?.message || ''}
        onClose={() => setAppModal(null)}
      />

      {/* HEADER */}
      <LinearGradient colors={['#4f46e5','#7c3aed','#a855f7']} style={s.header} start={{ x:0, y:0 }} end={{ x:1, y:1 }}>
        <View style={s.dec1} /><View style={s.dec2} />
        <Text style={s.hTitle}>{t('balance.title')}</Text>

        {/* Bakiye + Sekme butonları yan yana */}
        <View style={s.headerRow}>
          <LinearGradient colors={['rgba(255,255,255,0.25)','rgba(255,255,255,0.1)']} style={s.balChip}>
            <Ionicons name="wallet" size={14} color="#fff" />
            <Text style={s.balChipVal}>{balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</Text>
          </LinearGradient>

          <View style={s.tabRow}>
            <TouchableOpacity onPress={() => setTab('yukle')} style={[s.tabBtn, tab === 'yukle' && s.tabBtnActive]}>
              <Ionicons name="arrow-up-circle-outline" size={13} color={tab === 'yukle' ? '#6366f1' : 'rgba(255,255,255,0.7)'} />
              <Text style={[s.tabTxt, tab === 'yukle' && s.tabTxtActive]}>{t('balance.load')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('gecmis')} style={[s.tabBtn, tab === 'gecmis' && s.tabBtnActive]}>
              <Ionicons name="time-outline" size={13} color={tab === 'gecmis' ? '#6366f1' : 'rgba(255,255,255,0.7)'} />
              <Text style={[s.tabTxt, tab === 'gecmis' && s.tabTxtActive]}>{t('home.history')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* ── YÜKLE SEKMESİ ── */}
      {tab === 'yukle' && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.88} style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 20 }}>
            <LinearGradient colors={ready ? ['#6366f1','#8b5cf6'] : ['#cbd5e1','#b0b8cc']} style={s.submitBtn} start={{ x:0, y:0 }} end={{ x:1, y:0 }}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <View style={s.submitIconWrap}>
                    <Ionicons name="paper-plane" size={16} color={ready ? '#6366f1' : '#94a3b8'} />
                  </View>
                  <Text style={s.submitTxt}>{t('balance.sendPaymentNotification')}</Text>
                  <Ionicons name="arrow-forward" size={15} color="rgba(255,255,255,0.7)" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={s.section}>
            <View style={s.sectionHead}>
              <LinearGradient colors={['#6366f1','#8b5cf6']} style={s.sectionIcon}>
                <Ionicons name="cash-outline" size={12} color="#fff" />
              </LinearGradient>
              <Text style={s.sectionTitle}>{t('balance.selectAmount')}</Text>
            </View>
            <View style={s.quickRow}>
              {QUICK.map(q => (
                <TouchableOpacity key={q} onPress={() => setAmount(q)} style={s.quickWrap} activeOpacity={0.8}>
                  {amount === q ? (
                    <LinearGradient colors={['#6366f1','#8b5cf6']} style={s.quickBtn}>
                      <Text style={s.quickTxtActive}>{q} ₺</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[s.quickBtn, s.quickBtnOff]}>
                      <Text style={s.quickTxt}>{q} ₺</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.inputWrap}>
              <Ionicons name="calculator-outline" size={17} color="#6366f1" />
              <TextInput style={s.input} placeholder={t('balance.otherAmount')} placeholderTextColor="#94a3b8"
                value={amount} onChangeText={setAmount} keyboardType="numeric" />
              {amount.length > 0 && <Text style={s.inputSuffix}>₺</Text>}
            </View>
          </View>

          <View style={s.section}>
            <View style={s.sectionHead}>
              <LinearGradient colors={['#10b981','#059669']} style={s.sectionIcon}>
                <Ionicons name="business-outline" size={12} color="#fff" />
              </LinearGradient>
              <Text style={s.sectionTitle}>{t('balance.selectBank')}</Text>
            </View>
            {BANKS.map(b => {
              const sel = bank?.id === b.id;
              return (
                <TouchableOpacity key={b.id} onPress={() => setBank(b)} activeOpacity={0.85}>
                  <View style={[s.bankCard, sel && s.bankCardActive]}>
                    <View style={s.bankTop}>
                      <View style={[s.bankLogoWrap, sel && { borderColor: '#6366f1' }]}>
                        <Image source={b.logo} style={s.bankLogo} resizeMode="contain" />
                      </View>
                      <Text style={[s.bankName, sel && { color: '#6366f1' }]}>{b.name}</Text>
                      {sel ? (
                        <LinearGradient colors={['#6366f1','#8b5cf6']} style={s.checkWrap}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </LinearGradient>
                      ) : (
                        <View style={s.radioWrap}><View style={s.radio} /></View>
                      )}
                    </View>
                    <View style={[s.infoRow, sel && { backgroundColor: '#ede9fe' }]}>
                      <Text style={s.infoLabel}>{t('balance.recipient')}</Text>
                      <Text style={s.infoVal} numberOfLines={1}>{b.holder}</Text>
                      <TouchableOpacity onPress={() => copy(b.holder, t('balance.recipientName'))} style={s.copyBtn}>
                        <Ionicons name="copy-outline" size={13} color="#6366f1" />
                      </TouchableOpacity>
                    </View>
                    <View style={[s.infoRow, sel && { backgroundColor: '#ede9fe' }]}>
                      <Text style={s.infoLabel}>IBAN</Text>
                      <Text style={s.infoVal}>{b.iban}</Text>
                      <TouchableOpacity onPress={() => copy(b.iban, 'IBAN')} style={s.copyBtn}>
                        <Ionicons name="copy-outline" size={13} color="#6366f1" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.noteCard}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#6366f1" />
            <Text style={s.noteTxt}>{t('balance.transferNote')}</Text>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── GEÇMİŞ SEKMESİ ── */}
      {tab === 'gecmis' && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {balanceRequests.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="receipt-outline" size={40} color="#cbd5e1" />
              <Text style={s.emptyTxt}>{t('balance.noPaymentRequests')}</Text>
            </View>
          ) : balanceRequests.map((req, i) => {
            const st = statusInfo(req.status);
            const logo = BANK_LOGOS[req.bank_name];
            return (
              <TouchableOpacity key={i} style={s.reqCard} onPress={() => setSelected(req)} activeOpacity={0.82}>
                {logo ? (
                  <View style={s.reqLogoWrap}>
                    <Image source={logo} style={s.reqLogo} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={[s.reqLogoWrap, { backgroundColor: '#ede9fe' }]}>
                    <Ionicons name="business-outline" size={20} color="#6366f1" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.reqBank}>{req.bank_name}</Text>
                  <Text style={s.reqDate}>{safeDate(req.created_at)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 5 }}>
                  <Text style={s.reqAmount}>{parseFloat(req.amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                  <View style={[s.reqBadge, { backgroundColor: st.bg }]}>
                    <Ionicons name={st.icon as any} size={10} color={st.color} />
                    <Text style={[s.reqBadgeTxt, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* DETAY BOTTOM SHEET */}
      <Modal visible={!!selected} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.overlayBg} activeOpacity={1} onPress={() => setSelected(null)} />
          {selected && (() => {
            const st = statusInfo(selected.status);
            const logo = BANK_LOGOS[selected.bank_name];
            return (
              <View style={s.sheet}>
                <View style={s.handle} />
                <View style={s.sheetHead}>
                  <Text style={s.sheetTitle}>{t('balance.paymentDetail')}</Text>
                  <TouchableOpacity onPress={() => setSelected(null)} style={s.closeBtn}>
                    <Ionicons name="close" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Banka kartı */}
                <View style={s.sheetBankRow}>
                  {logo ? (
                    <View style={s.sheetLogoWrap}>
                      <Image source={logo} style={s.sheetLogo} resizeMode="contain" />
                    </View>
                  ) : (
                    <View style={[s.sheetLogoWrap, { backgroundColor: '#ede9fe' }]}>
                      <Ionicons name="business-outline" size={24} color="#6366f1" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetBankName}>{selected.bank_name}</Text>
                    <Text style={s.sheetIban}>{selected.iban}</Text>
                  </View>
                </View>

                {/* Detay satırları */}
                <View style={s.detailList}>
                  <DetailRow icon="cash-outline"     label={t('balance.amount')}   value={`${parseFloat(selected.amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`} />
                  <DetailRow icon="calendar-outline" label={t('orders.date')}   value={safeDate(selected.created_at)} />
                  <DetailRow icon="time-outline"     label={t('balance.time')}    value={safeDateFull(selected.created_at).split(' ')[1] || ''} />
                  <DetailRow icon="layers-outline"   label={t('orders.status')}   value={st.label} valueColor={st.color} />
                  {selected.admin_note && <DetailRow icon="chatbubble-outline" label={t('balance.note')} value={selected.admin_note} />}
                </View>
              </View>
            );
          })()}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function DetailRow({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) {
  return (
    <View style={s.detailRow}>
      <View style={s.detailIconWrap}>
        <Ionicons name={icon as any} size={16} color="#6366f1" />
      </View>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, valueColor ? { color: valueColor, fontWeight: '800' } : {}]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  header: { paddingTop: 60, paddingBottom: 18, paddingHorizontal: 22, overflow: 'hidden' },
  dec1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', top: -50, right: -50 },
  dec2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -20, left: -20 },
  hTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 12 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  balChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  balChipVal: { color: '#fff', fontSize: 16, fontWeight: '900' },

  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 3, gap: 2 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 11 },
  tabBtnActive: { backgroundColor: '#fff' },
  tabTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  tabTxtActive: { color: '#6366f1', fontWeight: '900' },

  scroll: { padding: 16 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 18, gap: 10 },
  submitIconWrap: { width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  submitTxt: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '900' },

  section: { marginBottom: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { width: 24, height: 24, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#1e293b' },

  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  quickWrap: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  quickBtn: { paddingVertical: 11, alignItems: 'center', borderRadius: 12 },
  quickBtnOff: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0' },
  quickTxt: { fontWeight: '800', color: '#6366f1', fontSize: 13 },
  quickTxtActive: { color: '#fff', fontWeight: '900', fontSize: 13 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, borderColor: '#e2e8f0', gap: 9 },
  input: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '700' },
  inputSuffix: { fontSize: 17, fontWeight: '900', color: '#6366f1' },

  bankCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 9, borderWidth: 1.5, borderColor: '#e2e8f0', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, gap: 7 },
  bankCardActive: { borderColor: '#6366f1', borderWidth: 2, backgroundColor: '#fafafe' },
  bankTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bankLogoWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  bankLogo: { width: 30, height: 30 },
  bankName: { flex: 1, fontSize: 13, fontWeight: '900', color: '#1e293b' },
  checkWrap: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  radioWrap: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  radio: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e2e8f0' },
  infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, gap: 7 },
  infoLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '800', width: 30, letterSpacing: 0.5 },
  infoVal: { flex: 1, fontSize: 11, fontWeight: '700', color: '#334155' },
  copyBtn: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center' },

  noteCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#ede9fe', borderRadius: 14, padding: 12, gap: 9 },
  noteTxt: { flex: 1, fontSize: 11, color: '#4f46e5', fontWeight: '600', lineHeight: 17 },

  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTxt: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },

  reqCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, gap: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  reqLogoWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  reqLogo: { width: 34, height: 34 },
  reqBank: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  reqDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  reqAmount: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  reqBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reqBadgeTxt: { fontSize: 10, fontWeight: '800' },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 44 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },

  sheetBankRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, marginBottom: 18 },
  sheetLogoWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  sheetLogo: { width: 36, height: 36 },
  sheetBankName: { fontSize: 15, fontWeight: '900', color: '#1e293b' },
  sheetIban: { fontSize: 11, color: '#94a3b8', marginTop: 3 },

  detailList: { gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginEnd: 12 },
  detailLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '700', width: 60 },
  detailValue: { flex: 1, color: '#1e293b', fontSize: 13, fontWeight: '700', textAlign: 'right' },
});
