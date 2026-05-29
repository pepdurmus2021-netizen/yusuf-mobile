import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://77.42.38.1:4000';

const PURPLE = '#5B4FCF';
const PURPLE_LIGHT = '#EEF0FF';
const PURPLE_MID = '#C4B5FD';

const BANKS = ['Ziraat Bankası', 'Garanti BBVA', 'İş Bankası', 'Yapı Kredi', 'Akbank', 'Vakıfbank', 'Halkbank'];

const QUICK_AMOUNTS = ['100', '250', '500', '1000', '2000', '5000'];

export default function BalanceScreen() {
  const { token, user } = useAuth();
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !bankName || !accountHolder || !iban) {
      Alert.alert('Hata', 'Tüm alanları doldurunuz');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/balance-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(amount), bank_name: bankName, account_holder: accountHolder, iban }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Başarılı', 'Bakiye talebiniz gönderildi!');
        setAmount('');
        setBankName('');
        setAccountHolder('');
        setIban('');
      } else {
        Alert.alert('Hata', data.error || 'Bir hata oluştu');
      }
    } catch (err) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = parseFloat(user?.balance?.toString() || '0');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />
        <Text style={styles.headerTitle}>Bakiye</Text>
        <Text style={styles.headerSub}>Cüzdanınızı yönetin</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardBg} />
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceLabel}>Mevcut Bakiye</Text>
              <Text style={styles.balanceAmount}>{currentBalance.toFixed(2)} ₺</Text>
            </View>
            <View style={styles.walletIconBox}>
              <Text style={styles.walletIcon}>💰</Text>
            </View>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceFooter}>
            <Text style={styles.balanceFooterText}>🟢 Hesap Aktif</Text>
            <Text style={styles.balanceCurrency}>TRY</Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>💳 Bakiye Talebi Oluştur</Text>

          <Text style={styles.label}>Tutar (₺)</Text>
          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map(q => (
              <TouchableOpacity
                key={q}
                style={[styles.quickBtn, amount === q && styles.quickBtnActive]}
                onPress={() => setAmount(q)}
              >
                <Text style={[styles.quickBtnText, amount === q && styles.quickBtnTextActive]}>
                  {q} ₺
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Veya miktar girin..."
            placeholderTextColor="#9ca3af"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Banka Seçin</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bankScroll}>
            <View style={styles.bankRow}>
              {BANKS.map(bank => (
                <TouchableOpacity
                  key={bank}
                  style={[styles.bankBtn, bankName === bank && styles.bankBtnActive]}
                  onPress={() => setBankName(bank)}
                >
                  <Text style={[styles.bankBtnText, bankName === bank && styles.bankBtnTextActive]}>
                    {bank}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>Hesap Sahibi</Text>
          <TextInput
            style={styles.input}
            placeholder="Ad Soyad"
            placeholderTextColor="#9ca3af"
            value={accountHolder}
            onChangeText={setAccountHolder}
          />

          <Text style={styles.label}>IBAN</Text>
          <TextInput
            style={styles.input}
            placeholder="TR00 0000 0000 0000 0000 0000 00"
            placeholderTextColor="#9ca3af"
            value={iban}
            onChangeText={setIban}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Talep Gönder</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Bakiye talebiniz onaylandıktan sonra hesabınıza yansıyacaktır. Ortalama işlem süresi 1-2 iş günüdür.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4FF' },
  header: {
    backgroundColor: PURPLE,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -50, right: -40,
  },
  headerCircle2: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.06)', top: 30, right: 90,
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: PURPLE_MID, marginTop: 2 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  balanceCard: {
    backgroundColor: PURPLE, borderRadius: 20, padding: 22, marginBottom: 16,
    shadowColor: PURPLE, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    overflow: 'hidden',
  },
  balanceCardBg: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: PURPLE_MID, marginBottom: 4 },
  balanceAmount: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
  walletIconBox: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  walletIcon: { fontSize: 28 },
  balanceDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 16 },
  balanceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceFooterText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  balanceCurrency: { fontSize: 13, fontWeight: '700', color: '#fff', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },

  formCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  quickBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: PURPLE_LIGHT, borderWidth: 1.5, borderColor: PURPLE_LIGHT,
  },
  quickBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  quickBtnText: { fontSize: 13, color: PURPLE, fontWeight: '600' },
  quickBtnTextActive: { color: '#fff' },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 13, fontSize: 14, marginBottom: 16,
    backgroundColor: '#FAFAFA', color: '#111827',
  },
  bankScroll: { marginBottom: 16 },
  bankRow: { flexDirection: 'row', gap: 8 },
  bankBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  bankBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  bankBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  bankBtnTextActive: { color: '#fff' },
  submitBtn: {
    backgroundColor: PURPLE, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: PURPLE, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row', backgroundColor: PURPLE_LIGHT, borderRadius: 14,
    padding: 14, gap: 10, alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#DDD8FF',
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 12, color: PURPLE, lineHeight: 18 },
});
