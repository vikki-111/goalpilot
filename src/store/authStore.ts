import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  setSession: (user: User) => Promise<void>;
  clearSession: () => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  role: null,
  loading: true,

  setSession: async (user: User) => {
    console.log('[Auth] setSession called for user:', user.id);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const profile = data as Profile | null;

      if (error || !profile) {
        console.warn('[Auth] Profile not found, creating one...', error?.message);
        const fullName = user.email?.split('@')[0] ?? 'User';
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: fullName,
            email: user.email ?? '',
            role: 'employee',
          })
          .select()
          .single();

        if (insertError || !newProfile) {
          console.error('[Auth] Failed to create profile:', insertError?.message);
          set({ user, profile: null, role: 'employee', loading: false });
          return;
        }

        console.log('[Auth] Profile created:', (newProfile as Profile).role);
        set({
          user,
          profile: newProfile as Profile,
          role: (newProfile as Profile).role,
          loading: false,
        });
        return;
      }

      console.log('[Auth] Profile found:', profile.role);
      set({
        user,
        profile,
        role: profile.role,
        loading: false,
      });
    } catch (err) {
      console.error('[Auth] setSession error:', err);
      set({ user, profile: null, role: null, loading: false });
    }
  },

  clearSession: () => {
    console.log('[Auth] clearSession called');
    set({ user: null, profile: null, role: null, loading: false });
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
