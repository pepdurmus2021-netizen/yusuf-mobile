import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { API_URL, apiFetch } from '../lib/config';

interface AppStore {
  orders: any[];
  balanceRequests: any[];
  packages: any[];
  myDealers: any[];
  anaBayiStats: any | null;
  dealerOrders: any[];
  dealerEarnings: any | null;
  priceRules: any[];
  fetchPriceRules: (token: string) => Promise<void>;
  savePriceRule: (token: string, packageId: string, marginType: string, marginValue: number) => Promise<void>;
  fetchOrders: (userId: string) => Promise<void>;
  fetchBalanceRequests: (userId: string) => Promise<void>;
  fetchPackages: () => Promise<void>;
  sendBalanceRequest: (userId: string, amount: number, bank: any, currency: string) => Promise<void>;
  fetchMyDealers: (token: string) => Promise<void>;
  fetchAnaBayiStats: (token: string) => Promise<void>;
  fetchDealerOrders: (token: string) => Promise<void>;
  transferBalance: (token: string, toUserId: string, amount: number) => Promise<void>;
  addDealer: (token: string, data: { name: string; email: string; phone?: string; password: string; currency?: string; country?: string }) => Promise<void>;
  fetchDealerEarnings: (token: string, dealerId: string) => Promise<void>;
  reset: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  orders: [],
  balanceRequests: [],
  packages: [],
  myDealers: [],
  anaBayiStats: null,
  dealerOrders: [],
  dealerEarnings: null,
  priceRules: [],

  fetchOrders: async (userId) => {
    const { data } = await supabase
      .from('orders')
      .select('*, package:packages(name_tr, operator, cost_try)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    set({ orders: data || [] });
  },

  fetchBalanceRequests: async (userId) => {
    const { data } = await supabase
      .from('balance_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    set({ balanceRequests: data || [] });
  },

  fetchPackages: async () => {
    try {
      const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('token');
      if (!token) return;
      const res = await apiFetch(`${API_URL}/api/packages`, token);
      set({ packages: res.data || [] });
    } catch {
      // token yoksa veya hata olursa sessizce geç
    }
  },

  sendBalanceRequest: async (userId, amount, bank, currency) => {
    // users tablosunda yoksa ekle (foreign key için) — upsert ile RLS sorununu aşıyoruz
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      // ignoreDuplicates: true — mevcut bakiyeyi sıfırlamaz, sadece yoksa ekler
      await supabase.from('users').upsert([{
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Kullanıcı',
        email: authUser.email || '',
        phone: authUser.id.slice(0, 20),
        country: 'TR',
        role: 'user',
        balance: 0,
        currency: currency || 'TRY',
      }], { onConflict: 'id', ignoreDuplicates: true });
    }
    const { error } = await supabase.from('balance_requests').insert([{
      user_id: userId,
      amount,
      bank_name: bank.name,
      account_holder: bank.holder,
      iban: bank.iban,
      status: 'pending',
      currency,
    }]);
    if (error) throw error;
  },

  fetchMyDealers: async (token) => {
    const res = await apiFetch(`${API_URL}/api/ana-bayi/my-dealers`, token);
    set({ myDealers: res.data || [] });
  },

  fetchAnaBayiStats: async (token) => {
    const res = await apiFetch(`${API_URL}/api/ana-bayi/stats`, token);
    set({ anaBayiStats: res.data || null });
  },

  fetchDealerOrders: async (token) => {
    const res = await apiFetch(`${API_URL}/api/ana-bayi/orders`, token);
    set({ dealerOrders: res.data || [] });
  },

  transferBalance: async (token, toUserId, amount) => {
    await apiFetch(`${API_URL}/api/ana-bayi/transfer-balance`, token, {
      method: 'POST',
      body: JSON.stringify({ to_user_id: toUserId, amount }),
    });
  },

  fetchPriceRules: async (token) => {
    const res = await apiFetch(`${API_URL}/api/ana-bayi/price-rules`, token);
    set({ priceRules: res.data || [] });
  },

  savePriceRule: async (token, packageId, marginType, marginValue) => {
    await apiFetch(`${API_URL}/api/ana-bayi/price-rules`, token, {
      method: 'POST',
      body: JSON.stringify({ package_id: packageId, margin_type: marginType, margin_value: marginValue }),
    });
  },

  addDealer: async (token, data) => {
    await apiFetch(`${API_URL}/api/ana-bayi/add-dealer`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  fetchDealerEarnings: async (token, dealerId) => {
    const res = await apiFetch(`${API_URL}/api/ana-bayi/dealer/${dealerId}/earnings`, token);
    set({ dealerEarnings: res.data || null });
  },

  reset: () => set({ orders: [], balanceRequests: [], packages: [], myDealers: [], anaBayiStats: null, dealerOrders: [], dealerEarnings: null, priceRules: [] }),
}));
