import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Quarter } from '@/types';

interface TeamMemberSheet {
  id: string;
  employee_id: string;
  cycle_id: string;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  manager_comment: string | null;
  profiles: { full_name: string; department: string; email: string };
  goals: Array<{ id: string; title: string; weightage: number; uom_type: string; target_value: number | null; target_date: string | null }>;
  goal_count: number;
  total_weightage: number;
}

interface TeamAchievementSummary {
  employee_id: string;
  full_name: string;
  department: string;
  quarter: Quarter;
  achievements_submitted: number;
  total_goals: number;
  avg_score: number | null;
}

export function useTeamSheets(managerId: string, cycleId: string) {
  return useQuery({
    queryKey: ['team-sheets', managerId, cycleId],
    queryFn: async () => {
      const { data: reportIds, error: reportsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', managerId);

      if (reportsError) throw reportsError;

      const ids = (reportIds ?? []).map((p) => p.id);
      if (ids.length === 0) return [];

      const { data: sheets, error: sheetsError } = await supabase
        .from('goal_sheets')
        .select(`
          *,
          profiles!goal_sheets_employee_id_fkey(full_name, department, email),
          goals(id, title, weightage, uom_type, target_value, target_date)
        `)
        .eq('cycle_id', cycleId)
        .in('employee_id', ids)
        .order('submitted_at', { ascending: false });

      if (sheetsError) throw sheetsError;

      return (sheets ?? []).map((sheet: Record<string, unknown>) => {
        const goals = (sheet.goals as Array<Record<string, unknown>> | undefined) ?? [];
        return {
          id: sheet.id as string,
          employee_id: sheet.employee_id as string,
          cycle_id: sheet.cycle_id as string,
          status: sheet.status as string,
          submitted_at: sheet.submitted_at as string | null,
          approved_at: sheet.approved_at as string | null,
          manager_comment: sheet.manager_comment as string | null,
          profiles: sheet.profiles as { full_name: string; department: string; email: string },
          goals: goals.map((g) => ({
            id: g.id as string,
            title: g.title as string,
            weightage: g.weightage as number,
            uom_type: g.uom_type as string,
            target_value: g.target_value as number | null,
            target_date: g.target_date as string | null,
          })),
          goal_count: goals.length,
          total_weightage: goals.reduce((sum, g) => sum + (g.weightage as number), 0),
        } as TeamMemberSheet;
      });
    },
    enabled: !!managerId && !!cycleId,
  });
}

export function useTeamAchievementSummary(managerId: string, cycleId: string, quarter: Quarter) {
  return useQuery({
    queryKey: ['team-achievement-summary', managerId, cycleId, quarter],
    queryFn: async () => {
      const { data: reports, error: reportsError } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .eq('manager_id', managerId);

      if (reportsError) throw reportsError;

      const results: TeamAchievementSummary[] = [];

      for (const report of reports ?? []) {
        const { data: sheets } = await supabase
          .from('goal_sheets')
          .select('id')
          .eq('employee_id', report.id)
          .eq('cycle_id', cycleId)
          .single();

        if (!sheets) continue;

        const { data: goals } = await supabase
          .from('goals')
          .select('id')
          .eq('sheet_id', (sheets as { id: string }).id);

        const goalIds = (goals ?? []).map((g) => g.id);

        const { data: achievements } = await supabase
          .from('achievements')
          .select('score, submitted_at')
          .eq('cycle_id', cycleId)
          .eq('quarter', quarter)
          .in('goal_id', goalIds);

        const submitted = (achievements ?? []).filter((a) => a.submitted_at !== null).length;
        const scores = (achievements ?? []).filter((a) => a.score !== null).map((a) => a.score as number);
        const avgScore = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null;

        results.push({
          employee_id: report.id as string,
          full_name: report.full_name as string,
          department: report.department as string,
          quarter,
          achievements_submitted: submitted,
          total_goals: goalIds.length,
          avg_score: avgScore ? Math.round(avgScore) : null,
        });
      }

      return results;
    },
    enabled: !!managerId && !!cycleId && !!quarter,
  });
}
