/**
 * User Logs Page
 * Dedicated page for user logs accessible via /app/logs route
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  FileText,
  Phone,
  Calendar,
} from 'lucide-react';
import AppHeader from '@/components/Layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const UserLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader
        customTitle={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                My Logs
              </h1>
            </div>
          </div>
        }
        statsBadge={{
          icon: Calendar,
          label: 'Activity History',
        }}
        showNotifications={true}
        notificationCount={0}
        theme={theme}
        onThemeToggle={handleThemeToggle}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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
