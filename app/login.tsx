import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  StatusBar, ScrollView, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://192.168.1.106:4000';
const { width } = Dimensions.get('window');

const COUNTRIES = ['Türkiye', 'Almanya', 'Fransa', 'İngiltere', 'ABD', 'Hollanda', 'Belçika', 'Avusturya', 'İsviçre', 'Diğer'];

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Türkiye');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showCountries, setShowCountries] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre zorunlu');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });
      const data = await response.json();
      if (data.success && data.token) {
        await login(data.token, data.user);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Hata', data.error || 'Giriş başarısız');
      }
    } catch {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !phone || !regEmail || !regPassword) {
      Alert.alert('Hata', 'Tüm alanları doldurun');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, country, email: regEmail, password: regPassword }),
      });
      const data = await response.json();
      if (data.success && data.token) {
        await login(data.token, data.user);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Hata', data.error || 'Kayıt başarısız');
      }
    } catch {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />

      {/* Dekoratif daireler */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>YT</Text>
            </View>
            <Text style={styles.appName}>Yusuf Telecom</Text>
            <Text style={styles.appSub}>Bayi Satış Platformu</Text>
          </View>

          {/* Kart */}
          <View style={styles.card}>

            {/* Tab switcher */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'login' && styles.tabActive]}
                onPress={() => setTab('login')}
              >
                <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
                  Giriş Yap
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'register' && styles.tabActive]}
                onPress={() => setTab('register')}
              >
                <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
                  Kayıt Ol
                </Text>
              </TouchableOpacity>
            </View>

            {tab === 'login' ? (
              <View>
                <Input
                  label="E-posta"
                  placeholder="ornek@mail.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
                <Input
                  label="Şifre"
                  placeholder="Şifrenizi girin"
                  value={password}
                  onChangeText={setPassword}
                  secure
                />

                <TouchableOpacity style={styles.forgotBtn}>
                  <Text style={styles.forgotText}>Şifremi unuttum</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btn}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Giriş Yap</Text>
                  }
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Input
                  label="Ad Soyad"
                  placeholder="Adınızı girin"
                  value={name}
                  onChangeText={setName}
                />
                <Input
                  label="Telefon"
                  placeholder="+90 5xx xxx xx xx"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />

                {/* Ülke seçici */}
                <Text style={styles.label}>Ülke</Text>
                <TouchableOpacity
                  style={styles.countryPicker}
                  onPress={() => setShowCountries(!showCountries)}
                >
                  <Text style={styles.countryText}>{country}</Text>
                  <Text style={styles.countryArrow}>{showCountries ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showCountries && (
                  <View style={styles.dropdown}>
                    {COUNTRIES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={styles.dropdownItem}
                        onPress={() => { setCountry(c); setShowCountries(false); }}
                      >
                        <Text style={[styles.dropdownText, c === country && styles.dropdownTextActive]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Input
                  label="E-posta"
                  placeholder="ornek@mail.com"
                  value={regEmail}
                  onChangeText={setRegEmail}
                  keyboardType="email-address"
                />
                <Input
                  label="Şifre"
                  placeholder="En az 6 karakter"
                  value={regPassword}
                  onChangeText={setRegPassword}
                  secure
                />

                <TouchableOpacity
                  style={styles.btn}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Kayıt Ol</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.footer}>© 2026 Yusuf Telecom. Tüm hakları saklıdır.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Input({ label, placeholder, value, onChangeText, secure, keyboardType }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#a0aec0"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#5B4FCF' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },

  circle1: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.06)',
    top: -80, right: -80,
  },
  circle2: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 40, left: -60,
  },

  logoArea: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  logoText: { fontSize: 24, fontWeight: '800', color: '#5B4FCF' },
  appName: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  appSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 28,
    padding: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },

  tabRow: {
    flexDirection: 'row', backgroundColor: '#f0eeff',
    borderRadius: 14, padding: 4, marginBottom: 24,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  tabActive: { backgroundColor: '#5B4FCF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9b8ecf' },
  tabTextActive: { color: '#fff' },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e8e4ff', borderRadius: 14,
    padding: 14, fontSize: 15, backgroundColor: '#faf9ff', color: '#1a1a2e',
  },

  countryPicker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e8e4ff', borderRadius: 14,
    padding: 14, backgroundColor: '#faf9ff', marginBottom: 16,
  },
  countryText: { fontSize: 15, color: '#1a1a2e' },
  countryArrow: { fontSize: 12, color: '#9b8ecf' },
  dropdown: {
    borderWidth: 1.5, borderColor: '#e8e4ff', borderRadius: 14,
    backgroundColor: '#fff', marginBottom: 16, overflow: 'hidden',
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownText: { fontSize: 14, color: '#374151' },
  dropdownTextActive: { color: '#5B4FCF', fontWeight: '700' },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: 16 },
  forgotText: { fontSize: 13, color: '#5B4FCF', fontWeight: '600' },

  btn: {
    backgroundColor: '#5B4FCF', borderRadius: 16,
    padding: 16, alignItems: 'center', marginTop: 4,
    shadowColor: '#5B4FCF', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 32 },
});
