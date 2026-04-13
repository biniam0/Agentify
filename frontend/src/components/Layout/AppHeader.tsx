/**
 * Shared App Header Component
 * Reusable header for all pages with configurable features
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Moon,
  Sun,
  LogOut,
  Settings,
  Search,
  Shield,
  LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

interface TabConfig {
  label: string;
  icon: LucideIcon;
  path: string;
  active: boolean;
  onClick: () => void;
}

interface AppHeaderProps {
  title?: string;
  titleIcon?: LucideIcon;
  customTitle?: React.ReactNode; // For custom title rendering (e.g., fancy logo)

  // Search
  showSearch?: boolean;
  searchQuery?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;

  // Notifications
  showNotifications?: boolean;
  notificationCount?: number;

  // Back Button
  backButton?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };

  // Stats Badge (e.g., "5 Today")
  statsBadge?: {
    icon: LucideIcon;
    label: string;
  };

  // Tab Navigation
  tabs?: TabConfig[];

  // Theme
  theme: 'light' | 'dark';
  onThemeToggle: () => void;

  // Extra Actions
  extraActions?: React.ReactNode;

  // Additional Dropdown Items
  additionalDropdownItems?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  titleIcon: TitleIcon,
  customTitle,
  showSearch = false,
  searchQuery = '',
  searchPlaceholder = 'Search...',
  onSearchChange,
  showNotifications = false,
  notificationCount = 0,
  backButton,
  statsBadge,
  tabs,
  theme,
  onThemeToggle,
  extraActions,
  additionalDropdownItems,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/app/login');
  };

  return (
    <header className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section: Logo & Title */}
          <div className="flex items-center gap-4">
            {/* Custom Title or Standard Title */}
            {customTitle ? (
              customTitle
            ) : (
              <div className="flex items-center gap-2">
                {TitleIcon && <TitleIcon className="w-6 h-6 text-primary" />}
                <h1 className="text-xl font-bold">{title}</h1>
              </div>
            )}

            {/* Stats Badge */}
            {statsBadge && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <statsBadge.icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {statsBadge.label}
                </span>
              </div>
            )}
          </div>

          {/* Right Section: Actions & User */}
          <div className="flex items-center gap-3">
            {/* Back Button */}
            {backButton && (
              <Button variant="outline" size="sm" onClick={backButton.onClick}>
                {backButton.icon && <backButton.icon className="w-4 h-4 mr-2" />}
                {backButton.label}
              </Button>
            )}

            {/* Search Input */}
            {showSearch && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/50 transition-colors min-w-[200px] lg:min-w-[300px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange?.('')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="text-xs">✕</span>
                  </button>
                )}
              </div>
            )}

            {/* Notifications */}
            {showNotifications && (
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-primary/10 transition-colors"
                onClick={() => toast.info('Notifications coming soon')}
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center border-2 border-background">
                    {notificationCount}
                  </span>
                )}
              </Button>
            )}

            {/* Divider (if needed) */}
            {(showNotifications || showSearch) && (
              <div className="h-8 w-px bg-border/50" />
            )}

            {/* Extra Actions */}
            {extraActions}

            {/* User Avatar Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-primary/20 transition-all"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      {user?.avatar ? (
                        <AvatarImage src={user.avatar} alt={user?.name || 'User'} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3 py-2">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      {user?.avatar ? (
                        <AvatarImage src={user.avatar} alt={user?.name || 'User'} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-primary text-white font-semibold text-lg">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1">
                      <p className="text-sm font-semibold leading-none mb-1">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground mb-1">
                        {user?.email || 'user@example.com'}
                      </p>
                      <Badge className="w-fit text-[10px] h-5 bg-success/10 text-success border-success/20 hover:bg-success/10">
                        <span className="mr-1">●</span> Online
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {additionalDropdownItems}
                {/* Admin Dashboard - Only show for admin users */}
                {user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                  <DropdownMenuItem
                    onClick={() => navigate('/app/admin')}
                    className="cursor-pointer"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => toast.info('Settings coming soon')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onThemeToggle} className="cursor-pointer">
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

        {/* Tab Navigation (if provided) */}
        {tabs && tabs.length > 0 && (
          <div className="flex gap-2 -mb-px">
            {tabs.map((tab) => (
              <Button
                key={tab.path}
                variant={tab.active ? 'default' : 'ghost'}
                size="sm"
                onClick={tab.onClick}
                className="rounded-b-none"
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;

