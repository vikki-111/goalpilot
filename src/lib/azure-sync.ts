import type { SupabaseClient } from '@supabase/supabase-js';

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
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[Azure Sync] Failed to update profile:', error);
    throw error;
  }
}
