import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

function TabIcon({ name, focused }: { name: any; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name={focused ? name : `${name}-outline` as any}
        size={23}
        color={focused ? '#6366f1' : '#b0b8cc'}
      />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

function CenterIcon() {
  return (
    <View style={styles.centerOuter}>
      <LinearGradient
        colors={['#4f46e5', '#7c3aed', '#a855f7']}
        style={styles.centerBtn}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="flash" size={28} color="#fff" />
      </LinearGradient>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAnaBayi = user?.role === 'ana_bayi';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#b0b8cc',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 10,
          shadowColor: '#6366f1',
          shadowOpacity: 0.1,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: -4 },
          elevation: 20,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.orders'),
          tabBarIcon: ({ focused }) => <TabIcon name="receipt" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dealers"
        options={{
          title: t('dealers.title'),
          tabBarIcon: ({ focused }) => <TabIcon name="people" focused={focused} />,
          tabBarItemStyle: isAnaBayi ? {} : { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '',
          tabBarIcon: () => <CenterIcon />,
          tabBarLabel: () => null,
          // Diğer sekmeler tek/çift sayıda olabildiği için (Bayilerim rol'e göre
          // gizlenip gösteriliyor) bu düğme flex akışına bırakılırsa sağa/sola kayıyor.
          // position:'absolute' ile akıştan tamamen çıkarıp bar genişliğinin tam
          // ortasına sabitliyoruz — geri kalan sekmeler kendi aralarında eşit dağılır.
          tabBarItemStyle: {
            position: 'absolute',
            left: '50%',
            marginLeft: -31,
            bottom: 6,
            width: 62,
            height: 62,
          },
        }}
      />
      <Tabs.Screen
        name="balance"
        options={{
          title: t('balance.title'),
          tabBarIcon: ({ focused }) => <TabIcon name="card" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarIcon: ({ focused }) => <TabIcon name="shield-checkmark" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#6366f1',
  },
  centerOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  centerBtn: {
    width: 62,
    height: 62,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  bwpRing: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bwpLetter: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
