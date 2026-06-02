import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, Dimensions, BackHandler,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';
import { useOrderFlow, OrderError } from '../../hooks/useOrderFlow';
import AppModal from '../../components/AppModal';
import { groupPackagesBySubCategory, getSubCategoryOrder, getSubCategoryLabel } from '../../lib/categories';

const { width } = Dimensions.get('window');
const PAD = 16;

// ─── Statik veriler (operatör tanımları) ──────────────────────────────────────
// Bu veriler sadece UI gösterimi için; iş mantığına karışmıyor.

const TURKEY_OPERATORS = [
  { id: 'turkcell',    name: 'Turkcell',     logo: require('../../assets/images/turkcell.png'),     colors: ['#f59e0b','#d97706'] as [string,string], dbNames: ['turkcell','türkcell'] },
  { id: 'vodafone',    name: 'Vodafone',     logo: require('../../assets/images/vodafone.png'),     colors: ['#ef4444','#dc2626'] as [string,string], dbNames: ['vodafone'] },
  { id: 'turktelekom', name: 'Türk Telekom', logo: require('../../assets/images/turktelekom.png'),  colors: ['#3b82f6','#1d4ed8'] as [string,string], dbNames: ['turk telekom','türk telekom','turktelekom'] },
];

const AFGHAN_OPERATORS = [
  { id: 'roshan',   name: 'Roshan',   logo: require('../../assets/images/roshan.png'),   colors: ['#ef4444','#dc2626'] as [string,string], prefixes: ['79','72'], dbNames: ['roshan'] },
  { id: 'mtn',      name: 'MTN',      logo: require('../../assets/images/mtn.png'),      colors: ['#f59e0b','#d97706'] as [string,string], prefixes: ['77','76'], dbNames: ['mtn'] },
  { id: 'awcc',     name: 'AWCC',     logo: require('../../assets/images/awcc.png'),     colors: ['#10b981','#059669'] as [string,string], prefixes: ['70','71'], dbNames: ['awcc'] },
  { id: 'salaam',   name: 'Salaam',   logo: require('../../assets/images/salaam.png'),   colors: ['#6366f1','#4f46e5'] as [string,string], prefixes: ['74'],      dbNames: ['salaam'] },
  { id: 'etisalat', name: 'Etisalat', logo: require('../../assets/images/etisalat.png'), colors: ['#10b981','#059669'] as [string,string], prefixes: ['78','73'], dbNames: ['etisalat'] },
];

