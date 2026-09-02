import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, RefreshControl, Modal,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { safeDate, safeDateFull, API_URL } from '../../lib/config';
import { useAppStore } from '../../store/useAppStore';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useGameLogoOverrides, toSafeKey } from '../../lib/gameLogoOverrides';
import { generateReceiptHtml, downloadReceipt, printReceipt } from '../../lib/receipt';

const ALL_OPERATORS = [
  { dbNames: ['turkcell','türkcell'],                          logo: require('../../assets/images/turkcell.png') },
  { dbNames: ['vodafone'],                                     logo: require('../../assets/images/vodafone.png') },
  { dbNames: ['turk telekom','türk telekom','turktelekom'],    logo: require('../../assets/images/turktelekom.png') },
  { dbNames: ['roshan'],                                       logo: require('../../assets/images/roshan.png') },
  { dbNames: ['mtn'],                                          logo: require('../../assets/images/mtn.png') },
  { dbNames: ['awcc'],                                         logo: require('../../assets/images/awcc.png') },
  { dbNames: ['salaam'],                                       logo: require('../../assets/images/salaam.png') },
  { dbNames: ['etisalat'],                                     logo: require('../../assets/images/etisalat.png') },
  { dbNames: ['pubg'],                                         logo: require('../../assets/images/pubg.png') },
  { dbNames: ['valorant'],                                     logo: require('../../assets/images/valorant.png') },
  { dbNames: ['free fire'],                                    logo: require('../../assets/images/free-fire.png') },
  { dbNames: ['google play kart','google play'],               logo: require('../../assets/images/google-play.png') },
  { dbNames: ['clash'],                                        logo: require('../../assets/images/clash-royale.png') },
  { dbNames: ['ahlan'],                                        logo: require('../../assets/images/ahlan.png') },
  { dbNames: ['soulchill','souLchill'],                        logo: require('../../assets/images/soulchill.png') },
  { dbNames: ['hiya','hi̇ya'],                                  logo: require('../../assets/images/hiya.png') },
  { dbNames: ['sugo'],                                         logo: require('../../assets/images/sugo.png') },
  { dbNames: ['yoho'],                                         logo: require('../../assets/images/yoho.png') },
  { dbNames: ['ditto'],                                        logo: require('../../assets/images/ditto.png') },
  { dbNames: ['jawaker'],                                      logo: require('../../assets/images/jawaker.png') },
  { dbNames: ['haki'],                                         logo: require('../../assets/images/haki.png') },
  { dbNames: ['haza'],                                         logo: require('../../assets/images/haza.png') },
  { dbNames: ['bigo'],                                         logo: require('../../assets/images/bigo.png') },
  { dbNames: ['tiktok','ti̇ktok'],                              logo: require('../../assets/images/tiktok.png') },
  { dbNames: ['tango'],                                        logo: require('../../assets/images/tango.png') },
  { dbNames: ['likee','li̇kee'],                                logo: require('../../assets/images/likee.png') },
  { dbNames: ['itunes kart','i̇tunes kart'],                    logo: require('../../assets/images/itunes.png') },
  { dbNames: ['paycell'],                                      logo: require('../../assets/images/paycell.png') },
  { dbNames: ['yalla ludo'],                                   logo: require('../../assets/images/yalla-ludo.png') },
  { dbNames: ['tumile'],                                       logo: require('../../assets/images/tumile.png') },
  { dbNames: ['falla'],                                        logo: require('../../assets/images/falla.png') },
];

// Admin panelden atanmis override (ozellikle Gunes-Tek oyunlari icin Play Store'dan
// cekilen gercek logolar) varsa onu kullan, yoksa eski yerel GSM/oyun haritasina
// (ALL_OPERATORS) dus, o da yoksa fallback ikon gosterilir (bkz. renderItem).
function getOperatorLogo(operatorName: string | undefined, overrides: Record<string, any>) {
  if (!operatorName) return null;
  const override = overrides[toSafeKey(operatorName)];
  if (override) return { uri: `${API_URL}${override.logo_url}` };
  const lower = operatorName.toLowerCase();
  const match = ALL_OPERATORS.find(op => op.dbNames.some(n => lower.includes(n)));
  return match?.logo || null;
}

