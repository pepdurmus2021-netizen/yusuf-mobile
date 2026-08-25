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
import { BRAND } from '../config/brand';
import { useFonts, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { t } = useTranslation();
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

  // Kayıt e-posta doğrulama akışı: signUp sonrası hesap Supabase'de "unconfirmed"
  // kalır, kullanıcı mailine gelen 6 haneli kodu girmeden giriş yapamaz.
  const [verifyStep, setVerifyStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');
  const [code, setCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (currentToken) router.replace('/(tabs)');
  }, [currentToken]);

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert(t('common.error'), t('login.emailPasswordRequired'));
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
        if (!name) return Alert.alert(t('common.error'), t('login.nameRequired'));
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Hesap oluştu ama Supabase'de "unconfirmed" durumda — public.users'a burada
        // yazmıyoruz, doğrulama koduyla onaylandıktan sonra handleVerifyCode yazacak.
        setPendingEmail(email);
        setPendingName(name);
        setPendingPhone(phone);
        setVerifyStep(true);
      }
    } catch (e: any) { Alert.alert(t('common.error'), e?.message || t('login.actionFailed')); }
    finally { setLoading(false); }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length < 6) return Alert.alert(t('common.error'), t('login.codeRequired'));
    setVerifyLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: pendingEmail, token: code, type: 'signup' });
      if (error) throw error;
      const session = data.session!;
      const uid = session.user.id;
      // upsert + ignoreDuplicates: on_auth_user_created trigger'ı zaten bir satır
      // oluşturmuş olabilir, burada sadece isim/telefon eksikse tamamlıyoruz.
      await supabase.from('users').upsert(
        [{ id: uid, name: pendingName, email: pendingEmail, phone: pendingPhone || '', country: 'TR', role: 'user', balance: 0, currency: 'TRY' }],
        { onConflict: 'id', ignoreDuplicates: true }
      );
      const { data: userData } = await supabase.from('users').select('*').eq('id', uid).single();
      await login(session.access_token, userData || { id: uid, name: pendingName, email: pendingEmail, phone: pendingPhone || '', balance: 0, currency: 'TRY', role: 'user' });
      router.replace('/(tabs)');
    } catch (e: any) { Alert.alert(t('common.error'), e?.message || t('login.codeInvalid')); }
    finally { setVerifyLoading(false); }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
      if (error) throw error;
      Alert.alert(t('login.codeResentTitle'), t('login.codeResentMessage'));
    } catch (e: any) { Alert.alert(t('common.error'), e?.message || t('login.actionFailed')); }
    finally { setResendLoading(false); }
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
              <Text style={[styles.bwpLetters, !fontsLoaded && { fontFamily: undefined }]}>{BRAND.logoText}</Text>
            </View>
          </View>

          {/* KART */}
          <View style={styles.card}>
            {verifyStep ? (
              <>
                <TouchableOpacity onPress={() => setVerifyStep(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <Ionicons name="arrow-back" size={16} color="#6366f1" />
                  <Text style={{ color: '#6366f1', fontWeight: '700', fontSize: 13 }}>{t('login.backToRegister')}</Text>
                </TouchableOpacity>
                <Text style={styles.verifyTitle}>{t('login.verifyTitle')}</Text>
                <Text style={styles.verifyDesc}>{t('login.verifyDesc', { email: pendingEmail })}</Text>

                <Field icon="key-outline" placeholder={t('login.codePlaceholder')} value={code} onChangeText={setCode} keyboardType="number-pad" />

                <TouchableOpacity onPress={handleVerifyCode} disabled={verifyLoading} style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}>
                  <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.submitBtn}>
                    {verifyLoading
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={styles.submitTxt}>{t('login.verifyButton')}</Text></>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleResendCode} disabled={resendLoading} style={{ marginTop: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 13 }}>
                    {resendLoading ? t('common.loading') : t('login.resendCode')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* TAB */}
                <View style={styles.tabRow}>
                  <TouchableOpacity onPress={() => setTab('login')} style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}>
                    <Text style={[styles.tabTxt, tab === 'login' && styles.tabTxtActive]}>{t('login.loginTab')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setTab('register')} style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}>
                    <Text style={[styles.tabTxt, tab === 'register' && styles.tabTxtActive]}>{t('login.registerTab')}</Text>
                  </TouchableOpacity>
                </View>

                {tab === 'register' && (
                  <>
                    <Field icon="person-outline" placeholder={t('login.namePlaceholder')} value={name} onChangeText={setName} />
                    <Field icon="call-outline" placeholder={t('login.phonePlaceholder')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  </>
                )}

                <Field icon="mail-outline" placeholder={t('login.emailPlaceholder')} value={email} onChangeText={setEmail} autoCapitalize="none" />

                <View style={{ position: 'relative' }}>
                  <Field icon="lock-closed-outline" placeholder={t('login.passwordPlaceholder')} value={password} onChangeText={setPassword} secure={!showPassword} />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={handleSubmit} disabled={loading} style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}>
                  <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.submitBtn}>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="flash" size={18} color="#fff" /><Text style={styles.submitTxt}>{tab === 'login' ? t('login.loginTab') : t('login.registerTab')}</Text></>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
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
  bwpLetters: { fontSize: 34, fontFamily: 'Orbitron_900Black', color: '#fff', letterSpacing: 2, textAlign: 'center', textShadowColor: 'rgba(167,139,250,0.9)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
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
  eyeBtn: { position: 'absolute', end: 14, top: 14 },

  submitBtn: { padding: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  verifyTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 6 },
  verifyDesc: { fontSize: 13, color: '#64748b', marginBottom: 18, lineHeight: 19 },
});
