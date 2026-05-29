import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { token, loading } = useAuth();

  // Yükleme sırasında beklet
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F3FF' }}>
        <ActivityIndicator size="large" color="#5B4FCF" />
      </View>
    );
  }

  // Token varsa ana sayfaya, yoksa login'e yönlendir
  return token ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}
