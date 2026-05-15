import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Reports() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Achievement Reports</CardTitle>
          <CardDescription>View and export achievement data across cycles</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Reports will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
