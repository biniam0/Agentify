/**
 * User Logs Page
 * Dedicated page for user logs accessible via /app/logs route
 * Header is now provided by UserLayout (shared across all user pages)
 */

import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  FileText,
  Phone,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const UserLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBackToMeetings = () => {
    navigate('/app/meetings');
  };

  // Determine active section based on current path
  const isActive = (path: string) => {
    if (path === '/app/logs') {
      return location.pathname === '/app/logs';
    }
    return location.pathname.startsWith(path);
  };

  const sidebarItems = [
    { label: 'Overview', path: '/app/logs', icon: Activity },
    { label: 'Calls', path: '/app/logs/calls', icon: Phone },
    { label: 'Activity', path: '/app/logs/activity', icon: Activity },
    { label: 'CRM Actions', path: '/app/logs/crm-actions', icon: FileText },
  ];

  return (
    <div className="page-container py-8">
      <div className="flex gap-6 content-container">
        {/* Logs Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <Card className="p-4 sticky top-24 bg-elevated dark:bg-card border border-default dark:border-border shadow-card">
            <div className="flex items-center gap-2 mb-4 px-2">
              <ArrowLeft className="w-4 h-4 cursor-pointer text-heading dark:text-foreground hover:text-brand transition-colors" onClick={handleBackToMeetings} />
              <h2 className="text-lg font-semibold text-heading dark:text-foreground">My Logs</h2>
            </div>
            <nav className="space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all
                      ${active
                        ? 'bg-brand text-white'
                        : 'text-body dark:text-muted-foreground hover:text-heading dark:hover:text-foreground hover:bg-page dark:hover:bg-muted'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </Card>
        </aside>

        {/* Logs Main Content - Renders child routes */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default UserLogsPage;
