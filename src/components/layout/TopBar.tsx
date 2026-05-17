import { Menu, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileOpen: () => void;
}

export function TopBar({ collapsed, onToggle, onMobileOpen }: TopBarProps) {
  const { profile, authProvider } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().clearSession();
    navigate('/login');
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : '?';

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex"
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMobileOpen}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium">{profile?.full_name}</p>
          <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
        </div>
        <div className="relative">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {authProvider === 'azure' && (
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-border">
              <svg width="10" height="10" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
                <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
                <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
              </svg>
            </div>
          )}
        </div>
        {authProvider === 'azure' && (
          <Badge variant="outline" className="hidden sm:flex gap-1 text-[10px] h-5 px-1.5">
            <svg width="10" height="10" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="10" height="10" fill="#F25022" />
              <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
              <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
              <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
            </svg>
            Microsoft
          </Badge>
        )}
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
