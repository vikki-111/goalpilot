import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCycle, useGoalSheet } from '@/hooks/useGoalSheet';
import { useUpsertAchievement, useEmployeeAchievements } from '@/hooks/useAchievements';
import { AchievementRow } from '@/components/checkins/AchievementRow';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getActiveWindow, canUpdateAchievement, getQuarterLabel } from '@/lib/cycle';
import { useToast } from '@/hooks/use-toast';
import type { Quarter, Achievement } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export function MyAchievements() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>('Q1');

  const { data: cycle, isLoading: cycleLoading } = useActiveCycle();
  const { data: sheetData, isLoading: sheetLoading } = useGoalSheet(
    profile?.id ?? '',
    cycle?.id ?? ''
  );
  const { data: allAchievements, isLoading: achLoading } = useEmployeeAchievements(
    profile?.id ?? '',
    cycle?.id ?? ''
  );

  const upsertAchievement = useUpsertAchievement();

  const activeWindow = cycle ? getActiveWindow(cycle) : 'none';
  const canEditQuarter = canUpdateAchievement(activeWindow, selectedQuarter);

  const goals = sheetData?.goals ?? [];
  const approvedGoals = goals.filter(() => sheetData?.sheet.status === 'approved' || sheetData?.sheet.status === 'locked');

  const getAchievementForGoal = useMemo(() => {
    return (goalId: string): Achievement | null => {
      return (allAchievements ?? []).find(
        (a) => a.goal_id === goalId && a.quarter === selectedQuarter
      ) ?? null;
    };
  }, [allAchievements, selectedQuarter]);

  if (cycleLoading || sheetLoading || achLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!cycle) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No active cycle found.</p>
        </CardContent>
      </Card>
    );
  }

  if (approvedGoals.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Achievements</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No approved goals yet. Goals must be approved before you can track achievements.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Achievements</h1>
          <p className="text-muted-foreground mt-1">
            {cycle.label} &middot; {getQuarterLabel(selectedQuarter)}
          </p>
        </div>
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

      {!canEditQuarter && activeWindow !== 'Q4' && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-700">
              Achievement updates for {selectedQuarter} are not currently open.
              {activeWindow === 'none' && ' The goal-setting window has not started yet.'}
            </p>
          </CardContent>
        </Card>
      )}

      {canEditQuarter && (
        <Badge variant="success" className="text-sm">
          {selectedQuarter} window is open
        </Badge>
      )}

      <div className="space-y-4">
        {approvedGoals.map((goal) => (
          <AchievementRow
            key={goal.id}
            goal={goal}
            quarter={selectedQuarter}
            cycle={cycle}
            achievement={getAchievementForGoal(goal.id)}
            isReadonly={!canEditQuarter}
            onSave={async (data) => {
              try {
                await upsertAchievement.mutateAsync({
                  goalId: goal.id,
                  quarter: selectedQuarter,
                  cycleId: cycle.id,
                  actualValue: data.actualValue,
                  actualDate: data.actualDate,
                  status: data.status,
                  employeeNote: data.employeeNote,
                  score: data.score,
                });
                toast({ title: 'Achievement saved', variant: 'success' });
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to save';
                toast({ title: 'Error', description: message, variant: 'destructive' });
              }
            }}
            saving={upsertAchievement.isPending}
          />
        ))}
      </div>
    </div>
  );
}
