import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Users, Save, Building2 } from 'lucide-react';
import type { Profile, UserRole } from '@/types';

interface EditableProfile extends Profile {
  manager_name?: string;
}

export function OrgManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ department: string; role: UserRole; manager_id: string | null }>({
    department: '',
    role: 'employee',
    manager_id: null,
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      if (error) throw error;

      const profiles = (data ?? []) as Profile[];

      const managers = profiles.filter((p) => p.role === 'manager');
      const managerMap = new Map(managers.map((m) => [m.id, m.full_name]));

      return profiles.map((p) => ({
        ...p,
        manager_name: p.manager_id ? managerMap.get(p.manager_id) ?? '—' : '—',
      })) as EditableProfile[];
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, department, role, manager_id }: { id: string; department: string; role: UserRole; manager_id: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ department, role, manager_id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
      setEditingId(null);
      toast({ title: 'Profile updated', variant: 'success' });
    },
  });

  const roleColors: Record<UserRole, 'default' | 'success' | 'info' | 'outline'> = {
    employee: 'default',
    manager: 'info',
    admin: 'success',
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Org Manager</h1>
        <p className="text-muted-foreground mt-1">Manage departments, roles, and reporting structure</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            All Users ({profiles?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles?.map((profile) => {
                const isEditing = editingId === profile.id;
                return (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium whitespace-nowrap">{profile.full_name}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{profile.email}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.department}
                          onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                          className="w-40 h-8"
                        />
                      ) : (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {profile.department ?? '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editData.role}
                          onValueChange={(v) => setEditData({ ...editData, role: v as UserRole })}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={roleColors[profile.role]} className="text-xs capitalize">
                          {profile.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editData.manager_id ?? ''}
                          onValueChange={(v) => setEditData({ ...editData, manager_id: v || null })}
                        >
                          <SelectTrigger className="w-40 h-8">
                            <SelectValue placeholder="No manager" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No manager</SelectItem>
                            {profiles
                              ?.filter((p) => p.role === 'manager' && p.id !== profile.id)
                              .map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground">{profile.manager_name ?? '—'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              updateProfile.mutate({
                                id: profile.id,
                                department: editData.department,
                                role: editData.role,
                                manager_id: editData.manager_id,
                              });
                            }}
                            disabled={updateProfile.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingId(profile.id);
                          setEditData({
                            department: profile.department ?? '',
                            role: profile.role,
                            manager_id: profile.manager_id,
                          });
                        }}>
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
