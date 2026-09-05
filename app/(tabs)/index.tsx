import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, RefreshControl, Image, Linking,
  Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { useFocusEffect , useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeDate, safeDateFull, API_URL } from '../../lib/config';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { WebView } from 'react-native-webview';
import { generateReceiptHtml, downloadReceipt, printReceipt, viewReceiptOnWeb } from '../../lib/receipt';

const ALL_OPERATORS = [
  { dbNames: ['turkcell','türkcell'],                       logo: null },
  { dbNames: ['vodafone'],                                  logo: null },
  { dbNames: ['turk telekom','türk telekom','turktelekom'], logo: null },
  { dbNames: ['roshan'],                                    logo: null },
  { dbNames: ['mtn'],                                       logo: null },
  { dbNames: ['awcc'],                                      logo: null },
  { dbNames: ['salaam'],                                    logo: null },
  { dbNames: ['etisalat'],                                  logo: null },
  { dbNames: ['pubg'],                                      logo: null },
  { dbNames: ['valorant'],                                  logo: null },
  { dbNames: ['free fire'],                                 logo: null },
  { dbNames: ['google play kart','google play'],            logo: null },
  { dbNames: ['clash'],                                     logo: null },
  { dbNames: ['ahlan'],                                     logo: null },
  { dbNames: ['soulchill','souLchill'],                     logo: null },
  { dbNames: ['hiya','hi̇ya'],                               logo: null },
  { dbNames: ['sugo'],                                      logo: null },
  { dbNames: ['yoho'],                                      logo: null },
  { dbNames: ['ditto'],                                     logo: require('../../assets/images/ditto.png') },
  { dbNames: ['jawaker'],                                   logo: require('../../assets/images/jawaker.png') },
  { dbNames: ['haki'],                                      logo: require('../../assets/images/haki.png') },
  { dbNames: ['haza'],                                      logo: require('../../assets/images/haza.png') },
  { dbNames: ['bigo'],                                      logo: require('../../assets/images/bigo.png') },
  { dbNames: ['tiktok','ti̇ktok'],                           logo: require('../../assets/images/tiktok.png') },
  { dbNames: ['tango'],                                     logo: require('../../assets/images/tango.png') },
  { dbNames: ['likee','li̇kee'],                             logo: require('../../assets/images/likee.png') },
  { dbNames: ['itunes kart','i̇tunes kart'],                 logo: require('../../assets/images/itunes.png') },
  { dbNames: ['paycell'],                                   logo: require('../../assets/images/paycell.png') },
  { dbNames: ['yalla ludo'],                                logo: require('../../assets/images/yalla-ludo.png') },
  { dbNames: ['tumile'],                                    logo: require('../../assets/images/tumile.png') },
  { dbNames: ['falla'],                                     logo: require('../../assets/images/falla.png') },
];

