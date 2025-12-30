/**
 * User Logs Layout - Full dashboard for user-specific logs
 * Similar to Admin Logs but shows only current user's data
 */

import { Activity, Calendar, LogOut, Moon, Sun, FileText, Phone } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import * as authService from '../../services/authService';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';

const UserLogsLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getUser();
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Determine active tab
  const isOverviewActive = location.pathname === '/my-logs' || location.pathname === '/my-logs/overview';
  const isCallsActive = location.pathname === '/my-logs/calls';
  const isActivityActive = location.pathname === '/my-logs/activity';
  const isCrmActionsActive = location.pathname === '/my-logs/crm-actions';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold">My Activity Logs</h1>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Back to Meetings */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/meetings')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Back to Meetings
              </Button>

              {/* Theme Toggle */}
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="w-8 h-8">
                      {user?.avatar ? (
                        <AvatarImage src={user.avatar} alt={user?.name || 'User'} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                        {user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:inline">{user?.name || 'User'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-semibold">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 -mb-px">
            <Button
              variant={isOverviewActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/my-logs/overview')}
              className="rounded-b-none"
            >
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={isCallsActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/my-logs/calls')}
              className="rounded-b-none"
            >
              <Phone className="w-4 h-4 mr-2" />
              Calls
            </Button>
            <Button
              variant={isActivityActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/my-logs/activity')}
              className="rounded-b-none"
            >
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </Button>
            <Button
              variant={isCrmActionsActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/my-logs/crm-actions')}
              className="rounded-b-none"
            >
              <FileText className="w-4 h-4 mr-2" />
              CRM Actions
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default UserLogsLayout;

