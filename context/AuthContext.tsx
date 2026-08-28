import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { API_URL } from '../lib/config';
import { registerPushToken } from '../lib/notifications';
import { applyRTLIfNeeded } from '../lib/rtl';
import i18n from '../i18n';
import type { SupportedLanguage } from '../i18n';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  currency: string;
  role: string;
  parent_id?: string | null;
  is_active?: boolean;
  debt?: number;
  language?: SupportedLanguage;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('token');
        const savedUser = await AsyncStorage.getItem('user');
        if (savedToken && savedUser) {
          // Token'ı yenilemeyi dene
          try {
            const res = await fetch(`${API_URL}/api/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Language': i18n.language || 'tr' },
              body: JSON.stringify({ token: savedToken }),
            });
            const data = await res.json();
            if (data.success) {
              setToken(data.token);
              setUser(data.user);
              await AsyncStorage.setItem('token', data.token);
              await AsyncStorage.setItem('user', JSON.stringify(data.user));
              if (data.user?.language) await applyRTLIfNeeded(data.user.language);
              return;
            }
            // Backend "başarısız" dedi (token gerçekten geçersiz/süresi dolmuş) —
            // eskiden burada eski token'la devam edilmeye çalışılıyordu, bu da
            // "giriş yapmış görünüp her istek 401 alan" bozuk bir duruma yol
            // açıyordu. Artık oturumu temizleyip giriş ekranına düşüyoruz.
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            return;
          } catch (_) {
            // Ağ hatası (backend'e ulaşılamadı) — bu durumda kullanıcıyı
            // internetsizken login'e atmamak için eski oturumla devam ediyoruz,
            // token gerçekten geçersizse zaten ilk API isteğinde 401 alınır.
            const parsedUser = JSON.parse(savedUser);
            setToken(savedToken);
            setUser(parsedUser);
            if (parsedUser?.language) await applyRTLIfNeeded(parsedUser.language);
          }
        }
      } catch (e) {
        console.error('Auth yüklenemedi:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
    registerPushToken(newToken);
  };

  const logout = async () => {
    try {
      setToken(null);
      setUser(null);
      useAppStore.getState().reset();
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Çıkış hatası:", err);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);