import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  Plug,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SectionScope = 'Personal' | 'Platform' | 'Read-only' | 'Dangerous';

interface SectionItem {
  name: string;
  path: string;
  icon: typeof SettingsIcon;
  scope: SectionScope;
}

const sections: SectionItem[] = [
  { name: 'General', path: '/app/admin/settings', icon: SettingsIcon, scope: 'Personal' },
  { name: 'Access & Roles', path: '/app/admin/settings/access-roles', icon: ShieldCheck, scope: 'Platform' },
  { name: 'Tenants', path: '/app/admin/settings/tenants', icon: Building2, scope: 'Platform' },
  { name: 'Audit Log', path: '/app/admin/settings/audit-log', icon: ClipboardList, scope: 'Read-only' },
  { name: 'Integrations', path: '/app/admin/settings/integrations', icon: Plug, scope: 'Platform' },
  { name: 'Environment', path: '/app/admin/settings/environment', icon: Server, scope: 'Platform' },
  { name: 'Danger Zone', path: '/app/admin/settings/danger-zone', icon: AlertTriangle, scope: 'Dangerous' },
];

const AdminSettingsPage = () => {
  const location = useLocation();
  const env = import.meta.env.MODE;

  const isActive = (path: string) => {
    if (path === '/app/admin/settings') {
      return (
        location.pathname === '/app/admin/settings' ||
        location.pathname === '/app/admin/settings/'
      );
    }
    return location.pathname === path;
  };

  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-2 mb-6 pb-4 border-b border-default sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Platform Settings
              </h1>
              {env !== 'production' && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {env}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Manage admins, roles, and platform-wide configuration.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
          <nav aria-label="Settings sections" className="space-y-0.5">
            {sections.map((s) => {
              const active = isActive(s.path);
              const Icon = s.icon;
              return (
                <Link
                  key={s.path}
                  to={s.path}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{s.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
