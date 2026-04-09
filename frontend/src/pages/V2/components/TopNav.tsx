import { Search, Settings, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const AgentXLogo = () => (
  <svg
    className="h-[1.1rem] w-auto"
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
);

const TopNav = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/app/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-1.5 cursor-pointer select-none"
              onClick={() => navigate('/app/v2')}
            >
              <span className="text-xl font-bold tracking-tight text-gray-900 leading-none">
                Agent
              </span>
              <AgentXLogo />
            </div>
          </div>

          {/* Right: Search, Settings, Notifications, Profile */}
          <div className="flex items-center gap-1">
            <button className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors">
              <Search className="h-[18px] w-[18px] text-gray-500" />
            </button>
            <button className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors">
              <Settings className="h-[18px] w-[18px] text-gray-500" />
            </button>
            <button className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors relative">
              <Bell className="h-[18px] w-[18px] text-gray-500" />
            </button>

            <div className="ml-2 pl-3 border-l border-gray-200">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="relative cursor-pointer">
                    <Avatar className="h-9 w-9 hover:ring-2 hover:ring-gray-200 transition-all">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-gray-800 text-white text-sm font-medium">
                        {user?.name?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1 py-1">
                      <p className="text-sm font-semibold">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email || 'admin@example.com'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate('/app/admin')}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
