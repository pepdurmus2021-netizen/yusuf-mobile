import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  StatusBar, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { API_URL } from '../lib/config';
import { useFonts, Orbitron_900Black } from '@expo-google-fonts/orbitron';

WebBrowser.maybeCompleteAuthSession();


export default function LoginScreen() {
  const { login, token: currentToken } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [fontsLoaded] = useFonts({ Orbitron_900Black });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (currentToken) router.replace('/(tabs)');
  }, [currentToken]);

  useEffect(() => {
    const ensureUserExists = async (session: any) => {
      const uid = session.user.id;
      const email = session.user.email;
      const name = session.user.user_metadata?.full_name || email.split('@')[0];

      let { data: existing } = await supabase.from('users').select('*').eq('id', uid).single();

      if (!existing) {
        const { data: inserted } = await supabase.from('users').insert([{
          id: uid, name, email, phone: '', country: 'TR',
          role: 'user', balance: 0, currency: 'TRY',
        }]).select().single();
        existing = inserted;
      }

      const userData = existing || { id: uid, name, email, phone: '', balance: 0, currency: 'TRY', role: 'user' };
      await login(session.access_token, userData);
    };

    const handleAuthAction = async (session: any) => {
      if (!session?.user?.email) return;
      setGoogleLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email.split('@')[0]
          }),
        });
        const resData = await response.json();
        if (resData.success) {
          await login(resData.token, resData.user);
        } else {
          await ensureUserExists(session);
        }
        router.replace('/(tabs)');
      } catch {
        await ensureUserExists(session);
        router.replace('/(tabs)');
      } finally {
        setGoogleLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        handleAuthAction(session);
      }
    });

    if (Platform.OS === 'web' && window.location.hash.includes('access_token')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) handleAuthAction(session);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const redirectTo = Platform.OS === 'web'
        ? window.location.origin + '/login'
        : AuthSession.makeRedirectUri({ scheme: 'yusufmobile', path: 'login' });

      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          if (result.type === 'success' && result.url) {
            const url = new URL(result.url);
            const params = new URLSearchParams(url.hash.replace('#', ''));
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            }
          } else {
            setGoogleLoading(false);
          }
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Google girişi başlatılamadı.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert('Hata', 'E-posta ve şifre zorunlu');
    setLoading(true);
    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const session = data.session!;
        const { data: userData } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        await login(session.access_token, userData || { id: session.user.id, name: email.split('@')[0], email, phone: '', balance: 0, currency: 'TRY', role: 'user' });
        router.replace('/(tabs)');
      } else {
        if (!name) return Alert.alert('Hata', 'Ad soyad zorunlu');
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const uid = data.user!.id;
        await supabase.from('users').insert([{ id: uid, name, email, phone: phone || '', country: 'TR', role: 'user', balance: 0, currency: 'TRY' }]);
        Alert.alert('Başarılı', 'Kayıt olundu. Giriş yapabilirsiniz.');
        setTab('login');
      }
    } catch (e: any) { Alert.alert('Hata', e?.message || 'İşlem başarısız'); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#4f46e5', '#7c3aed', '#a855f7']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.decor1} />
        <View style={styles.decor2} />
        <View style={styles.decor3} />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* LOGO */}
          <View style={styles.logoArea}>
            <View style={styles.bwpLogoWrap}>
              <Text style={[styles.bwpLetters, !fontsLoaded && { fontFamily: undefined }]}>BWP</Text>
            </View>
          </View>

          {/* KART */}
          <View style={styles.card}>

            {/* TAB */}
            <View style={styles.tabRow}>
              <TouchableOpacity onPress={() => setTab('login')} style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}>
                <Text style={[styles.tabTxt, tab === 'login' && styles.tabTxtActive]}>Giriş Yap</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTab('register')} style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}>
                <Text style={[styles.tabTxt, tab === 'register' && styles.tabTxtActive]}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>

            {tab === 'register' && (
              <>
                <Field icon="person-outline" placeholder="Ad Soyad" value={name} onChangeText={setName} />
                <Field icon="call-outline" placeholder="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </>
            )}

            <Field icon="mail-outline" placeholder="E-posta adresi" value={email} onChangeText={setEmail} autoCapitalize="none" />

            <View style={{ position: 'relative' }}>
              <Field icon="lock-closed-outline" placeholder="Şifre" value={password} onChangeText={setPassword} secure={!showPassword} />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleSubmit} disabled={loading} style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.submitBtn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="flash" size={18} color="#fff" /><Text style={styles.submitTxt}>{tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</Text></>
                }
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerTxt}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity onPress={handleGoogleLogin} disabled={googleLoading || loading} style={styles.googleBtn}>
              {googleLoading
                ? <ActivityIndicator color="#6366f1" />
                : <>
                    <View style={styles.googleIconWrap}><Ionicons name="logo-google" size={16} color="#6366f1" /></View>
                    <Text style={styles.googleTxt}>Google ile devam et</Text>
                  </>
              }
            </TouchableOpacity>

          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, placeholder, value, onChangeText, secure, keyboardType, autoCapitalize }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Ionicons name={icon} size={18} color="#94a3b8" style={styles.fieldIcon} />
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'none'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  decor1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -80 },
  decor2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', bottom: 100, left: -60 },
  decor3: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)', top: 200, left: 30 },

  scroll: { flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: 24, paddingTop: 80, paddingBottom: 30 },

  logoArea: { alignItems: 'center', marginBottom: 20 },
  bwpLogoWrap: { alignItems: 'center', marginBottom: 14 },
  bwpGlowOuter: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(139,92,246,0.25)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#7c3aed', shadowOpacity: 0.9, shadowRadius: 40, shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  bwpGlowInner: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(99,102,241,0.35)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  bwpGradientWrap: { borderRadius: 20, overflow: 'hidden' },
  bwpGradientBg: { paddingHorizontal: 20, paddingVertical: 8 },
  bwpLetters: { fontSize: 64, fontFamily: 'Orbitron_900Black', color: '#fff', letterSpacing: 4, textShadowColor: 'rgba(167,139,250,0.9)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  bwpLine: { width: 160, height: 1.5, backgroundColor: 'rgba(255,255,255,0.35)', marginVertical: 8 },
  bwpSub: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 1 },
  welcomeText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 30, elevation: 20 },

  tabRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 14, padding: 4, marginBottom: 22 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#6366f1', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  tabTxt: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  tabTxtActive: { color: '#6366f1' },

  fieldWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 12, gap: 10 },
  fieldIcon: {},
  fieldInput: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '600' },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },

  submitBtn: { padding: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerTxt: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#e2e8f0', gap: 10 },
  googleIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center' },
  googleTxt: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
});
