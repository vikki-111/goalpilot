import { supabase } from '@/lib/supabase';
import type { Goal, GoalSheet, GoalStatus } from '@/types';

export async function upsertGoalSheet(data: {
  employee_id: string;
  cycle_id: string;
  status?: GoalStatus;
}): Promise<GoalSheet> {
  const { data: result, error } = await supabase
    .from('goal_sheets')
    .upsert(data)
    .select()
    .single();
  if (error) throw error;
  return result as GoalSheet;
}

export async function updateGoalSheet(id: string, data: {
  status?: GoalStatus;
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  manager_comment?: string | null;
  locked_at?: string | null;
}): Promise<GoalSheet> {
  const { data: result, error } = await supabase
    .from('goal_sheets')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result as GoalSheet;
}

export async function insertGoal(data: {
  sheet_id: string;
  thrust_area_id: string | null;
  title: string;
  description: string | null;
  uom_type: Goal['uom_type'];
  target_value: number | null;
  target_date: string | null;
  weightage: number;
  is_shared: boolean;
  shared_parent_id: string | null;
  is_readonly_title: boolean;
  sort_order: number;
}): Promise<Goal> {
  const { data: result, error } = await supabase
    .from('goals')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as Goal;
}

export async function updateGoal(id: string, data: Partial<Goal>): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function insertGoals(data: Array<{
  sheet_id: string;
  thrust_area_id: string | null;
  title: string;
  description: string | null;
  uom_type: Goal['uom_type'];
  target_value: number | null;
  target_date: string | null;
  weightage: number;
  is_shared: boolean;
  shared_parent_id: string | null;
  is_readonly_title: boolean;
  sort_order: number;
}>): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .insert(data);
  if (error) throw error;
}

export async function fetchGoalsBySheet(sheetId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*, thrust_areas(name)')
    .eq('sheet_id', sheetId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as Goal[];
}

export async function fetchGoalSheetByEmployee(employeeId: string, cycleId: string): Promise<GoalSheet | null> {
  const { data, error } = await supabase
    .from('goal_sheets')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('cycle_id', cycleId)
    .single();
  if (error && (error as { code?: string }).code !== 'PGRST116') throw error;
  return data as GoalSheet | null;
}
