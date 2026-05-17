import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { notifyCheckinWindowOpen } from '@/lib/teams';
import { Plus, Check, Trash2, Settings } from 'lucide-react';
import type { Cycle } from '@/types';

export function CycleManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    year: new Date().getFullYear().toString(),
    goal_setting_opens: '',
    q1_opens: '',
    q2_opens: '',
    q3_opens: '',
    q4_opens: '',
    is_active: false,
  });

  const { data: cycles, isLoading } = useQuery({
    queryKey: ['cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .order('year', { ascending: false });
      if (error) throw error;
      return data as Cycle[];
    },
  });

  const upsertCycle = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        label: data.label,
        year: parseInt(data.year, 10),
        goal_setting_opens: data.goal_setting_opens,
        q1_opens: data.q1_opens,
        q2_opens: data.q2_opens,
        q3_opens: data.q3_opens,
        q4_opens: data.q4_opens,
        is_active: data.is_active,
      };

      if (data.is_active) {
        await supabase.from('cycles').update({ is_active: false }).neq('id', data.id ?? '');
      }

      if (data.id) {
        const { error } = await supabase.from('cycles').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cycles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      resetForm();
      toast({ title: editingCycle ? 'Cycle updated' : 'Cycle created', variant: 'success' });

      const today = new Date().toISOString().split('T')[0];
      const quarters: Array<[keyof typeof formData, string]> = [
        ['q1_opens', 'Q1'],
        ['q2_opens', 'Q2'],
        ['q3_opens', 'Q3'],
        ['q4_opens', 'Q4'],
      ];
      for (const [key, label] of quarters) {
        if (vars[key] === today) {
          notifyCheckinWindowOpen(vars.label, label);
          break;
        }
      }
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (cycleId: string) => {
      await supabase.from('cycles').update({ is_active: false }).neq('id', cycleId);
      const { error } = await supabase.from('cycles').update({ is_active: true }).eq('id', cycleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast({ title: 'Active cycle updated', variant: 'success' });
    },
  });

  const deleteCycle = useMutation({
    mutationFn: async (cycleId: string) => {
      const { error } = await supabase.from('cycles').delete().eq('id', cycleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast({ title: 'Cycle deleted', variant: 'success' });
    },
  });

  const resetForm = () => {
    setFormOpen(false);
    setEditingCycle(null);
    setFormData({
      label: '',
      year: new Date().getFullYear().toString(),
      goal_setting_opens: '',
      q1_opens: '',
      q2_opens: '',
      q3_opens: '',
      q4_opens: '',
      is_active: false,
    });
  };

  const handleEdit = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setFormOpen(true);
    setFormData({
      label: cycle.label,
      year: cycle.year.toString(),
      goal_setting_opens: cycle.goal_setting_opens,
      q1_opens: cycle.q1_opens,
      q2_opens: cycle.q2_opens,
      q3_opens: cycle.q3_opens,
      q4_opens: cycle.q4_opens,
      is_active: cycle.is_active ?? false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label || !formData.goal_setting_opens || !formData.q1_opens) {
      toast({ title: 'Missing fields', description: 'Label and at least goal setting + Q1 dates are required.', variant: 'destructive' });
      return;
    }
    upsertCycle.mutate({ ...formData, id: editingCycle?.id });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cycle Manager</h1>
          <p className="text-muted-foreground mt-1">Manage goal setting cycles and quarter windows</p>
        </div>
        <Button onClick={() => { resetForm(); setFormOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> New Cycle
        </Button>
      </div>

      {formOpen && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editingCycle ? 'Edit Cycle' : 'Create Cycle'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label>Cycle Label</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g. FY 2025-26"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1">
                  <Label>Goal Setting Opens</Label>
                  <Input
                    type="date"
                    value={formData.goal_setting_opens}
                    onChange={(e) => setFormData({ ...formData, goal_setting_opens: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Q1 Opens</Label>
                  <Input
                    type="date"
                    value={formData.q1_opens}
                    onChange={(e) => setFormData({ ...formData, q1_opens: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Q2 Opens</Label>
                  <Input
                    type="date"
                    value={formData.q2_opens}
                    onChange={(e) => setFormData({ ...formData, q2_opens: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Q3 Opens</Label>
                  <Input
                    type="date"
                    value={formData.q3_opens}
                    onChange={(e) => setFormData({ ...formData, q3_opens: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Q4 Opens</Label>
                  <Input
                    type="date"
                    value={formData.q4_opens}
                    onChange={(e) => setFormData({ ...formData, q4_opens: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={upsertCycle.isPending}>
                  {upsertCycle.isPending ? 'Saving...' : editingCycle ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Existing Cycles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Goal Setting</TableHead>
                <TableHead>Q1</TableHead>
                <TableHead>Q2</TableHead>
                <TableHead>Q3</TableHead>
                <TableHead>Q4</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles?.map((cycle) => (
                <TableRow key={cycle.id}>
                  <TableCell className="font-medium">{cycle.label}</TableCell>
                  <TableCell>{cycle.year}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{cycle.goal_setting_opens}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{cycle.q1_opens}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{cycle.q2_opens}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{cycle.q3_opens}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{cycle.q4_opens}</TableCell>
                  <TableCell>
                    {cycle.is_active ? (
                      <Badge variant="success" className="text-xs">
                        <Check className="mr-1 h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!cycle.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive.mutate(cycle.id)}
                        >
                          Set Active
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(cycle)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete cycle "${cycle.label}"?`)) {
                            deleteCycle.mutate(cycle.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
