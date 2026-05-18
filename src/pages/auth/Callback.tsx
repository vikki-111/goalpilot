import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { extractRoleFromGroups } from '@/lib/azure-sync'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'

export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { setSession } = useAuthStore()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          try {
            console.log('provider token:', session.provider_token)
            console.log('Groups found:',
              (session.user.user_metadata?.custom_claims as Record<string, unknown>)?.groups)

            const azureRole = extractRoleFromGroups(session.user.user_metadata)

            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single()

            const finalRole =
              existingProfile?.role === 'admin' || existingProfile?.role === 'manager'
                ? existingProfile.role
                : azureRole

            const fullName =
              (session.user.user_metadata?.full_name as string) ??
              (session.user.user_metadata?.name as string) ??
              session.user.email ??
              ''
            const email = (session.user.email as string) ?? ''

            await supabase.from('profiles').upsert({
              id: session.user.id,
              full_name: fullName,
              email,
              role: finalRole,
            }, { onConflict: 'id' })

            let profile = null
            for (let i = 0; i < 3; i++) {
              const { data: p } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
              if (p) { profile = p; break }
              await new Promise(r => setTimeout(r, 500))
            }

            if (!profile) {
              throw new Error('Profile not found after upsert')
            }

            await setSession(session.user)

            const role = (profile as { role: string }).role || finalRole || 'employee'
            if (role === 'admin') navigate('/admin/dashboard')
            else if (role === 'manager') navigate('/manager/dashboard')
            else navigate('/employee/dashboard')
          } catch (err) {
            console.error('Callback error:', err)
            setError(err instanceof Error ? err.message : 'Authentication failed')
          }
        } else if (event === 'SIGNED_OUT') {
          navigate('/login')
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [navigate, setSession])

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
    )
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
  )
}
