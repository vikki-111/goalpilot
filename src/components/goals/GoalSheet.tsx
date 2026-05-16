import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCycle, useGoalSheet, useUpsertGoalSheet, useSubmitGoalSheet } from '@/hooks/useGoalSheet';
import { useThrustAreas } from '@/hooks/useGoalSheet';
import { GoalForm } from '@/components/goals/GoalForm';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Plus, Send, Lock, CheckCircle, RotateCcw } from 'lucide-react';
import { validateGoalSheet, GOAL_RULES } from '@/lib/validation';
import { getActiveWindow, canSubmitGoals } from '@/lib/cycle';
import { useToast } from '@/hooks/use-toast';
import { insertGoal, updateGoal, deleteGoal, fetchGoalsBySheet } from '@/lib/supabase-helpers';
import type { Goal } from '@/types';

interface GoalWithThrust extends Goal {
  thrust_areas: { name: string } | null;
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'success' | 'warning' | 'info' | 'outline'; label: string; icon: React.ElementType }> = {
  draft: { variant: 'outline', label: 'Draft', icon: Target },
  submitted: { variant: 'info', label: 'Submitted', icon: Send },
  approved: { variant: 'success', label: 'Approved', icon: CheckCircle },
  returned: { variant: 'warning', label: 'Returned', icon: RotateCcw },
  locked: { variant: 'success', label: 'Locked', icon: Lock },
};

