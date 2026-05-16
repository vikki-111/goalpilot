import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Link } from 'lucide-react';
import type { Goal, ThrustArea, UomType } from '@/types';

const goalSchema = z.object({
  thrust_area_id: z.string().nullable(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  uom_type: z.enum(['min', 'max', 'timeline', 'zero']),
  target_value: z.string().optional(),
  target_date: z.string().optional(),
  weightage: z.string().refine((val) => {
    const n = parseInt(val, 10);
    return !isNaN(n) && n >= 10 && n <= 100;
  }, 'Must be between 10 and 100'),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface GoalFormProps {
  goal?: Goal & { thrust_areas?: { name: string } | null };
  thrustAreas: ThrustArea[];
  isReadonly: boolean;
  isShared: boolean;
  isReadonlyTitle: boolean;
  onSave: (data: GoalFormValues) => void;
  onDelete: () => void;
  onCancel: () => void;
}

const UOM_OPTIONS: { value: UomType; label: string }[] = [
  { value: 'min', label: 'Min Numeric (higher is better)' },
  { value: 'max', label: 'Max Numeric (lower is better)' },
  { value: 'timeline', label: 'Timeline (date-based)' },
  { value: 'zero', label: 'Zero (zero defects/incidents)' },
];

export function GoalForm({
  goal,
  thrustAreas,
  isReadonly,
  isShared,
  isReadonlyTitle,
  onSave,
  onDelete,
  onCancel,
}: GoalFormProps) {
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      thrust_area_id: goal?.thrust_area_id ?? null,
      title: goal?.title ?? '',
      description: goal?.description ?? '',
      uom_type: goal?.uom_type ?? 'min',
      target_value: goal?.target_value?.toString() ?? '',
      target_date: goal?.target_date ?? '',
      weightage: goal?.weightage?.toString() ?? '20',
    },
  });

  const uomType = watch('uom_type');
  const showTargetValue = uomType !== 'timeline' && uomType !== 'zero';
  const showTargetDate = uomType === 'timeline';

  const onSubmit = handleSubmit((data) => onSave(data));

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      {isShared && (
        <Badge variant="info" className="mb-2">
          <Link className="mr-1 h-3 w-3" />
          Shared Goal
        </Badge>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label>Thrust Area</Label>
          <Controller
            name="thrust_area_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={isReadonly}>
                <SelectTrigger>
                  <SelectValue placeholder="Select thrust area" />
                </SelectTrigger>
                <SelectContent>
                  {thrustAreas.map((ta) => (
                    <SelectItem key={ta.id} value={ta.id}>
                      {ta.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.thrust_area_id && (
            <p className="text-xs text-destructive">{errors.thrust_area_id.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Goal Title</Label>
          <Input
            {...register('title')}
            placeholder="e.g., Reduce deployment time by 50%"
            readOnly={isReadonly || isReadonlyTitle}
            disabled={isReadonlyTitle && !isReadonly}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>UoM Type</Label>
          <Controller
            name="uom_type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isReadonly}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UOM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.uom_type && <p className="text-xs text-destructive">{errors.uom_type.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Weightage (%)</Label>
          <Input
            type="number"
            min={10}
            max={100}
            {...register('weightage')}
            readOnly={isReadonly}
          />
          {errors.weightage && (
            <p className="text-xs text-destructive">{errors.weightage.message}</p>
          )}
        </div>

        {showTargetValue && (
          <div className="space-y-1">
            <Label>Target Value</Label>
            <Input
              type="number"
              step="any"
              {...register('target_value')}
              placeholder="e.g., 100"
              readOnly={isReadonly}
            />
          </div>
        )}

        {showTargetDate && (
          <div className="space-y-1">
            <Label>Target Date</Label>
            <Input
              type="date"
              {...register('target_date')}
              readOnly={isReadonly}
            />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label>Description (optional)</Label>
        <Textarea
          {...register('description')}
          placeholder="Additional context or details..."
          readOnly={isReadonly}
          rows={2}
        />
      </div>

      {!isReadonly && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
          <Button type="submit" size="sm">
            Save
          </Button>
        </div>
      )}
    </form>
  );
}
