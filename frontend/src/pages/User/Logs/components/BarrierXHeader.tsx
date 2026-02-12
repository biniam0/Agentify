import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, HelpCircle, Settings, Bell, LogOut, Moon, Sun } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import * as authService from '@/services/authService';

interface NavigationItem {
  label: string;
  path: string;
}

interface BarrierXHeaderProps {
  items: NavigationItem[];
  userAvatar?: string;
  userName?: string;
}

export const BarrierXHeader: React.FC<BarrierXHeaderProps> = ({
  items,
  userAvatar,
  userName
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getUser();
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
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
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newTheme);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <header className="bg-elevated border-b border-subtle sticky top-0 z-50 dark:bg-card dark:border-border">
      <div className="page-container h-16 flex items-center justify-between">

        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <span className="text-3xl font-bold leading-none tracking-tight text-heading">
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
        </div>

        {/* Middle: Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150
                  ${isActive
                    ? 'bg-brand-light text-heading dark:bg-primary/10 dark:text-foreground'
                    : 'text-subtle hover:text-heading hover:bg-[hsl(var(--page-bg))] dark:hover:bg-muted dark:hover:text-foreground'
                  }
                `}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-subtle hover:text-heading hover:bg-[hsl(var(--page-bg))] dark:hover:text-foreground dark:hover:bg-muted">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-subtle hover:text-heading hover:bg-[hsl(var(--page-bg))] dark:hover:text-foreground dark:hover:bg-muted">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-subtle hover:text-heading hover:bg-[hsl(var(--page-bg))] dark:hover:text-foreground dark:hover:bg-muted">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-subtle hover:text-heading hover:bg-[hsl(var(--page-bg))] dark:hover:text-foreground dark:hover:bg-muted relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-card"></span>
          </Button>

          <div className="pl-3 ml-1 border-l border-subtle dark:border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer ring-1 ring-transparent hover:ring-[hsl(var(--border-default))] dark:hover:ring-border transition-[ring-color] duration-150">
                  <AvatarImage src={userAvatar || user?.avatar} />
                  <AvatarFallback className="bg-[hsl(var(--text-heading))] text-white dark:bg-foreground dark:text-background text-xs">
                    {userName?.charAt(0) || user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3 py-2">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarImage src={userAvatar || user?.avatar} />
                      <AvatarFallback className="bg-[hsl(var(--text-heading))] text-white dark:bg-foreground dark:text-background font-semibold text-lg">
                        {userName?.charAt(0) || user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1">
                      <p className="text-sm font-semibold leading-none mb-1">
                        {userName || user?.name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground mb-1">
                        {user?.email || 'user@example.com'}
                      </p>
                      <Badge className="w-fit text-[10px] h-5 bg-brand-light text-brand border-[hsl(var(--app-brand-muted))] hover:bg-[hsl(var(--app-brand-light))]">
                        <span className="mr-1">●</span> Online
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleThemeToggle} className="cursor-pointer">
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
  );
};