function getStatusMap(): Record<string, { label: string; icon: string; colors: [string,string]; bg: string; text: string }> {
  return {
    completed:  { label: i18n.t('home.completed'), icon: 'checkmark-circle', colors: ['#10b981','#059669'], bg: '#f0fdf4', text: '#10b981' },
    pending:    { label: i18n.t('home.pending'),   icon: 'time',             colors: ['#f59e0b','#d97706'], bg: '#fffbeb', text: '#f59e0b' },
    processing: { label: i18n.t('home.pending'),   icon: 'time',             colors: ['#f59e0b','#d97706'], bg: '#fffbeb', text: '#f59e0b' },
    failed:     { label: i18n.t('home.cancelled'),      icon: 'close-circle',     colors: ['#ef4444','#dc2626'], bg: '#fef2f2', text: '#ef4444' },
    cancelled:  { label: i18n.t('home.cancelled'),      icon: 'close-circle',     colors: ['#ef4444','#dc2626'], bg: '#fef2f2', text: '#ef4444' },
  };
}

function getFilters() {
  return [
    { key: 'all',       label: i18n.t('orders.filterAll')       },
    { key: 'completed', label: i18n.t('home.completed') },
    { key: 'pending',   label: i18n.t('home.pending')   },
    { key: 'failed',    label: i18n.t('home.cancelled')      },
  ];
}

