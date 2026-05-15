import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useActiveCycle, useThrustAreas } from '@/hooks/useGoalSheet';
import { insertGoals } from '@/lib/supabase-helpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Share2, Send, Check } from 'lucide-react';
import type { Profile, UomType } from '@/types';

export function SharedGoalPush() {
  const { toast } = useToast();
  const { data: cycle } = useActiveCycle();
  const { data: thrustAreas } = useThrustAreas(cycle?.id);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['all-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department, email')
        .eq('role', 'employee')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Pick<Profile, 'id' | 'full_name' | 'department' | 'email'>[];
    },
  });

  const [formData, setFormData] = useState({
    thrust_area_id: '',
    title: '',
    description: '',
    uom_type: 'min' as UomType,
    target_value: '',
    target_date: '',
  });

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!cycle) return;
    if (selectedEmployees.length === 0) {
      toast({ title: 'No employees selected', variant: 'destructive' });
      return;
    }
    if (!formData.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data: sheets, error: sheetsError } = await supabase
        .from('goal_sheets')
        .select('id, employee_id')
        .in('employee_id', selectedEmployees)
        .eq('cycle_id', cycle.id);

      if (sheetsError) throw sheetsError;
      if (!sheets || sheets.length === 0) {
        toast({ title: 'No goal sheets found', description: 'Employees may not have sheets for this cycle.', variant: 'destructive' });
        return;
      }

      const goalInserts = sheets.map((sheet) => ({
        sheet_id: sheet.id,
        thrust_area_id: formData.thrust_area_id || null,
        title: formData.title,
        description: formData.description || null,
        uom_type: formData.uom_type,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        target_date: formData.target_date || null,
        weightage: 0,
        is_shared: true,
        shared_parent_id: null,
        is_readonly_title: true,
        sort_order: 99,
      }));

      await insertGoals(goalInserts);

      toast({
        title: 'Shared goal pushed',
        description: `Assigned to ${sheets.length} employee(s).`,
        variant: 'success',
      });

      setFormData({ thrust_area_id: '', title: '', description: '', uom_type: 'min', target_value: '', target_date: '' });
      setSelectedEmployees([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to push shared goal';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shared Goals</h1>
        <p className="text-muted-foreground mt-1">Push shared goals to multiple employees</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Goal Template
            </CardTitle>
            <CardDescription>Define the shared goal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Thrust Area</Label>
              <Select value={formData.thrust_area_id} onValueChange={(v) => setFormData({ ...formData, thrust_area_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select thrust area" /></SelectTrigger>
                <SelectContent>
                  {thrustAreas?.map((ta) => (
                    <SelectItem key={ta.id} value={ta.id}>{ta.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Goal Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Complete compliance training"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional details..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>UoM Type</Label>
              <Select value={formData.uom_type} onValueChange={(v) => setFormData({ ...formData, uom_type: v as UomType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="min">Min Numeric</SelectItem>
                  <SelectItem value="max">Max Numeric</SelectItem>
                  <SelectItem value="timeline">Timeline</SelectItem>
                  <SelectItem value="zero">Zero</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.uom_type !== 'timeline' && formData.uom_type !== 'zero' && (
              <div className="space-y-2">
                <Label>Target Value</Label>
                <Input
                  type="number"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                />
              </div>
            )}

            {formData.uom_type === 'timeline' && (
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recipients</CardTitle>
            <CardDescription>Select employees to receive this goal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {employees?.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent/50 cursor-pointer"
                  onClick={() => toggleEmployee(emp.id)}
                >
                  <Checkbox checked={selectedEmployees.includes(emp.id)} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.department} &middot; {emp.email}</p>
                  </div>
                  {selectedEmployees.includes(emp.id) && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedEmployees.length} employee(s) selected
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting || selectedEmployees.length === 0}>
          <Send className="mr-1 h-4 w-4" />
          {submitting ? 'Pushing...' : `Push to ${selectedEmployees.length} Employee(s)`}
        </Button>
      </div>
    </div>
  );
}
