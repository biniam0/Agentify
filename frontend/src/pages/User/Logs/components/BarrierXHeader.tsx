import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, HelpCircle, Settings, Bell, Zap, LogOut, Moon, Sun } from 'lucide-react';
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
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-[10%] h-16 flex items-center justify-between">
        
        {/* Left: Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="flex items-center gap-1">
             <span className="text-2xl font-bold tracking-tight text-slate-900">Agent</span>
             <div className="relative flex items-center justify-center">
               <Zap className="h-6 w-6 text-emerald-500 fill-emerald-500" />
             </div>
          </div>
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
                  px-4 py-1.5 rounded-md text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-emerald-50/50 text-slate-900' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
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
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-red-500 rounded-full border border-white"></span>
          </Button>
          
          <div className="pl-2 border-l border-slate-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-slate-200 transition-all">
                  <AvatarImage src={userAvatar || user?.avatar} />
                  <AvatarFallback className="bg-slate-900 text-white text-xs">
                    {userName?.charAt(0) || user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3 py-2">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarImage src={userAvatar || user?.avatar} />
                      <AvatarFallback className="bg-slate-900 text-white font-semibold text-lg">
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
                      <Badge className="w-fit text-[10px] h-5 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100">
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

