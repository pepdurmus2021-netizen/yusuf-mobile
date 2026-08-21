import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = 'https://wstawtccbxkhujhupukd.supabase.co';
const supabaseAnonKey = 'sb_publishable_YfGtqP61Kd952kYP5AAUjg_ytfZBLQy';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.localStorage : undefined) : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
