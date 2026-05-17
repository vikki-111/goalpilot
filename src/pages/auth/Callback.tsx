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

  useEffect(() => {
    (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !data.session) {
          throw new Error('No active session found after OAuth redirect');
        }

        const { user } = data.session;
        const meta = user.user_metadata ?? {};
        const fullName = (meta.full_name as string) ?? (meta.name as string) ?? user.email ?? '';
        const email = (meta.email as string) ?? user.email ?? '';

        await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              full_name: fullName,
              email,
              role: 'employee',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        await syncAzureProfile(supabase, user.id, meta);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileData) {
          throw new Error('Profile not found after upsert');
        }

        await useAuthStore.getState().setSession(user);

        const role = (profileData as { role: string }).role;
        const redirects: Record<string, string> = {
          employee: '/dashboard',
          manager: '/dashboard',
          admin: '/dashboard',
        };
        navigate(redirects[role] ?? '/dashboard', { replace: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
      }
    })();
  }, [navigate]);

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