export function GoalSheet() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);

  const { data: cycle, isLoading: cycleLoading } = useActiveCycle();
  const { data: thrustAreas } = useThrustAreas(cycle?.id);
  const { data: sheetData, isLoading: sheetLoading, refetch } = useGoalSheet(
    profile?.id ?? '',
    cycle?.id ?? ''
  );
  const upsertSheet = useUpsertGoalSheet();
  const submitSheet = useSubmitGoalSheet();

  const goals = (sheetData?.goals ?? []) as GoalWithThrust[];
  const sheet = sheetData?.sheet;
  const isEditable = sheet?.status === 'draft' || sheet?.status === 'returned';
  const isReadonly = !isEditable;

  const activeWindow = cycle ? getActiveWindow(cycle) : 'none';
  const canSubmit = canSubmitGoals(activeWindow);

  const totalWeightage = useMemo(() => goals.reduce((sum, g) => sum + g.weightage, 0), [goals]);
  const weightageValid = totalWeightage === 100;
  const validationError = validateGoalSheet(goals);

  const handleAddGoal = () => {
    if (goals.length >= GOAL_RULES.MAX_GOALS) {
      toast({ title: 'Limit reached', description: `Maximum ${GOAL_RULES.MAX_GOALS} goals allowed.`, variant: 'destructive' });
      return;
    }
    setIsNewOpen(true);
    setEditingId(null);
  };

  const handleSaveGoal = async (data: Record<string, unknown>) => {
    if (!cycle || !profile) return;

    if (!sheet) {
      await upsertSheet.mutateAsync({ employeeId: profile.id, cycleId: cycle.id });
      await refetch();
      return;
    }

    const goalData = {
      sheet_id: sheet.id,
      thrust_area_id: data.thrust_area_id as string | null,
      title: data.title as string,
      description: (data.description as string) || null,
      uom_type: data.uom_type as Goal['uom_type'],
      target_value: data.target_value ? parseFloat(data.target_value as string) : null,
      target_date: data.target_date ? (data.target_date as string) : null,
      weightage: data.weightage as number,
      is_shared: false,
      shared_parent_id: null,
      is_readonly_title: false,
      sort_order: goals.length,
    };

    try {
      if (editingId) {
        await updateGoal(editingId, goalData);
      } else {
        await insertGoal(goalData);
      }
      setIsNewOpen(false);
      setEditingId(null);
      await refetch();
      toast({ title: 'Goal saved', variant: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save goal';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteGoal(id);
      await refetch();
      toast({ title: 'Goal deleted', variant: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete goal';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    if (validationError) {
      toast({ title: 'Validation error', description: validationError, variant: 'destructive' });
      return;
    }
    if (!sheet?.id) return;

    try {
      const existingGoals = await fetchGoalsBySheet(sheet.id);
      const goalsToSubmit = existingGoals.map((g) => ({
        sheet_id: g.sheet_id,
        thrust_area_id: g.thrust_area_id,
        title: g.title,
        description: g.description,
        uom_type: g.uom_type,
        target_value: g.target_value,
        target_date: g.target_date,
        weightage: g.weightage,
        is_shared: g.is_shared,
        shared_parent_id: g.shared_parent_id,
        is_readonly_title: g.is_readonly_title,
        sort_order: g.sort_order,
      }));

      await submitSheet.mutateAsync({ sheetId: sheet.id, goals: goalsToSubmit });
      toast({ title: 'Goals submitted', description: 'Awaiting manager approval.', variant: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit goals';
      toast({ title: 'Submission failed', description: message, variant: 'destructive' });
    }
  };

  if (cycleLoading || sheetLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = STATUS_BADGE[sheet?.status ?? 'draft'];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Goals</h1>
          <p className="text-muted-foreground mt-1">
            {cycle?.label ?? 'No active cycle'} &mdash; {statusInfo.label}
          </p>
        </div>
        <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">
          <StatusIcon className="mr-1 h-4 w-4" />
          {statusInfo.label}
        </Badge>
      </div>

      {sheet?.status === 'returned' && sheet.manager_comment && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-amber-800">Manager&apos;s feedback:</p>
            <p className="text-sm text-amber-700 mt-1">{sheet.manager_comment}</p>
          </CardContent>
        </Card>
      )}

      {sheet?.status === 'submitted' && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-700">Goals submitted. Awaiting manager approval.</p>
          </CardContent>
        </Card>
      )}

      {sheet?.status === 'approved' && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-sm text-green-700">Goals approved and locked.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Weightage Distribution</CardTitle>
            <span className={`text-sm font-medium ${weightageValid ? 'text-green-600' : 'text-red-600'}`}>
              Total: {totalWeightage}% / 100%
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress
            value={Math.min(totalWeightage, 100)}
            className={`h-3 ${!weightageValid && totalWeightage > 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {goals.length}/{GOAL_RULES.MAX_GOALS} goals &middot; Each goal must be {GOAL_RULES.MIN_WEIGHTAGE}%&ndash;100%
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {goals.map((goal) =>
          editingId === goal.id ? (
            <GoalForm
              key={goal.id}
              goal={goal}
              thrustAreas={thrustAreas ?? []}
              isReadonly={isReadonly}
              isShared={goal.is_shared}
              isReadonlyTitle={goal.is_readonly_title}
              onSave={handleSaveGoal}
              onDelete={() => handleDeleteGoal(goal.id)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <GoalSummaryRow
              key={goal.id}
              goal={goal}
              isReadonly={isReadonly}
              onEdit={() => setEditingId(goal.id)}
            />
          )
        )}

        {isNewOpen && (
          <GoalForm
            thrustAreas={thrustAreas ?? []}
            isReadonly={false}
            isShared={false}
            isReadonlyTitle={false}
            onSave={handleSaveGoal}
            onDelete={() => setIsNewOpen(false)}
            onCancel={() => setIsNewOpen(false)}
          />
        )}
      </div>

      {isEditable && (
        <div className="flex justify-between">
          <Button
            onClick={handleAddGoal}
            disabled={goals.length >= GOAL_RULES.MAX_GOALS}
            variant="outline"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Goal ({goals.length}/{GOAL_RULES.MAX_GOALS})
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!weightageValid || !!validationError || goals.length === 0 || !canSubmit}
          >
            <Send className="mr-1 h-4 w-4" />
            Submit Goals
          </Button>
        </div>
      )}

      {validationError && isEditable && (
        <p className="text-sm text-destructive text-center">{validationError}</p>
      )}

      {!canSubmit && isEditable && (
        <p className="text-sm text-muted-foreground text-center">
          Goal submission is only available during the goal-setting window.
        </p>
      )}
    </div>
  );
}

function GoalSummaryRow({
  goal,
  isReadonly,
  onEdit,
}: {
  goal: GoalWithThrust;
  isReadonly: boolean;
  onEdit: () => void;
}) {
  const uomLabels: Record<string, string> = {
    min: 'Min Numeric',
    max: 'Max Numeric',
    timeline: 'Timeline',
    zero: 'Zero',
  };

  return (
    <div className="flex items-start justify-between rounded-lg border bg-card p-3">
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          {goal.is_shared && <Badge variant="info" className="text-xs">Shared</Badge>}
          <h3 className="font-medium">{goal.title}</h3>
        </div>
        {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Thrust: {goal.thrust_areas?.name ?? '—'}</span>
          <span>UoM: {uomLabels[goal.uom_type]}</span>
          {goal.target_value !== null && <span>Target: {goal.target_value}</span>}
          {goal.target_date && <span>Target Date: {goal.target_date}</span>}
          <span className="font-medium text-foreground">Weightage: {goal.weightage}%</span>
        </div>
      </div>
      {!isReadonly && (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      )}
    </div>
  );
}
