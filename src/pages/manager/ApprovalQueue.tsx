import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ApprovalQueue() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Review and approve goal sheets from your team</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pending approvals.</p>
        </CardContent>
      </Card>
    </div>
  );
}
