import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => { logout(); router.replace('/login'); } },
    ]);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const menuItems = [
    { icon: '✏️', label: 'Profili Düzenle', color: '#7C6FF7' },
    { icon: '⚙️', label: 'Ayarlar', color: '#4CAF8C' },
    { icon: '🔒', label: 'Gizlilik & Güvenlik', color: '#FF7F7F' },
    { icon: '❓', label: 'Yardım & Destek', color: '#FF9F43' },
    { icon: '📄', label: 'Kullanım Şartları', color: '#5B4FCF' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerCircle1} />
          <View style={styles.headerCircle2} />
          <Text style={styles.headerTitle}>Profil</Text>

          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <Text style={styles.userName}>{user?.name || 'Kullanıcı'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role === 'admin' ? '👑 Admin' : user?.role === 'dealer' ? '🏪 Bayi' : '👤 Kullanıcı'}
              </Text>
            </View>
          </View>
        </View>

        {/* QR Kod Kartı */}
        <View style={styles.section}>
          <View style={styles.qrCard}>
            <View style={styles.qrBox}>
              <Text style={styles.qrIcon}>▪▫▪{'\n'}▫▫▫{'\n'}▪▫▪</Text>
            </View>
            <View style={styles.qrInfo}>
              <Text style={styles.qrLabel}>QR Kodum</Text>
              <Text style={styles.qrSub}>{user?.phone || user?.email || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Bilgiler */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <InfoRow icon="📧" label="E-posta" value={user?.email || '—'} />
            <InfoRow icon="📞" label="Telefon" value={user?.phone || '—'} />
            <InfoRow
              icon="💰"
              label="Bakiye"
              value={`${parseFloat(user?.balance?.toString() || '0').toFixed(2)} ₺`}
              valueColor="#5B4FCF"
              last
            />
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
                onPress={() => Alert.alert('Yakında', 'Bu özellik yakında gelecek')}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconBox, { backgroundColor: item.color + '18' }]}>
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Çıkış */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>v1.0.0 · © 2026 Yusuf Telecom</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, valueColor, last }: any) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F3FF' },

  header: {
    backgroundColor: '#5B4FCF', paddingTop: 56, paddingBottom: 40,
    paddingHorizontal: 20, alignItems: 'center', overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
  },
  headerCircle2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.07)', bottom: -30, left: -20,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 20 },

  avatarWrapper: { alignItems: 'center' },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  roleText: { fontSize: 13, color: '#fff', fontWeight: '600' },

  section: { paddingHorizontal: 20, paddingTop: 16 },

  qrCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#5B4FCF', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  qrBox: {
    width: 70, height: 70, borderRadius: 14, backgroundColor: '#f0eeff',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  qrIcon: { fontSize: 18, lineHeight: 22, color: '#5B4FCF', textAlign: 'center' },
  qrInfo: { flex: 1 },
  qrLabel: { fontSize: 16, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  qrSub: { fontSize: 13, color: '#9ca3af' },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#5B4FCF', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0eeff' },
  infoIcon: { fontSize: 20, marginRight: 12 },
  infoLabel: { flex: 1, fontSize: 14, color: '#9ca3af', fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },

  menuCard: {
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#5B4FCF', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f0eeff' },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIconBox: {
    width: 42, height: 42, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { fontSize: 15, color: '#1a1a2e', fontWeight: '600' },
  menuArrow: { fontSize: 24, color: '#c4b5fd', fontWeight: '300' },

  logoutBtn: {
    backgroundColor: '#fee2e2', borderRadius: 16,
    padding: 16, alignItems: 'center',
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '800' },

  version: { textAlign: 'center', fontSize: 12, color: '#c4b5fd', marginTop: 20 },
});
