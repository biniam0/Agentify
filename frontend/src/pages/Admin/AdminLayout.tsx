/**
 * Admin Layout - BarrierX style header with tabs
 * Only accessible by tamiratkebede120@gmail.com
 */

import { Activity, Calendar, LogOut, Moon, Sun, Target, Search, HelpCircle, Settings, Bell } from 'lucide-react';
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
import { Badge } from '../../components/ui/badge';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getUser();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Check if user is admin
  const isAdmin = user?.email === 'tamiratkebede120@gmail.com';

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

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/meetings" replace />;
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

  // Navigation items
  const navItems = [
    { label: 'Clients Meeting', path: '/admin/meetings', icon: Calendar },
    { label: 'BarrierX Info', path: '/admin/barrierx-info', icon: Target },
    { label: 'Logs', path: '/admin/logs', icon: Activity },
  ];

  const isActive = (path: string) => {
    if (path === '/admin/meetings') {
      return location.pathname === '/admin' || location.pathname === '/admin/meetings';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Header - BarrierX Style */}
      <header className="bg-white dark:bg-card border-b border-slate-100 dark:border-border sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-[10%] h-16 flex items-center justify-between">
          {/* Logo - Agent X Dashboard */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/admin')}
          >
            <span className="text-3xl font-bold leading-none tracking-tight text-slate-900 dark:text-foreground">
              Agent
            </span>
            <svg
              className="h-[1.5rem] w-auto"
              viewBox="0 0 42 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M42 28H28V14L42 28Z" fill="#53A17D" />
              <path d="M28 14V0L42 2.00272e-06L28 14Z" fill="#2D6A4F" />
              <path d="M14 28V14H28L14 28Z" fill="#2D6A4F" />
              <path d="M28 14H14V0L28 14Z" fill="#53A17D" />
              <path d="M14 28H0L14 14V28Z" fill="#53A17D" />
              <path d="M14 14L0 0H14V14Z" fill="#53A17D" />
            </svg>
            <span className="text-xl font-semibold text-slate-600 dark:text-muted-foreground ml-1">
              Dashboard
            </span>
          </div>

          {/* Middle: Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2
                    ${active
                      ? 'bg-emerald-50 dark:bg-primary/10 text-slate-900 dark:text-foreground'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-50 dark:hover:bg-muted'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 dark:hover:text-foreground">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 dark:hover:text-foreground">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 dark:hover:text-foreground">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 dark:hover:text-foreground relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-red-500 rounded-full border border-white"></span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-foreground"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            <div className="pl-2 border-l border-slate-200 dark:border-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-slate-200 dark:hover:ring-border transition-all">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-slate-900 dark:bg-primary text-white text-xs">
                      {user?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-3 py-2">
                      <Avatar className="h-12 w-12 border-2 border-emerald-200 dark:border-primary/20">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-slate-900 dark:bg-primary text-white font-semibold text-lg">
                          {user?.name?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1">
                        <p className="text-sm font-semibold leading-none mb-1">
                          {user?.name || 'Admin'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground mb-1">
                          {user?.email || 'admin@example.com'}
                        </p>
                        <Badge className="w-fit text-[10px] h-5 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                          <span className="mr-1">●</span> Admin
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                    {theme === 'light' ? (
                      <Moon className="mr-2 h-4 w-4" />
                    ) : (
                      <Sun className="mr-2 h-4 w-4" />
                    )}
                    <span>{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-[10%] py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
