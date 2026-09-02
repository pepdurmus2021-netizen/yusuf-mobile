import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { apiFetch, API_URL } from '../../lib/config';

const STATUS_COLOR: Record<string, string> = {
  completed: '#10b981',
  pending: '#f59e0b',
  processing: '#f59e0b',
  cancelled: '#ef4444',
};
function getStatusLabels(): Record<string, string> {
  return {
    completed: i18n.t('home.completed'),
    pending: i18n.t('home.pending'),
    processing: i18n.t('dealers.processing'),
    cancelled: i18n.t('home.cancelled'),
  };
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DealersScreen() {
  const { t } = useTranslation();
  const STATUS_LABEL = getStatusLabels();
  const insets = useSafeAreaInsets();
  const { token, user, updateUser } = useAuth();
  const { myDealers, anaBayiStats, dealerEarnings, fetchMyDealers, fetchAnaBayiStats, transferBalance, addDealer, fetchDealerEarnings } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [actionDealer, setActionDealer] = useState<any>(null);

  // Modaller
  const [transferModal, setTransferModal] = useState<any>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);

  const [detailDealer, setDetailDealer] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'orders' | 'earnings'>('info');
  const [detailLoading, setDetailLoading] = useState(false);

  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [adding, setAdding] = useState(false);
  const [debtModal, setDebtModal] = useState<any>(null);
  const [debtAmount, setDebtAmount] = useState('');
  const [debtLoading, setDebtLoading] = useState(false);

  // Fiyat ayarları
  const [priceModal, setPriceModal] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [myGroup, setMyGroup] = useState<any>(null);
  const [myRules, setMyRules] = useState<any[]>([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState({ operator: '', category: '', margin_type: 'percent', margin_value: '' });
  const [savingRule, setSavingRule] = useState(false);

  const loadData = async () => {
    if (!token) return;
    try {
      await Promise.all([fetchMyDealers(token), fetchAnaBayiStats(token)]);
    } catch (e) {
      console.error('Yüklenemedi:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openPriceModal = async () => {
    setPriceModal(true);
    setPriceLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/api/ana-bayi/my-price-group`, token);
      setMyGroup(res.data?.group || null);
      setMyRules(res.data?.rules || []);
    } catch (e) {
      console.error('Fiyat grubu yüklenemedi:', e);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleSaveRule = async () => {
    if (!ruleForm.margin_value) return Alert.alert(t('common.error'), t('dealers.enterMargin'));
    setSavingRule(true);
    try {
      await apiFetch(`${API_URL}/api/ana-bayi/my-price-group/rules`, token, {
        method: 'POST',
        body: JSON.stringify({
          operator: ruleForm.operator || null,
          category: ruleForm.category || null,
          margin_type: ruleForm.margin_type,
          margin_value: parseFloat(ruleForm.margin_value),
        }),
      });
      const res = await apiFetch(`${API_URL}/api/ana-bayi/my-price-group`, token);
      setMyRules(res.data?.rules || []);
      setShowRuleForm(false);
      setRuleForm({ operator: '', category: '', margin_type: 'percent', margin_value: '' });
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('dealers.saveFailed'));
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await apiFetch(`${API_URL}/api/ana-bayi/my-price-group/rules/${ruleId}`, token, { method: 'DELETE' });
      setMyRules(myRules.filter((r: any) => r.id !== ruleId));
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('dealers.deleteFailed'));
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [token]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const openDetail = async (dealer: any) => {
    setDetailDealer(dealer);
    setDetailTab('info');
    setDetailLoading(true);
    try {
      await fetchDealerEarnings(token!, dealer.id);
    } catch (e) {
      console.error('Kazanç yüklenemedi:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) return Alert.alert(t('common.error'), t('dealers.enterValidAmount'));
    if (!transferModal) return;
    setTransferring(true);
    try {
      await transferBalance(token!, transferModal.id, amount);
      if (user) updateUser({ balance: parseFloat(String(user.balance)) - amount });
      Alert.alert(t('profile.successTitle'), t('dealers.transferredMessage', { name: transferModal.name, amount: amount.toLocaleString('tr-TR') }));
      setTransferModal(null);
      setTransferAmount('');
      loadData();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('dealers.transferFailed'));
    } finally {
      setTransferring(false);
    }
  };

  const handleGiveDebt = async () => {
    const amount = parseFloat(debtAmount);
    if (!amount || amount <= 0) return Alert.alert(t('common.error'), t('dealers.enterValidAmount'));
    if (!debtModal) return;
    setDebtLoading(true);
    try {
      await apiFetch(`${API_URL}/api/ana-bayi/give-debt/${debtModal.id}`, token!, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      if (user) updateUser({ balance: parseFloat(String(user.balance)) - amount });
      Alert.alert(t('profile.successTitle'), t('dealers.debtGivenMessage', { name: debtModal.name, amount: amount.toLocaleString('tr-TR') }));
      setDebtModal(null);
      setDebtAmount('');
      loadData();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('login.actionFailed'));
    } finally {
      setDebtLoading(false);
    }
  };

  const handleAddDealer = async () => {
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      return Alert.alert(t('common.error'), t('dealers.requiredFields'));
    }
    if (addForm.password.length < 6) {
      return Alert.alert(t('common.error'), t('profile.passwordTooShort'));
    }
    setAdding(true);
    try {
      await addDealer(token!, {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim() || undefined,
        password: addForm.password,
      });
      Alert.alert(t('profile.successTitle'), t('dealers.dealerAddedMessage', { name: addForm.name }));
      setAddModal(false);
      setAddForm({ name: '', email: '', phone: '', password: '' });
      loadData();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('dealers.addFailed'));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <LinearGradient colors={['#f97316', '#ea580c', '#c2410c']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>{t('dealers.title')}</Text>
            <Text style={styles.headerSub}>{t('dealers.subDealerCount', { count: myDealers.length })}</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openPriceModal} activeOpacity={0.85}>
            <Ionicons name="pricetag" size={16} color="#f97316" />
            <Text style={styles.addBtnText}>{t('dealers.prices')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
      >
        {/* İstatistikler */}
        {anaBayiStats && (
          <View style={styles.statsRow}>
            <StatCard label={t('dealers.subDealer')} value={anaBayiStats.dealerCount} color="#6366f1" />
            <StatCard label={t('dealers.totalOrders')} value={anaBayiStats.totalOrders} color="#10b981" />
            <StatCard label={t('dealers.earnings')} value={`${parseFloat(anaBayiStats.totalEarnings || 0).toLocaleString('tr-TR')} ₺`} color="#f59e0b" />
          </View>
        )}

        {/* Kendi bakiyem */}
        <View style={styles.myBalanceCard}>
          <Text style={styles.myBalanceLabel}>{t('dealers.myBalance')}</Text>
          <Text style={styles.myBalanceAmount}>
            {parseFloat(String(user?.balance || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {user?.currency || 'TRY'}
          </Text>
          <Text style={styles.myBalanceSub}>{t('dealers.transferHint')}</Text>
        </View>

        {/* Bayi Listesi */}
        <View style={styles.listHeadRow}>
          <Text style={styles.sectionTitle}>{t('dealers.subDealers')}</Text>
          <TouchableOpacity style={styles.inlineAddBtn} onPress={() => setAddModal(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={15} color="#f97316" />
            <Text style={styles.inlineAddText}>{t('dealers.addDealer')}</Text>
          </TouchableOpacity>
        </View>

        {myDealers.length > 0 && (
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('dealers.searchPlaceholder')}
              placeholderTextColor="#cbd5e1"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {myDealers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>{t('dealers.noSubDealers')}</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setAddModal(true)}>
              <Text style={styles.emptyAddText}>+ {t('dealers.addDealer')}</Text>
            </TouchableOpacity>
          </View>
        ) : (() => {
          const q = search.trim().toLowerCase();
          const filteredDealers = q
            ? myDealers.filter(d => (d.name || '').toLowerCase().includes(q) || (d.email || '').toLowerCase().includes(q) || (d.phone || '').includes(q))
            : myDealers;
          if (filteredDealers.length === 0) {
            return <Text style={styles.emptyTabText}>{t('orders.notFound')}</Text>;
          }
          return filteredDealers.map(dealer => (
            <TouchableOpacity key={dealer.id} style={styles.dealerCard} onPress={() => openDetail(dealer)} activeOpacity={0.8}>
              <View style={styles.dealerLeft}>
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.dealerAvatar}>
                  <Text style={styles.dealerAvatarText}>{dealer.name?.[0]?.toUpperCase() || '?'}</Text>
                </LinearGradient>
                <View>
                  <Text style={styles.dealerName}>{dealer.name}</Text>
                  <Text style={styles.dealerEmail}>{dealer.email}</Text>
                  {dealer.phone ? <Text style={styles.dealerPhone}>{dealer.phone}</Text> : null}
                </View>
              </View>
              <View style={styles.dealerRight}>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.dealerBalance}>
                    {parseFloat(dealer.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={styles.dealerCurrency}>{dealer.currency || 'TRY'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: dealer.is_active ? '#d1fae5' : '#fee2e2' }]}>
                    <Text style={[styles.statusText, { color: dealer.is_active ? '#065f46' : '#991b1b' }]}>
                      {dealer.is_active ? t('dealers.active') : t('dealers.inactive')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={(e) => { e.stopPropagation(); setActionDealer(dealer); }}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ));
        })()}
      </ScrollView>

      {/* ── Hızlı Aksiyon Modal (satır-içi "..." menüsü) ── */}
      <Modal visible={!!actionDealer} transparent animationType="fade" onRequestClose={() => setActionDealer(null)}>
        <TouchableOpacity style={styles.actionOverlay} activeOpacity={1} onPress={() => setActionDealer(null)}>
          <View style={styles.actionSheet}>
            <View style={styles.actionHead}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.actionAvatar}>
                <Text style={styles.dealerAvatarText}>{actionDealer?.name?.[0]?.toUpperCase() || '?'}</Text>
              </LinearGradient>
              <Text style={styles.actionName} numberOfLines={1}>{actionDealer?.name}</Text>
            </View>

            <TouchableOpacity style={styles.actionRow} onPress={() => { setTransferModal(actionDealer); setTransferAmount(''); setActionDealer(null); }}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="swap-horizontal" size={18} color="#10b981" />
              </View>
              <Text style={styles.actionRowText}>{t('dealers.transferBalance')}</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => { setDebtModal(actionDealer); setDebtAmount(''); setActionDealer(null); }}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#fffbeb' }]}>
                <Ionicons name="card" size={18} color="#f59e0b" />
              </View>
              <Text style={styles.actionRowText}>{t('dealers.giveDebt')}</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => { const d = actionDealer; setActionDealer(null); openDetail(d); }}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#eef2ff' }]}>
                <Ionicons name="person-circle-outline" size={18} color="#6366f1" />
              </View>
              <Text style={styles.actionRowText}>{t('dealers.info')}</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCancel} onPress={() => setActionDealer(null)}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Bayi Ekle Modal ── */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>{t('dealers.addNewDealer')}</Text>
              <TouchableOpacity onPress={() => setAddModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{t('dealers.nameRequired')}</Text>
              <TextInput
                style={styles.input}
                value={addForm.name}
                onChangeText={v => setAddForm(f => ({ ...f, name: v }))}
                placeholder="Ahmet Yılmaz"
                placeholderTextColor="#d1d5db"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{t('dealers.emailRequired')}</Text>
              <TextInput
                style={styles.input}
                value={addForm.email}
                onChangeText={v => setAddForm(f => ({ ...f, email: v }))}
                placeholder="bayi@example.com"
                placeholderTextColor="#d1d5db"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{t('login.phonePlaceholder')}</Text>
              <TextInput
                style={styles.input}
                value={addForm.phone}
                onChangeText={v => setAddForm(f => ({ ...f, phone: v }))}
                placeholder="05xx xxx xx xx"
                placeholderTextColor="#d1d5db"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{t('dealers.passwordRequiredHint')}</Text>
              <TextInput
                style={styles.input}
                value={addForm.password}
                onChangeText={v => setAddForm(f => ({ ...f, password: v }))}
                placeholder="••••••"
                placeholderTextColor="#d1d5db"
                secureTextEntry
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModal(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddDealer} disabled={adding} style={{ flex: 1 }}>
                <LinearGradient colors={['#f97316', '#ea580c']} style={styles.confirmBtn}>
                  {adding
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.confirmText}>{t('dealers.add')}</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Bayi Detay Modal ── */}
      <Modal visible={!!detailDealer} transparent animationType="slide" onRequestClose={() => setDetailDealer(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />

            {detailDealer && (
              <>
                <View style={styles.modalHeader}>
                  <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>{detailDealer.name?.[0]?.toUpperCase() || '?'}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{detailDealer.name}</Text>
                    <Text style={styles.modalEmail}>{detailDealer.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailDealer(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Sekmeler */}
                <View style={styles.tabRow}>
                  {(['info', 'orders', 'earnings'] as const).map(tab => (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.tab, detailTab === tab && styles.tabActive]}
                      onPress={() => setDetailTab(tab)}
                    >
                      <Text style={[styles.tabText, detailTab === tab && styles.tabTextActive]}>
                        {tab === 'info' ? t('dealers.info') : tab === 'orders' ? t('dealers.orders') : t('dealers.earnings')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {detailLoading ? (
                  <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                    <ActivityIndicator color="#6366f1" />
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                    {/* Bilgi sekmesi */}
                    {detailTab === 'info' && (
                      <>
                        <View style={styles.infoRow}>
                          <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>{t('balance.amount')}</Text>
                            <Text style={styles.infoValue}>
                              {parseFloat(detailDealer.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {detailDealer.currency}
                            </Text>
                          </View>
                          <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>{t('orders.status')}</Text>
                            <Text style={[styles.infoValue, { color: detailDealer.is_active ? '#10b981' : '#ef4444' }]}>
                              {detailDealer.is_active ? t('dealers.active') : t('dealers.inactive')}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => { setDetailDealer(null); setTransferModal(detailDealer); setTransferAmount(''); }}
                          >
                            <LinearGradient colors={['#10b981', '#059669']} style={styles.transferBtnGrad}>
                              <Ionicons name="swap-horizontal" size={18} color="#fff" />
                              <Text style={styles.transferBtnText}>{t('dealers.transferBalance')}</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => { setDetailDealer(null); setDebtModal(detailDealer); setDebtAmount(''); }}
                          >
                            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.transferBtnGrad}>
                              <Ionicons name="card" size={18} color="#fff" />
                              <Text style={styles.transferBtnText}>{t('dealers.giveDebt')}</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}

                    {/* Siparişler sekmesi */}
                    {detailTab === 'orders' && (
                      <View style={{ paddingBottom: 8 }}>
                        {!dealerEarnings?.orders?.length ? (
                          <Text style={styles.emptyTabText}>{t('home.noOrders')}</Text>
                        ) : dealerEarnings.orders.map((order: any) => (
                          <View key={order.id} style={styles.orderRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.orderName}>{order.package?.name_tr || order.order_type}</Text>
                              <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('tr-TR')}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                              <Text style={styles.orderAmount}>{parseFloat(order.amount || 0).toLocaleString('tr-TR')} ₺</Text>
                              <View style={[styles.orderBadge, { backgroundColor: (STATUS_COLOR[order.status] || '#6b7280') + '20' }]}>
                                <Text style={[styles.orderBadgeText, { color: STATUS_COLOR[order.status] || '#6b7280' }]}>
                                  {STATUS_LABEL[order.status] || order.status}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Kazanç sekmesi */}
                    {detailTab === 'earnings' && (
                      <View style={{ paddingBottom: 8 }}>
                        <View style={styles.earningsSummary}>
                          <View style={styles.earningsBox}>
                            <Text style={styles.earningsLabel}>{t('dealers.totalEarnings')}</Text>
                            <Text style={styles.earningsValue}>
                              {parseFloat(dealerEarnings?.totalEarning || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </Text>
                          </View>
                          <View style={styles.earningsBox}>
                            <Text style={styles.earningsLabel}>{t('home.completed')}</Text>
                            <Text style={[styles.earningsValue, { color: '#10b981' }]}>
                              {dealerEarnings?.completedCount || 0} / {dealerEarnings?.totalCount || 0}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.earningsNote}>
                          {t('dealers.earningsNote')}
                        </Text>
                        {dealerEarnings?.orders?.filter((o: any) => o.status === 'completed').map((order: any) => (
                          <View key={order.id} style={styles.orderRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.orderName}>{order.package?.name_tr || order.order_type}</Text>
                              <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('tr-TR')}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[styles.orderAmount, { color: '#10b981' }]}>
                                +{Math.max(0, parseFloat(order.bayi_maaliyet || 0) - parseFloat(order.ana_bayi_maaliyet || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Fiyat Ayarları Modal ── */}
      <Modal visible={priceModal} transparent animationType="slide" onRequestClose={() => { setPriceModal(false); setShowRuleForm(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '92%' }]}>
            <View style={styles.modalHandle} />

            {!showRuleForm ? (
              <>
                <View style={styles.modalTitleRow}>
                  <Text style={styles.modalTitle}>{t('dealers.priceSettings')}</Text>
                  <TouchableOpacity onPress={() => setPriceModal(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {priceLoading ? (
                  <ActivityIndicator color="#f97316" style={{ paddingVertical: 32 }} />
                ) : !myGroup ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Ionicons name="pricetag-outline" size={40} color="#d1d5db" />
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                      {t('dealers.noPriceGroup')}
                    </Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                    {/* Grup Bilgisi */}
                    <View style={{ backgroundColor: '#f0f0ff', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, color: '#6366f1', fontWeight: '700', marginBottom: 4 }}>{t('dealers.activePriceGroup')}</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b' }}>{myGroup.name}</Text>
                      <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                        {t('dealers.defaultMargin')}: {myGroup.margin_type === 'percent' ? `%${myGroup.margin_value}` : `+${myGroup.margin_value} ₺`}
                      </Text>
                    </View>

                    {/* Kural Listesi */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }}>{t('dealers.operatorCategoryRules')}</Text>
                      <TouchableOpacity onPress={() => { setShowRuleForm(true); setRuleForm({ operator: '', category: '', margin_type: 'percent', margin_value: '' }); }}
                        style={{ backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="add" size={14} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{t('dealers.addRule')}</Text>
                      </TouchableOpacity>
                    </View>

                    {myRules.length === 0 ? (
                      <Text style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
                        {t('dealers.noRules')}
                      </Text>
                    ) : myRules.map((rule: any) => {
                      const parts = [];
                      if (rule.operator) parts.push(rule.operator);
                      if (rule.category) parts.push(rule.category);
                      const label = parts.length ? parts.join(' + ') : t('dealers.allPackages');
                      return (
                        <View key={rule.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }}>{label}</Text>
                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                              {rule.margin_type === 'percent' ? `%${rule.margin_value}` : `+${rule.margin_value} ₺`} {t('dealers.add')}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteRule(rule.id)} style={{ padding: 6 }}>
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                <View style={styles.modalTitleRow}>
                  <TouchableOpacity onPress={() => setShowRuleForm(false)} style={styles.closeBtn}>
                    <Ionicons name="arrow-back" size={20} color="#6b7280" />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { flex: 1, marginStart: 8 }]}>{t('dealers.addRule')}</Text>
                </View>

                <Text style={[styles.priceNote, { marginBottom: 12 }]}>
                  {t('dealers.ruleFormHint')}
                </Text>

                {/* Operatör */}
                <Text style={styles.inputLabel}>{t('dealers.operatorOptional')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['', 'Turkcell', 'Vodafone', 'Avea', 'PUBG', 'Valorant', 'Free Fire', 'Google Play', 'Steam'].map(op => (
                      <TouchableOpacity key={op} onPress={() => setRuleForm({ ...ruleForm, operator: op })}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
                          borderColor: ruleForm.operator === op ? '#6366f1' : '#e5e7eb',
                          backgroundColor: ruleForm.operator === op ? '#eef2ff' : '#fff' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: ruleForm.operator === op ? '#6366f1' : '#6b7280' }}>
                          {op || t('dealers.allOption')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Kategori */}
                <Text style={styles.inputLabel}>{t('dealers.categoryOptional')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {[{ value: '', label: t('dealers.allOption') }, { value: 'gsm', label: 'GSM' }, { value: 'game', label: t('dealers.categoryGame') }, { value: 'topup', label: t('dealers.categoryTopup') }, { value: 'bill', label: t('dealers.categoryBill') }].map(cat => (
                    <TouchableOpacity key={cat.value} onPress={() => setRuleForm({ ...ruleForm, category: cat.value })}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
                        borderColor: ruleForm.category === cat.value ? '#6366f1' : '#e5e7eb',
                        backgroundColor: ruleForm.category === cat.value ? '#eef2ff' : '#fff' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: ruleForm.category === cat.value ? '#6366f1' : '#6b7280' }}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Marj Türü */}
                <Text style={styles.inputLabel}>{t('dealers.marginType')}</Text>
                <View style={[styles.tabRow, { marginBottom: 12 }]}>
                  {['percent', 'tl'].map(mt => (
                    <TouchableOpacity key={mt} style={[styles.tab, ruleForm.margin_type === mt && styles.tabActive]}
                      onPress={() => setRuleForm({ ...ruleForm, margin_type: mt })}>
                      <Text style={[styles.tabText, ruleForm.margin_type === mt && styles.tabTextActive]}>
                        {mt === 'percent' ? t('dealers.percentType') : t('dealers.fixedType')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Değer */}
                <Text style={styles.inputLabel}>{t('dealers.value')} {ruleForm.margin_type === 'percent' ? '(%)' : '(₺)'}</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 16 }]}
                  value={ruleForm.margin_value}
                  onChangeText={v => setRuleForm({ ...ruleForm, margin_value: v })}
                  keyboardType="numeric"
                  placeholder={ruleForm.margin_type === 'percent' ? 'örn: 3' : 'örn: 5'}
                  placeholderTextColor="#d1d5db"
                  autoFocus
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRuleForm(false)}>
                    <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveRule} disabled={savingRule || !ruleForm.margin_value} style={{ flex: 1 }}>
                    <LinearGradient colors={['#6366f1', '#8b5cf6']} style={[styles.confirmBtn, { opacity: !ruleForm.margin_value ? 0.5 : 1 }]}>
                      {savingRule ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmText}>{t('common.save')}</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Bakiye Transfer Modal ── */}
      <Modal visible={!!transferModal} transparent animationType="slide" onRequestClose={() => setTransferModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.transferTitle}>{t('dealers.transferBalance')}</Text>
            <Text style={styles.transferSub}>
              <Text style={{ fontWeight: '700', color: '#6366f1' }}>{transferModal?.name}</Text> {t('dealers.toDealer')}
            </Text>

            <View style={styles.amountWrap}>
              <TextInput
                style={styles.amountInput}
                value={transferAmount}
                onChangeText={setTransferAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#d1d5db"
                autoFocus
              />
              <Text style={styles.amountCurrency}>{user?.currency || 'TRY'}</Text>
            </View>

            <Text style={styles.availableText}>
              {t('dealers.available')}: {parseFloat(String(user?.balance || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {user?.currency}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTransferModal(null)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleTransfer} disabled={transferring} style={{ flex: 1 }}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.confirmBtn}>
                  {transferring
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.confirmText}>{t('dealers.transfer')}</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ── Borç Ver Modal ── */}
      <Modal visible={!!debtModal} transparent animationType="slide" onRequestClose={() => setDebtModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.transferTitle}>💳 {t('dealers.giveDebt')}</Text>
            <Text style={styles.transferSub}>
              <Text style={{ fontWeight: '700', color: '#f59e0b' }}>{debtModal?.name}</Text> {t('dealers.giveDebtToDealer')}
            </Text>
            <View style={styles.amountWrap}>
              <TextInput
                style={styles.amountInput}
                value={debtAmount}
                onChangeText={setDebtAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#d1d5db"
                autoFocus
              />
              <Text style={styles.amountCurrency}>{user?.currency || 'TRY'}</Text>
            </View>
            <Text style={styles.availableText}>
              {t('profile.balance')}: {parseFloat(String(user?.balance || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {user?.currency}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDebtModal(null)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGiveDebt} disabled={debtLoading} style={{ flex: 1 }}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.confirmBtn}>
                  {debtLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.confirmText}>{t('dealers.giveDebt')}</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#f97316' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginTop: 2 },
  myBalanceCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  myBalanceLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '700', marginBottom: 4 },
  myBalanceAmount: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
  myBalanceSub: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#374151', marginBottom: 10, letterSpacing: 0.3 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 20 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#9ca3af', marginTop: 12 },
  emptyAddBtn: { marginTop: 14, backgroundColor: '#fff7ed', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa' },
  emptyAddText: { fontSize: 14, fontWeight: '700', color: '#f97316' },
  dealerCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  dealerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dealerAvatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  dealerAvatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  dealerName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  dealerEmail: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  dealerPhone: { fontSize: 11, color: '#9ca3af' },
  dealerRight: { alignItems: 'flex-end', gap: 4 },
  dealerBalance: { fontSize: 16, fontWeight: '900', color: '#10b981' },
  dealerCurrency: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 20 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modalAvatar: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalAvatarText: { fontSize: 22, fontWeight: '900', color: '#fff' },
  modalName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  modalEmail: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  tabRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  tabTextActive: { color: '#1e293b' },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  infoBox: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14 },
  infoLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 4 },
  infoValue: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  transferBtn: { borderRadius: 16, overflow: 'hidden' },
  transferBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  transferBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  orderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  orderName: { fontSize: 13, fontWeight: '700', color: '#1e293b', maxWidth: 180 },
  orderDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  orderAmount: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  orderBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  orderBadgeText: { fontSize: 10, fontWeight: '700' },
  emptyTabText: { textAlign: 'center', color: '#9ca3af', paddingVertical: 24, fontWeight: '600' },
  earningsSummary: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  earningsBox: { flex: 1, backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14 },
  earningsLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 4 },
  earningsValue: { fontSize: 18, fontWeight: '900', color: '#10b981' },
  earningsNote: { fontSize: 11, color: '#9ca3af', marginBottom: 12, fontStyle: 'italic' },
  inputWrap: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#e5e7eb' },
  transferTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
  transferSub: { fontSize: 13, color: '#6b7280', marginBottom: 24 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 20, marginBottom: 8 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '900', color: '#1e293b', paddingVertical: 16 },
  amountCurrency: { fontSize: 18, fontWeight: '700', color: '#9ca3af' },
  availableText: { fontSize: 12, color: '#9ca3af', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 16, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#6b7280' },
  confirmBtn: { borderRadius: 16, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  priceNote: { fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pricePkgName: { fontSize: 13, fontWeight: '700', color: '#1e293b', maxWidth: 180 },
  pricePkgOp: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  priceFinal: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  priceMargin: { fontSize: 11, fontWeight: '700', color: '#10b981' },
});
