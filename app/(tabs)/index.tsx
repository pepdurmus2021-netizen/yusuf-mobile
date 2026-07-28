import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, RefreshControl, Image, Linking
} from 'react-native';
import { useFocusEffect , useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeDate, safeDateFull } from '../../lib/config';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

const ALL_OPERATORS = [
  { dbNames: ['turkcell','türkcell'],                       logo: require('../../assets/images/turkcell.png') },
  { dbNames: ['vodafone'],                                  logo: require('../../assets/images/vodafone.png') },
  { dbNames: ['turk telekom','türk telekom','turktelekom'], logo: require('../../assets/images/turktelekom.png') },
  { dbNames: ['roshan'],                                    logo: require('../../assets/images/roshan.png') },
  { dbNames: ['mtn'],                                       logo: require('../../assets/images/mtn.png') },
  { dbNames: ['awcc'],                                      logo: require('../../assets/images/awcc.png') },
  { dbNames: ['salaam'],                                    logo: require('../../assets/images/salaam.png') },
  { dbNames: ['etisalat'],                                  logo: require('../../assets/images/etisalat.png') },
  { dbNames: ['pubg'],                                      logo: require('../../assets/images/pubg.png') },
  { dbNames: ['valorant'],                                  logo: require('../../assets/images/valorant.png') },
  { dbNames: ['free fire'],                                 logo: require('../../assets/images/free-fire.png') },
  { dbNames: ['google play kart','google play'],            logo: require('../../assets/images/google-play.png') },
  { dbNames: ['clash'],                                     logo: require('../../assets/images/clash-royale.png') },
  { dbNames: ['ahlan'],                                     logo: require('../../assets/images/ahlan.png') },
  { dbNames: ['soulchill','souLchill'],                     logo: require('../../assets/images/soulchill.png') },
  { dbNames: ['hiya','hi̇ya'],                               logo: require('../../assets/images/hiya.png') },
  { dbNames: ['sugo'],                                      logo: require('../../assets/images/sugo.png') },
  { dbNames: ['yoho'],                                      logo: require('../../assets/images/yoho.png') },
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

function getOperatorLogo(operatorName?: string) {
  if (!operatorName) return null;
  const lower = operatorName.toLowerCase();
  return ALL_OPERATORS.find(op => op.dbNames.some(n => lower.includes(n)))?.logo || null;
}
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { t } = useTranslation();
  const { token, user, updateUser } = useAuth();
  const router = useRouter();
  const { orders: recentOrders, balanceRequests, fetchOrders, fetchBalanceRequests } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

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
    if (!user?.id) { setLoading(false); setRefreshing(false); return; }
    try {
      const [, , userRes] = await Promise.all([
        fetchOrders(user.id),
        fetchBalanceRequests(user.id),
        supabase.from('users').select('balance').eq('id', user.id).single(),
      ]);
      if (userRes.data) updateUser({ balance: userRes.data.balance });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { if (user?.id) fetchData(); }, [user?.id]);

  useFocusEffect(useCallback(() => { if (user?.id) fetchData(); }, [user?.id]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const firstName = user?.name?.split(' ')[0] || t('profile.defaultUser');
  const balance = parseFloat(user?.balance?.toString() || '0');

  const completed = recentOrders.filter(o => o.status === 'completed').length;
  const pending = recentOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const cancelled = recentOrders.filter(o => o.status === 'cancelled' || o.status === 'failed').length;
  const totalSpent = recentOrders.filter(o => o.status === 'completed').reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);

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
            const logo = getOperatorLogo(order.package?.operator);
            const statusColor = order.status === 'completed' ? '#10b981' : order.status === 'pending' || order.status === 'processing' ? '#f59e0b' : '#ef4444';
            const statusIcon = order.status === 'completed' ? 'checkmark-circle' : order.status === 'pending' || order.status === 'processing' ? 'time' : 'close-circle';
            return (
              <View key={i} style={styles.orderCard}>
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
                  <Text style={styles.orderPhone}>{order.phone_number || '—'}</Text>
                  <Text style={styles.orderTime}>{safeDateFull(order.created_at)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.orderPrice}>
                    {isBalanceVisible ? `-${parseFloat(order.amount || 0).toFixed(2)} ₺` : '**** ₺'}
                  </Text>
                  <Ionicons name={statusIcon as any} size={16} color={statusColor} />
                </View>
              </View>
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
  orderPhone: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  orderTime: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  orderPrice: { fontSize: 15, fontWeight: '800', color: '#ef4444' },

  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
});
