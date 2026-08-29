import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n } from '../i18n';
import { BRAND } from '../config/brand';

function AuthGuard() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Yükleme devam ediyorsa hiçbir şey yapma
    if (loading) return;

    const inTabs = segments[0] === '(tabs)';

    // MANTIK: Token yoksa ve korumalı alandaysa Login'e gönder
    if (!token && inTabs) {
      router.replace('/login');
    } 
    // MANTIK: Token Varsa ve Login sayfasındaysa Dashboard'a gönder
    else if (token && !inTabs) {
      router.replace('/(tabs)');
    }
  }, [token, loading, segments]);

  if (loading) {
    return <SplashScreen />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <LinearGradient colors={['#1a0533', '#2d1b69', '#4f46e5']} style={splash.container}>
      {/* Arka dekoratif daireler */}
      <View style={[splash.circle, { width: 300, height: 300, opacity: 0.06, top: -80, right: -80 }]} />
      <View style={[splash.circle, { width: 200, height: 200, opacity: 0.08, bottom: 100, left: -60 }]} />

      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        {/* Logo kutusu */}
        <Animated.View style={[splash.logoBox, { opacity: glowOpacity }]}>
          <Text style={splash.logoText}>{BRAND.shortInitials}</Text>
        </Animated.View>

        {/* İsim */}
        <Text style={splash.title}>{BRAND.displayName}</Text>
        <Text style={splash.subtitle}>Bayi Yönetim Sistemi</Text>

        {/* Nokta animasyonu */}
        <View style={splash.dots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[splash.dot, { opacity: 0.4 + i * 0.2 }]} />
          ))}
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const splash = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  circle: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff' },
  logoBox: {
    width: 110, height: 110, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24, shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 20,
  },
  logoText: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 1, marginBottom: 6 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500', letterSpacing: 0.5, marginBottom: 48 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#a78bfa' },
});

// Açılış ekranı en az bu kadar (ms) ekranda kalsın — i18n/auth kontrolü
// genelde çok hızlı bitiyor ve marka animasyonu daha görünmeden kayboluyordu.
const MIN_SPLASH_DURATION = 5000;

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
    const timer = setTimeout(() => setMinDelayDone(true), MIN_SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  if (!i18nReady || !minDelayDone) {
    return <SplashScreen />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </I18nextProvider>
  );
}