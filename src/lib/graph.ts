import type { SupabaseClient } from '@supabase/supabase-js';

export async function syncOrgHierarchy(
  supabase: SupabaseClient,
  userId: string,
  providerToken: string
): Promise<void> {
  try {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/manager?$select=mail,displayName,userPrincipalName',
      {
        headers: {
          Authorization: `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 404) {
      console.log('[OrgSync] No manager set in Azure AD');
      return;
    }

    if (!response.ok) {
      console.warn('[OrgSync] Graph API error:', response.status);
      return;
    }

    const managerData = await response.json();
    const managerEmail = managerData.mail || managerData.userPrincipalName;
    console.log('[OrgSync] Manager from Azure AD:', managerData.displayName, managerEmail);

    const { data: managerProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', managerEmail)
      .single();

    if (!managerProfile) {
      console.log('[OrgSync] Manager not found in GoalPilot profiles:', managerEmail);
      return;
    }

    await supabase
      .from('profiles')
      .update({ manager_id: managerProfile.id })
      .eq('id', userId);

    console.log('[OrgSync] manager_id updated to:', managerProfile.full_name);
  } catch (err) {
    console.warn('[OrgSync] Failed silently:', err);
  }
}
