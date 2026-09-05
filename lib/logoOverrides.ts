import { useEffect, useState } from 'react';
import { API_URL, apiFetch } from './config';

// Tek kaynak: oyun/telekom/operator logolari artik sadece backend'deki
// /api/logos?scope=operator uzerinden geliyor (admin panelden toplu yuklenir).
// Statik require()/bundle yok, admin'de yeni logo eklemek APK rebuild gerektirmez.
export type Logo = { logo_key: string; logo_url: string };

const state: Record<string, { cache: Record<string, Logo> | null; inFlight: Promise<Record<string, Logo>> | null }> = {};

export const toSafeKey = (raw: string | undefined) => String(raw || '')
  .toLocaleLowerCase('tr-TR')
  .replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c')
  .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ı/g, 'i')
  .replace(/i̇/g, 'i')
  .replace(/[^a-z0-9]/g, '');

function fetchScope(scope: string, token: string | null): Promise<Record<string, Logo>> {
  if (!state[scope]) state[scope] = { cache: null, inFlight: null };
  const s = state[scope];
  if (!s.inFlight) {
    s.inFlight = apiFetch(`${API_URL}/api/logos?scope=${scope}`, token)
      .then((res: any) => {
        const map: Record<string, Logo> = {};
        (res.data || []).forEach((row: Logo) => { map[row.logo_key] = row; });
        s.cache = map;
        return map;
      })
      .catch(() => {
        s.inFlight = null;
        return {};
      });
  }
  return s.inFlight;
}

export function useLogos(scope: string, token: string | null) {
  const [, forceRender] = useState(0);
  useEffect(() => {
    if (state[scope]?.cache || !token) return;
    fetchScope(scope, token).then(() => forceRender((n) => n + 1));
  }, [scope, token]);
  return state[scope]?.cache || {};
}
