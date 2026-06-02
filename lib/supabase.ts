import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = 'https://wstawtccbxkhujhupukd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdGF3dGNjYnhraHVqaHVwdWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDI1MTAsImV4cCI6MjA4NjIxODUxMH0.byQIXLbDYQBQvBaRDgaxHs6RMTx_U-CsnRDrMQ0Vhxk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.localStorage : undefined) : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
