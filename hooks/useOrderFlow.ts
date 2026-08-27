import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { API_URL, apiFetch } from '../lib/config';

// ─── Tipler ───────────────────────────────────────────────────────────────────

export type OrderType = 'topup' | 'game' | 'bill';

export interface OrderPayload {
  packageId: string;
  amount: number;
  orderType: OrderType;
  phoneOrGameId?: string;   // topup için telefon, game için oyun ID
}

export interface OrderResult {
  orderId: string;
  newBalance: number;
  status: 'processing';
}

// Hata kodları — ekranda switch/case ile Türkçe mesaj gösterilebilir
export type OrderErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'PACKAGE_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'INVALID_PHONE'
  | 'INVALID_GAME_ID'
  | 'AUTH_REQUIRED'
  | 'UNKNOWN';

export class OrderError extends Error {
  constructor(
    public readonly code: OrderErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

// ─── Doğrulama yardımcıları ───────────────────────────────────────────────────

function validatePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) {
    throw new OrderError('INVALID_PHONE', 'Telefon numarası 9-15 rakam arasında olmalı');
  }
  return digits;
}

function validateGameId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length < 3) {
    throw new OrderError('INVALID_GAME_ID', 'Oyun ID en az 3 karakter olmalı');
  }
  return trimmed;
}

// ─── Kullanıcı senkronizasyonu (foreign key için) ─────────────────────────────

async function ensureUserExists(authUser: { id: string; email?: string; user_metadata?: any }) {
  // upsert + ignoreDuplicates: SELECT gerekmez, mevcut bakiyeyi sıfırlamaz
  await supabase.from('users').upsert([{
    id: authUser.id,
    name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Kullanıcı',
    email: authUser.email || '',
    phone: authUser.id.slice(0, 20), // unique + NOT NULL constraint için
    country: 'TR',
    role: 'user',
    balance: 0,
    currency: 'TRY',
  }], { onConflict: 'id', ignoreDuplicates: true });
}

// ─── Ana Hook ─────────────────────────────────────────────────────────────────

export function useOrderFlow() {
  const { updateUser } = useAuth();
  const fetchOrders = useAppStore(s => s.fetchOrders);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<OrderError | null>(null);
  const [lastResult, setLastResult] = useState<OrderResult | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const submitOrder = useCallback(async (payload: OrderPayload): Promise<OrderResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Auth kontrolü
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new OrderError('AUTH_REQUIRED', 'Giriş yapmanız gerekiyor');

      // 2. Kullanıcı public.users tablosunda yoksa oluştur
      await ensureUserExists(authUser);

      // 3. Girdi doğrulama
      let cleanPhoneOrId: string | undefined;
      if (payload.orderType === 'topup') {
        cleanPhoneOrId = validatePhone(payload.phoneOrGameId || '');
      } else if (payload.orderType === 'game' && payload.phoneOrGameId) {
        cleanPhoneOrId = validateGameId(payload.phoneOrGameId);
      }

      // 4. Backend API üzerinden sipariş — PayStore entegrasyonu burada çalışır
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      let apiResult: any;
      try {
        apiResult = await apiFetch(`${API_URL}/api/orders`, token, {
          method: 'POST',
          body: JSON.stringify({
            package_id:   payload.packageId,
            amount:       payload.amount,
            phone_number: cleanPhoneOrId ?? null,
            order_type:   payload.orderType,
          }),
        });
      } catch (apiErr: any) {
        const msg = apiErr.message || '';
        if (msg.includes('INSUFFICIENT_BALANCE')) throw new OrderError('INSUFFICIENT_BALANCE', 'Bakiyeniz yetersiz. Lütfen yükleyin.');
        if (msg.includes('PACKAGE_NOT_FOUND'))   throw new OrderError('PACKAGE_NOT_FOUND', 'Paket bulunamadı.');
        if (msg.includes('USER_NOT_FOUND'))       throw new OrderError('USER_NOT_FOUND', 'Hesap bilgisi eksik.');
        throw new OrderError('UNKNOWN', msg);
      }

      const result: OrderResult = {
        orderId:    apiResult.data.order_id,
        newBalance: apiResult.data.new_balance,
        status:     'processing',
      };

      // 5. Local state'i güncelle (UI anında yansısın)
      updateUser({ balance: result.newBalance });
      if (token) fetchOrders(token);

      setLastResult(result);
      return result;

    } catch (err) {
      const orderErr =
        err instanceof OrderError
          ? err
          : new OrderError('UNKNOWN', (err as Error).message || 'Bilinmeyen hata');

      setError(orderErr);
      throw orderErr;
    } finally {
      setIsLoading(false);
    }
  }, [updateUser, fetchOrders]);

  return {
    submitOrder,   // ana fonksiyon — sadece bunu ekran çağırır
    isLoading,     // buton disabled + spinner
    error,         // OrderError | null — ekran mesajı gösterir
    lastResult,    // başarı sonrası order bilgisi
    clearError,    // modal kapanınca temizle
  };
}
