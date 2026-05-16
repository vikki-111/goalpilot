import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useActiveCycle } from '@/hooks/useGoalSheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreBadge } from '@/components/checkins/ScoreBadge';
import { getQuarterLabel } from '@/lib/cycle';
import { Users } from 'lucide-react';
import type { Quarter } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

interface CheckinRow {
  employee: string;
  manager: string;
  department: string;
  quarter: Quarter;
  goal: string;
  uom: string;
  target: string;
  actual: string;
  score: number | null;
  status: string;
}

export function AdminCheckins() {
  const { data: cycle } = useActiveCycle();
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterManager, setFilterManager] = useState<string>('all');
  const [filterQuarter, setFilterQuarter] = useState<string>('all');

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-checkins', cycle?.id, filterDepartment, filterManager, filterQuarter],
    queryFn: async () => {
      const { data: goals, error } = await supabase
        .from('goals')
        .select(`
          *,
          thrust_areas(name),
          goal_sheets!inner(
            status,
            employee_id,
            profiles!goal_sheets_employee_id_fkey(full_name, department, manager_id)
          )
        `);

      if (error) throw error;

      const approvedGoals = (goals ?? []).filter((g: Record<string, unknown>) => {
        const gs = g.goal_sheets as Record<string, unknown> | null;
        return gs?.status === 'approved' || gs?.status === 'locked';
      });

      const results: CheckinRow[] = [];

      for (const goal of approvedGoals) {
        const gs = goal.goal_sheets as Record<string, unknown> | null;
        const profiles = gs?.profiles as Record<string, unknown> | null;
        if (!profiles) continue;

        const managerId = profiles.manager_id as string | null;
        let managerName = '—';
        if (managerId) {
          const { data: mgr } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', managerId)
            .single();
          managerName = (mgr as { full_name: string } | null)?.full_name ?? '—';
        }

        const targetDisplay = goal.uom_type === 'timeline'
          ? (goal.target_date?.toString() ?? '—')
          : goal.uom_type === 'zero'
            ? '0'
            : (goal.target_value?.toString() ?? '—');

        const { data: achievements } = await supabase
          .from('achievements')
          .select('*')
          .eq('goal_id', goal.id)
          .eq('cycle_id', cycle?.id ?? '');

        if (achievements && achievements.length > 0) {
          for (const ach of achievements) {
            const actualDisplay = goal.uom_type === 'timeline'
              ? (ach.actual_date?.toString() ?? '—')
              : (ach.actual_value?.toString() ?? '—');

            results.push({
              employee: profiles.full_name as string,
              manager: managerName,
              department: (profiles.department as string) ?? '—',
              quarter: ach.quarter as Quarter,
              goal: goal.title as string,
              uom: goal.uom_type as string,
              target: targetDisplay,
              actual: actualDisplay,
              score: ach.score as number | null,
              status: ach.status as string,
            });
          }
        } else {
          for (const q of QUARTERS) {
            results.push({
              employee: profiles.full_name as string,
              manager: managerName,
              department: (profiles.department as string) ?? '—',
              quarter: q,
              goal: goal.title as string,
              uom: goal.uom_type as string,
              target: targetDisplay,
              actual: '—',
              score: null,
              status: 'not_started',
            });
          }
        }
      }

      return results;
    },
    enabled: !!cycle,
  });

  const { data: departments } = useQuery({
    queryKey: ['admin-checkin-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('department')
        .not('department', 'is', null)
        .eq('role', 'employee');
      if (error) throw error;
      return [...new Set((data ?? []).map((d) => d.department))] as string[];
    },
  });

  const { data: managers } = useQuery({
    queryKey: ['admin-checkin-managers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('role', 'manager');
      if (error) throw error;
      return (data ?? []).map((m) => m.full_name as string);
    },
  });

  const filteredRows = useMemo(() => {
    return (rows ?? []).filter((row) => {
      if (filterDepartment !== 'all' && row.department !== filterDepartment) return false;
      if (filterManager !== 'all' && row.manager !== filterManager) return false;
      if (filterQuarter !== 'all' && row.quarter !== filterQuarter) return false;
      return true;
    });
  }, [rows, filterDepartment, filterManager, filterQuarter]);

  const statusLabels: Record<string, string> = {
    not_started: 'Not Started',
    on_track: 'On Track',
    completed: 'Completed',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Org Check-ins</h1>
        <p className="text-muted-foreground mt-1">Read-only view of all team check-ins across the organization</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Department</label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Manager</label>
              <Select value={filterManager} onValueChange={setFilterManager}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All managers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All managers</SelectItem>
                  {managers?.map((mgr) => (
                    <SelectItem key={mgr} value={mgr}>{mgr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Quarter</label>
              <Select value={filterQuarter} onValueChange={setFilterQuarter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All quarters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All quarters</SelectItem>
                  {QUARTERS.map((q) => (
                    <SelectItem key={q} value={q}>{getQuarterLabel(q)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Check-ins</CardTitle>
          <p className="text-xs text-muted-foreground">{filteredRows.length} entries</p>
        </CardHeader>
        <CardContent>
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No check-ins found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Adjust filters or wait for employees to submit achievements.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Employee</TableHead>
                    <TableHead className="whitespace-nowrap">Manager</TableHead>
                    <TableHead className="whitespace-nowrap">Department</TableHead>
                    <TableHead className="whitespace-nowrap">Quarter</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead className="whitespace-nowrap">UoM</TableHead>
                    <TableHead className="whitespace-nowrap">Target</TableHead>
                    <TableHead className="whitespace-nowrap">Actual</TableHead>
                    <TableHead className="whitespace-nowrap">Score</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium whitespace-nowrap">{row.employee}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.manager}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.department}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.quarter}</TableCell>
                      <TableCell className="max-w-56 truncate" title={row.goal}>{row.goal}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.uom}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.target}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.actual}</TableCell>
                      <TableCell>
                        <ScoreBadge score={row.score} size="sm" />
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          row.status === 'completed' ? 'success' :
                          row.status === 'on_track' ? 'info' :
                          'secondary'
                        } className="text-xs whitespace-nowrap">
                          {statusLabels[row.status] ?? row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
