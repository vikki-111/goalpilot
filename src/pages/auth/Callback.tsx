import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { extractRoleFromGroups } from '@/lib/azure-sync'

export function AuthCallback() {
  const navigate = useNavigate()
  const { setSession } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        )

        if (error) {
          console.error('Code exchange error:', error)
          navigate('/login?error=auth_failed')
          return
        }

        const session = data.session
        if (!session) {
          navigate('/login?error=no_session')
          return
        }

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

        console.log('Final role:', finalRole)

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
        const redirects: Record<string, string> = {
          employee: '/dashboard',
          manager: '/dashboard',
          admin: '/dashboard',
        }
        navigate(redirects[role] ?? '/dashboard', { replace: true })
      } catch (err) {
        console.error('Callback error:', err)
        navigate('/login?error=unexpected')
      }
    }

    handleCallback()
  }, [navigate, setSession])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
        <p className="text-sm text-gray-500">Completing sign-in...</p>
      </div>
    </div>
  )
}
