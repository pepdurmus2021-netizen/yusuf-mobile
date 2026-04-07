import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

function HomeIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, focused && styles.iconActive]}>🏠</Text>
      {focused && <View style={styles.dot} />}
    </View>
  );
}

function OrdersIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, focused && styles.iconActive]}>📋</Text>
      {focused && <View style={styles.dot} />}
    </View>
  );
}

function CenterIcon() {
  return (
    <View style={styles.centerBtn}>
      <Text style={styles.centerIcon}>📦</Text>
    </View>
  );
}

function BalanceIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, focused && styles.iconActive]}>💳</Text>
      {focused && <View style={styles.dot} />}
    </View>
  );
}

function ProfileIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, focused && styles.iconActive]}>👤</Text>
      {focused && <View style={styles.dot} />}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#5B4FCF',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: 75,
          paddingBottom: 12,
          paddingTop: 8,
          shadowColor: '#5B4FCF',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 16,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ focused }) => <HomeIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Siparişler',
          tabBarIcon: ({ focused }) => <OrdersIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '',
          tabBarIcon: () => <CenterIcon />,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="balance"
        options={{
          title: 'Bakiye',
          tabBarIcon: ({ focused }) => <BalanceIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => <ProfileIcon focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22, opacity: 0.4 },
  iconActive: { opacity: 1 },
  dot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#5B4FCF', marginTop: 3,
  },
  centerBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#5B4FCF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#5B4FCF',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  centerIcon: { fontSize: 26 },
});
