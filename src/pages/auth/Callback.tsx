import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { syncAzureProfile } from '@/lib/azure-sync';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { setSession } = useAuthStore();

  useEffect(() => {
    console.log('[Callback] Starting auth listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Callback] Auth event:', event, 'Session:', session ? 'present' : 'null');

        if (event === 'SIGNED_IN' && session) {
          try {
            console.log('[Callback] Processing SIGNED_IN for user:', session.user.id);
            const meta = session.user.user_metadata ?? {};
            const fullName = (meta.full_name as string) ?? (meta.name as string) ?? session.user.email ?? '';
            const email = (meta.email as string) ?? session.user.email ?? '';

            console.log('[Callback] Upserting profile for:', email);
            const { error: upsertError } =             await supabase
              .from('profiles')
              .upsert(
                {
                  id: session.user.id,
                  full_name: fullName,
                  email,
                  role: 'employee',
                },
                { onConflict: 'id' }
              );

            if (upsertError) {
              console.error('[Callback] Upsert error:', upsertError);
              throw upsertError;
            }

            console.log('[Callback] Syncing Azure profile');
            await syncAzureProfile(supabase, session.user.id, meta);

            console.log('[Callback] Fetching full profile');
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('[Callback] Profile fetch error:', profileError);
              throw profileError;
            }

            if (!profileData) {
              throw new Error('Profile not found after upsert');
            }

            console.log('[Callback] Setting session');
            await setSession(session.user);

            const role = (profileData as { role: string }).role;
            console.log('[Callback] Redirecting to role:', role);
            const redirects: Record<string, string> = {
              employee: '/dashboard',
              manager: '/dashboard',
              admin: '/dashboard',
            };
            navigate(redirects[role] ?? '/dashboard', { replace: true });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Authentication failed';
            console.error('[Callback] Error:', err);
            setError(message);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[Callback] SIGNED_OUT, redirecting to login');
          navigate('/login');
        }
      }
    );

    // Fallback: check URL hash directly if onAuthStateChange doesn't fire
    const checkUrlHash = async () => {
      const hash = window.location.hash;
      console.log('[Callback] URL hash present:', !!hash);
      if (hash && hash.includes('access_token')) {
        console.log('[Callback] Hash contains access_token, Supabase should process it');
      }
    };
    checkUrlHash();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, setSession]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">Check browser console (F12) for details</p>
            <Button onClick={() => navigate('/login')}>Return to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Completing sign-in...</p>
        </CardContent>
      </Card>
    </div>
  );
}
