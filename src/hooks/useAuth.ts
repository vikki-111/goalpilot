import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, profile, role, loading, setSession, clearSession } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    console.log('[useAuth] Initializing, checking session...');

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[useAuth] getSession result:', session?.user?.id ?? 'no session');
      if (session?.user) {
        setSession(session.user);
      } else {
        clearSession();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useAuth] onAuthStateChange:', event, session?.user?.id ?? 'no user');
      if (event === 'SIGNED_OUT') {
        clearSession();
      } else if (event === 'SIGNED_IN' && session?.user) {
        setSession(session.user);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setSession(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, clearSession]);

  return { user, profile, role, loading };
}
