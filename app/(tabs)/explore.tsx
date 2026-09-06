import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ActivityIndicator, Animated,
  KeyboardAvoidingView, Keyboard, Platform, Dimensions, BackHandler,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';
import { useOrderFlow, OrderError } from '../../hooks/useOrderFlow';
import AppModal from '../../components/AppModal';
import { groupPackagesBySubCategory, getSubCategoryOrder, getSubCategoryLabel } from '../../lib/categories';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { API_URL, apiFetch } from '../../lib/config';
import { useLogos, toSafeKey } from '../../lib/logoOverrides';

// Once admin panelden yuklenen logoya (tek kaynak) bakar, yoksa renkli daire
// icinde ismin ilk harfi fallback'ine duser.
function OpLogo({ op, overrides, style }: { op: { name: string; logo: any; colors: [string, string]; dbNames?: string[] }; overrides: Record<string, { logo_url: string }>; style: any }) {
  const candidates = [...(op.dbNames || []), op.name].filter(Boolean);
  const logo = candidates.map((c) => overrides[toSafeKey(c)]).find(Boolean);
  if (!logo) {
    return (
      <View style={[style, { backgroundColor: op.colors[0], alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: (style?.width || 32) * 0.4 }}>{op.name?.[0]?.toUpperCase()}</Text>
      </View>
    );
  }
  return <Image source={{ uri: logo.logo_url }} style={style} contentFit="contain" />;
}

// PayStore TopUpPackageQuery operatör parametresi — sadece Türkiye operatörleri destekleniyor
const ELIGIBLE_QUERY_OPERATOR: Record<string, string> = {
  turkcell: 'Turkcell',
  vodafone: 'Vodafone',
  turktelekom: 'TurkTelekom',
};

const { width } = Dimensions.get('window');
const PAD = 16;

// ─── Statik veriler (operatör tanımları) ──────────────────────────────────────
// Bu veriler sadece UI gösterimi için; iş mantığına karışmıyor.

const TURKEY_OPERATORS = [
  { id: 'turkcell',    name: 'Turkcell',     logo: null, colors: ['#f59e0b','#d97706'] as [string,string], prefixes: ['530','531','532','533','534','535','536','537','538','539','501','505','506','507'], dbNames: ['turkcell','türkcell'] },
  { id: 'vodafone',    name: 'Vodafone',     logo: null, colors: ['#ef4444','#dc2626'] as [string,string], prefixes: ['541','542','543','544','545','546','547','548','549','502','555','556','557','558','559'], dbNames: ['vodafone'] },
  { id: 'turktelekom', name: 'Türk Telekom', logo: null, colors: ['#3b82f6','#1d4ed8'] as [string,string], prefixes: ['551','552','553','554','561','562','563','564','565','566','500'], dbNames: ['turk telekom','türk telekom','turktelekom'] },
];

const AFGHAN_OPERATORS = [
  { id: 'roshan',   name: 'Roshan',   logo: null, colors: ['#ef4444','#dc2626'] as [string,string], prefixes: ['79','72'], dbNames: ['roshan'] },
  { id: 'mtn',      name: 'MTN',      logo: null, colors: ['#f59e0b','#d97706'] as [string,string], prefixes: ['77','76'], dbNames: ['mtn'] },
  { id: 'awcc',     name: 'AWCC',     logo: null, colors: ['#10b981','#059669'] as [string,string], prefixes: ['70','71'], dbNames: ['awcc'] },
  { id: 'salaam',   name: 'Salaam',   logo: null, colors: ['#6366f1','#4f46e5'] as [string,string], prefixes: ['74'],      dbNames: ['salaam'] },
  { id: 'etisalat', name: 'Etisalat', logo: null, colors: ['#10b981','#059669'] as [string,string], prefixes: ['78','73'], dbNames: ['etisalat'] },
];

const IRAN_OPERATORS = [
  { id: 'irancell', name: 'Irancell',      logo: null, colors: ['#fbbf24','#f59e0b'] as [string,string], prefixes: ['93','90'], dbNames: ['irancell'] },
  { id: 'mci',      name: 'Hamrah-e Avval', logo: null, colors: ['#10b981','#059669'] as [string,string], prefixes: ['91'],      dbNames: ['mci','hamrah'] },
  { id: 'rightel',  name: 'Rightel',        logo: null, colors: ['#8b5cf6','#7c3aed'] as [string,string], prefixes: ['92'],      dbNames: ['rightel'] },
];

// GAME_OPERATORS sabit listesi kaldırıldı (29 Ağustos 2026) — oyun/sosyal-app
// kategorisi artık PayStore değil Gunes-Tek tedarikçisinden geliyor, eski
// PayStore paketleri DB'den silindi. Oyun kartları artık tamamen dinamik:
// `packages` içindeki type==='game' satırlarının `operator` alanına göre
// gruplanıp oluşturuluyor (bkz. dynamicGameOperators aşağıda).

const ALL_OPERATORS = [...TURKEY_OPERATORS, ...AFGHAN_OPERATORS, ...IRAN_OPERATORS];

type CountryKey = 'turk' | 'afgan' | 'iran';

// Seçili ülkeye göre, numaranın başındaki alan koduna göre operatörü bulur
function detectOperator(localDigits: string, country: CountryKey): string | null {
  if (country === 'turk')  return TURKEY_OPERATORS.find(o => o.prefixes.includes(localDigits.slice(0, 3)))?.id || null;
  if (country === 'afgan') return AFGHAN_OPERATORS.find(o => o.prefixes.includes(localDigits.slice(0, 2)))?.id || null;
  if (country === 'iran')  return IRAN_OPERATORS.find(o => o.prefixes.includes(localDigits.slice(0, 2)))?.id || null;
  return null;
}

// Uygun paket sorgusu ~15sn sürüyor — beklerken sıkılmasın diye kayan mesajlar
const LOADING_STEPS = [
  'explore.checkingStep1',
  'explore.checkingStep2',
  'explore.checkingStep3',
  'explore.checkingStep4',
  'explore.checkingStep5',
];

// Hata kodunu kullanıcı dostu Türkçe mesaja çevir
function orderErrorMessage(err: OrderError): string {
  switch (err.code) {
    case 'INSUFFICIENT_BALANCE': return i18n.t('explore.insufficientBalance');
    case 'INVALID_PHONE':        return i18n.t('explore.invalidPhone');
    case 'INVALID_GAME_ID':      return i18n.t('explore.invalidGameId');
    case 'PACKAGE_NOT_FOUND':    return i18n.t('explore.packageNotFound');
    case 'AUTH_REQUIRED':        return i18n.t('explore.authRequired');
    default:                     return err.message || i18n.t('explore.genericError');
  }
}

// ─── Ana ekran ────────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const { t } = useTranslation();
  const { token, updateUser } = useAuth();
  const logoOverrides = useLogos('operator', token);
  const { packages, fetchPackages, fetchOrders } = useAppStore();

  // Backend zaten role'e göre doğru fiyatı price_try'a yazdı
  const getPkgPrice = (pkg: any): number =>
    parseFloat(pkg.price_try ?? pkg.price ?? pkg.app_price_try ?? 0);

  // Binlik ayraç nokta ile (20.000 gibi) - miktar gösterimleri için
  const fmtNum = (n: any): string => {
    const v = parseInt(n, 10);
    return Number.isFinite(v) ? v.toLocaleString('tr-TR') : String(n ?? '');
  };
  // Fiyat gösterimi - binlik nokta, ondalık virgül (Türkçe format)
  const fmtPrice = (n: number): string =>
    (Number.isFinite(n) ? n : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderPkgCard = (pkg: any, op: { name: string; colors: [string, string]; logo: any; dbNames?: string[] }) => {
    const price = getPkgPrice(pkg);
    const sellPrice = parseFloat(pkg.app_price_try) || 0;
    const details: { icon: string; label: string }[] = [];
    const nm = (pkg.name_tr || '').toLowerCase();
    // Önce gerçek DB sütunlarını kullan (PayStore'dan gelen paketlerde dolu),
    // yoksa eski paketler için isimden regex ile ayıkla
    const dbMinutes = parseFloat(pkg.minutes) || 0;
    const dbSms     = parseFloat(pkg.sms_count) || 0;
    const dbGb      = parseFloat(pkg.data_gb) || 0;
    const minuteMatch = nm.match(/(\d+)\s*(dk|dak|dakika|min)/);
    const gbMatch     = nm.match(/(\d+[\.,]?\d*)\s*(gb|mb)/i);
    const smsMatch    = nm.match(/(\d+)\s*sms/i);
    if (dbMinutes > 0) details.push({ icon: 'call-outline', label: dbMinutes + ' Dk' });
    else if (minuteMatch) details.push({ icon: 'call-outline', label: minuteMatch[1] + ' Dk' });
    if (dbGb > 0) details.push({ icon: 'wifi-outline', label: dbGb + ' GB' });
    else if (gbMatch) details.push({ icon: 'wifi-outline', label: gbMatch[1] + ' ' + gbMatch[2].toUpperCase() });
    if (dbSms > 0) details.push({ icon: 'chatbubble-outline', label: dbSms + ' SMS' });
    else if (smsMatch) details.push({ icon: 'chatbubble-outline', label: smsMatch[1] + ' SMS' });
    return (
      <TouchableOpacity
        key={pkg.id}
        onPress={() => { setSelPkg(pkg); setOrderPhone(isGameOrder ? '' : ('0' + phone.replace(/\D/g, ''))); setAmountQty(''); setExtraFields({}); }}
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
              <OpLogo op={op} overrides={logoOverrides} style={s.pkgLogo} />
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
                  <Text style={s.pkgSellLabel}>{t('explore.sale')}: </Text>
                  <Text style={[s.pkgSellPrice, { color: op.colors[0] }]}>{sellPrice.toFixed(0)} ₺</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[s.pkgBadge, { backgroundColor: op.colors[0] }]}>
            <Text style={s.pkgBadgeLabelSmall}>{t('explore.purchase')}</Text>
            <Text style={s.pkgBadgePrice}>{price.toFixed(0)}</Text>
            <Text style={s.pkgBadgeCur}>₺</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // UI state — sadece görsel akış
  const [loading, setLoading]         = useState(true);
  const [opId, setOpId]               = useState<string | null>(null);
  const [phone, setPhone]             = useState('');
  const [detectedOp, setDetectedOp]   = useState<string | null>(null);
  const [selCountry, setSelCountry]   = useState<CountryKey>('turk');
  const [phoneError, setPhoneError]   = useState('');
  const [marketMode, setMarketMode]   = useState<'phone' | 'game'>('phone');
  const [selPkg, setSelPkg]           = useState<any>(null);
  // Tek paketli (serbest miktar) oyunlarda ara ekrana hiç geçmeden direkt modal
  // açmak için ayrı bir "gösterim" operatörü — activeOp/opId set edilmiyor,
  // arka plan oyun ızgarasında kalıyor (bkz. selectGameOp).
  const [modalOp, setModalOp]         = useState<any>(null);
  const [orderPhone, setOrderPhone]   = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  // Gunes-Tek 'amount' tipi ürünler için (serbest miktar) — kullanıcının girdiği
  // miktar, qty_min/qty_max aralığında canlı doğrulanıp fiyat anlık hesaplanır.
  const [amountQty, setAmountQty]     = useState('');
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [amountFocused, setAmountFocused] = useState(false);
  const [gtLoading, setGtLoading]     = useState(false);
  const [appModal, setAppModal] = useState<{ type: 'success' | 'pending' | 'error'; title: string; message: string } | null>(null);
  const [checkingEligible, setCheckingEligible] = useState(false);
  const [eligibleIds, setEligibleIds] = useState<Set<string> | null>(null);
  const [eligibleNote, setEligibleNote] = useState<string | null>(null);
  const [showAllOverride, setShowAllOverride] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const loadingTextAnim = useRef(new Animated.Value(1)).current;

  // Sorgu sürerken ~3sn'de bir mesaj değiştir, kayarak görünsün
  useEffect(() => {
    if (!checkingEligible) { setLoadingStepIdx(0); return; }
    const id = setInterval(() => setLoadingStepIdx(i => (i + 1) % LOADING_STEPS.length), 3000);
    return () => clearInterval(id);
  }, [checkingEligible]);

  useEffect(() => {
    loadingTextAnim.setValue(0);
    Animated.timing(loadingTextAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [loadingStepIdx]);

  // edgeToEdgeEnabled açıkken Android'in otomatik resize'ı güvenilir değil —
  // klavye yüksekliğini elle takip edip ScrollView'a boşluk ekliyoruz
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, e => setKbHeight(e.endCoordinates?.height || 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

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
      if (selPkg) { setSelPkg(null); setModalOp(null); clearError(); return true; }
      if (opId || detectedOp) { setOpId(null); setDetectedOp(null); setPhone(''); setEligibleIds(null); setEligibleNote(null); setShowAllOverride(false); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [selPkg, opId, detectedOp]));

  // Excel/DB kaynaklı bazı operatör isimlerinde normal 'i' yerine Türkçe
  // "noktalı büyük İ"nin küçültülmüş hali (i + U+0307 combining dot) geliyor —
  // görsel olarak aynı görünüp string olarak farklı, bu yüzden bazı oyunlar
  // (örn. Cocco Live) hiç bulunamıyordu. dbNames tarafında da aynı sorun
  // (büyük harfli girişler, örn. 'souLchill') olabileceği için HER İKİ tarafı
  // da normalize ediyoruz — tek tek her oyuna varyant eklemek yerine kökten çözüm.
  const normOpName = (s: string) => s.toLowerCase().normalize('NFC').replace(/̇/g, '');

  const DYNAMIC_COLORS: [string, string][] = [
    ['#6366f1', '#4f46e5'], ['#ec4899', '#db2777'], ['#f59e0b', '#d97706'],
    ['#10b981', '#059669'], ['#3b82f6', '#2563eb'], ['#ef4444', '#dc2626'],
    ['#8b5cf6', '#7c3aed'], ['#f97316', '#ea580c'],
  ];

  // Gunes-Tek'ten gelen 2342 satırlık `packages` tablosu — oyun/sosyal-app kartları
  // artık sabit bir liste yerine tamamen `operator` alanına göre dinamik oluşturuluyor.
  // Ham operatör kodunu + fallback ikonunu (OpLogo) gösterir.
  const dynamicGameOperators = useMemo(() => {
    const gamePkgs = packages.filter((p: any) => p.type === 'game');
    const codes = [...new Set(gamePkgs.map((p: any) => p.operator).filter(Boolean))] as string[];

    return codes.map((code, i) => ({
      id: 'dyn-' + code.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: code,
      logo: null,
      colors: DYNAMIC_COLORS[i % DYNAMIC_COLORS.length],
      dbNames: [code],
    }));
  }, [packages]);

  const allGameOperators = dynamicGameOperators;

  const activeOpId = opId || detectedOp;
  const activeOp    = [...ALL_OPERATORS, ...allGameOperators].find(o => o.id === activeOpId);
  const isGameOrder = allGameOperators.some(o => o.id === activeOpId) || !!modalOp;
  // Modalda gösterilecek operatör: normal akışta activeOp, tek-paketli hızlı
  // seçimde (opId set edilmemiş) modalOp kullanılır.
  const sheetOp = activeOp || modalOp;

  // Oyun kartına tıklayınca: tek paketli (serbest miktar) oyunlarda ara ekrana
  // hiç geçmeden direkt sipariş modalını açar, arka plan ızgara ekranında kalır.
  // Birden fazla paket varyantı olan (sabit paket) oyunlarda mevcut akış korunur.
  const selectGameOp = (op: any) => {
    const list = packages.filter((p: any) => op.dbNames.some((n: string) => normOpName(p.operator || '').includes(normOpName(n))));
    if (list.length === 1) {
      setModalOp(op);
      setSelPkg(list[0]);
      setOrderPhone('');
      // Miktar alanı minimum değerle önden dolu gelsin, toplam fiyat anında görünsün.
      setAmountQty(list[0].product_type === 'amount' ? String(list[0].qty_min ?? '') : '');
    } else {
      setOpId(op.id);
      setEligibleIds(null);
      setEligibleNote(null);
      setShowAllOverride(false);
    }
  };

  const pkgs = useMemo(() => {
    if (!activeOp) return [];
    let list = packages.filter(p => activeOp.dbNames.some(n => normOpName(p.operator || '').includes(normOpName(n))));
    if (eligibleIds && !showAllOverride) {
      list = list.filter(p => p.paystore_product_id != null && eligibleIds.has(String(p.paystore_product_id)));
    }
    return list;
  }, [packages, activeOp, eligibleIds, showAllOverride]);

  const pkgCount = (op: any) =>
    packages.filter(p => op.dbNames.some((n: string) => normOpName(p.operator || '').includes(normOpName(n)))).length;

  // Serbest miktarli (amount) oyunlarda tek satir var ama bu bir "paket" degil -
  // "1 paket" yazmak yanlis/kafa karistirici. Bu durumda rozette "Serbest Miktar"
  // gibi uygun bir etiket goster, paket sayisi gostermeyi atla.
  const gameGridBadgeLabel = (op: any) => {
    const opPkgs = packages.filter(p => op.dbNames.some((n: string) => normOpName(p.operator || '').includes(normOpName(n))));
    if (opPkgs.length === 1 && opPkgs[0].product_type === 'amount') {
      return t('explore.freeAmount', { defaultValue: 'Serbest Miktar' });
    }
    return t('explore.packageCount', { count: opPkgs.length });
  };

  // Gunes-Tek 'amount' tipi ürünlerde tüm operatör satırı tek (serbest miktar) —
  // miktar× birim fiyat canlı hesaplanır, gerçek fiyat siparişte backend'de hesaplanır.
  const isAmountPkg = !!selPkg && isGameOrder && selPkg.product_type === 'amount';
  const amountQtyNum = parseFloat(amountQty.replace(',', '.')) || 0;
  const amountQtyValid = !isAmountPkg || (
    amountQtyNum > 0 &&
    amountQtyNum >= (parseFloat(selPkg?.qty_min) || 0) &&
    amountQtyNum <= (parseFloat(selPkg?.qty_max) || Infinity)
  );
  const sheetPrice = isAmountPkg ? (getPkgPrice(selPkg) * amountQtyNum) : getPkgPrice(selPkg || {});

  // ── Gunes-Tek siparişi — yeni tedarikçi, ayrı endpoint (/api/orders/gunestek) ──
  const confirmGunesTekOrder = async () => {
    if (!selPkg) return;
    const playerId = orderPhone.trim();
    if (playerId.length < 3) {
      setAppModal({ type: 'error', title: t('common.error'), message: t('explore.invalidGameId') });
      return;
    }
    if (isAmountPkg && !amountQtyValid) {
      setAppModal({
        type: 'error',
        title: t('common.error'),
        message: t('explore.invalidAmountRange', {
          min: selPkg.qty_min, max: selPkg.qty_max,
          defaultValue: `Miktar ${fmtNum(selPkg.qty_min)} - ${fmtNum(selPkg.qty_max)} arasında olmalı`,
        }),
      });
      return;
    }

    setGtLoading(true);
    try {
      const body: any = { package_id: selPkg.id, player_id: playerId, phone_number: null };
      if (isAmountPkg) body.qty = amountQtyNum;

      const res: any = await apiFetch(`${API_URL}/api/orders/gunestek`, token, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const newBalance = res?.data?.new_balance ?? res?.data?.order?.new_balance ?? res?.data?.order?.newBalance;
      if (newBalance != null) updateUser({ balance: newBalance });
      if (token) fetchOrders(token).catch(() => {});

      setSelPkg(null);
      setModalOp(null);
      setOrderPhone('');
      setAmountQty('');
      setAppModal({ type: 'pending', title: t('explore.orderReceived'), message: t('explore.trackFromOrdersTab') });

    } catch (err: any) {
      setAppModal({ type: 'error', title: t('explore.orderError'), message: err?.message || t('explore.unexpectedError') });
    } finally {
      setGtLoading(false);
    }
  };

  // ── Sipariş onaylama — sadece hook'u çağırır ──────────────────────────────
  const confirmOrder = async () => {
    if (!selPkg) return;

    const price = getPkgPrice(selPkg);

    if (!price || isNaN(price)) {
      setAppModal({ type: 'error', title: t('common.error'), message: t('explore.priceNotFound') }); return;
    }

    try {
      await submitOrder({
        packageId:    selPkg.id,
        amount:       price,
        orderType:    isGameOrder ? 'game' : 'topup',
        phoneOrGameId: orderPhone,
      });

      setSelPkg(null);
      setOrderPhone('');
      setAppModal({ type: 'pending', title: t('explore.orderReceived'), message: t('explore.trackFromOrdersTab') });

    } catch (err) {
      if (err instanceof OrderError) {
        setAppModal({ type: 'error', title: t('explore.orderError'), message: orderErrorMessage(err) });
      } else {
        setAppModal({ type: 'error', title: t('common.error'), message: t('explore.unexpectedError') });
      }
      clearError();
    }
  };

  // isGameOrder (Gunes-Tek) siparişleri ayrı endpoint/akıştan gidiyor, diğerleri
  // (telefon yükleme) eski useOrderFlow/PayStore akışını kullanmaya devam ediyor.
  const handleConfirm = () => { if (isGameOrder) confirmGunesTekOrder(); else confirmOrder(); };

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
            <Text style={s.hTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('explore.loadAndBuy')}</Text>
          </View>
        </View>
      </LinearGradient>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: PAD, gap: 10 }}>
        {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
      </ScrollView>
    </View>
  );

  // Sipariş onay modalı — hem "opId yok" (ana ızgara) hem "opId var" (oyun/telefon
  // detay ekranı) dallarında kullanılacak, tek yerde tanımlanıp her ikisine de
  // eklenir (tek paketli hızlı seçimde selPkg, opId set edilmeden açılabiliyor —
  // bu yüzden modal her iki return dalında da mount edilmek zorunda).
  const orderModal = (
    <Modal visible={!!selPkg} animationType="slide" transparent onRequestClose={() => { setSelPkg(null); setModalOp(null); clearError(); }}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Başlık */}
          <View style={s.sheetTop}>
            <Text style={s.sheetTitle} numberOfLines={1}>{t('explore.orderSummary')}</Text>
            <TouchableOpacity onPress={() => { setSelPkg(null); setModalOp(null); clearError(); }} style={s.closeBtn}>
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {selPkg && sheetOp && (
            <>
              {/* Paket kartı — gradient */}
              <LinearGradient colors={sheetOp.colors} style={s.sheetPkg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={s.sheetLogoBox}>
                  <OpLogo op={sheetOp} overrides={logoOverrides} style={{ width: 34, height: 34 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetPkgName}>{selPkg.name_tr}</Text>
                  <Text style={s.sheetPkgOp}>{sheetOp.name}</Text>
                </View>
                <View style={s.sheetPriceBadge}>
                  <Text style={s.sheetPkgPrice}>{fmtPrice(sheetPrice)}</Text>
                  <Text style={s.sheetPriceCur}>₺</Text>
                </View>
              </LinearGradient>

              {/* Serbest miktar girişi (Gunes-Tek 'amount' tipi ürünler) */}
              {isAmountPkg && (
                <View style={s.inputSection}>
                  <Text style={s.inputLabel}>{t('explore.amountLabel', { defaultValue: 'Miktar' })}</Text>
                  <View style={[s.inputRow, !amountQtyValid && amountQty.length > 0 && { borderColor: '#ef4444' }]}>
                    <View style={s.inputIconWrap}>
                      <Ionicons name="calculator" size={16} color="#94a3b8" />
                    </View>
                    <TextInput
                      style={s.inputField}
                      value={amountQty}
                      onChangeText={setAmountQty}
                      keyboardType="numeric"
                      placeholder={String(selPkg.qty_min)}
                      placeholderTextColor="#b0bec5"
                    />
                  </View>
                  <Text style={[s.inputLabel, { marginTop: 4, fontSize: 11, color: !amountQtyValid && amountQty.length > 0 ? '#ef4444' : '#94a3b8' }]}>
                    {t('explore.amountRangeHint', {
                      min: fmtNum(selPkg.qty_min), max: fmtNum(selPkg.qty_max),
                      defaultValue: `${fmtNum(selPkg.qty_min)} - ${fmtNum(selPkg.qty_max)} arasında olmalı`,
                    })}
                  </Text>
                </View>
              )}

              {/* Telefon / Oyun ID girişi */}
              <View style={s.inputSection}>
                <Text style={s.inputLabel}>
                  {isGameOrder ? t('explore.gameIdLabel') : t('explore.phoneNumberLabel')}
                </Text>
                <View style={[s.inputRow, phoneFocused && { borderColor: sheetOp?.colors[0] || '#6366f1', backgroundColor: '#fff' }]}>
                  <View style={[s.inputIconWrap, phoneFocused && { backgroundColor: (sheetOp?.colors[0] || '#6366f1') + '15' }]}>
                    <Ionicons
                      name={isGameOrder ? 'game-controller' : 'call'}
                      size={16}
                      color={phoneFocused ? (sheetOp?.colors[0] || '#6366f1') : '#94a3b8'}
                    />
                  </View>
                  <TextInput
                    style={s.inputField}
                    value={orderPhone}
                    onChangeText={setOrderPhone}
                    keyboardType={isGameOrder ? 'default' : 'phone-pad'}
                    placeholder={isGameOrder ? t('explore.enterGameId') : '05xx xxx xx xx'}
                    placeholderTextColor="#b0bec5"
                    autoFocus={isGameOrder}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                  />
                  {orderPhone.length > 0 && (
                    <TouchableOpacity onPress={() => setOrderPhone('')} style={{ paddingEnd: 14 }}>
                      <Ionicons name="close-circle" size={18} color="#cbd5e1" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* İşlem özeti */}
              <View style={s.summaryBox}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{t('explore.packageAmount')}</Text>
                  <Text style={s.summaryValue}>{fmtPrice(sheetPrice)} ₺</Text>
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
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={orderLoading || gtLoading || (isAmountPkg && !amountQtyValid)}
            style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4, opacity: (isAmountPkg && !amountQtyValid) ? 0.5 : 1 }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={sheetOp?.colors || ['#6366f1', '#8b5cf6']} style={s.confirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {(orderLoading || gtLoading)
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="flash" size={18} color="#fff" /><Text style={s.confirmTxt} numberOfLines={1}>{t('explore.confirmOrder')}</Text></>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* İptal linki */}
          <TouchableOpacity onPress={() => { setSelPkg(null); setModalOp(null); clearError(); }} style={s.cancelLink} activeOpacity={0.7}>
            <Text style={s.cancelTxt}>{t('explore.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ── Numara ekranı — Telegram tarzı, ülke seçici + numara girişi ─────────────
  if (!opId) {
    const countries: { key: CountryKey; flag: string; name: string; code: string }[] = [
      { key: 'turk',  flag: '🇹🇷', name: t('explore.turkey'),      code: '+90' },
      { key: 'iran',  flag: '🇮🇷', name: t('explore.iran'),        code: '+98' },
      { key: 'afgan', flag: '🇦🇫', name: t('explore.afghanistan'), code: '+93' },
    ];
    const activeCountry = countries.find(c => c.key === selCountry)!;
    const phonePlaceholder = selCountry === 'afgan' ? '7XX XXX XXX' : selCountry === 'iran' ? '9XX XXX XXX' : '5XX XXX XX XX';

    const onContinue = async () => {
      const found = detectOperator(phone.replace(/\D/g, ''), selCountry);
      if (!found) {
        setPhoneError(t('explore.operatorNotDetected'));
        return;
      }
      setPhoneError('');
      setDetectedOp(found);
      setEligibleIds(null);
      setEligibleNote(null);
      setShowAllOverride(false);

      const queryOperator = selCountry === 'turk' ? ELIGIBLE_QUERY_OPERATOR[found] : null;
      if (queryOperator && token) {
        setCheckingEligible(true);
        try {
          const gsm = phone.replace(/\D/g, '');
          const res = await apiFetch(`${API_URL}/api/paystore/eligible-packages/${gsm}?operator=${queryOperator}`, token);
          const ids = new Set<string>((res.data || []).map((p: any) => String(p.id)));
          if (ids.size > 0) setEligibleIds(ids);
          else setEligibleNote(t('explore.noEligiblePackagesFallback'));
        } catch {
          // Sorgu başarısız olursa akışı kesmiyoruz, tüm paketler gösterilmeye devam eder
        } finally {
          setCheckingEligible(false);
        }
      }

      setOpId(found);
    };

    return (
    <>
      <View style={s.phoneScreen}>
        <LinearGradient colors={['#4f46e5', '#7c3aed', '#a855f7']} style={s.phoneHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={s.hDecor1} /><View style={s.hDecor2} />
          <View style={s.phoneHeaderRow}>
            <View style={s.phoneHeaderIconWrap}>
              <Ionicons name={marketMode === 'game' ? 'game-controller' : 'call'} size={24} color="#fff" />
            </View>
            <View style={s.phoneHeaderTextWrap}>
              <Text style={s.phoneScreenTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{marketMode === 'game' ? t('explore.gameAndDigital') : t('explore.yourPhone')}</Text>
              <Text style={s.phoneScreenSub} numberOfLines={1}>{marketMode === 'game' ? t('explore.selectPlatform') : t('explore.enterPhoneNumber')}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.modeToggleRow}>
          <TouchableOpacity onPress={() => setMarketMode('phone')} style={[s.modeToggleBtn, marketMode === 'phone' && s.modeToggleBtnActive]} activeOpacity={0.8}>
            <Ionicons name="call" size={15} color={marketMode === 'phone' ? '#fff' : '#6366f1'} />
            <Text style={[s.modeToggleTxt, marketMode === 'phone' && s.modeToggleTxtActive]} numberOfLines={1}>{t('explore.phoneTopup')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMarketMode('game')} style={[s.modeToggleBtn, marketMode === 'game' && s.modeToggleBtnActive]} activeOpacity={0.8}>
            <Ionicons name="game-controller" size={15} color={marketMode === 'game' ? '#fff' : '#6366f1'} />
            <Text style={[s.modeToggleTxt, marketMode === 'game' && s.modeToggleTxtActive]} numberOfLines={1}>{t('explore.gameAndDigital')}</Text>
          </TouchableOpacity>
        </View>

        {marketMode === 'game' ? (
          // Sanallaştırılmış liste - ~250+ oyun/sosyal-app kartı artık ScrollView'de
          // hepsi bir anda değil, FlatList ile sadece görünen kısım render ediliyor
          // (performans: ScrollView+map ile ekran çok yavaşlıyordu, 30 Ağustos 2026).
          <FlatList
            data={allGameOperators}
            keyExtractor={(op) => op.id}
            numColumns={3}
            style={{ flex: 1 }}
            contentContainerStyle={s.phoneScreenBody}
            columnWrapperStyle={{ gap: 10 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={18}
            maxToRenderPerBatch={18}
            windowSize={7}
            removeClippedSubviews
            renderItem={({ item: op }) => (
              <TouchableOpacity onPress={() => selectGameOp(op)} activeOpacity={0.82} style={[s.gameCell, { marginBottom: 10 }]}>
                <View style={s.gameCellInner}>
                  <View style={s.gameLogoWrap}>
                    <OpLogo op={op} overrides={logoOverrides} style={s.gameOpLogo} />
                  </View>
                  <Text style={s.gameOpName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{op.name}</Text>
                  <View style={[s.gameOpBadge, { backgroundColor: op.colors[0] + '18' }]}>
                    <View style={[s.gameOpDot, { backgroundColor: op.colors[0] }]} />
                    <Text style={[s.gameOpBadgeTxt, { color: op.colors[0] }]}>{gameGridBadgeLabel(op)}</Text>
                  </View>
                  <LinearGradient colors={op.colors} style={s.gameArrow} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="chevron-forward" size={10} color="#fff" />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.phoneScreenBody, { paddingBottom: kbHeight > 0 ? kbHeight + 20 : PAD }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
              <View style={s.countryFlagRow}>
                {countries.map(c => {
                  const active = selCountry === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      onPress={() => { setSelCountry(c.key); setPhoneError(''); }}
                      style={s.countryFlagBtn}
                      activeOpacity={0.85}
                    >
                      {active ? (
                        <LinearGradient colors={['#4f46e5', '#7c3aed']} style={s.countryFlagBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                          <Text style={s.countryFlagEmoji}>{c.flag}</Text>
                          <Text style={s.countryFlagNameActive} numberOfLines={1}>{c.name}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={[s.countryFlagBtnInner, s.countryFlagBtnInnerIdle]}>
                          <Text style={s.countryFlagEmoji}>{c.flag}</Text>
                          <Text style={s.countryFlagName} numberOfLines={1}>{c.name}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[s.phoneNumberRow, phoneFocused && { borderColor: '#6366f1', backgroundColor: '#fff' }]}>
                <Text style={s.phoneCode}>{activeCountry.code}</Text>
                <TextInput
                  style={s.phoneScreenInput}
                  placeholder={phonePlaceholder}
                  placeholderTextColor="#94a3b8"
                  value={phone}
                  onChangeText={v => { setPhone(v); setPhoneError(''); }}
                  keyboardType="phone-pad"
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                />
                {phone.length > 0 && (
                  <TouchableOpacity onPress={() => { setPhone(''); setPhoneError(''); }}>
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {!!phoneError && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={s.errorTxt}>{phoneError}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={onContinue}
                disabled={phone.replace(/\D/g, '').length < 6 || checkingEligible}
                style={{ borderRadius: 16, overflow: 'hidden', marginTop: 24, opacity: (phone.replace(/\D/g, '').length < 6 || checkingEligible) ? 0.4 : 1 }}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#4f46e5', '#7c3aed']} style={s.confirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {checkingEligible ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Animated.Text
                        numberOfLines={1}
                        style={[s.confirmTxt, {
                          opacity: loadingTextAnim,
                          transform: [{ translateY: loadingTextAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                        }]}
                      >
                        {t(LOADING_STEPS[loadingStepIdx])}
                      </Animated.Text>
                    </>
                  ) : (
                    <>
                      <Text style={s.confirmTxt} numberOfLines={1}>{t('explore.continue')}</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <AppModal
        visible={!!appModal}
        type={appModal?.type || 'pending'}
        title={appModal?.title || ''}
        message={appModal?.message || ''}
        onClose={() => setAppModal(null)}
      />
      {orderModal}
    </>
    );
  }

  // ── Ana render ─────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* HEADER */}
      <LinearGradient colors={['#4f46e5', '#7c3aed', '#a855f7']} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={s.hDecor1} /><View style={s.hDecor2} />

        <View style={s.hRow}>
          <TouchableOpacity
            onPress={() => { setOpId(null); setDetectedOp(null); setPhone(''); setEligibleIds(null); setEligibleNote(null); setShowAllOverride(false); }}
            style={s.backBtn}
          >
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.hTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{activeOp?.name}</Text>
            {activeOp && <Text style={s.hSub}>{t('explore.packagesAvailable', { count: pkgs.length })}</Text>}
          </View>
          {activeOp && <OpLogo op={activeOp} overrides={logoOverrides} style={s.hLogo} />}
        </View>
      </LinearGradient>

      <ScrollView
        style={s.root}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Uygun paket sorgu bilgi bandı */}
        {activeOp && eligibleIds && !showAllOverride && (
          <View style={s.eligibleBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={s.eligibleBannerTxt}>{t('explore.eligiblePackagesFound', { count: eligibleIds.size })}</Text>
            <TouchableOpacity onPress={() => setShowAllOverride(true)}>
              <Text style={s.eligibleBannerLink}>{t('explore.showAllPackages')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {activeOp && eligibleNote && (
          <View style={s.eligibleNoteBanner}>
            <Ionicons name="information-circle" size={16} color="#f59e0b" />
            <Text style={s.eligibleNoteTxt}>{eligibleNote}</Text>
          </View>
        )}

        {/* PAKET LİSTESİ */}
        {activeOp && (
          pkgs.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={30} color="#cbd5e1" />
              <Text style={s.emptyTxt}>{t('explore.packageNotFoundList')}</Text>
            </View>
          ) : isGameOrder && pkgs[0]?.product_type === 'amount' ? (
            // Gunes-Tek 'amount' (serbest miktar) ürünü — tüm operatör tek satır,
            // kullanıcı ID + miktar sonradan modalda girilecek, burada sadece
            // birim fiyat + minimum miktar bilgisiyle tek bir kart gösteriliyor.
            <TouchableOpacity
              onPress={() => { setSelPkg(pkgs[0]); setOrderPhone(''); setAmountQty(String(pkgs[0].qty_min ?? '')); }}
              activeOpacity={0.8}
              style={s.pkgCard}
            >
              <LinearGradient
                colors={[activeOp.colors[0] + '12', activeOp.colors[1] + '08']}
                style={s.pkgCardInner}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <View style={s.pkgLeft}>
                  <View style={[s.pkgLogoCircle, { borderColor: activeOp.colors[0] + '40' }]}>
                    <OpLogo op={activeOp} overrides={logoOverrides} style={s.pkgLogo} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pkgName} numberOfLines={2}>{pkgs[0].name_tr || activeOp.name}</Text>
                    <Text style={s.pkgDetailTxt}>
                      {t('explore.minAmountHint', { min: fmtNum(pkgs[0].qty_min), defaultValue: `Minimum ${fmtNum(pkgs[0].qty_min)} adet` })}
                    </Text>
                  </View>
                </View>
                <View style={[s.pkgBadge, { backgroundColor: activeOp.colors[0] }]}>
                  <Text style={s.pkgBadgeLabelSmall}>{t('explore.unitPrice', { defaultValue: 'Birim' })}</Text>
                  <Text style={s.pkgBadgePrice}>{fmtPrice(getPkgPrice(pkgs[0]))}</Text>
                  <Text style={s.pkgBadgeCur}>₺</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
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
                  <Text style={s.catHeaderTxt} numberOfLines={1}>{getSubCategoryLabel(activeOp.name, key)}</Text>
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
      {orderModal}
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

  phoneScreen: { flex: 1, backgroundColor: '#f8fafc' },
  phoneHeader: { paddingTop: 34, paddingBottom: 16, paddingHorizontal: 22, overflow: 'hidden' },
  phoneHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  phoneHeaderIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  phoneHeaderTextWrap: { flex: 1 },
  phoneScreenTitle: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  phoneScreenSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginTop: 1 },
  phoneScreenBody: { padding: PAD },
  modeToggleRow: { flexDirection: 'row', gap: 8, paddingHorizontal: PAD, paddingTop: 14 },
  modeToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#eef2ff', borderRadius: 12, paddingVertical: 10 },
  modeToggleBtnActive: { backgroundColor: '#6366f1' },
  modeToggleTxt: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
  modeToggleTxtActive: { color: '#fff' },
  countryFlagRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  countryFlagBtn: { flex: 1, borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: '#6366f1', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  countryFlagBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 6 },
  countryFlagBtnInnerIdle: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0' },
  countryFlagEmoji: { fontSize: 18 },
  countryFlagName: { fontSize: 12.5, fontWeight: '800', color: '#475569' },
  countryFlagNameActive: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
  phoneNumberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, gap: 10, borderWidth: 1.5, borderColor: '#e2e8f0', marginTop: 12 },
  phoneCode: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
  phoneScreenInput: { flex: 1, color: '#1e293b', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

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

  eligibleBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  eligibleBannerTxt: { flex: 1, fontSize: 12, fontWeight: '700', color: '#059669' },
  eligibleBannerLink: { fontSize: 11, fontWeight: '700', color: '#10b981', textDecorationLine: 'underline' },
  eligibleNoteBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  eligibleNoteTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: '#b45309' },

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
