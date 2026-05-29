import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://77.42.38.1:4000';

const PURPLE = '#5B4FCF';
const PURPLE_LIGHT = '#EEF0FF';
const PURPLE_MID = '#C4B5FD';

const CATEGORIES = [
  { key: 'all', label: '🌍 Tümü' },
  { key: 'turk', label: '🇹🇷 Türkiye' },
  { key: 'afgan', label: '🇦🇫 Afganistan' },
  { key: 'game', label: '🎮 Oyun' },
];

export default function ExploreScreen() {
  const { token } = useAuth();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (token) fetchPackages();
  }, [token]);

  const fetchPackages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/packages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPackages(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = packages.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !search || (p.name_tr || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />
        <Text style={styles.headerTitle}>Paket Sipariş</Text>
        <Text style={styles.headerSub}>İstediğin paketi seç ve sipariş ver</Text>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Paket ara..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Categories */}
      <View style={styles.catWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catContent}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catBtn, activeCategory === cat.key && styles.catBtnActive]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Text style={[styles.catBtnText, activeCategory === cat.key && styles.catBtnTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Package Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>{filtered.length} paket bulundu</Text>
      </View>

      {/* Packages */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyIconText}>📦</Text>
            </View>
            <Text style={styles.emptyTitle}>Paket Bulunamadı</Text>
            <Text style={styles.emptyText}>Farklı bir kategori veya arama deneyin</Text>
          </View>
        ) : (
          filtered.map(item => (
            <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.85}>
              <View style={styles.cardLeft}>
                <View style={styles.cardIconBox}>
                  <Text style={styles.cardIcon}>
                    {item.category === 'game' ? '🎮' : item.category === 'afgan' ? '🇦🇫' : '🇹🇷'}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name_tr || item.name}</Text>
                  {item.operator && (
                    <View style={styles.operatorBadge}>
                      <Text style={styles.operatorText}>{item.operator}</Text>
                    </View>
                  )}
                  {item.description_tr && (
                    <Text style={styles.cardDesc} numberOfLines={1}>{item.description_tr}</Text>
                  )}
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardPrice}>{parseFloat(item.price || 0).toFixed(0)} ₺</Text>
                <View style={styles.orderBtn}>
                  <Text style={styles.orderBtnText}>Sipariş</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: PURPLE,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -50,
  },
  headerCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', top: 20, right: 100,
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: PURPLE_MID, marginTop: 2, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  catWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  catContent: { padding: 10, gap: 8, flexDirection: 'row' },
  catBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  catBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  catBtnText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  catBtnTextActive: { color: '#fff' },
  countRow: { paddingHorizontal: 16, paddingVertical: 10 },
  countText: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: PURPLE, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIconBox: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: PURPLE_LIGHT,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardIcon: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  operatorBadge: {
    backgroundColor: PURPLE_LIGHT, borderRadius: 6, paddingHorizontal: 8,
    paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4,
  },
  operatorText: { fontSize: 10, color: PURPLE, fontWeight: '600' },
  cardDesc: { fontSize: 11, color: '#9ca3af' },
  cardRight: { alignItems: 'flex-end', marginLeft: 8 },
  cardPrice: { fontSize: 18, fontWeight: 'bold', color: PURPLE, marginBottom: 6 },
  orderBtn: {
    backgroundColor: PURPLE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6,
  },
  orderBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: PURPLE_LIGHT,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyIconText: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#9ca3af' },
});
