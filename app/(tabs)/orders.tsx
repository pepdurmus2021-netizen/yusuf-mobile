import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://192.168.1.106:4000';

export default function OrdersScreen() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setOrders(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return '#16a34a';
    if (status === 'pending') return '#d97706';
    if (status === 'failed') return '#dc2626';
    return '#6b7280';
  };

  const getStatusBg = (status: string) => {
    if (status === 'completed') return '#dcfce7';
    if (status === 'pending') return '#fef3c7';
    if (status === 'failed') return '#fee2e2';
    return '#f3f4f6';
  };

  const getStatusText = (status: string) => {
    if (status === 'completed') return 'Tamamlandı';
    if (status === 'pending') return 'Bekliyor';
    if (status === 'failed') return 'Başarısız';
    return status;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return '✅';
    if (status === 'pending') return '⏳';
    if (status === 'failed') return '❌';
    return '❓';
  };

  const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

  const stats = {
    total: orders.length,
    completed: orders.filter(o => o.status === 'completed').length,
    pending: orders.filter(o => o.status === 'pending').length,
    failed: orders.filter(o => o.status === 'failed').length,
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Siparişlerim</Text>
        <Text style={styles.headerSub}>Sipariş geçmişinizi takip edin</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderTopColor: '#1e3a8a' }]}>
          <Text style={[styles.statNum, { color: '#1e3a8a' }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Toplam</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#16a34a' }]}>
          <Text style={[styles.statNum, { color: '#16a34a' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Tamam</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#d97706' }]}>
          <Text style={[styles.statNum, { color: '#d97706' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Bekliyor</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#dc2626' }]}>
          <Text style={[styles.statNum, { color: '#dc2626' }]}>{stats.failed}</Text>
          <Text style={styles.statLabel}>Başarısız</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'completed', label: 'Tamamlandı' },
          { key: 'pending', label: 'Bekliyor' },
          { key: 'failed', label: 'Başarısız' },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterBtnText, filter === f.key && styles.filterBtnTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardIconBox}>
                <Text style={styles.cardIconText}>📋</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.packageName}>{item.package?.name_tr || 'Paket'}</Text>
                <Text style={styles.cardDate}>
                  {new Date(item.created_at).toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.orderId}>Sipariş #{item.id?.slice(0, 8) || '—'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>Tutar</Text>
                <Text style={styles.amountValue}>{parseFloat(item.amount || 0).toFixed(2)} ₺</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sipariş Bulunamadı</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'Henüz hiç sipariş vermediniz' : `${filter} siparişi yok`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1e3a8a', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 8,
  },
  statCard: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 12,
    padding: 10, alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  statNum: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600', marginTop: 2 },
  filterScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', maxHeight: 54 },
  filterContent: { padding: 10, gap: 8, flexDirection: 'row' },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filterBtnActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  filterBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  listContent: { padding: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#1e3a8a', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardIconText: { fontSize: 22 },
  cardInfo: { flex: 1 },
  packageName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  statusIcon: { fontSize: 22 },
  cardDivider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  orderId: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  amountBox: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 11, color: '#9ca3af' },
  amountValue: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#9ca3af' },
});
