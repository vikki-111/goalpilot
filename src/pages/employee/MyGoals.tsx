import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function MyGoals() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">My Goals</h1>
      <Card>
        <CardHeader>
          <CardTitle>Goal Sheet</CardTitle>
          <CardDescription>Create and manage your goals for the current cycle</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Goal sheet will appear here once the cycle is active.</p>
        </CardContent>
      </Card>
    </div>
  );
}
