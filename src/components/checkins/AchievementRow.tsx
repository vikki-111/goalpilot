import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoreBadge } from '@/components/checkins/ScoreBadge';
import { computeScore } from '@/lib/scoring';
import { canUpdateAchievement, getActiveWindow } from '@/lib/cycle';
import type { Goal, Achievement, Quarter, Cycle, CheckinStatus } from '@/types';

const achievementSchema = z.object({
  actual_value: z.string().optional(),
  actual_date: z.string().optional(),
  status: z.enum(['not_started', 'on_track', 'completed']),
  employee_note: z.string().optional(),
});

type AchievementFormValues = z.infer<typeof achievementSchema>;

interface AchievementRowProps {
  goal: Goal;
  quarter: Quarter;
  cycle: Cycle;
  achievement: Achievement | null;
  isReadonly: boolean;
  onSave: (data: {
    actualValue: number | null;
    actualDate: string | null;
    status: CheckinStatus;
    employeeNote: string | null;
    score: number | null;
  }) => void;
  saving: boolean;
}

const STATUS_OPTIONS: { value: CheckinStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'on_track', label: 'On Track' },
  { value: 'completed', label: 'Completed' },
];

const UOM_LABELS: Record<string, string> = {
  min: 'Min Numeric',
  max: 'Max Numeric',
  timeline: 'Timeline',
  zero: 'Zero',
};

export function AchievementRow({
  goal,
  quarter,
  cycle,
  achievement,
  isReadonly,
  onSave,
  saving,
}: AchievementRowProps) {
  const [localScore, setLocalScore] = useState<number | null>(achievement?.score ?? null);

  const { register, watch, handleSubmit, setValue } = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: {
      actual_value: achievement?.actual_value?.toString() ?? '',
      actual_date: achievement?.actual_date ?? '',
      status: achievement?.status ?? 'not_started',
      employee_note: achievement?.employee_note ?? '',
    },
  });

  const actualValue = watch('actual_value');
  const actualDate = watch('actual_date');

  const computedScore = useMemo(() => {
    if (goal.uom_type === 'timeline') {
      if (!goal.target_date || !actualDate) return null;
      return computeScore(
        goal.uom_type,
        goal.target_value,
        null,
        new Date(goal.target_date),
        new Date(actualDate)
      );
    }

    if (goal.uom_type === 'zero') {
      if (!actualValue) return null;
      return computeScore(
        goal.uom_type,
        goal.target_value,
        parseFloat(actualValue),
        null,
        null
      );
    }

    if (!actualValue) return null;
    return computeScore(
      goal.uom_type,
      goal.target_value,
      parseFloat(actualValue),
      null,
      null
    );
  }, [goal.uom_type, goal.target_value, goal.target_date, actualValue, actualDate]);

  useEffect(() => {
    setLocalScore(computedScore);
  }, [computedScore]);

  const activeWindow = getActiveWindow(cycle);
  const canEdit = !isReadonly && canUpdateAchievement(activeWindow, quarter);

  const onSubmit = handleSubmit((data) => {
    onSave({
      actualValue: actualValue ? parseFloat(actualValue) : null,
      actualDate: actualDate || null,
      status: data.status,
      employeeNote: data.employee_note || null,
      score: computedScore,
    });
  });

  const targetDisplay = goal.uom_type === 'timeline'
    ? goal.target_date
    : goal.uom_type === 'zero'
      ? '0'
      : goal.target_value?.toString();

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{goal.title}</h3>
              <p className="text-sm text-muted-foreground">
                {UOM_LABELS[goal.uom_type]} &middot; Target: {targetDisplay ?? '—'} &middot; Weightage: {goal.weightage}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{quarter}</Badge>
              <ScoreBadge score={localScore} size="sm" />
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {goal.uom_type === 'timeline' ? (
                <div className="space-y-1">
                  <Label>Actual Date</Label>
                  <Input
                    type="date"
                    {...register('actual_date')}
                    readOnly={!canEdit}
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>Actual Value</Label>
                  <Input
                    type="number"
                    step="any"
                    {...register('actual_value')}
                    placeholder="Enter actual value"
                    readOnly={!canEdit}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(v) => setValue('status', v as CheckinStatus)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Score Preview</Label>
                <div className="flex h-10 items-center">
                  <ScoreBadge score={localScore} size="md" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Textarea
                {...register('employee_note')}
                placeholder="Add context or explanation..."
                readOnly={!canEdit}
                rows={2}
              />
            </div>

            {canEdit && (
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Achievement'}
                </Button>
              </div>
            )}
          </form>

          {!canEdit && !isReadonly && (
            <p className="text-sm text-muted-foreground text-center">
              Achievement updates for {quarter} are not currently open.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
