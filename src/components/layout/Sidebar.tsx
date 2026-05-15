import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Target,
  Trophy,
  Users,
  ClipboardCheck,
  MessageSquare,
  Settings,
  Building2,
  Share2,
  FileText,
  ScrollText,
  BarChart3,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'My Goals', icon: Target, href: '/employee/goals', roles: ['employee'] },
  { label: 'My Achievements', icon: Trophy, href: '/employee/achievements', roles: ['employee'] },
  { label: 'Team Dashboard', icon: Users, href: '/manager/dashboard', roles: ['manager', 'admin'] },
  { label: 'Approval Queue', icon: ClipboardCheck, href: '/manager/approvals', roles: ['manager', 'admin'] },
  { label: 'Check-ins', icon: MessageSquare, href: '/manager/checkins', roles: ['manager', 'admin'] },
  { label: 'Cycle Manager', icon: Settings, href: '/admin/cycles', roles: ['admin'] },
  { label: 'Org Manager', icon: Building2, href: '/admin/org', roles: ['admin'] },
  { label: 'Shared Goals', icon: Share2, href: '/admin/shared-goals', roles: ['admin'] },
  { label: 'Reports', icon: FileText, href: '/admin/reports', roles: ['admin'] },
  { label: 'Audit Log', icon: ScrollText, href: '/admin/audit', roles: ['admin'] },
  { label: 'Analytics', icon: BarChart3, href: '/admin/analytics', roles: ['admin'] },
];

interface SidebarProps {
  role: UserRole | null;
  collapsed: boolean;
}

export function Sidebar({ role, collapsed }: SidebarProps) {
  const location = useLocation();

  const filteredItems = navItems.filter((item) => item.roles.includes(role || 'employee'));

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className={cn('flex h-14 items-center border-b px-4', collapsed && 'justify-center')}>
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
            <LayoutDashboard className="h-5 w-5" />
            <span>AtomQuest</span>
          </Link>
        )}
        {collapsed && <LayoutDashboard className="h-5 w-5" />}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