function getOperatorLogo(operatorName: string | undefined) {
  if (!operatorName) return null;
  const lower = operatorName.toLowerCase();
  return ALL_OPERATORS.find(op => op.dbNames.some(n => lower.includes(n)))?.logo || null;
}
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { t } = useTranslation();
  const { token, user, updateUser } = useAuth();
  const router = useRouter();
  const { orders: recentOrders, balanceRequests, fetchOrders, fetchBalanceRequests, anaBayiStats, fetchAnaBayiStats } = useAppStore();
  const isDealerParent = user?.role === 'ana_bayi';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('isBalanceVisible').then(val => {
      if (val !== null) setIsBalanceVisible(val === 'true');
    });
  }, []);

  useFocusEffect(useCallback(() => {
    setProfilePhoto(null);
    if (user?.id) AsyncStorage.getItem(`profilePhoto_${user.id}`).then(val => { if (val) setProfilePhoto(val); });
  }, []));

  const toggleBalanceVisibility = () => {
    const newState = !isBalanceVisible;
    setIsBalanceVisible(newState);
    AsyncStorage.setItem('isBalanceVisible', newState.toString());
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProfilePhoto(uri);
      if (user?.id) AsyncStorage.setItem(`profilePhoto_${user.id}`, uri);
    }
  };

  const fetchData = useCallback(async () => {
    if (!user?.id || !token) { setLoading(false); setRefreshing(false); return; }
    try {
      const results = await Promise.allSettled([
        fetchOrders(token),
        fetchBalanceRequests(token),
        supabase.from('users').select('balance').eq('id', user.id).single(),
        isDealerParent ? fetchAnaBayiStats(token) : Promise.resolve(),
      ]);
      const userRes = results[2];
      if (userRes.status === 'fulfilled' && (userRes.value as any)?.data) {
        updateUser({ balance: (userRes.value as any).data.balance });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isDealerParent]);

  useEffect(() => { if (user?.id) fetchData(); }, [user?.id]);

  useFocusEffect(useCallback(() => { if (user?.id) fetchData(); }, [user?.id]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const firstName = user?.name?.split(' ')[0] || t('profile.defaultUser');
  const balance = parseFloat(user?.balance?.toString() || '0');

  const completed = recentOrders.filter(o => o.status === 'completed').length;
  const pending = recentOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const cancelled = recentOrders.filter(o => o.status === 'cancelled' || o.status === 'failed').length;
  const totalSpent = recentOrders.filter(o => o.status === 'completed').reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);

  const todayStr = new Date().toDateString();
  const todaysOrders = recentOrders.filter(o => o.created_at && new Date(o.created_at).toDateString() === todayStr);
  const todayCount = todaysOrders.length;
  const todaySpent = todaysOrders.filter(o => o.status === 'completed').reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
  const todayPending = todaysOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  const pendingBalance = balanceRequests.filter(r => r.status === 'pending').length;
  const approvedBalance = balanceRequests.filter(r => r.status === 'approved').length;

  const quickActions = [
    { label: t('home.topUpBalance'), icon: 'logo-usd', colors: ['#6366f1', '#8b5cf6'] as const, route: '/(tabs)/balance' },
    { label: t('home.placeOrder'), icon: 'storefront', colors: ['#10b981', '#06b6d4'] as const, route: '/(tabs)/explore' },
    { label: t('home.history'), icon: 'stats-chart', colors: ['#f59e0b', '#f97316'] as const, route: '/(tabs)/orders' },
    { label: t('home.myAccount'), icon: 'shield-checkmark', colors: ['#ec4899', '#f43f5e'] as const, route: '/(tabs)/profile' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.loadingGrad}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />}
      >
        {/* HEADER */}
        <LinearGradient colors={['#4f46e5', '#7c3aed', '#a855f7']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.decorCircle3} />

          {/* ÜST SATIR: profil + isim sol | ikonlar sağ */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <TouchableOpacity style={styles.photoWrapper} onPress={pickPhoto}>
                {profilePhoto ? (
                  <Image key={user?.id} source={{ uri: profilePhoto }} style={styles.topPhoto} />
                ) : (
                  <LinearGradient colors={['#818cf8', '#c084fc']} style={styles.topPhotoPlaceholder}>
                    <Text style={styles.topPhotoInitial}>{firstName[0]?.toUpperCase()}</Text>
                  </LinearGradient>
                )}
                <View style={styles.editIcon}>
                  <Ionicons name="pencil" size={9} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={styles.topName} numberOfLines={1}>{user?.name || firstName}</Text>
            </View>
            <View style={styles.topBarRight}>
              <TouchableOpacity style={styles.topIconBtn} onPress={() => Linking.openURL('sms:05069690724')}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* BAKİYE KARTI */}
          <View style={styles.heroCard}>
            <View style={styles.heroCardHeader}>
              <Text style={styles.heroBalLabel}>{t('home.totalBalance')}</Text>
            </View>
            <View style={styles.heroAmountRow}>
              <Text style={styles.heroBalAmount} adjustsFontSizeToFit numberOfLines={1}>
                {isBalanceVisible
                  ? balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '••••••'}
              </Text>
              <Text style={styles.heroBalTL}> ₺</Text>
              <TouchableOpacity onPress={toggleBalanceVisibility} style={{ marginStart: 8, marginBottom: 2 }}>
                <Ionicons name={isBalanceVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color="#6366f1" />
              </TouchableOpacity>
            </View>
            {parseFloat((user as any)?.debt || 0) > 0 && (
              <View style={styles.debtBadge}>
                <Ionicons name="alert-circle" size={12} color="#ef4444" />
                <Text style={styles.debtText}>{t('home.debt')}: {parseFloat((user as any).debt).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* BUGÜN ÖZET KARTI */}
        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>{t('home.today')}</Text>
          <View style={styles.todayRow}>
            <View style={styles.todayStat}>
              <Text style={styles.todayVal}>{todayCount}</Text>
              <Text style={styles.todayLbl}>{t('home.todayOrders')}</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={styles.todayVal}>{isBalanceVisible ? todaySpent.toFixed(2) : '****'} ₺</Text>
              <Text style={styles.todayLbl}>{t('home.todaySpent')}</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={[styles.todayVal, todayPending > 0 && { color: '#f59e0b' }]}>{todayPending}</Text>
              <Text style={styles.todayLbl}>{t('home.todayPending')}</Text>
            </View>
          </View>

          {isDealerParent && anaBayiStats && (
            <>
              <View style={styles.todaySplit} />
              <View style={styles.todayRow}>
                <View style={styles.todayStat}>
                  <Text style={styles.todayVal}>{anaBayiStats.todayOrders ?? 0}</Text>
                  <Text style={styles.todayLbl}>{t('home.todayDealerOrders')}</Text>
                </View>
                <View style={styles.todayDivider} />
                <View style={styles.todayStat}>
                  <Text style={[styles.todayVal, { color: '#10b981' }]}>
                    {isBalanceVisible ? anaBayiStats.todayEarnings ?? '0.00' : '****'} ₺
                  </Text>
                  <Text style={styles.todayLbl}>{t('home.todayDealerProfit')}</Text>
                </View>
                <View style={styles.todayDivider} />
                <View style={styles.todayStat}>
                  <Text style={[styles.todayVal, (anaBayiStats.todayPendingOrders ?? 0) > 0 && { color: '#f59e0b' }]}>
                    {anaBayiStats.todayPendingOrders ?? 0}
                  </Text>
                  <Text style={styles.todayLbl}>{t('home.todayDealerPending')}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {isDealerParent && (
          <TouchableOpacity style={styles.dealersBanner} onPress={() => router.push('/(tabs)/dealers')} activeOpacity={0.85}>
            <LinearGradient colors={['#f97316', '#ea580c']} style={styles.dealersBannerIcon}>
              <Ionicons name="people" size={20} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.dealersBannerTitle}>{t('dealers.title')}</Text>
              <Text style={styles.dealersBannerSub}>{t('dealers.subDealerCount', { count: anaBayiStats?.dealerCount ?? 0 })}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#f97316" />
          </TouchableOpacity>
        )}

        {/* HIZLI İŞLEM BUTONLARI */}
        <View style={styles.quickRow}>
          {quickActions.map((a, i) => (
            <TouchableOpacity key={i} style={styles.quickBtn} onPress={() => router.push(a.route as any)}>
              <LinearGradient colors={a.colors} style={styles.quickIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name={a.icon as any} size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>


        {/* SİPARİŞ ÖZETİ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.orderSummary')}</Text>
          <View style={styles.summaryRow}>
            <LinearGradient colors={['#10b981','#059669']} style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <Ionicons name="checkmark-circle" size={18} color="rgba(255,255,255,0.9)" />
                <Text style={styles.summaryVal}>{completed}</Text>
              </View>
              <Text style={styles.summaryLbl}>{t('home.completed')}</Text>
            </LinearGradient>
            <LinearGradient colors={['#f59e0b','#d97706']} style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <Ionicons name="time" size={18} color="rgba(255,255,255,0.9)" />
                <Text style={styles.summaryVal}>{pending}</Text>
              </View>
              <Text style={styles.summaryLbl}>{t('home.pending')}</Text>
            </LinearGradient>
            <LinearGradient colors={['#ef4444','#dc2626']} style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.9)" />
                <Text style={styles.summaryVal}>{cancelled}</Text>
              </View>
              <Text style={styles.summaryLbl}>{t('home.cancelled')}</Text>
            </LinearGradient>
          </View>
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.totalSpentCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View>
              <Text style={styles.totalSpentLbl}>{t('home.totalSpent')}</Text>
              <Text style={styles.totalSpentVal}>
                {isBalanceVisible ? `${totalSpent.toFixed(2)} ₺` : '**** ₺'}
              </Text>
            </View>
            <Ionicons name="trending-up" size={32} color="rgba(255,255,255,0.4)" />
          </LinearGradient>
        </View>

        {/* SON SİPARİŞLER */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>{t('home.recentOrders')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.slice(0, 5).map((order, i) => {
            const operatorName = order.package_operator || order.package?.operator;
            const logo = getOperatorLogo(operatorName);
            const pkgName = order.package_name_tr || order.package?.name_tr || t('orders.defaultPackage');
            const statusColor = order.status === 'completed' ? '#10b981' : order.status === 'pending' || order.status === 'processing' ? '#f59e0b' : '#ef4444';
            const statusIcon = order.status === 'completed' ? 'checkmark-circle' : order.status === 'pending' || order.status === 'processing' ? 'time' : 'close-circle';
            return (
              <TouchableOpacity key={i} style={styles.orderCard} activeOpacity={0.82} onPress={() => setSelectedOrder(order)}>
                {logo ? (
                  <View style={styles.orderLogoWrap}>
                    <Image source={logo} style={styles.orderLogo} resizeMode="contain" />
                  </View>
                ) : (
                  <LinearGradient
                    colors={order.status === 'completed' ? ['#10b981', '#06b6d4'] : order.status === 'pending' ? ['#f59e0b', '#f97316'] : ['#ef4444', '#dc2626']}
                    style={styles.orderIcon}
                  >
                    <Ionicons name={statusIcon as any} size={16} color="#fff" />
                  </LinearGradient>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderPkg} numberOfLines={1}>{pkgName}</Text>
                  <Text style={styles.orderPhone}>{order.phone_number || '—'}</Text>
                  <Text style={styles.orderTime}>{safeDateFull(order.created_at)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.orderPrice}>
                    {isBalanceVisible ? `-${parseFloat(order.amount || 0).toFixed(2)} ₺` : '**** ₺'}
                  </Text>
                  <Ionicons name={statusIcon as any} size={16} color={statusColor} />
                </View>
              </TouchableOpacity>
            );
          })}

          {recentOrders.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={32} color="#cbd5e1" />
              <Text style={styles.emptyText}>{t('home.noOrders')}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* DEKONT ÖNİZLEME MODAL */}
      <Modal visible={!!receiptOrder} transparent animationType="slide">
        <View style={styles.receiptModalWrap}>
          <View style={styles.receiptModalHeader}>
            <Text style={styles.receiptModalTitle}>{t('orders.receiptPreview')}</Text>
            <View style={styles.receiptModalActions}>
              <TouchableOpacity onPress={() => { if (receiptOrder) downloadReceipt(receiptOrder); }} style={styles.receiptModalBtn}>
                <Ionicons name="share-outline" size={20} color="#6366f1" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { if (receiptOrder) printReceipt(receiptOrder); }} style={styles.receiptModalBtn}>
                <Ionicons name="print-outline" size={20} color="#6366f1" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setReceiptOrder(null)} style={styles.receiptModalClose}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
          <WebView
            source={{ html: receiptOrder ? generateReceiptHtml(receiptOrder) : '' }}
            style={styles.receiptWebView}
            scrollEnabled
          />
        </View>
      </Modal>

      {/* SİPARİŞ DETAY MODAL */}
      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setSelectedOrder(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{t('orders.orderDetail')}</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (() => {
              const op = selectedOrder.package_operator || selectedOrder.package?.operator;
              const pkgName = selectedOrder.package_name_tr || selectedOrder.package?.name_tr || t('orders.defaultPackage');
              const statusColor = selectedOrder.status === 'completed' ? '#10b981' : selectedOrder.status === 'pending' || selectedOrder.status === 'processing' ? '#f59e0b' : '#ef4444';
              const statusIcon = selectedOrder.status === 'completed' ? 'checkmark-circle' : selectedOrder.status === 'pending' || selectedOrder.status === 'processing' ? 'time' : 'close-circle';
              const statusLabel = selectedOrder.status === 'completed' ? t('home.completed') : selectedOrder.status === 'pending' || selectedOrder.status === 'processing' ? t('home.pending') : t('home.cancelled');
              const gradColors: [string, string] = selectedOrder.status === 'completed' ? ['#10b981', '#059669'] : selectedOrder.status === 'pending' || selectedOrder.status === 'processing' ? ['#f59e0b', '#d97706'] : ['#ef4444', '#dc2626'];
              return (
                <>
                  <LinearGradient colors={gradColors} style={styles.sheetBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']} style={styles.sheetBadgeIcon}>
                      <Ionicons name={statusIcon as any} size={22} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetBadgePkg} numberOfLines={1}>{pkgName}</Text>
                      <Text style={styles.sheetBadgeOp}>{op || '—'}</Text>
                    </View>
                    <Text style={styles.sheetBadgeAmt}>{parseFloat(selectedOrder.amount || 0).toFixed(2)} ₺</Text>
                  </LinearGradient>

                  <View style={styles.detailList}>
                    <DetailRow icon="call-outline" label={t('orders.number')} value={selectedOrder.phone_number || '—'} />
                    <DetailRow icon="layers-outline" label={t('orders.status')} value={statusLabel} valueColor={statusColor} />
                    <DetailRow icon="calendar-outline" label={t('orders.date')} value={safeDateFull(selectedOrder.created_at)} />
                    <DetailRow icon="pricetag-outline" label={t('orders.salePrice')} value={`${parseFloat(selectedOrder.satis_fiyati || selectedOrder.amount || 0).toFixed(2)} ₺`} />
                  </View>

                  <View style={styles.receiptRow}>
                    <TouchableOpacity style={styles.receiptBtn} onPress={() => downloadReceipt(selectedOrder)}>
                      <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.receiptBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Ionicons name="share-outline" size={17} color="#fff" />
                        <Text style={styles.receiptBtnTxt}>{t('orders.share')}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.receiptBtnOutline} onPress={() => {
                      if (Platform.OS === 'web') { viewReceiptOnWeb(selectedOrder); return; }
                      setSelectedOrder(null); setReceiptOrder(selectedOrder);
                    }}>
                      <Ionicons name="eye-outline" size={17} color="#6366f1" />
                      <Text style={styles.receiptBtnOutlineTxt}>{t('orders.viewReceipt')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.receiptBtnOutline} onPress={() => printReceipt(selectedOrder)}>
                      <Ionicons name="print-outline" size={17} color="#6366f1" />
                      <Text style={styles.receiptBtnOutlineTxt}>{t('orders.print')}</Text>
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
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon as any} size={16} color="#6366f1" />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor, fontWeight: '800' } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1 },
  loadingGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  header: { paddingTop: 58, paddingBottom: 28, paddingHorizontal: 20, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.06)', top: -70, right: -70 },
  decorCircle2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -40, left: -40 },
  decorCircle3: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', top: 40, left: width / 2 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  photoWrapper: { position: 'relative' },
  topPhoto: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  topPhotoPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  topPhotoInitial: { color: '#fff', fontSize: 18, fontWeight: '900' },
  editIcon: { position: 'absolute', bottom: -2, end: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
  topName: { color: '#fff', fontSize: 15, fontWeight: '800' },
  topBarRight: { flexDirection: 'row', gap: 10 },
  topIconBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  heroCard: { backgroundColor: '#fff', borderRadius: 28, padding: 22, elevation: 14, shadowColor: '#4f46e5', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  heroCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heroBalLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  heroAmountRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
  heroBalAmount: { color: '#1e293b', fontSize: 36, fontWeight: '900', letterSpacing: -1, flexShrink: 1 },
  heroBalTL: { color: '#1e293b', fontSize: 28, fontWeight: '900', marginBottom: 2 },
  debtBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  debtText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

  todayCard: { marginHorizontal: 20, marginTop: -16, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, elevation: 6, shadowColor: '#1e293b', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  todayTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.4, marginBottom: 8, textTransform: 'uppercase' },
  todayRow: { flexDirection: 'row', alignItems: 'center' },
  todayStat: { flex: 1, alignItems: 'center', gap: 2 },
  todayVal: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  todayLbl: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 2, textAlign: 'center' },
  todayDivider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },
  todaySplit: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },

  dealersBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 14, backgroundColor: '#fff', borderRadius: 18, padding: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  dealersBannerIcon: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  dealersBannerTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  dealersBannerSub: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 1 },

  quickRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 24, gap: 8 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 8 },
  quickIcon: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  quickLabel: { fontSize: 10, fontWeight: '700', color: '#334155', textAlign: 'center', letterSpacing: 0.1, flexShrink: 1 },

  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAll: { color: '#6366f1', fontWeight: '700', fontSize: 13 },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', gap: 4, elevation: 6, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  summaryLbl: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700' },
  totalSpentCard: { borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 6, shadowColor: '#6366f1', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  totalSpentLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  totalSpentVal: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },

  balSummaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  balSummaryBox: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  balSummaryVal: { fontSize: 22, fontWeight: '900' },
  balSummaryLbl: { fontSize: 10, fontWeight: '700', color: '#64748b' },

  balReqCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2, shadowOpacity: 0.04, shadowRadius: 6 },
  balReqDot: { width: 10, height: 10, borderRadius: 5, marginEnd: 14 },
  balReqAmount: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  balReqDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  balReqBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  balReqStatus: { fontSize: 11, fontWeight: '700' },

  orderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  orderIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginEnd: 14 },
  orderLogoWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginEnd: 14, overflow: 'hidden' },
  orderLogo: { width: 30, height: 30 },
  orderPkg: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  orderPhone: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 1 },
  orderTime: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  orderPrice: { fontSize: 15, fontWeight: '800', color: '#ef4444' },

  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },

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

  detailList: { gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginEnd: 12 },
  detailLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '700', width: 70 },
  detailValue: { flex: 1, color: '#1e293b', fontSize: 13, fontWeight: '700', textAlign: 'right' },

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
});
