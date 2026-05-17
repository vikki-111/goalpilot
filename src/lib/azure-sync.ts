import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from '@/types';

export function extractRoleFromGroups(
  userMetadata: Record<string, unknown>
): UserRole {
  const groups: string[] =
    (userMetadata?.groups as string[]) ??
    ((userMetadata?.app_metadata as Record<string, unknown>)?.groups as string[]) ??
    [];

  const GROUP_IDS: Record<UserRole, string> = {
    admin: '91725528-ecdb-4ccc-b6ff-4824961c5cc5',
    manager: '4e4a33be-1e1d-4f50-8f37-ad543daae03b',
    employee: '319c76f5-07e8-46cc-a157-3224ac8e0dc3',
  };

  if (groups.includes(GROUP_IDS.admin)) return 'admin';
  if (groups.includes(GROUP_IDS.manager)) return 'manager';
  if (groups.includes(GROUP_IDS.employee)) return 'employee';
  return 'employee';
}

export async function syncAzureProfile(
  supabase: SupabaseClient,
  userId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const fullName = (metadata.full_name as string) ?? (metadata.name as string) ?? '';
  const email = (metadata.email as string) ?? '';
  const department = (metadata.department as string) ?? (metadata.job_title as string) ?? null;

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      email,
      department,
    })
    .eq('id', userId);

  if (error) {
    console.error('[Azure Sync] Failed to update profile:', error);
    throw error;
  }
}