const GAME_OPERATORS = [
  { id: 'pubg',        name: 'PUBG',          logo: require('../../assets/images/pubg.png'),         colors: ['#f59e0b','#d97706'] as [string,string], dbNames: ['pubg'] },
  { id: 'valorant',    name: 'Valorant',      logo: require('../../assets/images/valorant.png'),     colors: ['#ef4444','#dc2626'] as [string,string], dbNames: ['valorant'] },
  { id: 'free-fire',   name: 'Free Fire',     logo: require('../../assets/images/free-fire.png'),    colors: ['#f97316','#ea580c'] as [string,string], dbNames: ['free fire'] },
  { id: 'google-play', name: 'Google Play',   logo: require('../../assets/images/google-play.png'),  colors: ['#10b981','#059669'] as [string,string], dbNames: ['google play kart', 'google play'] },
  { id: 'clash',       name: 'Clash Royale',  logo: require('../../assets/images/clash-royale.png'), colors: ['#3b82f6','#1d4ed8'] as [string,string], dbNames: ['clash'] },
  { id: 'ahlan',       name: 'Ahlan',         logo: require('../../assets/images/ahlan.png'),        colors: ['#6366f1','#4f46e5'] as [string,string], dbNames: ['ahlan'] },
  { id: 'soulchill',   name: 'SoulChill',     logo: require('../../assets/images/soulchill.png'),    colors: ['#8b5cf6','#7c3aed'] as [string,string], dbNames: ['soulchill', 'souLchill'] },
  { id: 'hiya',        name: 'Hiya',          logo: require('../../assets/images/hiya.png'),         colors: ['#ec4899','#db2777'] as [string,string], dbNames: ['hiya', 'hi̇ya'] },
  { id: 'sugo',        name: 'Sugo',          logo: require('../../assets/images/sugo.png'),         colors: ['#f59e0b','#d97706'] as [string,string], dbNames: ['sugo'] },
  { id: 'yoho',        name: 'Yoho',          logo: require('../../assets/images/yoho.png'),         colors: ['#10b981','#059669'] as [string,string], dbNames: ['yoho'] },
  { id: 'ditto',       name: 'Ditto',         logo: require('../../assets/images/ditto.png'),        colors: ['#3b82f6','#2563eb'] as [string,string], dbNames: ['ditto'] },
  { id: 'jawaker',     name: 'Jawaker',       logo: require('../../assets/images/jawaker.png'),      colors: ['#ef4444','#dc2626'] as [string,string], dbNames: ['jawaker'] },
  { id: 'haki',        name: 'Haki',          logo: require('../../assets/images/haki.png'),         colors: ['#6366f1','#4f46e5'] as [string,string], dbNames: ['haki'] },
  { id: 'light-chat',  name: 'Light Chat',    logo: require('../../assets/images/light-chat.png'),   colors: ['#f59e0b','#d97706'] as [string,string], dbNames: ['light cha', 'light chat'] },
  { id: 'haza',        name: 'Haza',          logo: require('../../assets/images/haza.png'),         colors: ['#10b981','#059669'] as [string,string], dbNames: ['haza'] },
  { id: 'saya-likee',  name: 'Saya Likee',    logo: require('../../assets/images/saya-likee.png'),   colors: ['#ec4899','#db2777'] as [string,string], dbNames: ['saya likee', 'saya li̇kee'] },
  { id: 'lions-chat',  name: 'Lions Chat',    logo: require('../../assets/images/lions-chat.png'),   colors: ['#f97316','#ea580c'] as [string,string], dbNames: ['lions chat', 'li̇ons chat'] },
  { id: 'azal-live',   name: 'Azal Live',     logo: require('../../assets/images/azal-live.png'),    colors: ['#8b5cf6','#7c3aed'] as [string,string], dbNames: ['azal live', 'azal li̇ve'] },
  { id: 'habi',        name: 'Habi',          logo: require('../../assets/images/habi.png'),         colors: ['#ef4444','#dc2626'] as [string,string], dbNames: ['habi', 'habi̇'] },
  { id: 'hoby',        name: 'Hoby',          logo: require('../../assets/images/hoby.png'),         colors: ['#3b82f6','#2563eb'] as [string,string], dbNames: ['hoby'] },
  { id: 'ayome',       name: 'Ayome',         logo: require('../../assets/images/ayome.png'),        colors: ['#10b981','#059669'] as [string,string], dbNames: ['ayome'] },
  { id: 'yalla-ludo',  name: 'Yalla Ludo',    logo: require('../../assets/images/yalla-ludo.png'),   colors: ['#f59e0b','#d97706'] as [string,string], dbNames: ['yalla ludo'] },
  { id: 'paycell',     name: 'Paycell',       logo: require('../../assets/images/paycell.png'),      colors: ['#6366f1','#4f46e5'] as [string,string], dbNames: ['paycell'] },
  { id: 'talktalk',    name: 'TalkTalk',      logo: require('../../assets/images/talktalk.png'),     colors: ['#ec4899','#db2777'] as [string,string], dbNames: ['talktalk'] },
  { id: 'imo',         name: 'İmo',           logo: require('../../assets/images/imo.png'),          colors: ['#10b981','#059669'] as [string,string], dbNames: ['imo', 'i̇mo'] },
  { id: 'yooy',        name: 'Yooy',          logo: require('../../assets/images/yooy.png'),         colors: ['#f97316','#ea580c'] as [string,string], dbNames: ['yooy'] },
  { id: 'cocco-live',  name: 'Cocco Live',    logo: require('../../assets/images/cocco-live.png'),   colors: ['#ef4444','#dc2626'] as [string,string], dbNames: ['cocco live', 'cocco li̇ve'] },
  { id: 'bigo',        name: 'Bigo',          logo: require('../../assets/images/bigo.png'),         colors: ['#3b82f6','#2563eb'] as [string,string], dbNames: ['bigo'] },
  { id: 'weso-chat',   name: 'Weso Chat',     logo: require('../../assets/images/weso-chat.png'),    colors: ['#8b5cf6','#7c3aed'] as [string,string], dbNames: ['weso chat'] },
  { id: 'wanasah',     name: 'Wanasah',       logo: require('../../assets/images/wanasah.png'),      colors: ['#6366f1','#4f46e5'] as [string,string], dbNames: ['wanasah'] },
  { id: 'honey',       name: 'Honey',         logo: require('../../assets/images/honey.png'),        colors: ['#f59e0b','#d97706'] as [string,string], dbNames: ['honey'] },
  { id: 'tami-chat',   name: 'Tami Chat',     logo: require('../../assets/images/tami-chat.png'),    colors: ['#ec4899','#db2777'] as [string,string], dbNames: ['tami chat', 'tami̇ chat'] },
  { id: 'poppo-live',  name: 'Poppo Live',    logo: require('../../assets/images/poppo-live.png'),   colors: ['#ef4444','#dc2626'] as [string,string], dbNames: ['poppo live', 'poppo li̇ve'] },
  { id: 'migo-live',   name: 'Migo Live',     logo: require('../../assets/images/migo-live.png'),    colors: ['#10b981','#059669'] as [string,string], dbNames: ['migo live', 'migo li̇ve'] },
  { id: 'salam-chat',  name: 'Salam Chat',    logo: require('../../assets/images/salam-chat.png'),   colors: ['#3b82f6','#2563eb'] as [string,string], dbNames: ['salam chat'] },
  { id: 'wego',        name: 'Wego',          logo: require('../../assets/images/wego.png'),         colors: ['#f97316','#ea580c'] as [string,string], dbNames: ['wego'] },
  { id: 'likee',       name: 'Likee',         logo: require('../../assets/images/likee.png'),        colors: ['#ef4444','#dc2626'] as [string,string], dbNames: ['likee', 'li̇kee'] },
  { id: '4fun',        name: '4Fun',          logo: require('../../assets/images/4fun.png'),         colors: ['#8b5cf6','#7c3aed'] as [string,string], dbNames: ['4fun'] },
  { id: 'soul-star',   name: 'Soul Star',     logo: require('../../assets/images/soul-star.png'),    colors: ['#6366f1','#4f46e5'] as [string,string], dbNames: ['soul star'] },
  { id: 'up-fun',      name: 'Up Fun',        logo: require('../../assets/images/up-fun.png'),       colors: ['#10b981','#059669'] as [string,string], dbNames: ['up fun'] },
  { id: 'tiktok',      name: 'TikTok',        logo: require('../../assets/images/tiktok.png'),       colors: ['#1e293b','#334155'] as [string,string], dbNames: ['tiktok', 'ti̇ktok'] },
  { id: 'binmo',       name: 'Binmo',         logo: require('../../assets/images/binmo.png'),        colors: ['#f59e0b','#d97706'] as [string,string], dbNames: ['binmo', 'bi̇nmo'] },
  { id: 'etisalat',    name: 'Etisalat',      logo: require('../../assets/images/etisalat.png'),     colors: ['#10b981','#059669'] as [string,string], dbNames: ['etisalat'] },
  { id: 'super-live',  name: 'Super Live',    logo: require('../../assets/images/super-live.png'),   colors: ['#ec4899','#db2777'] as [string,string], dbNames: ['super live', 'super li̇ve'] },
  { id: 'fancy-live',  name: 'Fancy Live',    logo: require('../../assets/images/fancy-live.png'),   colors: ['#f97316','#ea580c'] as [string,string], dbNames: ['fancy live'] },
  { id: 'sodfa-chat',  name: 'Sodfa Chat',    logo: require('../../assets/images/sodfa-chat.png'),   colors: ['#3b82f6','#2563eb'] as [string,string], dbNames: ['sodfa chat'] },
  { id: 'oohla',       name: 'Oohla',         logo: require('../../assets/images/oohla.png'),        colors: ['#8b5cf6','#7c3aed'] as [string,string], dbNames: ['oohla'] },
  { id: 'up-live',     name: 'Up Live',       logo: require('../../assets/images/up-live.png'),      colors: ['#6366f1','#4f46e5'] as [string,string], dbNames: ['up live', 'up li̇ve'] },
  { id: 'hawa',        name: 'Hawa',          logo: require('../../assets/images/hawa.png'),         colors: ['#10b981','#059669'] as [string,string], dbNames: ['hawa'] },
  { id: 'wyak',        name: 'Wyak',          logo: require('../../assets/images/wyak.png'),         colors: ['#ef4444','#dc2626'] as [string,string], dbNames: ['wyak'] },
  { id: 'soulfa',      name: 'Soulfa',        logo: require('../../assets/images/soulfa.png'),       colors: ['#f59e0b','#d97706'] as [string,string], dbNames: ['soulfa'] },
  { id: 'lami',        name: 'Lam',           logo: require('../../assets/images/lami.png'),         colors: ['#ec4899','#db2777'] as [string,string], dbNames: ['lam'] },
  { id: 'itunes',      name: 'iTunes Kart',   logo: require('../../assets/images/itunes.png'),       colors: ['#1e293b','#334155'] as [string,string], dbNames: ['itunes kart', 'i̇tunes kart'] },
  { id: 'yoyo',        name: 'Yoyo',          logo: require('../../assets/images/yoyo.png'),         colors: ['#f97316','#ea580c'] as [string,string], dbNames: ['yoyo'] },
  { id: 'tango',       name: 'Tango',         logo: require('../../assets/images/tango.png'),        colors: ['#3b82f6','#2563eb'] as [string,string], dbNames: ['tango'] },
  { id: 'layla-chat',  name: 'Layla Chat',    logo: require('../../assets/images/layla-chat.png'),   colors: ['#8b5cf6','#7c3aed'] as [string,string], dbNames: ['layla chat'] },
  { id: 'ligo-live',   name: 'Ligo Live',     logo: require('../../assets/images/ligo-live.png'),    colors: ['#6366f1','#4f46e5'] as [string,string], dbNames: ['ligo live', 'li̇go li̇ve'] },
  { id: 'tumile',      name: 'Tumile',        logo: require('../../assets/images/tumile.png'),       colors: ['#10b981','#059669'] as [string,string], dbNames: ['tumile'] },
  { id: 'waho',        name: 'Waho',          logo: require('../../assets/images/waho.png'),         colors: ['#f59e0b','#d97706'] as [string,string], dbNames: ['waho'] },
  { id: 'mr7ba',       name: 'Mr7ba',         logo: require('../../assets/images/mr7ba.png'),        colors: ['#ef4444','#dc2626'] as [string,string], dbNames: ['mr7ba'] },
  { id: 'falla',       name: 'Falla',         logo: require('../../assets/images/falla.png'),        colors: ['#ec4899','#db2777'] as [string,string], dbNames: ['falla'] },
  { id: 'pota-live',   name: 'Pota Live',     logo: require('../../assets/images/pota-live.png'),    colors: ['#f97316','#ea580c'] as [string,string], dbNames: ['pota live', 'pota li̇ve'] },
  { id: 'hapi-live',   name: 'Hapi Live',     logo: require('../../assets/images/hapi-live.png'),    colors: ['#3b82f6','#2563eb'] as [string,string], dbNames: ['hapi live', 'hapi̇ li̇ve'] },
  { id: 'pep-live',    name: 'Pep Live',      logo: require('../../assets/images/pep-live.png'),     colors: ['#8b5cf6','#7c3aed'] as [string,string], dbNames: ['pep live', 'pep li̇ve'] },
  { id: 'waaw-chat',   name: 'Waaw Chat',     logo: require('../../assets/images/waaw-chat.png'),    colors: ['#6366f1','#4f46e5'] as [string,string], dbNames: ['waaw chat'] },
  { id: 'soyo-chat',   name: 'Soyo Chat',     logo: require('../../assets/images/soyo.png'),          colors: ['#f97316','#ea580c'] as [string,string], dbNames: ['soyo chat', 'soyo'] },
  { id: 'kiyo-live',   name: 'Kiyo Live',     logo: require('../../assets/images/kiyo-live.png'),     colors: ['#8b5cf6','#7c3aed'] as [string,string], dbNames: ['kiyo live', 'kiyo'] },
  { id: 'junko',       name: 'Junko',         logo: require('../../assets/images/junko.png'),         colors: ['#ec4899','#db2777'] as [string,string], dbNames: ['junko'] },
  { id: 'yaahlan',     name: 'Yaahlan',       logo: require('../../assets/images/yaahlan.png'),       colors: ['#10b981','#059669'] as [string,string], dbNames: ['yaahlan'] },
];

