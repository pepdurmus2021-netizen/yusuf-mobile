import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { API_URL, apiFetch, safeDateFull } from '../../lib/config';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

type Tab = 'orders' | 'bills' | 'balance';
type Range = 7 | 30 | 90;

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  completed:  { color: '#10b981', bg: '#f0fdf4' },
  processing: { color: '#f59e0b', bg: '#fffbeb' },
  failed:     { color: '#ef4444', bg: '#fef2f2' },
};

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const cfg = STATUS_CFG[status] || { color: '#64748b', bg: '#f1f5f9' };
  return (
    <View style={[st.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[st.badgeTxt, { color: cfg.color }]}>{label}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const isAnaBayi = user?.role === 'ana_bayi';

  const [tab, setTab] = useState<Tab>('orders');
  const [range, setRange] = useState<Range>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [ordersSummary, setOrdersSummary] = useState({ orderCount: 0, totalRevenue: 0, totalProfit: 0, totalCost: 0 });
  const [ordersRows, setOrdersRows] = useState<any[]>([]);
  const [billsSummary, setBillsSummary] = useState({ billCount: 0, totalAmount: 0 });
  const [billsRows, setBillsRows] = useState<any[]>([]);
  const [balanceSummary, setBalanceSummary] = useState({ totalCredit: 0, totalDebit: 0, netChange: 0 });
  const [balanceRows, setBalanceRows] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    if (!token) { setLoading(false); setRefreshing(false); return; }
    const from = todayISO(-(range - 1));
    const to = todayISO(0);
    const qs = `from=${from}&to=${to}`;

    const results = await Promise.allSettled([
      apiFetch(`${API_URL}/api/reports/orders?${qs}&pageSize=50`, token),
      apiFetch(`${API_URL}/api/reports/bills?${qs}`, token),
      apiFetch(`${API_URL}/api/reports/balance?${qs}`, token),
    ]);

    const [ordersRes, billsRes, balanceRes] = results;
    if (ordersRes.status === 'fulfilled') {
      setOrdersSummary(ordersRes.value.data.summary);
      setOrdersRows(ordersRes.value.data.rows || []);
    }
    if (billsRes.status === 'fulfilled') {
      setBillsSummary(billsRes.value.data.summary);
      setBillsRows(billsRes.value.data.rows || []);
    }
    if (balanceRes.status === 'fulfilled') {
      setBalanceSummary(balanceRes.value.data.summary);
      setBalanceRows(balanceRes.value.data.rows || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [token, range]);

  useEffect(() => { setLoading(true); fetchAll(); }, [fetchAll]);

  const rows = tab === 'orders' ? ordersRows : tab === 'bills' ? billsRows : balanceRows;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'orders', label: t('reports.tabOrders') },
    { key: 'bills', label: t('reports.tabBills') },
    { key: 'balance', label: t('reports.tabBalance') },
  ];

  if (loading) return (
    <LinearGradient colors={['#4f46e5','#7c3aed']} style={st.loadWrap}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={st.loadTxt}>{t('common.loading')}</Text>
    </LinearGradient>
  );

  return (
    <View style={st.root}>
      <LinearGradient colors={['#4f46e5','#7c3aed','#a855f7']} style={st.header} start={{ x:0, y:0 }} end={{ x:1, y:1 }}>
        <View style={st.dec1} /><View style={st.dec2} />
        <Text style={st.hTitle}>{t('reports.title')}</Text>
        <View style={st.rangeRow}>
          {[7, 30, 90].map(r => (
            <TouchableOpacity key={r} onPress={() => setRange(r as Range)} style={st.rangeWrap}>
              {range === r ? (
                <View style={[st.rangeBtn, st.rangeBtnActive]}>
                  <Text style={st.rangeTxtActive}>{t('reports.lastNDays', { count: r })}</Text>
                </View>
              ) : (
                <View style={st.rangeBtn}>
                  <Text style={st.rangeTxt}>{t('reports.lastNDays', { count: r })}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <View style={st.summaryRow}>
        <SummaryCard icon="receipt-outline" label={t('reports.orderCount')} value={String(ordersSummary.orderCount)} />
        <SummaryCard icon="cash-outline" label={t('reports.totalRevenue')} value={`${ordersSummary.totalRevenue.toFixed(0)} ₺`} />
        <SummaryCard icon="document-text-outline" label={t('reports.billTotal')} value={`${billsSummary.totalAmount.toFixed(0)} ₺`} />
        <SummaryCard icon="wallet-outline" label={t('reports.balanceChange')} value={`${balanceSummary.netChange.toFixed(0)} ₺`} valueColor={balanceSummary.netChange >= 0 ? '#10b981' : '#ef4444'} />
      </View>

      <View style={st.tabRow}>
        {TABS.map(tb => (
          <TouchableOpacity key={tb.key} onPress={() => setTab(tb.key)} style={st.tabItem}>
            <Text style={[st.tabTxt, tab === tb.key && st.tabTxtActive]}>{tb.label}</Text>
            {tab === tb.key && <View style={st.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item, i) => item.id || i.toString()}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} colors={['#6366f1']} />}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="bar-chart-outline" size={40} color="#cbd5e1" />
            <Text style={st.emptyTxt}>{t('reports.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (tab === 'orders') {
            return (
              <View style={st.card}>
                <View style={st.cardBody}>
                  <Text style={st.cardTitle} numberOfLines={1}>{item.package_name_tr || item.package?.name_tr || t('orders.defaultPackage')}</Text>
                  {isAnaBayi && <Text style={st.cardSub}>{item.user?.firma_adi || item.user?.name || '—'}</Text>}
                  <Text style={st.cardSub}>{item.phone_number || item.game_id || '—'}</Text>
                  <Text style={st.cardDate}>{safeDateFull(item.created_at)}</Text>
                </View>
                <View style={st.cardRight}>
                  <Text style={st.cardAmount}>{parseFloat(item.price ?? item.amount ?? 0).toFixed(2)} ₺</Text>
                  <StatusBadge status={item.status} label={t(`home.${item.status === 'processing' ? 'pending' : item.status === 'failed' ? 'cancelled' : 'completed'}`)} />
                </View>
              </View>
            );
          }
          if (tab === 'bills') {
            return (
              <View style={st.card}>
                <View style={st.cardBody}>
                  <Text style={st.cardTitle} numberOfLines={1}>{item.company_name || '—'}</Text>
                  {isAnaBayi && <Text style={st.cardSub}>{item.user?.firma_adi || item.user?.name || '—'}</Text>}
                  <Text style={st.cardSub}>{item.customer_code || '—'}</Text>
                  <Text style={st.cardDate}>{safeDateFull(item.created_at)}</Text>
                </View>
                <View style={st.cardRight}>
                  <Text style={st.cardAmount}>{parseFloat(item.amount || 0).toFixed(2)} ₺</Text>
                  <StatusBadge status={item.status} label={t(`home.${item.status === 'processing' ? 'pending' : item.status === 'failed' ? 'cancelled' : 'completed'}`)} />
                </View>
              </View>
            );
          }
          const positive = parseFloat(item.amount) >= 0;
          return (
            <View style={st.card}>
              <View style={st.cardBody}>
                <Text style={st.cardTitle}>{t(`reports.ledgerType.${item.type}`, item.type)}</Text>
                {isAnaBayi && <Text style={st.cardSub}>{item.user?.firma_adi || item.user?.name || '—'}</Text>}
                <Text style={st.cardDate}>{safeDateFull(item.created_at)}</Text>
              </View>
              <View style={st.cardRight}>
                <Text style={[st.cardAmount, { color: positive ? '#10b981' : '#ef4444' }]}>{parseFloat(item.amount).toFixed(2)} ₺</Text>
                <Text style={st.cardSub}>{t('reports.balanceAfter')}: {parseFloat(item.balance_after).toFixed(2)} ₺</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

function SummaryCard({ icon, label, value, valueColor }: { icon: any; label: string; value: string; valueColor?: string }) {
  return (
    <View style={st.sumCard}>
      <Ionicons name={icon} size={15} color="#6366f1" />
      <Text style={[st.sumVal, valueColor ? { color: valueColor } : {}]} numberOfLines={1}>{value}</Text>
      <Text style={st.sumLbl} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 22, overflow: 'hidden' },
  dec1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', top: -50, right: -50 },
  dec2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -20, left: -20 },
  hTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 12 },

  rangeRow: { flexDirection: 'row', gap: 8 },
  rangeWrap: { flex: 1 },
  rangeBtn: { paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  rangeBtnActive: { backgroundColor: '#fff' },
  rangeTxt: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  rangeTxtActive: { fontSize: 12, fontWeight: '800', color: '#6366f1' },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingTop: 12, gap: 8 },
  sumCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, gap: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  sumVal: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  sumLbl: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },

  tabRow: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, marginTop: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabTxt: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  tabTxtActive: { color: '#6366f1' },
  tabIndicator: { marginTop: 8, height: 2.5, width: '60%', backgroundColor: '#6366f1', borderRadius: 2 },

  card: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  cardSub: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  cardDate: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardAmount: { fontSize: 15, fontWeight: '900', color: '#1e293b' },

  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  badgeTxt: { fontSize: 10, fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTxt: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
});
