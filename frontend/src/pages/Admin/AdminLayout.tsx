import { LogOut, Settings, Calendar, Moon, Sun } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../../components/ui/sidebar';
import { Separator } from '../../components/ui/separator';
import { AdminSidebar } from '@/components/Admin/AdminSidebar';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/app/login');
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

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="bg-background">
        {/* Header - BarrierX Style */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border bg-elevated transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 flex-1">
            <SidebarTrigger className="-ml-1 hover:!bg-gray-100 hover:!text-gray-900 dark:hover:!bg-gray-700 dark:hover:!text-gray-100" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            {/* Logo - Agent X Dashboard */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate('/app/admin')}
            >
              <span className="text-2xl font-bold leading-none tracking-tight text-heading dark:text-foreground">
                Agent
              </span>
              <svg
                className="h-[1.25rem] w-auto"
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
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-4 px-4">
            <div className="pl-2 border-l border-default dark:border-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-[hsl(var(--border-default))] dark:hover:ring-border transition-all">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-[hsl(var(--text-heading))] dark:bg-primary text-white text-xs">
                      {user?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-3 py-2">
                      <Avatar className="h-12 w-12 border-2 border-[hsl(var(--app-brand-muted))] dark:border-primary/20">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-[hsl(var(--text-heading))] dark:bg-primary text-white font-semibold text-lg">
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
                        <Badge className="w-fit text-[10px] h-5 bg-brand-light text-brand border-[hsl(var(--app-brand-muted))] hover:bg-[hsl(var(--app-brand-light))] dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                          <span className="mr-1">●</span> Admin
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate('/app/meetings')}
                    className="cursor-pointer focus:!bg-gray-100 focus:!text-gray-900 dark:focus:!bg-gray-700 dark:focus:!text-gray-100 hover:!bg-gray-100 hover:!text-gray-900 dark:hover:!bg-gray-700 dark:hover:!text-gray-100"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Clients Page</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer focus:!bg-gray-100 focus:!text-gray-900 dark:focus:!bg-gray-700 dark:focus:!text-gray-100 hover:!bg-gray-100 hover:!text-gray-900 dark:hover:!bg-gray-700 dark:hover:!text-gray-100">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer focus:!bg-gray-100 focus:!text-gray-900 dark:focus:!bg-gray-700 dark:focus:!text-gray-100 hover:!bg-gray-100 hover:!text-gray-900 dark:hover:!bg-gray-700 dark:hover:!text-gray-100">
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
                    className="text-destructive focus:!bg-gray-100 focus:!text-destructive dark:focus:!bg-gray-700 hover:!bg-gray-100 hover:!text-destructive dark:hover:!bg-gray-700 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminLayout;
