import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell, ProtectedRoute } from '@/components/layout/AppShell';
import { Login } from '@/pages/auth/Login';
import { Dashboard } from '@/pages/Dashboard';
import { TeamDashboard } from '@/pages/manager/TeamDashboard';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { MyGoals } from '@/pages/employee/MyGoals';
import { MyAchievements } from '@/pages/employee/MyAchievements';
import { ApprovalQueue } from '@/pages/manager/ApprovalQueue';
import { ApprovalDetail } from '@/pages/manager/ApprovalDetail';
import { CheckinView } from '@/pages/manager/CheckinView';
import { CycleManager } from '@/pages/admin/CycleManager';
import { OrgManager } from '@/pages/admin/OrgManager';
import { AdminCheckins } from '@/pages/admin/AdminCheckins';
import { AdminUnlock } from '@/pages/admin/AdminUnlock';
import { SharedGoalPush } from '@/pages/admin/SharedGoalPush';
import { Reports } from '@/pages/admin/Reports';
import { AuditLog } from '@/pages/admin/AuditLog';
import { Analytics } from '@/pages/admin/Analytics';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/hooks/useAuth';

function RoleDashboard() {
  const { role } = useAuth();
  if (role === 'manager') return <TeamDashboard />;
  if (role === 'admin') return <AdminDashboard />;
  return <Dashboard />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute allowedRoles={['employee', 'manager', 'admin']} />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<RoleDashboard />} />

              <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
                <Route path="/employee/goals" element={<MyGoals />} />
                <Route path="/employee/achievements" element={<MyAchievements />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
                <Route path="/manager/approvals" element={<ApprovalQueue />} />
                <Route path="/manager/approvals/:sheetId" element={<ApprovalDetail />} />
                <Route path="/manager/checkins" element={<CheckinView />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/cycles" element={<CycleManager />} />
                <Route path="/admin/org" element={<OrgManager />} />
                <Route path="/admin/checkins" element={<AdminCheckins />} />
                <Route path="/admin/unlock" element={<AdminUnlock />} />
                <Route path="/admin/shared-goals" element={<SharedGoalPush />} />
                <Route path="/admin/reports" element={<Reports />} />
                <Route path="/admin/audit" element={<AuditLog />} />
                <Route path="/admin/analytics" element={<Analytics />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
