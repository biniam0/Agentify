/**
 * User Logs Page
 * Dedicated page for user logs accessible via /app/logs route
 */

import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  FileText,
  Phone,
} from 'lucide-react';
import { BarrierXHeader } from './components/BarrierXHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const UserLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBackToMeetings = () => {
    navigate('/meetings');
  };

  // Determine active section based on current path
  const isActive = (path: string) => {
    if (path === '/logs') {
      return location.pathname === '/logs';
    }
    return location.pathname.startsWith(path);
  };

  // Navigation items for the header
  const navigationItems = [
    { label: 'Meetings', path: '/meetings' },
    { label: 'Logs', path: '/logs' },
    { label: 'Calls', path: '/calls' },
    { label: 'Analytics', path: '/calls/analytics' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Header - Using BarrierXHeader for consistency */}
      <BarrierXHeader items={navigationItems} />

      {/* Main Content */}
      <main className="container mx-auto px-[10%] py-8 max-w-[1920px]">
        <div className="flex gap-6">
          {/* Logs Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <Card className="p-4 sticky top-24">
              <div className="flex items-center gap-2 mb-4 px-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBackToMeetings}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-lg font-semibold">My Logs</h2>
              </div>
              <nav className="space-y-1">
                <Button
                  variant={isActive('/logs') ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/logs')}
                >
                  <Activity className="w-4 h-4" />
                  Overview
                </Button>
                <Button
                  variant={isActive('/logs/calls') ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/logs/calls')}
                >
                  <Phone className="w-4 h-4" />
                  Calls
                </Button>
                <Button
                  variant={isActive('/logs/activity') ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/logs/activity')}
                >
                  <Activity className="w-4 h-4" />
                  Activity
                </Button>
                <Button
                  variant={isActive('/logs/crm-actions') ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/logs/crm-actions')}
                >
                  <FileText className="w-4 h-4" />
                  CRM Actions
                </Button>
              </nav>
            </Card>
          </aside>

          {/* Logs Main Content - Renders child routes */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserLogsPage;
