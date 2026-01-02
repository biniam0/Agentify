/**
 * Logs Layout - Sidebar navigation for all log sections
 */

import { Activity, AlertCircle, FileText, Phone, Timer, Webhook } from 'lucide-react';
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';

const LogsLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Activity,
      path: '/admin/logs',
      description: 'Dashboard & statistics',
    },
    {
      id: 'calls',
      label: 'Calls',
      icon: Phone,
      path: '/admin/logs/calls',
      description: 'Pre & post meeting calls',
    },
    {
      id: 'webhooks',
      label: 'Webhooks',
      icon: Webhook,
      path: '/admin/logs/webhooks',
      description: 'ElevenLabs & BarrierX',
    },
    {
      id: 'crm-actions',
      label: 'CRM Actions',
      icon: FileText,
      path: '/admin/logs/crm-actions',
      description: 'Notes, meetings created',
    },
    {
      id: 'scheduler',
      label: 'Scheduler',
      icon: Timer,
      path: '/admin/logs/scheduler',
      description: 'Automated job runs',
    },
    {
      id: 'errors',
      label: 'Errors',
      icon: AlertCircle,
      path: '/admin/logs/errors',
      description: 'System errors & issues',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/admin/logs') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <Card className="p-4 sticky top-24">
          <h2 className="text-lg font-semibold mb-4 px-2">Log Sections</h2>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Button
                  key={item.id}
                  variant={active ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className={`text-xs ${active ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {item.description}
                    </span>
                  </div>
                </Button>
              );
            })}
          </nav>
        </Card>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
};

export default LogsLayout;

