import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { RULE_LABELS } from '@/lib/escalation';
import { CheckCircle, Filter } from 'lucide-react';

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-orange-100 text-orange-800',
  3: 'bg-red-100 text-red-800',
};

export function EscalationLog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterRule, setFilterRule] = useState<string>('all');
  const [filterResolved, setFilterResolved] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['escalation-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escalation_log')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const enriched = [];
      for (const log of data ?? []) {
        let employeeName = '—';
        let managerName = '—';

        if (log.employee_id) {
          const { data: emp } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', log.employee_id)
            .single();
          employeeName = (emp as { full_name: string } | null)?.full_name ?? '—';
        }

        if (log.manager_id) {
          const { data: mgr } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', log.manager_id)
            .single();
          managerName = (mgr as { full_name: string } | null)?.full_name ?? '—';
        }

        enriched.push({
          ...log,
          employee_name: employeeName,
          manager_name: managerName,
        });
      }

      return enriched;
    },
  });

  const resolveLog = useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase
        .from('escalation_log')
        .update({ resolved: true })
        .eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-log'] });
      toast({ title: 'Marked as resolved', variant: 'success' });
    },
  });

  const filteredLogs = (logs ?? []).filter((log: Record<string, unknown>) => {
    if (filterRule !== 'all' && log.rule_type !== filterRule) return false;
    if (filterResolved === 'resolved' && !log.resolved) return false;
    if (filterResolved === 'open' && log.resolved) return false;
    return true;
  });

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escalation Log</h1>
        <p className="text-muted-foreground mt-1">Track and resolve escalation events</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Rule Type</label>
              <Select value={filterRule} onValueChange={setFilterRule}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="All rules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rules</SelectItem>
                  <SelectItem value="goal_not_submitted">Goal not submitted</SelectItem>
                  <SelectItem value="goal_not_approved">Goal not approved</SelectItem>
                  <SelectItem value="checkin_not_completed">Check-in not completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterResolved} onValueChange={setFilterResolved}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Escalation Events</CardTitle>
          <p className="text-xs text-muted-foreground">{filteredLogs.length} entries</p>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No escalation events match the current filters.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Timestamp</TableHead>
                    <TableHead className="whitespace-nowrap">Rule</TableHead>
                    <TableHead className="whitespace-nowrap">Employee</TableHead>
                    <TableHead className="whitespace-nowrap">Manager</TableHead>
                    <TableHead className="whitespace-nowrap">Level</TableHead>
                    <TableHead className="whitespace-nowrap">Quarter</TableHead>
                    <TableHead className="whitespace-nowrap">Resolved</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log: Record<string, unknown>) => (
                    <TableRow key={log.id as string} className={log.resolved ? 'opacity-50' : ''}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at as string).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="text-sm">{RULE_LABELS[log.rule_type as keyof typeof RULE_LABELS] ?? log.rule_type}</span>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{log.employee_name as string}</TableCell>
                      <TableCell className="whitespace-nowrap">{log.manager_name as string}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${LEVEL_COLORS[log.escalation_level as number] ?? ''}`}>
                          Level {log.escalation_level as number}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{(log.quarter as string) ?? '—'}</TableCell>
                      <TableCell>
                        {log.resolved ? (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" /> Resolved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!log.resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveLog.mutate(log.id as string)}
                            disabled={resolveLog.isPending}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
