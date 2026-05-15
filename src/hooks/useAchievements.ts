import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Achievement, CheckinComment, Quarter } from '@/types';

export function useAchievements(goalId: string, quarter: Quarter, cycleId: string) {
  return useQuery({
    queryKey: ['achievements', goalId, quarter, cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('goal_id', goalId)
        .eq('quarter', quarter)
        .eq('cycle_id', cycleId)
        .single();
      if (error && (error as { code?: string }).code !== 'PGRST116') throw error;
      return data as Achievement | null;
    },
    enabled: !!goalId && !!quarter && !!cycleId,
  });
}

export function useUpsertAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      goalId,
      quarter,
      cycleId,
      actualValue,
      actualDate,
      status,
      employeeNote,
      score,
    }: {
      goalId: string;
      quarter: Quarter;
      cycleId: string;
      actualValue: number | null;
      actualDate: string | null;
      status: Achievement['status'];
      employeeNote: string | null;
      score: number | null;
    }) => {
      const { data: existing } = await supabase
        .from('achievements')
        .select('id')
        .eq('goal_id', goalId)
        .eq('quarter', quarter)
        .eq('cycle_id', cycleId)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('achievements')
          .update({
            actual_value: actualValue,
            actual_date: actualDate,
            status,
            employee_note: employeeNote,
            score,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', (existing as Achievement).id)
          .select()
          .single();
        if (error) throw error;
        return data as Achievement;
      }

      const { data, error } = await supabase
        .from('achievements')
        .insert({
          goal_id: goalId,
          quarter,
          cycle_id: cycleId,
          actual_value: actualValue,
          actual_date: actualDate,
          status,
          employee_note: employeeNote,
          score,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as Achievement;
    },
    onSuccess: (_, { goalId, quarter, cycleId }) => {
      queryClient.invalidateQueries({ queryKey: ['achievements', goalId, quarter, cycleId] });
    },
  });
}

export function useCheckinComments(achievementId: string) {
  return useQuery({
    queryKey: ['checkin-comments', achievementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkin_comments')
        .select('*, profiles(full_name)')
        .eq('achievement_id', achievementId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as (CheckinComment & { profiles: { full_name: string } | null })[];
    },
    enabled: !!achievementId,
  });
}

export function useAddCheckinComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      achievementId,
      managerId,
      comment,
    }: {
      achievementId: string;
      managerId: string;
      comment: string;
    }) => {
      const { data, error } = await supabase
        .from('checkin_comments')
        .insert({
          achievement_id: achievementId,
          manager_id: managerId,
          comment,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CheckinComment;
    },
    onSuccess: (_, { achievementId }) => {
      queryClient.invalidateQueries({ queryKey: ['checkin-comments', achievementId] });
    },
  });
}

export function useEmployeeAchievements(employeeId: string, cycleId: string) {
  return useQuery({
    queryKey: ['employee-achievements', employeeId, cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select(`
          *,
          goals!inner(
            *,
            goal_sheets!inner(employee_id)
          )
        `)
        .eq('cycle_id', cycleId)
        .eq('goals.goal_sheets.employee_id', employeeId);
      if (error) throw error;
      return (data ?? []) as Achievement[];
    },
    enabled: !!employeeId && !!cycleId,
  });
}
