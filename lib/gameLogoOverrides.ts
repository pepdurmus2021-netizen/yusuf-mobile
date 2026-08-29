import { useEffect, useState } from 'react';
import { API_URL, apiFetch } from './config';

// Admin panelden yüklenen oyun logosu/isim override'ları — modül seviyesinde
// cache'leniyor ki her ekran açılışında ayrı istek atılmasın (uygulama açık
// kaldığı sürece bir kez çekilir).
export type GameLogoOverride = { operator_key: string; display_name: string; logo_url: string };

let cache: Record<string, GameLogoOverride> | null = null;
let inFlight: Promise<Record<string, GameLogoOverride>> | null = null;

function fetchOverrides(token: string | null): Promise<Record<string, GameLogoOverride>> {
  if (!inFlight) {
    inFlight = apiFetch(`${API_URL}/api/game-logos`, token)
      .then((res: any) => {
        const map: Record<string, GameLogoOverride> = {};
        (res.data || []).forEach((row: GameLogoOverride) => { map[row.operator_key] = row; });
        cache = map;
        return map;
      })
      .catch(() => { cache = {}; return {}; });
  }
  return inFlight;
}

export function useGameLogoOverrides(token: string | null) {
  const [, forceRender] = useState(0);
  useEffect(() => {
    if (cache || !token) return;
    fetchOverrides(token).then(() => forceRender(n => n + 1));
  }, [token]);
  return cache || {};
}

export const toSafeKey = (raw: string) => String(raw || '').toLowerCase().replace(/[^a-z0-9-]/g, '');

// Bir oyun/operatör kartı için (dbNames'ine bakarak) override var mı kontrol eder,
// varsa uzak logo URI'sini, yoksa yerel require() edilmiş asset'i döner.
export function resolveLogo(op: { logo: any; dbNames?: string[] }, overrides: Record<string, GameLogoOverride>) {
  if (op.dbNames) {
    for (const name of op.dbNames) {
      const override = overrides[toSafeKey(name)];
      if (override) return { uri: `${API_URL}${override.logo_url}` };
    }
  }
  return op.logo;
}