function detectAfghan(phone: string): string | null {
  const clean = phone.replace(/\D/g, '');
  const digits = clean.startsWith('93') ? clean.slice(2) : clean.startsWith('0') ? clean.slice(1) : clean;
  return AFGHAN_OPERATORS.find(o => o.prefixes.includes(digits.slice(0, 2)))?.id || null;
}

// Hata kodunu kullanıcı dostu Türkçe mesaja çevir
function orderErrorMessage(err: OrderError): string {
  switch (err.code) {
    case 'INSUFFICIENT_BALANCE': return 'Bakiyeniz yetersiz. Bakiye yükleyip tekrar deneyin.';
    case 'INVALID_PHONE':        return 'Geçerli bir telefon numarası girin.';
    case 'INVALID_GAME_ID':      return 'Oyun ID en az 3 karakter olmalı.';
    case 'PACKAGE_NOT_FOUND':    return 'Bu paket artık mevcut değil.';
    case 'AUTH_REQUIRED':        return 'Oturumunuz sona erdi. Tekrar giriş yapın.';
    default:                     return err.message || 'Bir hata oluştu, tekrar deneyin.';
  }
}

type CountryKey = 'turk' | 'afgan' | 'game' | null;

// ─── Ana ekran ────────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const { token } = useAuth();
  const { packages, fetchPackages } = useAppStore();

  // Backend zaten role'e göre doğru fiyatı price_try'a yazdı
  const getPkgPrice = (pkg: any): number =>
    parseFloat(pkg.price_try ?? pkg.price ?? pkg.app_price_try ?? 0);

  const renderPkgCard = (pkg: any, op: { colors: [string, string]; logo: any }) => {
    const price = getPkgPrice(pkg);
    const sellPrice = parseFloat(pkg.app_price_try) || 0;
    const details: { icon: string; label: string }[] = [];
    const nm = (pkg.name_tr || '').toLowerCase();
    const minuteMatch = nm.match(/(\d+)\s*(dk|dak|dakika|min)/);
    const gbMatch     = nm.match(/(\d+[\.,]?\d*)\s*(gb|mb)/i);
    const smsMatch    = nm.match(/(\d+)\s*sms/i);
    if (minuteMatch) details.push({ icon: 'call-outline',       label: minuteMatch[1] + ' Dk' });
    if (gbMatch)     details.push({ icon: 'wifi-outline',       label: gbMatch[1] + ' ' + gbMatch[2].toUpperCase() });
    if (smsMatch)    details.push({ icon: 'chatbubble-outline', label: smsMatch[1] + ' SMS' });
    return (
      <TouchableOpacity
        key={pkg.id}
        onPress={() => { setSelPkg(pkg); setOrderPhone(''); }}
        activeOpacity={0.8}
        style={s.pkgCard}
      >
        <LinearGradient
          colors={[op.colors[0] + '12', op.colors[1] + '08']}
          style={s.pkgCardInner}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <View style={s.pkgLeft}>
            <View style={[s.pkgLogoCircle, { borderColor: op.colors[0] + '40' }]}>
              <Image source={op.logo} style={s.pkgLogo} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pkgName} numberOfLines={2}>{pkg.name_tr}</Text>
              {details.length > 0 && (
                <View style={s.pkgDetails}>
                  {details.map((d, i) => (
                    <View key={i} style={s.pkgDetailItem}>
                      <Ionicons name={d.icon as any} size={11} color="#94a3b8" />
                      <Text style={s.pkgDetailTxt}>{d.label}</Text>
                    </View>
                  ))}
                </View>
              )}
              {sellPrice > 0 && (
                <View style={s.pkgSellRow}>
                  <Text style={s.pkgSellLabel}>Satış: </Text>
                  <Text style={[s.pkgSellPrice, { color: op.colors[0] }]}>{sellPrice.toFixed(0)} ₺</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[s.pkgBadge, { backgroundColor: op.colors[0] }]}>
            <Text style={s.pkgBadgeLabelSmall}>Alış</Text>
            <Text style={s.pkgBadgePrice}>{price.toFixed(0)}</Text>
            <Text style={s.pkgBadgeCur}>₺</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // UI state — sadece görsel akış
  const [loading, setLoading]         = useState(true);
  const [country, setCountry]         = useState<CountryKey>(null);
  const [opId, setOpId]               = useState<string | null>(null);
  const [phone, setPhone]             = useState('');
  const [detectedOp, setDetectedOp]   = useState<string | null>(null);
  const [selPkg, setSelPkg]           = useState<any>(null);
  const [orderPhone, setOrderPhone]   = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [appModal, setAppModal] = useState<{ type: 'success' | 'pending' | 'error'; title: string; message: string } | null>(null);

  // İş mantığı — tek kaynak, tasarımdan bağımsız
  const { submitOrder, isLoading: orderLoading, error: orderError, clearError } = useOrderFlow();

  useEffect(() => {
    if (token) fetchPackages().finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => {
    if (token) fetchPackages();
  }, [token]));

  useFocusEffect(useCallback(() => {
    const onBack = () => {
      if (selPkg) { setSelPkg(null); clearError(); return true; }
      if (opId || detectedOp) { setOpId(null); setDetectedOp(null); setPhone(''); return true; }
      if (country) { setCountry(null); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [selPkg, opId, detectedOp, country]));

  const allOps      = country === 'turk' ? TURKEY_OPERATORS : country === 'afgan' ? AFGHAN_OPERATORS : GAME_OPERATORS;
  const activeOpId  = country === 'afgan' && !opId ? detectedOp : opId;
  const activeOp    = allOps.find(o => o.id === activeOpId);

  const pkgs = useMemo(() => {
    if (!activeOp) return [];
    return packages.filter(p => activeOp.dbNames.some(n => (p.operator || '').toLowerCase().includes(n)));
  }, [packages, activeOp]);

  const pkgCount = (op: any) =>
    packages.filter(p => op.dbNames.some((n: string) => (p.operator || '').toLowerCase().includes(n))).length;

  // ── Sipariş onaylama — sadece hook'u çağırır ──────────────────────────────
  const confirmOrder = async () => {
    if (!selPkg) return;

    const price = getPkgPrice(selPkg);

    if (!price || isNaN(price)) {
      setAppModal({ type: 'error', title: 'Hata', message: 'Paket fiyatı bulunamadı.' }); return;
    }

    try {
      await submitOrder({
        packageId:    selPkg.id,
        amount:       price,
        orderType:    country === 'game' ? 'game' : 'topup',
        phoneOrGameId: orderPhone,
        distPrice:    selPkg.dist_price ?? null,
        satisFiyati:  parseFloat(selPkg.app_price_try ?? 0) || null,
      });

      setSelPkg(null);
      setOrderPhone('');
      setAppModal({ type: 'pending', title: 'Sipariş Alındı', message: 'Siparişler sekmesinden takip edebilirsiniz.' });

    } catch (err) {
      if (err instanceof OrderError) {
        setAppModal({ type: 'error', title: 'Sipariş Hatası', message: orderErrorMessage(err) });
      } else {
        setAppModal({ type: 'error', title: 'Hata', message: 'Beklenmeyen bir sorun oluştu.' });
      }
      clearError();
    }
  };

  // ── Yükleme skeleton ──────────────────────────────────────────────────────
  const SkeletonCard = () => (
    <View style={s.skeletonCard}>
      <View style={s.skeletonLeft}>
        <View style={s.skeletonCircle} />
        <View style={{ gap: 6 }}>
          <View style={[s.skeletonLine, { width: 120 }]} />
          <View style={[s.skeletonLine, { width: 80, opacity: 0.5 }]} />
        </View>
      </View>
      <View style={s.skeletonBadge} />
    </View>
  );

  if (loading) return (
    <View style={s.root}>
      <LinearGradient colors={['#4f46e5', '#7c3aed', '#a855f7']} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={s.hDecor1} /><View style={s.hDecor2} />
        <View style={s.hRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.hTitle}>Yükle & Satın Al</Text>
          </View>
        </View>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: PAD, gap: 10 }}>
        {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
      </ScrollView>
    </View>
  );

  // ── Ana render ─────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* HEADER */}
      <LinearGradient colors={['#4f46e5', '#7c3aed', '#a855f7']} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={s.hDecor1} /><View style={s.hDecor2} />

        {!country ? (
          <View style={s.hCenter}>
            <View style={s.hTitleRow}>
              <Text style={s.hTitleBig}>Dijital Market</Text>
              <Ionicons name="flash" size={28} color="#fff" />
            </View>
          </View>
        ) : (
          <View style={s.hRow}>
            <TouchableOpacity
              onPress={() => {
                if (opId || detectedOp) { setOpId(null); setDetectedOp(null); setPhone(''); }
                else { setCountry(null); }
              }}
              style={s.backBtn}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.hTitle}>
                {!activeOpId ? (country === 'turk' ? '🇹🇷 Türkiye' : country === 'afgan' ? '🇦🇫 Afganistan' : '🎮 Oyun') : activeOp?.name}
              </Text>
              {activeOp && <Text style={s.hSub}>{pkgs.length} paket mevcut</Text>}
            </View>
            {activeOp && <Image source={activeOp.logo} style={s.hLogo} resizeMode="contain" />}
          </View>
        )}

      </LinearGradient>

      <ScrollView
        style={s.root}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ÜLKE SEÇİMİ */}
        {!country && (
          <View style={s.countryGrid}>
            {[
              { key: 'turk',  flag: '🇹🇷', name: 'Türkiye',        sub: `${TURKEY_OPERATORS.length} operatör`, colors: ['#ef4444','#f97316'] as [string,string] },
              { key: 'afgan', flag: '🇦🇫', name: 'Afganistan',     sub: `${AFGHAN_OPERATORS.length} operatör`, colors: ['#10b981','#06b6d4'] as [string,string] },
              { key: 'game',  flag: '🎮',  name: 'Oyun & Dijital',  sub: `${GAME_OPERATORS.length} platform`,  colors: ['#8b5cf6','#ec4899'] as [string,string] },
            ].map(c => (
              <TouchableOpacity key={c.key} onPress={() => setCountry(c.key as CountryKey)} activeOpacity={0.85} style={s.countryCard}>
                <LinearGradient colors={c.colors} style={s.countryGrad}>
                  <View style={s.countryDecor} />
                  <Text style={s.countryFlag}>{c.flag}</Text>
                  <Text style={s.countryName}>{c.name}</Text>
                  <View style={s.countryRow}>
                    <Text style={s.countrySub}>{c.sub}</Text>
                    <View style={s.countryArrow}><Ionicons name="chevron-forward" size={12} color={c.colors[0]} /></View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* TÜRKİYE OPERATÖRLER */}
        {country === 'turk' && !opId && TURKEY_OPERATORS.map(op => (
          <TouchableOpacity key={op.id} onPress={() => setOpId(op.id)} activeOpacity={0.8} style={s.opCard}>
            <View style={s.opLogoWrap}>
              <Image source={op.logo} style={s.opLogo} resizeMode="contain" />
            </View>
            <View style={s.opInfo}>
              <Text style={s.opName}>{op.name}</Text>
              <Text style={s.opSub}>{pkgCount(op)} paket</Text>
            </View>
            <LinearGradient colors={op.colors} style={s.opChevron}>
              <Ionicons name="chevron-forward" size={14} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {/* AFGANİSTAN */}
        {country === 'afgan' && !opId && (
          <>
            <View style={s.phoneWrap}>
              <Ionicons name="call-outline" size={18} color="#94a3b8" />
              <TextInput
                style={s.phoneInput}
                placeholder="07x xxx xxxx"
                placeholderTextColor="#94a3b8"
                value={phone}
                onChangeText={v => { setPhone(v); setDetectedOp(detectAfghan(v)); }}
                keyboardType="phone-pad"
                autoFocus
              />
              {phone.length > 0 && (
                <TouchableOpacity onPress={() => { setPhone(''); setDetectedOp(null); }}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            {detectedOp && (() => {
              const op = AFGHAN_OPERATORS.find(o => o.id === detectedOp)!;
              return (
                <TouchableOpacity onPress={() => setOpId(detectedOp)} style={s.detectedCard} activeOpacity={0.85}>
                  <LinearGradient colors={op.colors} style={s.detectedInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Image source={op.logo} style={s.detectedLogo} resizeMode="contain" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.detectedName}>{op.name} tespit edildi</Text>
                      <Text style={s.detectedSub}>{pkgCount(op)} paket mevcut</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              );
            })()}
            <Text style={s.orLabel}>veya operatör seç</Text>
            <View style={s.afgGrid}>
              {AFGHAN_OPERATORS.map(op => (
                <TouchableOpacity key={op.id} onPress={() => setOpId(op.id)} style={s.afgItem} activeOpacity={0.8}>
                  <View style={s.afgLogoBox}>
                    <Image source={op.logo} style={s.afgLogo} resizeMode="contain" />
                  </View>
                  <Text style={s.afgName}>{op.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* OYUN OPERATÖRLER — 2 sütun grid */}
        {country === 'game' && !opId && (
          <View style={s.gameGrid}>
            {GAME_OPERATORS.map(op => (
              <TouchableOpacity key={op.id} onPress={() => setOpId(op.id)} activeOpacity={0.82} style={s.gameCell}>
                <View style={s.gameCellInner}>
                  <View style={s.gameLogoWrap}>
                    <Image source={op.logo} style={s.gameOpLogo} resizeMode="contain" resizeMethod="resize" />
                  </View>
                  <Text style={s.gameOpName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{op.name}</Text>
                  <View style={[s.gameOpBadge, { backgroundColor: op.colors[0] + '18' }]}>
                    <View style={[s.gameOpDot, { backgroundColor: op.colors[0] }]} />
                    <Text style={[s.gameOpBadgeTxt, { color: op.colors[0] }]}>{pkgCount(op)} paket</Text>
                  </View>
                  <LinearGradient colors={op.colors} style={s.gameArrow} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="chevron-forward" size={10} color="#fff" />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* PAKET LİSTESİ */}
        {activeOp && (
          pkgs.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={30} color="#cbd5e1" />
              <Text style={s.emptyTxt}>Paket bulunamadı</Text>
            </View>
          ) : (() => {
            const isTurkish = TURKEY_OPERATORS.some(o => o.id === activeOp.id);
            if (!isTurkish) {
              return pkgs.map(pkg => renderPkgCard(pkg, activeOp));
            }
            const grouped = groupPackagesBySubCategory(pkgs, activeOp.name);
            const order = getSubCategoryOrder(activeOp.name);
            return order.filter(key => grouped[key]?.length > 0).map(key => (
              <View key={key}>
                <View style={s.catHeader}>
                  <View style={[s.catHeaderBar, { backgroundColor: activeOp.colors[0] }]} />
                  <Text style={s.catHeaderTxt}>{getSubCategoryLabel(activeOp.name, key)}</Text>
                </View>
                {grouped[key].map(pkg => renderPkgCard(pkg, activeOp))}
              </View>
            ));
          })()
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <AppModal
        visible={!!appModal}
        type={appModal?.type || 'pending'}
        title={appModal?.title || ''}
        message={appModal?.message || ''}
        onClose={() => setAppModal(null)}
      />

      {/* SİPARİŞ ONAY MODALI */}
      <Modal visible={!!selPkg} animationType="slide" transparent onRequestClose={() => { setSelPkg(null); clearError(); }}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.sheet}>
            <View style={s.handle} />

            {/* Başlık */}
            <View style={s.sheetTop}>
              <Text style={s.sheetTitle}>Sipariş Özeti</Text>
              <TouchableOpacity onPress={() => { setSelPkg(null); clearError(); }} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selPkg && activeOp && (
              <>
                {/* Paket kartı — gradient */}
                <LinearGradient colors={activeOp.colors} style={s.sheetPkg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={s.sheetLogoBox}>
                    <Image source={activeOp.logo} style={{ width: 34, height: 34 }} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetPkgName}>{selPkg.name_tr}</Text>
                    <Text style={s.sheetPkgOp}>{activeOp.name}</Text>
                  </View>
                  <View style={s.sheetPriceBadge}>
                    <Text style={s.sheetPkgPrice}>{getPkgPrice(selPkg).toFixed(2)}</Text>
                    <Text style={s.sheetPriceCur}>₺</Text>
                  </View>
                </LinearGradient>

                {/* Telefon / Oyun ID girişi */}
                <View style={s.inputSection}>
                  <Text style={s.inputLabel}>
                    {country === 'game' ? 'Oyun ID / Kullanıcı ID' : 'Telefon Numarası'}
                  </Text>
                  <View style={[s.inputRow, phoneFocused && { borderColor: activeOp?.colors[0] || '#6366f1', backgroundColor: '#fff' }]}>
                    <View style={[s.inputIconWrap, phoneFocused && { backgroundColor: (activeOp?.colors[0] || '#6366f1') + '15' }]}>
                      <Ionicons
                        name={country === 'game' ? 'game-controller' : 'call'}
                        size={16}
                        color={phoneFocused ? (activeOp?.colors[0] || '#6366f1') : '#94a3b8'}
                      />
                    </View>
                    <TextInput
                      style={s.inputField}
                      value={orderPhone}
                      onChangeText={setOrderPhone}
                      keyboardType={country === 'game' ? 'default' : 'phone-pad'}
                      placeholder={country === 'game' ? 'Oyun ID\'nizi girin' : '05xx xxx xx xx'}
                      placeholderTextColor="#b0bec5"
                      autoFocus
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                    />
                    {orderPhone.length > 0 && (
                      <TouchableOpacity onPress={() => setOrderPhone('')} style={{ paddingRight: 14 }}>
                        <Ionicons name="close-circle" size={18} color="#cbd5e1" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* İşlem özeti */}
                <View style={s.summaryBox}>
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Paket Tutarı</Text>
                    <Text style={s.summaryValue}>{getPkgPrice(selPkg).toFixed(2)} ₺</Text>
                  </View>
                  <View style={s.summaryDivider} />
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>İşlem Sonrası Bakiye</Text>
                    <Text style={[s.summaryValue, { color: '#10b981', fontWeight: '800' }]}>
                      {/* user balance gösterilmek istenirse buraya eklenebilir */}
                      Anında güncellenir
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Hata mesajı */}
            {orderError && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={s.errorTxt}>{orderErrorMessage(orderError)}</Text>
              </View>
            )}

            {/* Onayla butonu */}
            <TouchableOpacity onPress={confirmOrder} disabled={orderLoading} style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }} activeOpacity={0.85}>
              <LinearGradient colors={activeOp?.colors || ['#6366f1', '#8b5cf6']} style={s.confirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {orderLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Ionicons name="flash" size={18} color="#fff" /><Text style={s.confirmTxt}>Siparişi Onayla</Text></>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* İptal linki */}
            <TouchableOpacity onPress={() => { setSelPkg(null); clearError(); }} style={s.cancelLink} activeOpacity={0.7}>
              <Text style={s.cancelTxt}>İptal Et</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Stiller — sadece görsel, mantıkla ilgisi yok ─────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 22, overflow: 'hidden' },
  hDecor1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', top: -50, right: -40 },
  hDecor2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -20, left: -20 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hCenter: { alignItems: 'center' },
  hTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hFlashWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hTitleBig: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  hSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  hLogo: { width: 38, height: 38 },

  scroll: { padding: PAD },

  countryGrid: { gap: 10 },
  countryCard: { borderRadius: 20, overflow: 'hidden', elevation: 4, shadowColor: '#6366f1', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  countryGrad: { padding: 20, overflow: 'hidden' },
  countryDecor: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)', top: -30, right: -30 },
  countryFlag: { fontSize: 32, marginBottom: 8 },
  countryName: { color: '#fff', fontSize: 18, fontWeight: '900' },
  countryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  countrySub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  countryArrow: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },

  opCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  opLogoWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  opLogo: { width: 38, height: 38 },
  opInfo: { flex: 1 },
  opName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  opSub: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  opChevron: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  phoneWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, gap: 10, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 12 },
  phoneInput: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1e293b' },
  detectedCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  detectedInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  detectedLogo: { width: 36, height: 36 },
  detectedName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  detectedSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  orLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textAlign: 'center', marginVertical: 14 },
  gameGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gameCell: { width: (width - PAD * 2 - 10 * 2) / 3, borderRadius: 16, elevation: 3, shadowColor: '#6366f1', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  gameCellInner: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#f1f5f9' },
  gameLogoWrap: { width: '100%', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, backgroundColor: '#fff' },
  gameOpLogo: { width: '100%', height: 44 },
  gameOpName: { fontSize: 10, fontWeight: '800', color: '#1e293b', textAlign: 'center', width: '100%' },
  gameOpBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  gameOpDot: { width: 4, height: 4, borderRadius: 2 },
  gameOpBadgeTxt: { fontSize: 9, fontWeight: '700' },
  gameArrow: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  afgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  afgItem: { width: (width - PAD * 2 - 10 * 2) / 3, alignItems: 'center', gap: 6 },
  afgLogoBox: { width: 58, height: 58, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowOpacity: 0.04, shadowRadius: 6 },
  afgLogo: { width: 42, height: 42 },
  afgName: { fontSize: 10, fontWeight: '700', color: '#64748b', textAlign: 'center' },

  pkgSellRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  pkgSellLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  pkgSellPrice: { fontSize: 12, fontWeight: '800' },
  pkgBadgeLabelSmall: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 0.5 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 18, marginBottom: 4 },
  catHeaderBar: { width: 4, height: 18, borderRadius: 2 },
  catHeaderTxt: { fontSize: 13, fontWeight: '700', color: '#1e293b', letterSpacing: 0.3 },
  pkgCard: { width: '94%', alignSelf: 'center', marginVertical: 6, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  pkgCardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  pkgLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pkgLogoCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  pkgLogo: { width: 32, height: 32 },
  pkgName: { fontSize: 14, fontWeight: '700', color: '#1e293b', lineHeight: 19 },
  pkgDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  pkgDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pkgDetailTxt: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  pkgBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 52 },
  pkgBadgePrice: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 20 },
  pkgBadgeCur: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },

  skeletonCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  skeletonLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#e2e8f0' },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#e2e8f0' },
  skeletonBadge: { width: 52, height: 44, borderRadius: 12, backgroundColor: '#e2e8f0' },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTxt: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 18 },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  sheetPkg: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  sheetLogoBox: { width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  sheetPkgName: { color: '#fff', fontSize: 13, fontWeight: '800' },
  sheetPkgOp: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  sheetPkgPrice: { color: '#fff', fontSize: 18, fontWeight: '900' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, backgroundColor: '#f8f9fa', marginBottom: 16, overflow: 'hidden' },
  inputIconWrap: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  inputField: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '600', paddingHorizontal: 12, paddingVertical: 13 },
  sheetPriceBadge: { alignItems: 'flex-end' },
  sheetPriceCur: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  inputSection: { marginBottom: 4 },
  summaryBox: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  summaryDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#fecaca' },
  errorTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: '#ef4444' },
  confirmBtn: { padding: 17, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  confirmTxt: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  cancelLink: { alignItems: 'center', paddingVertical: 14 },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },

  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successSheet: { backgroundColor: '#fff', borderRadius: 28, padding: 28, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 40, elevation: 20, overflow: 'hidden' },
  successDecor: { position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: '#f0fdf4', opacity: 0.8 },
  successIconWrap: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 18, shadowColor: '#10b981', shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 },
  successTitle: { fontSize: 26, fontWeight: '900', color: '#1e293b', marginBottom: 20, letterSpacing: -0.5 },
  successAmountBox: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 18, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  successAmountLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8 },
  successAmount: { fontSize: 42, fontWeight: '900', color: '#1e293b', letterSpacing: -1 },
  successAmountCur: { fontSize: 24, fontWeight: '700', color: '#64748b' },
  successDivider: { width: '100%', height: 1, backgroundColor: '#e2e8f0', marginVertical: 14 },
  successWarningRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  successWarningTxt: { fontSize: 12, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  successTrackTxt: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textAlign: 'center', lineHeight: 19 },
});
