import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  upsertGoalSheet,
  updateGoalSheet,
  insertGoals,
  fetchGoalsBySheet,
  fetchGoalSheetByEmployee,
} from '@/lib/supabase-helpers';
import type { GoalStatus, Cycle, ThrustArea } from '@/types';

interface GoalWithThrust {
  id: string;
  sheet_id: string;
  thrust_area_id: string | null;
  title: string;
  description: string | null;
  uom_type: 'min' | 'max' | 'timeline' | 'zero';
  target_value: number | null;
  target_date: string | null;
  weightage: number;
  is_shared: boolean;
  shared_parent_id: string | null;
  is_readonly_title: boolean;
  sort_order: number;
  created_at: string;
  thrust_areas: { name: string } | null;
}

export function useActiveCycle() {
  return useQuery({
    queryKey: ['active-cycle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data as Cycle;
    },
  });
}

export function useThrustAreas(cycleId?: string) {
  return useQuery({
    queryKey: ['thrust-areas', cycleId],
    queryFn: async () => {
      let query = supabase.from('thrust_areas').select('*').order('name');
      if (cycleId) query = query.eq('cycle_id', cycleId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ThrustArea[];
    },
    enabled: !!cycleId,
  });
}

export function useGoalSheet(employeeId: string, cycleId: string) {
  return useQuery({
    queryKey: ['goal-sheet', employeeId, cycleId],
    queryFn: async () => {
      const sheet = await fetchGoalSheetByEmployee(employeeId, cycleId);
      if (!sheet) return null;

      const goals = await fetchGoalsBySheet(sheet.id);
      const goalsWithThrust: GoalWithThrust[] = goals.map((g) => ({
        ...g,
        thrust_areas: null,
      }));

      return { sheet, goals: goalsWithThrust };
    },
    enabled: !!employeeId && !!cycleId,
  });
}

export function useUpsertGoalSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      cycleId,
      status,
    }: {
      employeeId: string;
      cycleId: string;
      status?: GoalStatus;
    }) => {
      const existing = await fetchGoalSheetByEmployee(employeeId, cycleId);

      if (existing) {
        return updateGoalSheet(existing.id, { status: status ?? 'draft' });
      }

      return upsertGoalSheet({
        employee_id: employeeId,
        cycle_id: cycleId,
        status: status ?? 'draft',
      });
    },
    onSuccess: (_, { employeeId, cycleId }) => {
      queryClient.invalidateQueries({ queryKey: ['goal-sheet', employeeId, cycleId] });
    },
  });
}

export function useSubmitGoalSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sheetId,
      goals,
    }: {
      sheetId: string;
      goals: Array<{
        sheet_id: string;
        thrust_area_id: string | null;
        title: string;
        description: string | null;
        uom_type: 'min' | 'max' | 'timeline' | 'zero';
        target_value: number | null;
        target_date: string | null;
        weightage: number;
        is_shared: boolean;
        shared_parent_id: string | null;
        is_readonly_title: boolean;
        sort_order: number;
      }>;
    }) => {
      await supabase.from('goals').delete().eq('sheet_id', sheetId);

      if (goals.length > 0) {
        await insertGoals(goals);
      }

      return updateGoalSheet(sheetId, {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
    },
  });
}

export function useUpdateGoalSheetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sheetId,
      status,
      managerComment,
      approvedBy,
    }: {
      sheetId: string;
      status: GoalStatus;
      managerComment?: string;
      approvedBy?: string;
    }) => {
      const update: Parameters<typeof updateGoalSheet>[1] = { status };

      if (status === 'approved') {
        update.approved_at = new Date().toISOString();
        update.approved_by = approvedBy ?? null;
        update.locked_at = new Date().toISOString();
      }

      if (status === 'returned') {
        update.manager_comment = managerComment ?? null;
      }

      return updateGoalSheet(sheetId, update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
    },
  });
}
