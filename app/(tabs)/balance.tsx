import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://192.168.1.106:4000';

const BANKS = ['Ziraat Bankası', 'Garanti BBVA', 'İş Bankası', 'Yapı Kredi', 'Akbank', 'Vakıfbank', 'Halkbank'];

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
        <Text style={styles.headerTitle}>Bakiye</Text>
        <Text style={styles.headerSub}>Cüzdanınızı yönetin</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceLabel}>Mevcut Bakiye</Text>
              <Text style={styles.balanceAmount}>{currentBalance.toFixed(2)} ₺</Text>
            </View>
            <View style={styles.walletIconBox}>
              <Text style={styles.walletIcon}>💰</Text>
            </View>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>💳 Bakiye Talebi Oluştur</Text>

          <Text style={styles.label}>Tutar (₺)</Text>
          <TextInput
            style={styles.input}
            placeholder="500"
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
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  header: { backgroundColor: '#1e3a8a', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  scrollContent: { padding: 16 },
  balanceCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 24, marginBottom: 16,
    shadowColor: '#1e3a8a', shadowOpacity: 0.10, shadowRadius: 12, elevation: 6,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  balanceAmount: { fontSize: 38, fontWeight: 'bold', color: '#1e3a8a' },
  walletIconBox: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center',
  },
  walletIcon: { fontSize: 28 },
  formCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 13, fontSize: 14, marginBottom: 16,
    backgroundColor: '#f9fafb', color: '#111827',
  },
  bankScroll: { marginBottom: 16 },
  bankRow: { flexDirection: 'row', gap: 8 },
  bankBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  bankBtnActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  bankBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  bankBtnTextActive: { color: '#fff' },
  submitBtn: {
    backgroundColor: '#1e3a8a', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#eff6ff', borderRadius: 14,
    padding: 14, gap: 10, alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },
});
