import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCycle } from '@/hooks/useGoalSheet';
import { useAddCheckinComment } from '@/hooks/useAchievements';
import { CheckinModal } from '@/components/checkins/CheckinModal';
import { ScoreBadge } from '@/components/checkins/ScoreBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users } from 'lucide-react';
import { getQuarterLabel } from '@/lib/cycle';
import type { Profile, Quarter, Goal, Achievement, CheckinStatus } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

interface EmployeeWithSheet {
  employee: Pick<Profile, 'id' | 'full_name' | 'department' | 'email'>;
  sheet: { id: string; status: string };
  goals: Array<Goal & { achievements: Achievement[] }>;
}

export function CheckinView() {
  const { profile } = useAuth();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>('Q1');
  const [commentModal, setCommentModal] = useState<{ open: boolean; achievementId: string }>({ open: false, achievementId: '' });

  const { data: cycle } = useActiveCycle();
  const addComment = useAddCheckinComment();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['manager-reports', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      const { data: employees, error } = await supabase
        .from('profiles')
        .select('id, full_name, department, email')
        .eq('manager_id', profile.id);
      if (error) throw error;

      if (!employees || employees.length === 0) return [];

      const { data: sheets } = await supabase
        .from('goal_sheets')
        .select('id, employee_id, status')
        .in('employee_id', employees.map((e) => (e as Profile).id))
        .eq('cycle_id', cycle?.id ?? '');

      const result: EmployeeWithSheet[] = [];
      for (const emp of employees as Pick<Profile, 'id' | 'full_name' | 'department' | 'email'>[]) {
        const sheet = (sheets ?? []).find((s) => (s as { employee_id: string }).employee_id === emp.id);
        if (!sheet) continue;

        const { data: goals } = await supabase
          .from('goals')
          .select('*, achievements(*)')
          .eq('sheet_id', (sheet as { id: string }).id);

        result.push({
          employee: emp,
          sheet: sheet as { id: string; status: string },
          goals: (goals ?? []) as Array<Goal & { achievements: Achievement[] }>,
        });
      }

      return result;
    },
    enabled: !!profile && !!cycle,
  });

  const currentEmployee = reports?.find((r) => r.employee.id === selectedEmployee);

  const weightedScore = (() => {
    if (!currentEmployee) return null;
    let totalScore = 0;
    let totalWeight = 0;
    for (const goal of currentEmployee.goals) {
      const achievement = goal.achievements?.find((a) => a.quarter === selectedQuarter);
      if (achievement?.score !== null && achievement?.score !== undefined) {
        totalScore += achievement.score * goal.weightage;
        totalWeight += goal.weightage;
      }
    }
    return totalWeight > 0 ? totalScore / totalWeight : null;
  })();

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
        <h1 className="text-3xl font-bold tracking-tight">Check-ins</h1>
        <p className="text-muted-foreground mt-1">Track team progress and add feedback</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select team member" />
          </SelectTrigger>
          <SelectContent>
            {reports?.map((r) => (
              <SelectItem key={r.employee.id} value={r.employee.id}>
                {r.employee.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedQuarter} onValueChange={(v) => setSelectedQuarter(v as Quarter)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUARTERS.map((q) => (
              <SelectItem key={q} value={q}>{getQuarterLabel(q)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reports?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No team members</h3>
            <p className="text-muted-foreground text-sm mt-1">
              You don&apos;t have any direct reports.
            </p>
          </CardContent>
        </Card>
      )}

      {!selectedEmployee && reports && reports.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Select a team member to view their check-ins.</p>
          </CardContent>
        </Card>
      )}

      {currentEmployee && cycle && (
        <>
          {weightedScore !== null && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Overall Progress</CardTitle>
                  <ScoreBadge score={weightedScore} size="lg" />
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={Math.min(weightedScore, 100)} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  Weighted average score for {getQuarterLabel(selectedQuarter)}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Goals & Achievements</CardTitle>
              <CardDescription>
                {currentEmployee.employee.full_name} &middot; {currentEmployee.employee.department}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Goal</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentEmployee.goals.map((goal) => {
                    const achievement = goal.achievements?.find((a) => a.quarter === selectedQuarter);
                    const statusLabels: Record<CheckinStatus, string> = {
                      not_started: 'Not Started',
                      on_track: 'On Track',
                      completed: 'Completed',
                    };

                    return (
                      <TableRow key={goal.id}>
                        <TableCell className="font-medium max-w-48 truncate" title={goal.title}>
                          {goal.title}
                        </TableCell>
                        <TableCell className="text-xs">{goal.uom_type}</TableCell>
                        <TableCell>
                          {goal.uom_type === 'timeline' ? goal.target_date : goal.target_value?.toString() ?? '—'}
                        </TableCell>
                        <TableCell>
                          {achievement
                            ? (goal.uom_type === 'timeline' ? achievement.actual_date : achievement.actual_value?.toString()) ?? '—'
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={achievement?.score ?? null} size="sm" />
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            achievement?.status === 'completed' ? 'success' :
                            achievement?.status === 'on_track' ? 'info' : 'outline'
                          } className="text-xs">
                            {statusLabels[achievement?.status ?? 'not_started']}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCommentModal({ open: true, achievementId: achievement?.id ?? '' })}
                            disabled={!achievement}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <CheckinModal
        open={commentModal.open}
        onOpenChange={(open) => setCommentModal({ ...commentModal, open })}
        onSave={async (comment) => {
          await addComment.mutateAsync({
            achievementId: commentModal.achievementId,
            managerId: profile?.id ?? '',
            comment,
          });
        }}
      />
    </div>
  );
}
