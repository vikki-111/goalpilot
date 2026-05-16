import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useActiveCycle } from '@/hooks/useGoalSheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getActiveWindow } from '@/lib/cycle';
import { runEscalationScan } from '@/lib/runEscalationScan';
import { RULE_LABELS } from '@/lib/escalation';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';

export function EscalationRules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: cycle } = useActiveCycle();
  const [scanning, setScanning] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['escalation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .order('rule_type');
      if (error) throw error;
      return data;
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, threshold_days, is_active }: { id: string; threshold_days: number; is_active: boolean }) => {
      const { error } = await supabase
        .from('escalation_rules')
        .update({ threshold_days, is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
      toast({ title: 'Rule updated', variant: 'success' });
    },
  });

  const handleScan = async () => {
    if (!cycle) return;
    setScanning(true);
    try {
      const activeWindow = getActiveWindow(cycle);
      const result = await runEscalationScan(supabase, cycle.id, activeWindow, {
        goal_setting_opens: cycle.goal_setting_opens,
        q1_opens: cycle.q1_opens,
        q2_opens: cycle.q2_opens,
        q3_opens: cycle.q3_opens,
        q4_opens: cycle.q4_opens,
      });
      toast({
        title: 'Scan complete',
        description: `${result.created} new escalations, ${result.updated} updated.`,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['escalation-log'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      toast({ title: 'Scan failed', description: message, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Escalation Rules</h1>
          <p className="text-muted-foreground mt-1">Configure thresholds and run escalation checks</p>
        </div>
        <Button onClick={handleScan} disabled={scanning || !cycle}>
          <RefreshCw className={`mr-1 h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Run Check Now'}
        </Button>
      </div>

      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">How escalation works</p>
              <p className="text-sm text-amber-700 mt-1">
                When a deadline is exceeded by the threshold, the system escalates:
                Level 1 → Employee notified, Level 2 → Manager notified, Level 3 → Admin notified.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Active Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Threshold (days)</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules?.map((rule) => (
                <RuleRow key={rule.id} rule={rule} onUpdate={updateRule.mutate} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RuleRow({
  rule,
  onUpdate,
}: {
  rule: { id: string; rule_type: string; threshold_days: number; is_active: boolean };
  onUpdate: (data: { id: string; threshold_days: number; is_active: boolean }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [threshold, setThreshold] = useState(rule.threshold_days.toString());
  const [active, setActive] = useState(rule.is_active);

  const handleSave = () => {
    const days = parseInt(threshold, 10);
    if (isNaN(days) || days < 1) return;
    onUpdate({ id: rule.id, threshold_days: days, is_active: active });
    setEditing(false);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{RULE_LABELS[rule.rule_type as keyof typeof RULE_LABELS] ?? rule.rule_type}</TableCell>
      <TableCell>
        {editing ? (
          <Input
            type="number"
            min={1}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-20 h-8"
          />
        ) : (
          <span>{rule.threshold_days} days</span>
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm">{active ? 'Active' : 'Inactive'}</span>
          </label>
        ) : (
          <Badge variant={rule.is_active ? 'success' : 'outline'} className="text-xs">
            {rule.is_active ? 'Active' : 'Inactive'}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleSave}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setThreshold(rule.threshold_days.toString()); setActive(rule.is_active); }}>Cancel</Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </TableCell>
    </TableRow>
  );
}
