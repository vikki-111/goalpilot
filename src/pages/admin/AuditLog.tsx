import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollText } from 'lucide-react';
import type { AuditLog } from '@/types';

interface JsonDiffProps {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

function JsonDiff({ before, after }: JsonDiffProps) {
  const allKeys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  const diffs: Array<{ key: string; before: string; after: string; changed: boolean }> = [];

  for (const key of allKeys) {
    const beforeVal = before?.[key] ?? null;
    const afterVal = after?.[key] ?? null;
    const beforeStr = beforeVal === null ? '—' : typeof beforeVal === 'object' ? JSON.stringify(beforeVal) : String(beforeVal);
    const afterStr = afterVal === null ? '—' : typeof afterVal === 'object' ? JSON.stringify(afterVal) : String(afterVal);
    diffs.push({ key, before: beforeStr, after: afterStr, changed: beforeVal !== afterVal });
  }

  const changedDiffs = diffs.filter((d) => d.changed);
  if (changedDiffs.length === 0) {
    return <span className="text-muted-foreground text-xs">No changes</span>;
  }

  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {changedDiffs.map((d) => (
        <div key={d.key} className="text-xs font-mono">
          <span className="font-medium">{d.key}:</span>
          <span className="text-red-600 ml-1 line-through">{d.before}</span>
          <span className="text-green-600 ml-1">{d.after}</span>
        </div>
      ))}
    </div>
  );
}

export function AuditLog() {
  const [filterEntityType, setFilterEntityType] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-log', filterEntityType],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select(`
          *,
          profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (filterEntityType !== 'all') {
        query = query.eq('entity_type', filterEntityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as (AuditLog & { profiles: { full_name: string } | null })[];
    },
  });

  const actionColors: Record<string, 'default' | 'success' | 'warning' | 'info' | 'destructive' | 'outline'> = {
    update: 'info',
    unlock: 'warning',
    approve: 'success',
    return: 'destructive',
    submit: 'default',
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
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Track all changes and approvals in the system</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              System Audit
            </CardTitle>
            <Select value={filterEntityType} onValueChange={setFilterEntityType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="goal">Goals</SelectItem>
                <SelectItem value="goal_sheet">Goal Sheets</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {logs?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No audit entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.profiles?.full_name ?? 'System'}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-medium">{log.entity_type}</span>
                          <span className="text-muted-foreground ml-1 font-mono">
                            {log.entity_id.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionColors[log.action] ?? 'outline'} className="text-xs">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-64">
                        <JsonDiff
                          before={log.before_state as Record<string, unknown> | null}
                          after={log.after_state as Record<string, unknown> | null}
                        />
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
