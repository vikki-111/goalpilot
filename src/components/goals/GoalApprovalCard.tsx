import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateGoalSheetStatus } from '@/hooks/useGoalSheet';
import { updateGoal } from '@/lib/supabase-helpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, RotateCcw, ArrowLeft } from 'lucide-react';
import { validateGoalSheet } from '@/lib/validation';
import { useToast } from '@/hooks/use-toast';
import type { Goal, GoalSheet, Profile } from '@/types';

interface GoalWithThrust extends Goal {
  thrust_areas: { name: string } | null;
}

interface ApprovalDetail {
  sheet: GoalSheet;
  goals: GoalWithThrust[];
  employee: Pick<Profile, 'full_name' | 'department' | 'email'>;
}

export function GoalApprovalCard() {
  const { sheetId } = useParams<{ sheetId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnComment, setReturnComment] = useState('');
  const [editingGoals, setEditingGoals] = useState<Record<string, { weightage?: number }>>({});

  const updateStatus = useUpdateGoalSheetStatus();

  const { data: detail, isLoading } = useQuery({
    queryKey: ['approval-detail', sheetId],
    queryFn: async () => {
      const { data: sheet, error: sheetError } = await supabase
        .from('goal_sheets')
        .select('*')
        .eq('id', sheetId!)
        .single();
      if (sheetError) throw sheetError;

      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*, thrust_areas(name)')
        .eq('sheet_id', (sheet as GoalSheet).id)
        .order('sort_order');
      if (goalsError) throw goalsError;

      const { data: employee, error: empError } = await supabase
        .from('profiles')
        .select('full_name, department, email')
        .eq('id', (sheet as GoalSheet).employee_id)
        .single();
      if (empError) throw empError;

      return {
        sheet: sheet as GoalSheet,
        goals: (goals ?? []) as GoalWithThrust[],
        employee: employee as Pick<Profile, 'full_name' | 'department' | 'email'>,
      } as ApprovalDetail;
    },
    enabled: !!sheetId,
  });

  const handleGoalEdit = (goalId: string, field: string, value: number) => {
    setEditingGoals((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], [field]: value },
    }));
  };

  const getEffectiveGoals = () => {
    if (!detail) return [];
    return detail.goals.map((g) => ({
      ...g,
      weightage: editingGoals[g.id]?.weightage ?? g.weightage,
    }));
  };

  const effectiveGoals = getEffectiveGoals();
  const totalWeightage = effectiveGoals.reduce((sum, g) => sum + g.weightage, 0);
  const validationError = validateGoalSheet(effectiveGoals);

  const handleApprove = async () => {
    if (!sheetId || !profile) return;
    if (validationError) {
      toast({ title: 'Cannot approve', description: validationError, variant: 'destructive' });
      return;
    }

    for (const [goalId, edits] of Object.entries(editingGoals)) {
      if (Object.keys(edits).length > 0) {
        try {
          await updateGoal(goalId, edits);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to update goal';
          toast({ title: 'Error', description: message, variant: 'destructive' });
          return;
        }
      }
    }

    try {
      await updateStatus.mutateAsync({
        sheetId,
        status: 'approved',
        approvedBy: profile.id,
      });
      toast({ title: 'Goals approved', variant: 'success' });
      navigate('/manager/approvals');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve';
      toast({ title: 'Approval failed', description: message, variant: 'destructive' });
    }
  };

  const handleReturn = async () => {
    if (!sheetId || !returnComment.trim()) {
      toast({ title: 'Comment required', description: 'Please provide feedback for the employee.', variant: 'destructive' });
      return;
    }

    try {
      await updateStatus.mutateAsync({
        sheetId,
        status: 'returned',
        managerComment: returnComment.trim(),
      });
      toast({ title: 'Goals returned', description: 'Employee has been notified.', variant: 'success' });
      setReturnOpen(false);
      navigate('/manager/approvals');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to return';
      toast({ title: 'Return failed', description: message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail) return null;

  const uomLabels: Record<string, string> = {
    min: 'Min Numeric',
    max: 'Max Numeric',
    timeline: 'Timeline',
    zero: 'Zero',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/manager/approvals')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Goal Sheet</h1>
          <p className="text-muted-foreground mt-1">
            {detail.employee.full_name} &middot; {detail.employee.department}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goals ({detail.goals.length})</CardTitle>
          <CardDescription>
            Total weightage: {totalWeightage}% / 100%
            {validationError && <span className="text-destructive ml-2">&mdash; {validationError}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {detail.goals.map((goal, index) => {
              const edits = editingGoals[goal.id] ?? {};
              return (
                <div key={goal.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                        <h3 className="font-medium">{goal.title}</h3>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                      )}
                    </div>
                    {goal.is_shared && <Badge variant="info" className="text-xs">Shared</Badge>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                    <div>
                      <span className="text-muted-foreground">Thrust Area</span>
                      <p className="font-medium">{goal.thrust_areas?.name ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">UoM</span>
                      <p className="font-medium">{uomLabels[goal.uom_type]}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target</span>
                      <p className="font-medium">
                        {goal.target_value ?? goal.target_date ?? '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weightage</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          min={10}
                          max={100}
                          value={edits.weightage ?? goal.weightage}
                          onChange={(e) => handleGoalEdit(goal.id, 'weightage', parseInt(e.target.value, 10))}
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setReturnOpen(true)}>
          <RotateCcw className="mr-1 h-4 w-4" />
          Return for Rework
        </Button>
        <Button onClick={handleApprove} disabled={!!validationError || updateStatus.isPending}>
          <CheckCircle className="mr-1 h-4 w-4" />
          {updateStatus.isPending ? 'Approving...' : 'Approve & Lock'}
        </Button>
      </div>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return for Rework</DialogTitle>
            <DialogDescription>
              Provide feedback so the employee can revise their goals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Manager Comment</Label>
              <Textarea
                value={returnComment}
                onChange={(e) => setReturnComment(e.target.value)}
                placeholder="Describe what needs to be changed..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReturn}>
              Return Goals
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
