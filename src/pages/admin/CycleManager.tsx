import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CycleManager() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Cycle Manager</h1>
      <Card>
        <CardHeader>
          <CardTitle>Fiscal Cycles</CardTitle>
          <CardDescription>Manage goal setting cycles and quarter windows</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cycle management will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
