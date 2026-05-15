import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SharedGoalPush() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Shared Goals</h1>
      <Card>
        <CardHeader>
          <CardTitle>Push Shared Goals</CardTitle>
          <CardDescription>Assign shared goals to employees across the organization</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Shared goal management will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
