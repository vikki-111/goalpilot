import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { extractRoleFromGroups } from '@/lib/azure-sync'
import { syncOrgHierarchy } from '@/lib/graph'
import type { Profile } from '@/types'
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
            console.log('1. SIGNED_IN event fired')
            console.log('2. Session user id:', session.user.id)

            console.log('provider token:', session.provider_token)
            console.log('Groups found:',
              (session.user.user_metadata?.custom_claims as Record<string, unknown>)?.groups)

            const azureRole = extractRoleFromGroups(session.user.user_metadata)
            console.log('3. Azure role extracted:', azureRole)

            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single()
            console.log('4. Existing profile:', existingProfile)

            const finalRole =
              existingProfile?.role === 'admin' || existingProfile?.role === 'manager'
                ? existingProfile.role
                : azureRole
            console.log('5. Final role:', finalRole)

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
            console.log('6. Profile upserted successfully')

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
            console.log('7. Profile fetched:', profile)
            console.log('8. Profile role:', profile?.role)

            if (!profile) {
              throw new Error('Profile not found after upsert')
            }

            await setSession(session.user, profile as Profile)
            console.log('9. Auth store updated')

            if (session.provider_token) {
              await syncOrgHierarchy(supabase, session.user.id, session.provider_token)
            } else {
              console.log('[OrgSync] No provider token — skipping sync')
            }

            await new Promise(r => setTimeout(r, 100))

            const role = (profile as { role: string }).role || finalRole || 'employee'
            console.log('10. Navigating to role:', role)
            console.log('11. Navigate target: /dashboard')
            window.location.href = '/dashboard'
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
