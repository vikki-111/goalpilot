import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  authProvider: 'email' | 'azure' | null;
  setSession: (user: User) => Promise<void>;
  clearSession: () => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  role: null,
  loading: true,
  authProvider: null,

  setSession: async (user: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const profile = data as Profile | null;
      const provider = (user.app_metadata?.provider as string) ?? null;
      const authProvider: 'email' | 'azure' | null = provider === 'azure' ? 'azure' : provider === 'email' ? 'email' : null;

      if (error || !profile) {
        console.warn('[Auth] Profile not found for user:', user.id);
        set({ user, profile: null, role: null, authProvider, loading: false });
        return;
      }

      set({
        user,
        profile,
        role: profile.role,
        authProvider,
        loading: false,
      });
    } catch (err) {
      console.error('[Auth] setSession error:', err);
      set({ user, profile: null, role: null, authProvider: null, loading: false });
    }
  },

  clearSession: () => {
    set({ user: null, profile: null, role: null, authProvider: null, loading: false });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const profile = data as Profile | null;
    if (error || !profile) return;

    set({ profile, role: profile.role });
  },
}));
