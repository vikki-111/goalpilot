import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuditLog() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
      <Card>
        <CardHeader>
          <CardTitle>System Audit</CardTitle>
          <CardDescription>Track all changes and approvals in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Audit log entries will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
