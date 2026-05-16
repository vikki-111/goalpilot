import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Quarter } from '@/types';

interface OrgStats {
  total_employees: number;
  goals_submitted: number;
  goals_approved: number;
  goals_pending: number;
}

interface CheckinCompletion {
  quarter: Quarter;
  submitted_count: number;
  total_employees: number;
  completion_pct: number;
}

interface AuditEvent {
  id: string;
  actor_name: string | null;
  entity_type: string;
  action: string;
  created_at: string;
}

interface DepartmentSummary {
  department: string;
  employee_count: number;
  avg_score: number | null;
  checkin_pct: number;
}

export function useOrgStats(cycleId: string) {
  return useQuery({
    queryKey: ['org-stats', cycleId],
    queryFn: async () => {
      const { data: employees } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'employee');

      const { data: sheets } = await supabase
        .from('goal_sheets')
        .select('status')
        .eq('cycle_id', cycleId);

      const submitted = (sheets ?? []).filter((s) => s.status === 'submitted').length;
      const approved = (sheets ?? []).filter((s) => s.status === 'approved' || s.status === 'locked').length;
      const pending = (sheets ?? []).filter((s) => s.status === 'draft' || s.status === 'returned').length;

      return {
        total_employees: (employees ?? []).length,
        goals_submitted: submitted,
        goals_approved: approved,
        goals_pending: pending,
      } as OrgStats;
    },
    enabled: !!cycleId,
  });
}

export function useCheckinCompletion(cycleId: string, quarter: Quarter) {
  return useQuery({
    queryKey: ['checkin-completion', cycleId, quarter],
    queryFn: async () => {
      const { data: employees } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'employee');

      const employeeIds = (employees ?? []).map((e) => e.id);

      if (employeeIds.length === 0) {
        return { quarter, submitted_count: 0, total_employees: 0, completion_pct: 0 } as CheckinCompletion;
      }

      const { data: sheets } = await supabase
        .from('goal_sheets')
        .select('id, employee_id')
        .eq('cycle_id', cycleId)
        .in('employee_id', employeeIds);

      const sheetIds = (sheets ?? []).map((s) => s.id);

      const { data: goals } = await supabase
        .from('goals')
        .select('id, sheet_id')
        .in('sheet_id', sheetIds);

      const goalIds = (goals ?? []).map((g) => g.id);

      const { data: achievements } = await supabase
        .from('achievements')
        .select('goal_id, submitted_at')
        .eq('cycle_id', cycleId)
        .eq('quarter', quarter)
        .in('goal_id', goalIds);

      const submittedGoalIds = new Set(
        (achievements ?? [])
          .filter((a) => a.submitted_at !== null)
          .map((a) => a.goal_id)
      );

      const employeesWithSubmission = new Set(
        (goals ?? [])
          .filter((g) => submittedGoalIds.has(g.id))
          .map((g) => {
            const sheet = (sheets ?? []).find((s) => s.id === g.sheet_id);
            return sheet?.employee_id;
          })
          .filter(Boolean)
      );

      return {
        quarter,
        submitted_count: employeesWithSubmission.size,
        total_employees: employeeIds.length,
        completion_pct: employeeIds.length > 0 ? Math.round((employeesWithSubmission.size / employeeIds.length) * 100) : 0,
      } as CheckinCompletion;
    },
    enabled: !!cycleId && !!quarter,
  });
}

export function useRecentAuditEvents(limit = 5) {
  return useQuery({
    queryKey: ['recent-audit-events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, actor_id, entity_type, action, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const results: AuditEvent[] = [];
      for (const row of data ?? []) {
        let actorName: string | null = null;
        if (row.actor_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', row.actor_id)
            .single();
          actorName = (profile as { full_name: string } | null)?.full_name ?? null;
        }
        results.push({
          id: row.id as string,
          actor_name: actorName,
          entity_type: row.entity_type as string,
          action: row.action as string,
          created_at: row.created_at as string,
        });
      }
      return results;
    },
  });
}

export function useDepartmentSummary(cycleId: string, quarter: Quarter) {
  return useQuery({
    queryKey: ['department-summary', cycleId, quarter],
    queryFn: async () => {
      const { data: employees } = await supabase
        .from('profiles')
        .select('id, department')
        .eq('role', 'employee');

      const deptMap = new Map<string, string[]>();
      for (const emp of employees ?? []) {
        const dept = (emp.department as string) ?? 'Unassigned';
        if (!deptMap.has(dept)) deptMap.set(dept, []);
        deptMap.get(dept)!.push(emp.id as string);
      }

      const results: DepartmentSummary[] = [];

      for (const [dept, empIds] of deptMap) {
        const { data: sheets } = await supabase
          .from('goal_sheets')
          .select('id, employee_id')
          .eq('cycle_id', cycleId)
          .in('employee_id', empIds);

        const sheetIds = (sheets ?? []).map((s) => s.id);

        const { data: goals } = await supabase
          .from('goals')
          .select('id, sheet_id')
          .in('sheet_id', sheetIds);

        const goalIds = (goals ?? []).map((g) => g.id);

        const { data: achievements } = await supabase
          .from('achievements')
          .select('goal_id, score, submitted_at')
          .eq('cycle_id', cycleId)
          .eq('quarter', quarter)
          .in('goal_id', goalIds);

        const scores = (achievements ?? [])
          .filter((a) => a.score !== null)
          .map((a) => a.score as number);

        const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;

        const submittedEmpIds = new Set(
          (achievements ?? [])
            .filter((a) => a.submitted_at !== null)
            .map((a) => {
              const goal = (goals ?? []).find((g) => g.id === a.goal_id);
              if (!goal) return null;
              const sheet = (sheets ?? []).find((s) => s.id === goal.sheet_id);
              return sheet?.employee_id;
            })
            .filter(Boolean)
        );

        const checkinPct = empIds.length > 0 ? Math.round((submittedEmpIds.size / empIds.length) * 100) : 0;

        results.push({
          department: dept,
          employee_count: empIds.length,
          avg_score: avgScore,
          checkin_pct: checkinPct,
        });
      }

      return results;
    },
    enabled: !!cycleId && !!quarter,
  });
}
