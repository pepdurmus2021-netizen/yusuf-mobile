import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

const API_URL = 'http://77.42.38.1:4000';
const { width } = Dimensions.get('window');

const CATEGORIES = [
  { key: 'turk', label: '🇹🇷 Türk', operators: ['Turkcell', 'Vodafone', 'Turk Telekom'] },
  { key: 'afgan', label: '🇦🇫 Afgan', operators: ['MTN', 'AWCC', 'SALAAM', 'ROSHAN', 'ETİSALAT', 'ASAAN', 'İRAN', 'AFGHAN KREDİ'] },
  { key: 'game', label: '🎮 Oyunlar', operators: [] },
];

const QUICK_ACTIONS = [
  { icon: '📦', label: 'Paketler', color: '#7C6FF7' },
  { icon: '💰', label: 'Bakiye', color: '#FF7F7F' },
  { icon: '📋', label: 'Siparişler', color: '#4CAF8C' },
  { icon: '👤', label: 'Profil', color: '#FF9F43' },
];

export default function HomeScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('turk');
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (token) fetchPackages();
  }, [token]);

  useEffect(() => {
    setSelectedOperator(null);
  }, [activeCategory]);

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

  const categoryPackages = packages.filter(p => p.type === activeCategory);
  const gameOperators = [...new Set(categoryPackages.map(p => p.operator))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  );

  const displayPackages = categoryPackages
    .filter(p => !selectedOperator || p.operator === selectedOperator)
    .filter(p => !searchQuery || p.name_tr?.toLowerCase().includes(searchQuery.toLowerCase()));

  const currentCategory = CATEGORIES.find(c => c.key === activeCategory)!;
  const firstName = (user as any)?.name?.split(' ')[0] || 'Kullanıcı';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerCircle1} />
          <View style={styles.headerCircle2} />

          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Merhaba, {firstName}! 👋</Text>
              <Text style={styles.greetingSub}>Bugün ne satmak istersiniz?</Text>
            </View>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
            </View>
          </View>

          {/* Bakiye Kartı */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Mevcut Bakiye</Text>
            <Text style={styles.balanceAmount}>
              {parseFloat((user as any)?.balance || 0).toFixed(2)} ₺
            </Text>
            <View style={styles.balanceRow}>
              <TouchableOpacity style={styles.balanceBtn} onPress={() => router.push('/(tabs)/balance')}>
                <Text style={styles.balanceBtnText}>+ Bakiye Yükle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.balanceBtn, styles.balanceBtnOutline]} onPress={() => router.push('/(tabs)/orders')}>
                <Text style={styles.balanceBtnOutlineText}>Siparişler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Hızlı İşlemler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity key={action.label} style={styles.quickItem} activeOpacity={0.8}>
                <View style={[styles.quickIcon, { backgroundColor: action.color + '20' }]}>
                  <Text style={styles.quickIconText}>{action.icon}</Text>
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Promosyon Banner */}
        <View style={styles.section}>
          <View style={styles.promoBanner}>
            <View style={styles.promoCircle} />
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Yeni Paketler Eklendi!</Text>
              <Text style={styles.promoSub}>Afgan operatör paketlerini inceleyin</Text>
              <TouchableOpacity style={styles.promoBtn} onPress={() => setActiveCategory('afgan')}>
                <Text style={styles.promoBtnText}>Şimdi Gör</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.promoEmoji}>🌐</Text>
          </View>
        </View>

        {/* Paketler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paketler</Text>

          {/* Search */}
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Paket ara..."
              placeholderTextColor="#a0aec0"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Kategori Tablar */}
          <View style={styles.tabRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.tab, activeCategory === cat.key && styles.tabActive]}
                onPress={() => setActiveCategory(cat.key)}
              >
                <Text style={[styles.tabText, activeCategory === cat.key && styles.tabTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Operatör Filtresi */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.opScroll}>
            {activeCategory === 'game' ? (
              <>
                <TouchableOpacity
                  style={[styles.opBtn, !selectedOperator && styles.opBtnActive]}
                  onPress={() => setSelectedOperator(null)}
                >
                  <Text style={[styles.opBtnText, !selectedOperator && styles.opBtnTextActive]}>Tümü</Text>
                </TouchableOpacity>
                {gameOperators.map(op => (
                  <TouchableOpacity
                    key={op}
                    style={[styles.opBtn, selectedOperator === op && styles.opBtnActive]}
                    onPress={() => setSelectedOperator(selectedOperator === op ? null : op)}
                  >
                    <Text style={[styles.opBtnText, selectedOperator === op && styles.opBtnTextActive]}>{op}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              currentCategory.operators.map(op => (
                <TouchableOpacity
                  key={op}
                  style={[styles.opBtn, selectedOperator === op && styles.opBtnActive]}
                  onPress={() => setSelectedOperator(selectedOperator === op ? null : op)}
                >
                  <Text style={[styles.opBtnText, selectedOperator === op && styles.opBtnTextActive]}>{op}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Paket Listesi */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#5B4FCF" />
            </View>
          ) : displayPackages.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>Paket bulunamadı</Text>
            </View>
          ) : (
            displayPackages.map(item => (
              <View key={item.id} style={styles.packageCard}>
                <View style={styles.packageLeft}>
                  <View style={styles.packageIconBox}>
                    <Text style={styles.packageIconText}>
                      {activeCategory === 'game' ? '🎮' : activeCategory === 'afgan' ? '🌐' : '📶'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.packageName}>{item.name_tr}</Text>
                    <Text style={styles.packageOperator}>{item.operator} · {item.amount}</Text>
                  </View>
                </View>
                <View style={styles.packageRight}>
                  <Text style={styles.packagePrice}>{parseFloat(item.price_try || 0).toFixed(2)} ₺</Text>
                  <TouchableOpacity style={styles.buyBtn} activeOpacity={0.85}>
                    <Text style={styles.buyBtnText}>Al</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F3FF' },
  center: { paddingVertical: 40, alignItems: 'center' },

  // Header
  header: {
    backgroundColor: '#5B4FCF', paddingTop: 56, paddingBottom: 24,
    paddingHorizontal: 20, overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -60,
  },
  headerCircle2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)', top: 40, right: 60,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#fff' },
  greetingSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },

  // Balance Card
  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  balanceAmount: { fontSize: 34, fontWeight: '800', color: '#fff', marginBottom: 16 },
  balanceRow: { flexDirection: 'row', gap: 10 },
  balanceBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
  },
  balanceBtnText: { fontSize: 13, fontWeight: '700', color: '#5B4FCF' },
  balanceBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  balanceBtnOutlineText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Section
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 16 },

  // Quick Actions
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: { alignItems: 'center', width: (width - 80) / 4 },
  quickIcon: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  quickIconText: { fontSize: 26 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },

  // Promo Banner
  promoBanner: {
    backgroundColor: '#5B4FCF', borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  promoCircle: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)', right: -30, top: -40,
  },
  promoContent: { flex: 1 },
  promoTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  promoSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 12 },
  promoBtn: {
    backgroundColor: '#fff', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  promoBtnText: { fontSize: 13, fontWeight: '700', color: '#5B4FCF' },
  promoEmoji: { fontSize: 48, marginLeft: 10 },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14,
    height: 48, marginBottom: 16,
    shadowColor: '#5B4FCF', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a2e' },

  // Tabs
  tabRow: {
    flexDirection: 'row', backgroundColor: '#ede9ff',
    borderRadius: 14, padding: 4, marginBottom: 14,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#5B4FCF' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#9b8ecf' },
  tabTextActive: { color: '#fff' },

  // Operator buttons
  opScroll: { marginBottom: 14 },
  opBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e8e4ff', marginRight: 8,
  },
  opBtnActive: { backgroundColor: '#5B4FCF', borderColor: '#5B4FCF' },
  opBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  opBtnTextActive: { color: '#fff' },

  // Package Card
  packageCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#5B4FCF', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  packageLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  packageIconBox: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: '#f0eeff',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  packageIconText: { fontSize: 22 },
  packageName: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  packageOperator: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  packageRight: { alignItems: 'flex-end' },
  packagePrice: { fontSize: 16, fontWeight: '800', color: '#5B4FCF', marginBottom: 6 },
  buyBtn: {
    backgroundColor: '#5B4FCF', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  buyBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af', fontWeight: '500' },
});
