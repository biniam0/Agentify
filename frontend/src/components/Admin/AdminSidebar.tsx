/**
 * Admin Sidebar Component
 * Collapsible sidebar for admin dashboard navigation
 */

import {
  Activity,
  AlertCircle,
  Bell,
  Briefcase,
  Calendar,
  ChevronRight,
  FileText,
  HelpCircle,
  MessageSquare,
  Phone,
  SearchCode,
  Settings,
  Target,
  Timer,
  Webhook,
  Zap,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';

// Main navigation items
const mainNavItems = [
  {
    title: 'Clients Meetings',
    url: '/admin/meetings',
    icon: Calendar,
  },
  {
    title: 'Clients Deals',
    url: '/admin/deals',
    icon: Briefcase,
  },
  {
    title: 'BarrierX Info',
    url: '/admin/barrierx-info',
    icon: Target,
  },
  {
    title: 'Investigations',
    url: '/admin/agentx-investigations',
    icon: SearchCode,
  },
  {
    title: 'Workflows',
    url: '/admin/workflows',
    icon: Zap,
  },
];

// Logs sub-navigation items
const logsNavItems = [
  {
    title: 'Overview',
    url: '/admin/logs',
    icon: Activity,
  },
  {
    title: 'Calls',
    url: '/admin/logs/calls',
    icon: Phone,
  },
  {
    title: 'SMS',
    url: '/admin/logs/sms',
    icon: MessageSquare,
  },
  {
    title: 'Webhooks',
    url: '/admin/logs/webhooks',
    icon: Webhook,
  },
  {
    title: 'CRM Actions',
    url: '/admin/logs/crm-actions',
    icon: FileText,
  },
  {
    title: 'Schedulers',
    url: '/admin/logs/scheduler',
    icon: Timer,
  },
  {
    title: 'Errors',
    url: '/admin/logs/errors',
    icon: AlertCircle,
  },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === '/admin/meetings') {
      return location.pathname === '/admin' || location.pathname === '/admin/meetings';
    }
    if (url === '/admin/logs') {
      return location.pathname === '/admin/logs';
    }
    return location.pathname === url;
  };

  const isLogsActive = location.pathname.startsWith('/admin/logs');

  return (
    <Sidebar collapsible="icon" className="border-r border-default">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              onClick={() => navigate('/admin')}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
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
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">AgentX</span>
                <span className="truncate text-xs">Admin Dashboard</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Main nav items */}
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <button onClick={() => navigate(item.url)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Logs collapsible menu */}
              <Collapsible
                asChild
                defaultOpen={isLogsActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Logs" isActive={isLogsActive}>
                      <Activity />
                      <span>Logs</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {logsNavItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(item.url)}
                          >
                            <button onClick={() => navigate(item.url)}>
                              <item.icon className="size-4" />
                              <span>{item.title}</span>
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with actions */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Help">
              <button>
                <HelpCircle />
                <span>Help</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Notifications" className="relative">
              <button>
                <Bell />
                <span>Notifications</span>
                <span className="absolute left-5 top-1 h-1.5 w-1.5 bg-red-500 rounded-full border border-sidebar-background"></span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <button>
                <Settings />
                <span>Settings</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
