import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function OrgManager() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Org Manager</h1>
      <Card>
        <CardHeader>
          <CardTitle>Organization Hierarchy</CardTitle>
          <CardDescription>Manage departments, roles, and reporting structure</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Organization management will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
