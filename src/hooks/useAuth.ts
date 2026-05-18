import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, profile, role, loading, setSession, clearSession } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          await setSession(session.user);
        } else {
          clearSession();
        }
      } else if (event === 'SIGNED_OUT') {
        clearSession();
      } else if (event === 'SIGNED_IN' && session?.user) {
        await setSession(session.user);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        await setSession(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, clearSession]);

  return { user, profile, role, loading };
}
