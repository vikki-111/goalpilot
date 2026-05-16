import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCycle, useGoalSheet } from '@/hooks/useGoalSheet';
import { useEmployeeAchievements } from '@/hooks/useAchievements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getActiveWindow, canUpdateAchievement, getQuarterLabel } from '@/lib/cycle';
import { validateGoalSheet, GOAL_RULES } from '@/lib/validation';
import { getScoreColor, getScoreLabel } from '@/lib/scoring';
import { computeScore } from '@/lib/scoring';
import { Target, Send, CheckCircle, RotateCcw, Lock, Calendar, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Quarter } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Target; variant: 'default' | 'success' | 'warning' | 'info' | 'outline'; cta: string; ctaRoute: string }> = {
  draft: { label: 'Draft', icon: Target, variant: 'outline', cta: 'Continue Editing', ctaRoute: '/employee/goals' },
  submitted: { label: 'Submitted', icon: Send, variant: 'info', cta: 'View Goals', ctaRoute: '/employee/goals' },
  approved: { label: 'Approved', icon: CheckCircle, variant: 'success', cta: 'View Goals', ctaRoute: '/employee/goals' },
  returned: { label: 'Returned', icon: RotateCcw, variant: 'warning', cta: 'Revise Goals', ctaRoute: '/employee/goals' },
  locked: { label: 'Locked', icon: Lock, variant: 'success', cta: 'View Goals', ctaRoute: '/employee/goals' },
};

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week ago';
  return `${diffWeeks} weeks ago`;
}

export function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: cycle, isLoading: cycleLoading } = useActiveCycle();
  const { data: sheetData, isLoading: sheetLoading } = useGoalSheet(
    profile?.id ?? '',
    cycle?.id ?? ''
  );
  const { data: achievements, isLoading: achLoading } = useEmployeeAchievements(
    profile?.id ?? '',
    cycle?.id ?? ''
  );

  const goals = sheetData?.goals ?? [];
  const sheet = sheetData?.sheet;
  const statusConfig = STATUS_CONFIG[sheet?.status ?? 'draft'];
  const StatusIcon = statusConfig.icon;

  const totalWeightage = useMemo(() => goals.reduce((sum, g) => sum + g.weightage, 0), [goals]);
  const weightageValid = totalWeightage === 100;
  const validationError = validateGoalSheet(goals);

  const activeWindow = cycle ? getActiveWindow(cycle) : 'none';
  const currentQuarter = QUARTERS.find((q) => q === activeWindow) ?? null;
  const canEditAchievements = currentQuarter ? canUpdateAchievement(activeWindow, currentQuarter) : false;

  const nextWindowDate = useMemo(() => {
    if (!cycle) return null;
    if (activeWindow === 'goal_setting') return new Date(cycle.q1_opens);
    if (activeWindow === 'Q1') return new Date(cycle.q2_opens);
    if (activeWindow === 'Q2') return new Date(cycle.q3_opens);
    if (activeWindow === 'Q3') return new Date(cycle.q4_opens);
    return null;
  }, [cycle, activeWindow]);

  const goalScores = useMemo(() => {
    if (!goals.length || !achievements?.length) return [];
    return goals.map((goal) => {
      const ach = achievements.find((a) => a.goal_id === goal.id);
      let score: number | null = null;
      if (ach && ach.actual_value !== null) {
        score = ach.score ?? computeScore(
          goal.uom_type,
          goal.target_value,
          ach.actual_value,
          goal.target_date ? new Date(goal.target_date) : null,
          ach.actual_date ? new Date(ach.actual_date) : null
        );
      }
      return { title: goal.title, weightage: goal.weightage, score };
    });
  }, [goals, achievements]);

  const weightedScore = useMemo(() => {
    const scored = goalScores.filter((g) => g.score !== null);
    if (!scored.length) return null;
    const weightedSum = scored.reduce((sum, g) => sum + (g.score! / 100) * g.weightage, 0);
    const totalWeight = scored.reduce((sum, g) => sum + g.weightage, 0);
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight * 100) : null;
  }, [goalScores]);

  const goalsWithData = useMemo(() => {
    return goalScores.filter((g) => g.score !== null).length;
  }, [goalScores]);

  const recentActivity = useMemo(() => {
    const events: { text: string; time: string }[] = [];
    if (sheet) {
      if (sheet.approved_at) events.push({ text: `Goals approved${sheet.approved_by ? ' by manager' : ''}`, time: sheet.approved_at });
      if (sheet.submitted_at) events.push({ text: 'Goals submitted', time: sheet.submitted_at });
      if (sheet.manager_comment && sheet.status === 'returned') events.push({ text: 'Goals returned for rework', time: sheet.created_at });
    }
    if (achievements?.length) {
      const sorted = [...achievements].sort((a, b) => new Date(b.submitted_at ?? b.created_at).getTime() - new Date(a.submitted_at ?? a.created_at).getTime());
      sorted.slice(0, 2).forEach((ach) => {
        events.push({ text: `${ach.quarter} achievement saved`, time: ach.submitted_at ?? ach.created_at });
      });
    }
    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 4);
  }, [sheet, achievements]);

  if (cycleLoading || sheetLoading || achLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.full_name}</h1>
        <p className="text-muted-foreground mt-1">{cycle?.label ?? 'No active cycle'}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Goal Sheet Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={statusConfig.variant} className="text-sm px-3 py-1">
                <StatusIcon className="mr-1 h-4 w-4" />
                {statusConfig.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {goals.length} / {GOAL_RULES.MAX_GOALS} goals
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Weightage</span>
                <span className={`text-sm font-medium ${weightageValid ? 'text-green-600' : 'text-red-600'}`}>
                  {totalWeightage}% / 100%
                </span>
              </div>
              <Progress value={Math.min(totalWeightage, 100)} className={`h-2 ${!weightageValid && totalWeightage > 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`} />
              {validationError && <p className="text-xs text-destructive mt-1">{validationError}</p>}
            </div>

            <Button onClick={() => navigate(statusConfig.ctaRoute)} className="w-full">
              {statusConfig.cta}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Quarter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentQuarter ? (
              <>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">{getQuarterLabel(currentQuarter)}</span>
                </div>
                {canEditAchievements ? (
                  <Badge variant="success" className="text-sm">Window is open</Badge>
                ) : (
                  <Badge variant="outline" className="text-sm">Window closed</Badge>
                )}
                {nextWindowDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Next window opens {nextWindowDate.toLocaleDateString()}
                  </div>
                )}
                <Button onClick={() => navigate('/employee/achievements')} className="w-full">
                  Update Achievements
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {activeWindow === 'none' ? 'No window is currently open' : 'Goal setting window is active'}
                </p>
                {nextWindowDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Q1 opens {nextWindowDate.toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {weightedScore !== null ? (
              <div className="text-center py-2">
                <span className={`text-3xl font-bold ${getScoreColor(weightedScore).split(' ')[1]}`}>
                  {weightedScore}%
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {goalsWithData} of {goalScores.length} goals
                </p>
              </div>
            ) : (
              <div className="text-center py-2">
                <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No achievements entered yet</p>
              </div>
            )}

            <div className="space-y-2">
              {goalScores.map((g) => (
                <div key={g.title} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-2">{g.title}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${getScoreColor(g.score)}`}>
                    {getScoreLabel(g.score)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{event.text}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(event.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