export default function OrdersScreen() {
  const { t } = useTranslation();
  const STATUS = getStatusMap();
  const FILTERS = getFilters();
  const { user, token } = useAuth();
  const { orders, fetchOrders } = useAppStore();
  const logoOverrides = useGameLogoOverrides(token);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);

  useEffect(() => { fetchOrdersData(); }, [token]);

  const fetchOrdersData = async () => {
    if (!token) { setLoading(false); setRefreshing(false); return; }
    try { await fetchOrders(token); }
    catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const filtered = useMemo(() => orders.filter(o => {
    if (filter === 'pending' && o.status !== 'pending' && o.status !== 'processing') return false;
    if (filter === 'failed' && o.status !== 'failed' && o.status !== 'cancelled') return false;
    if (filter !== 'all' && filter !== 'pending' && filter !== 'failed' && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (o.phone_number || '').includes(q) || (o.package_name_tr || o.package?.name_tr || '').toLowerCase().includes(q);
    }
    return true;
  }), [orders, filter, search]);

  const total     = orders.length;
  const completed = orders.filter(o => o.status === 'completed').length;
  const pending   = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const totalSpent = orders.filter(o => o.status === 'completed').reduce((a, b) => {
    const satis = parseFloat(b.amount || 0);
    const maliyet = parseFloat(b.dist_price || b.cost_price || 0);
    return a + Math.max(0, satis - maliyet);
  }, 0);

  if (loading) return (
    <LinearGradient colors={['#4f46e5','#7c3aed']} style={s.loadWrap}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={s.loadTxt}>{t('common.loading')}</Text>
    </LinearGradient>
  );

  return (
    <View style={s.root}>
      {/* HEADER */}
      <LinearGradient colors={['#4f46e5','#7c3aed','#a855f7']} style={s.header} start={{ x:0, y:0 }} end={{ x:1, y:1 }}>
        <View style={s.dec1} /><View style={s.dec2} />
        <Text style={s.hTitle}>{t('orders.title')}</Text>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={s.searchInput}
            placeholder={t('orders.searchPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* FİLTRELER */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={s.filterWrap}>
            {filter === f.key ? (
              <LinearGradient colors={['#6366f1','#8b5cf6']} style={s.filterBtn}>
                <Text style={s.filterTxtActive}>{f.label}</Text>
              </LinearGradient>
            ) : (
              <View style={[s.filterBtn, s.filterBtnOff]}>
                <Text style={s.filterTxt}>{f.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* LİSTE */}
      <FlatList
        data={filtered}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrdersData(); }} colors={['#6366f1']} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <LinearGradient colors={['#ede9fe','#e0e7ff']} style={s.emptyIcon}>
              <Ionicons name="receipt-outline" size={32} color="#6366f1" />
            </LinearGradient>
            <Text style={s.emptyTitle}>{t('orders.notFound')}</Text>
            <Text style={s.emptySub}>{t('orders.noTransactionsInCategory')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS[item.status] || STATUS.failed;
          const logo = getOperatorLogo(item.package_operator || item.package?.operator, logoOverrides);
          return (
            <TouchableOpacity style={s.card} onPress={() => setSelected(item)} activeOpacity={0.82}>
              {logo ? (
                <View style={s.cardLogoWrap}>
                  <Image source={logo} style={s.cardLogo} resizeMode="contain" />
                </View>
              ) : (
                <LinearGradient colors={cfg.colors} style={s.cardIcon}>
                  <Ionicons name="storefront-outline" size={18} color="#fff" />
                </LinearGradient>
              )}
              <View style={s.cardBody}>
                <Text style={s.cardPkg} numberOfLines={1}>{item.package_name_tr || item.package?.name_tr || t('orders.defaultPackage')}</Text>
                <Text style={s.cardPhone}>{item.phone_number || '—'}</Text>
                <Text style={s.cardDate}>{safeDate(item.created_at)}</Text>
              </View>
              <View style={s.cardRight}>
                <Text style={s.cardAmount}>{parseFloat(item.amount || 0).toFixed(2)} ₺</Text>
                <Ionicons
                  name={cfg.icon as any}
                  size={18}
                  color={cfg.text}
                />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* DEKONT ÖNİZLEME MODAL */}
      <Modal visible={!!receiptOrder} transparent animationType="slide">
        <View style={s.receiptModalWrap}>
          <View style={s.receiptModalHeader}>
            <Text style={s.receiptModalTitle}>{t('orders.receiptPreview')}</Text>
            <View style={s.receiptModalActions}>
              <TouchableOpacity onPress={() => { if(receiptOrder) downloadReceipt(receiptOrder); }} style={s.receiptModalBtn}>
                <Ionicons name="share-outline" size={20} color="#6366f1" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { if(receiptOrder) printReceipt(receiptOrder); }} style={s.receiptModalBtn}>
                <Ionicons name="print-outline" size={20} color="#6366f1" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setReceiptOrder(null)} style={s.receiptModalClose}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
          <WebView
            source={{ html: receiptOrder ? generateReceiptHtml(receiptOrder) : '' }}
            style={s.receiptWebView}
            scrollEnabled={true}
          />
        </View>
      </Modal>

      {/* DETAY MODAL — BOTTOM SHEET */}
      <Modal visible={!!selected} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.overlayBg} activeOpacity={1} onPress={() => setSelected(null)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{t('orders.orderDetail')}</Text>
              <TouchableOpacity onPress={() => setSelected(null)} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selected && (() => {
              const cfg = STATUS[selected.status] || STATUS.failed;
              return (
                <>
                  <LinearGradient colors={cfg.colors} style={s.sheetBadge} start={{ x:0, y:0 }} end={{ x:1, y:0 }}>
                    <LinearGradient colors={['rgba(255,255,255,0.3)','rgba(255,255,255,0.1)']} style={s.sheetBadgeIcon}>
                      <Ionicons name={cfg.icon as any} size={22} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sheetBadgePkg} numberOfLines={1}>{selected.package_name_tr || selected.package?.name_tr || t('orders.defaultPackage')}</Text>
                      <Text style={s.sheetBadgeOp}>{selected.package_operator || selected.package?.operator || '—'}</Text>
                    </View>
                    <Text style={s.sheetBadgeAmt}>{parseFloat(selected.amount || 0).toFixed(2)} ₺</Text>
                  </LinearGradient>

                  <View style={s.detailList}>
                    <DetailRow icon="call-outline"    label={t('orders.number')}  value={selected.phone_number || '—'} />
                    <DetailRow icon="layers-outline"  label={t('orders.status')}   value={cfg.label} valueColor={cfg.text} />
                    <DetailRow icon="calendar-outline" label={t('orders.date')}  value={safeDateFull(selected.created_at)} />
                    <DetailRow icon="pricetag-outline" label={t('orders.salePrice')} value={`${parseFloat(selected.satis_fiyati || selected.amount || 0).toFixed(2)} ₺`} />
                    {(() => {
                      const satisFiyati = parseFloat(selected.satis_fiyati || 0);
                      const bayiMaaliyet = parseFloat(selected.bayi_maaliyet || selected.amount || 0);
                      const kar = satisFiyati > 0 ? Math.max(0, satisFiyati - bayiMaaliyet) : 0;
                      return kar > 0 ? <DetailRow icon="trending-up-outline" label={t('orders.profit')} value={`+${kar.toFixed(2)} ₺`} valueColor="#10b981" /> : null;
                    })()}
                  </View>

                  <View style={s.receiptRow}>
                    <TouchableOpacity style={s.receiptBtn} onPress={() => downloadReceipt(selected)}>
                      <LinearGradient colors={['#4f46e5','#7c3aed']} style={s.receiptBtnInner} start={{x:0,y:0}} end={{x:1,y:0}}>
                        <Ionicons name="share-outline" size={17} color="#fff" />
                        <Text style={s.receiptBtnTxt}>{t('orders.share')}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.receiptBtnOutline} onPress={() => { setSelected(null); setReceiptOrder(selected); }}>
                      <Ionicons name="eye-outline" size={17} color="#6366f1" />
                      <Text style={s.receiptBtnOutlineTxt}>{t('orders.viewReceipt')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.receiptBtnOutline} onPress={() => printReceipt(selected)}>
                      <Ionicons name="print-outline" size={17} color="#6366f1" />
                      <Text style={s.receiptBtnOutlineTxt}>{t('orders.print')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
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
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 22, overflow: 'hidden' },
  dec1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', top: -50, right: -50 },
  dec2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -20, left: -20 },
  hTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 10 },

  statRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 6, marginBottom: 10 },
  statPill: { flex: 1, alignItems: 'center', gap: 2 },
  statPillVal: { color: '#fff', fontSize: 15, fontWeight: '900' },
  statPillLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700' },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  searchInput: { flex: 1, fontSize: 14, color: '#fff', fontWeight: '600' },

  filterRow: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterWrap: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  filterBtn: { paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  filterBtnOff: { backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0' },
  filterTxt: { fontSize: 12, fontWeight: '700', color: '#334155' },
  filterTxtActive: { fontSize: 12, fontWeight: '800', color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  cardIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardLogoWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cardLogo: { width: 36, height: 36 },
  cardBody: { flex: 1, gap: 2 },
  cardPkg: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  cardPhone: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  cardDate: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardAmount: { fontSize: 15, fontWeight: '900', color: '#1e293b' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeTxt: { fontSize: 10, fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#334155' },
  emptySub: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 44 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },

  sheetBadge: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  sheetBadgeIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sheetBadgePkg: { color: '#fff', fontSize: 14, fontWeight: '800' },
  sheetBadgeOp: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  sheetBadgeAmt: { color: '#fff', fontSize: 18, fontWeight: '900' },

  receiptRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  receiptBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  receiptBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13 },
  receiptBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  receiptBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 14, borderWidth: 2, borderColor: '#6366f1', paddingVertical: 13 },
  receiptBtnOutlineTxt: { color: '#6366f1', fontSize: 12, fontWeight: '800' },

  receiptModalWrap: { flex: 1, backgroundColor: '#fff' },
  receiptModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  receiptModalTitle: { fontSize: 17, fontWeight: '900', color: '#1e293b' },
  receiptModalActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  receiptModalBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center' },
  receiptModalClose: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  receiptWebView: { flex: 1, backgroundColor: '#f1f5f9' },

  detailList: { gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginEnd: 12 },
  detailLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '700', width: 70 },
  detailValue: { flex: 1, color: '#1e293b', fontSize: 13, fontWeight: '700', textAlign: 'right' },
});
