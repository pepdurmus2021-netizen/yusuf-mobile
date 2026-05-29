import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
  TextInput, Modal, KeyboardAvoidingView, Platform, Linking,
  ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { API_URL, apiFetch } from '../../lib/config';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import AppModal from '../../components/AppModal';

export default function ProfileScreen() {
  const { user, token, logout, updateUser } = useAuth();
  const [photo, setPhoto] = useState<string | null>(null);

  const [editModal, setEditModal]     = useState(false);
  const [editName, setEditName]       = useState('');
  const [editPhone, setEditPhone]     = useState('');
  const [editFirma, setEditFirma]     = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [passModal, setPassModal]     = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass]         = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCur, setShowCur]         = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [appModal, setAppModal] = useState<{ type: 'success' | 'pending' | 'error'; title: string; message: string } | null>(null);
  const [photoOptions, setPhotoOptions] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(false);

  const photoKey = user?.id ? `profilePhoto_${user.id}` : null;

  useEffect(() => {
    setPhoto(null);
    if (photoKey) AsyncStorage.getItem(photoKey).then(v => { if (v) setPhoto(v); });
  }, [user?.id]);

  const pickPhoto = async () => {
    setPhotoOptions(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setAppModal({ type: 'error', title: 'İzin Gerekli', message: 'Fotoğraf erişimi için izin verin.' }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhoto(uri);
      if (photoKey) AsyncStorage.setItem(photoKey, uri);
    }
  };

  const openEdit = () => { setEditName(user?.name || ''); setEditPhone(user?.phone || ''); setEditFirma((user as any)?.firma_adi || ''); setEditModal(true); };

  const handleSave = async () => {
    if (!editName.trim()) { setAppModal({ type: 'error', title: 'Hata', message: 'Ad soyad boş olamaz.' }); return; }
    if (!user?.id) return;
    setEditLoading(true);
    try {
      const { error } = await supabase.from('users').update({ name: editName.trim(), phone: editPhone.trim(), firma_adi: editFirma.trim() || null }).eq('id', user.id);
      if (error) throw error;
      updateUser({ name: editName.trim(), phone: editPhone.trim(), firma_adi: editFirma.trim() || null });
      setEditModal(false);
      setAppModal({ type: 'success', title: 'Başarılı', message: 'Bilgileriniz güncellendi.' });
    } catch (e: any) { setAppModal({ type: 'error', title: 'Hata', message: e?.message || 'Güncelleme başarısız.' }); }
    finally { setEditLoading(false); }
  };

  const handleChangePass = async () => {
    if (!currentPass || !newPass || !confirmPass) { setAppModal({ type: 'error', title: 'Hata', message: 'Tüm alanları doldurun.' }); return; }
    if (newPass !== confirmPass) { setAppModal({ type: 'error', title: 'Hata', message: 'Yeni şifreler eşleşmiyor.' }); return; }
    if (newPass.length < 6) { setAppModal({ type: 'error', title: 'Hata', message: 'Şifre en az 6 karakter olmalı.' }); return; }
    if (!user?.id) return;
    setPassLoading(true);
    try {
      await apiFetch(`${API_URL}:4000/api/me/password`, token, {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPass, new_password: newPass }),
      });
      setPassModal(false); setCurrentPass(''); setNewPass(''); setConfirmPass('');
      setAppModal({ type: 'success', title: 'Başarılı', message: 'Şifreniz değiştirildi.' });
    } catch (e: any) { setAppModal({ type: 'error', title: 'Hata', message: e?.message || 'Şifre değiştirme başarısız.' }); }
    finally { setPassLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Oturumu kapatmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => { logout(); router.replace('/login'); } },
    ]);
  };

  const initials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  const balance  = parseFloat(user?.balance?.toString() || '0');

  return (
    <View style={s.root}>
      <AppModal
        visible={!!appModal}
        type={appModal?.type || 'error'}
        title={appModal?.title || ''}
        message={appModal?.message || ''}
        onClose={() => setAppModal(null)}
      />
      {/* FOTOĞRAF SEÇENEK MODALI */}
      <Modal visible={photoOptions} transparent animationType="slide" onRequestClose={() => setPhotoOptions(false)}>
        <TouchableOpacity style={s.optOverlay} activeOpacity={1} onPress={() => setPhotoOptions(false)}>
          <View style={s.optSheet}>
            <View style={s.optHandle} />
            <Text style={s.optTitle}>Profil Fotoğrafı</Text>
            {photo && (
              <TouchableOpacity style={s.optBtn} onPress={() => { setPhotoOptions(false); setViewPhoto(true); }} activeOpacity={0.8}>
                <View style={[s.optIcon, { backgroundColor: '#ede9fe' }]}>
                  <Ionicons name="eye-outline" size={20} color="#6366f1" />
                </View>
                <Text style={s.optBtnTxt}>Fotoğrafı Gör</Text>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.optBtn} onPress={pickPhoto} activeOpacity={0.8}>
              <View style={[s.optIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="image-outline" size={20} color="#10b981" />
              </View>
              <Text style={s.optBtnTxt}>Fotoğraf Seç & Düzenle</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.optBtn, { marginTop: 4 }]} onPress={() => setPhotoOptions(false)} activeOpacity={0.8}>
              <View style={[s.optIcon, { backgroundColor: '#f8fafc' }]}>
                <Ionicons name="close" size={20} color="#94a3b8" />
              </View>
              <Text style={[s.optBtnTxt, { color: '#94a3b8' }]}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FOTOĞRAF GÖRÜNTÜLEME */}
      <Modal visible={viewPhoto} transparent animationType="fade" onRequestClose={() => setViewPhoto(false)}>
        <View style={s.viewOverlay}>
          <TouchableOpacity style={s.viewClose} onPress={() => setViewPhoto(false)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {photo && <Image source={{ uri: photo }} style={s.viewImg} resizeMode="contain" />}
        </View>
      </Modal>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER GRADİENT ARKA PLAN */}
        <LinearGradient colors={['#4f46e5','#7c3aed','#a855f7']} style={s.headerBg} start={{ x:0, y:0 }} end={{ x:1, y:1 }}>
          <View style={s.dec1} /><View style={s.dec2} />
          <Text style={s.hTitle}>Profilim</Text>

          {/* YATAY PROFİL KARTI */}
          <View style={s.profileCard}>
            {/* FOTOĞRAF */}
            <TouchableOpacity style={s.photoWrap} onPress={() => setPhotoOptions(true)} activeOpacity={0.85}>
              {photo ? (
                <Image key={user?.id} source={{ uri: photo }} style={s.photoImg} />
              ) : (
                <LinearGradient colors={['#6366f1','#a855f7']} style={s.photoPlaceholder}>
                  <Text style={s.photoInitial}>{initials(user?.name)}</Text>
                </LinearGradient>
              )}
              <View style={s.cameraBadge}>
                <Ionicons name="camera" size={11} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* BİLGİLER — sağ taraf */}
            <View style={s.profileInfo}>
              <View style={s.nameRow}>
                <Text style={s.profileName} numberOfLines={1}>{user?.name || 'Kullanıcı'}</Text>
                <TouchableOpacity onPress={openEdit} style={s.editBtn}>
                  <Ionicons name="pencil" size={12} color="#6366f1" />
                </TouchableOpacity>
              </View>

              <Text style={s.profileEmail} numberOfLines={1}>{user?.email}</Text>
              {user?.phone ? <Text style={s.profilePhone}>{user.phone}</Text> : null}

              <View style={s.badgeRow}>
                <View style={s.roleBadge}>
                  <Ionicons name={user?.role === 'dealer' ? 'storefront' : 'person'} size={10} color="#6366f1" />
                  <Text style={s.roleText}>{user?.role === 'dealer' ? 'Bayi' : 'Kullanıcı'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* BAKİYE + İSTATİSTİK SATIRI */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statVal}>{balance.toFixed(2)} ₺</Text>
              <Text style={s.statLbl}>Bakiye</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statVal}>{user?.role?.toUpperCase() || 'USER'}</Text>
              <Text style={s.statLbl}>Hesap Tipi</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statVal}>TR</Text>
              <Text style={s.statLbl}>Bölge</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.content}>

          {/* HESAP */}
          <View style={s.groupHead}>
            <Ionicons name="settings-outline" size={13} color="#94a3b8" />
            <Text style={s.groupTitle}>HESAP AYARLARI</Text>
          </View>
          <View style={s.group}>
            <MenuItem icon="person-outline"           color="#6366f1" label="Bilgilerimi Düzenle"   onPress={openEdit} />
            <MenuItem icon="lock-closed-outline"      color="#10b981" label="Şifre Değiştir"         onPress={() => setPassModal(true)} />
            <MenuItem icon="shield-checkmark-outline" color="#f59e0b" label="Güvenlik"               last />
          </View>

          {/* DESTEK */}
          <View style={s.groupHead}>
            <Ionicons name="headset-outline" size={13} color="#94a3b8" />
            <Text style={s.groupTitle}>DESTEK & İLETİŞİM</Text>
          </View>
          <View style={s.group}>
            <MenuItem icon="logo-whatsapp"       color="#25D366" label="WhatsApp Destek"       onPress={() => Linking.openURL('https://wa.me/905069690724')} />
            <MenuItem icon="mail-outline"        color="#0ea5e9" label="E-posta Gönder"        onPress={() => Linking.openURL('mailto:destek@yusufmobile.com')} />
            <MenuItem icon="help-circle-outline" color="#8b5cf6" label="Sık Sorulan Sorular"  last />
          </View>

          {/* ÇIKIŞ */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <View style={s.logoutIcon}>
              <Ionicons name="log-out-outline" size={19} color="#ef4444" />
            </View>
            <Text style={s.logoutTxt}>Oturumu Kapat</Text>
            <Ionicons name="chevron-forward" size={15} color="#ef4444" />
          </TouchableOpacity>

          <Text style={s.version}>Yusuf Telecom v1.0.0</Text>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BİLGİ DÜZENLEME MODAL */}
      <Modal visible={editModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.overlayBg} activeOpacity={1} onPress={() => setEditModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Bilgilerimi Düzenle</Text>
              <TouchableOpacity onPress={() => setEditModal(false)} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FieldRow icon="person-outline"   label="Ad Soyad"   value={editName}  onChange={setEditName}  placeholder="Adınızı girin" />
            <FieldRow icon="business-outline" label="Firma Adı" value={editFirma} onChange={setEditFirma} placeholder="Firma adınız (opsiyonel)" />
            <FieldRow icon="call-outline"     label="Telefon"   value={editPhone} onChange={setEditPhone} placeholder="Telefon numarası" keyboard="phone-pad" />
            <TouchableOpacity onPress={handleSave} disabled={editLoading} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 6 }}>
              <LinearGradient colors={['#6366f1','#8b5cf6']} style={s.sheetBtn}>
                {editLoading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={17} color="#fff" /><Text style={s.sheetBtnTxt}>Kaydet</Text></>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ŞİFRE MODAL */}
      <Modal visible={passModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.overlayBg} activeOpacity={1} onPress={() => setPassModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Şifre Değiştir</Text>
              <TouchableOpacity onPress={() => { setPassModal(false); setCurrentPass(''); setNewPass(''); setConfirmPass(''); }} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FieldRow icon="lock-closed-outline" label="Mevcut Şifre"       value={currentPass} onChange={setCurrentPass} placeholder="Mevcut şifreniz"  secure={!showCur} eye onEye={() => setShowCur(!showCur)} showEye={showCur} />
            <FieldRow icon="lock-open-outline"   label="Yeni Şifre"         value={newPass}     onChange={setNewPass}     placeholder="En az 6 karakter" secure={!showNew} eye onEye={() => setShowNew(!showNew)} showEye={showNew} />
            <FieldRow icon="lock-open-outline"   label="Yeni Şifre (Tekrar)" value={confirmPass} onChange={setConfirmPass} placeholder="Tekrar girin"     secure={!showNew} />
            <TouchableOpacity onPress={handleChangePass} disabled={passLoading} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 6 }}>
              <LinearGradient colors={['#10b981','#059669']} style={s.sheetBtn}>
                {passLoading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="key" size={17} color="#fff" /><Text style={s.sheetBtnTxt}>Şifreyi Güncelle</Text></>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function MenuItem({ icon, color, label, onPress, last }: any) {
  return (
    <TouchableOpacity style={[s.menuItem, !last && s.menuBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.menuIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

function FieldRow({ icon, label, value, onChange, placeholder, keyboard, secure, eye, onEye, showEye }: any) {
  return (
    <>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldRow}>
        <Ionicons name={icon} size={16} color="#94a3b8" />
        <TextInput style={s.fieldInput} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#94a3b8" keyboardType={keyboard || 'default'} secureTextEntry={secure} autoCapitalize="none" />
        {eye && <TouchableOpacity onPress={onEye}><Ionicons name={showEye ? 'eye-off-outline' : 'eye-outline'} size={16} color="#94a3b8" /></TouchableOpacity>}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  headerBg: { paddingTop: 60, paddingBottom: 22, paddingHorizontal: 20, overflow: 'hidden' },
  dec1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60 },
  dec2: { position: 'absolute', width: 120, height: 120, borderRadius: 60,  backgroundColor: 'rgba(255,255,255,0.06)', bottom: -30, left: -30 },
  hTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 16 },

  /* YATAY PROFİL KARTI */
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
    elevation: 10,
    shadowColor: '#4f46e5',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
  },

  photoWrap: { position: 'relative' },
  photoImg: { width: 76, height: 76, borderRadius: 22, borderWidth: 2.5, borderColor: '#6366f1' },
  photoPlaceholder: { width: 76, height: 76, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  photoInitial: { color: '#fff', fontSize: 28, fontWeight: '900' },
  cameraBadge: { position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: '#fff' },

  profileInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName: { flex: 1, fontSize: 17, fontWeight: '900', color: '#1e293b' },
  editBtn: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center' },
  profileEmail: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  profilePhone: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  badgeRow: { flexDirection: 'row', marginTop: 4, gap: 6 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ede9fe', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  roleText: { color: '#6366f1', fontSize: 11, fontWeight: '800' },

  /* İSTATİSTİK SATIRI */
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { color: '#fff', fontSize: 14, fontWeight: '900' },
  statLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  content: { paddingHorizontal: 18, paddingTop: 20 },

  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 9, marginLeft: 2 },
  groupTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.2 },
  group: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 4, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1e293b' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 16, padding: 14, gap: 12, marginBottom: 10 },
  logoutIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  logoutTxt: { flex: 1, color: '#ef4444', fontWeight: '800', fontSize: 14 },

  version: { textAlign: 'center', marginTop: 16, color: '#cbd5e1', fontSize: 11, fontWeight: '600' },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 44 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 6, marginLeft: 2 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, backgroundColor: '#f8fafc', marginBottom: 13, gap: 10 },
  fieldInput: { flex: 1, fontSize: 14, color: '#1e293b', fontWeight: '600' },
  sheetBtn: { padding: 15, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  sheetBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  optOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  optHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  optTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 16 },
  optBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optBtnTxt: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1e293b' },

  viewOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  viewClose: { position: 'absolute', top: 54, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  viewImg: { width: '100%', height: '100%' },
});
