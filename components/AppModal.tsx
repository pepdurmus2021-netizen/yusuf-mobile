import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

type ModalType = 'success' | 'pending' | 'error';

interface AppModalProps {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

const CONFIG = {
  success: {
    colors: ['#10b981', '#059669'] as [string, string],
    icon: 'checkmark' as const,
    decor: '#f0fdf4',
  },
  pending: {
    colors: ['#f59e0b', '#d97706'] as [string, string],
    icon: 'time' as const,
    decor: '#fffbeb',
  },
  error: {
    colors: ['#ef4444', '#dc2626'] as [string, string],
    icon: 'close' as const,
    decor: '#fef2f2',
  },
};

export default function AppModal({ visible, type, title, message, buttonText, onClose }: AppModalProps) {
  const { t } = useTranslation();
  const cfg = CONFIG[type];
  const resolvedButtonText = buttonText ?? t('common.ok');

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={[s.decor, { backgroundColor: cfg.decor }]} />

          <LinearGradient colors={cfg.colors} style={s.iconWrap}>
            <Ionicons name={cfg.icon} size={48} color="#fff" />
          </LinearGradient>

          <Text style={s.title}>{title}</Text>

          <View style={s.msgBox}>
            <Text style={s.msg}>{message}</Text>
          </View>

          <TouchableOpacity onPress={onClose} style={{ borderRadius: 16, overflow: 'hidden', width: '100%' }} activeOpacity={0.85}>
            <LinearGradient colors={cfg.colors} style={s.btn}>
              <Text style={s.btnTxt}>{resolvedButtonText}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 28, padding: 28, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 40, elevation: 20, overflow: 'hidden' },
  decor: { position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: 90 },
  iconWrap: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 18, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 },
  title: { fontSize: 26, fontWeight: '900', color: '#1e293b', marginBottom: 20, letterSpacing: -0.5 },
  msgBox: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 18, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  msg: { fontSize: 13, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  btn: { padding: 17, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
});
