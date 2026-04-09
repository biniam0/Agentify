import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import MeetingsPage from './components/MeetingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import * as authService from './services/authService';
import UserLayout from './layouts/UserLayout';
import CallsLayout from './layouts/CallsLayout';
import UserLogsPage from './pages/User/Logs/UserLogsPage';
import UserLogsOverview from './pages/User/Logs/Overview';
import UserCallsLog from './pages/User/Logs/UserCallsLog';
import UserActivityLog from './pages/User/Logs/UserActivityLog';
import UserCrmActionsLog from './pages/User/Logs/UserCrmActionsLog';
import UserCallAnalytics from './pages/User/Logs/UserCallAnalytics';

// Workflow imports
import SimpleWorkflow from './pages/Workflows/SimpleWorkflow';

// V2 imports
import V2Layout from './pages/V2/V2Layout';
import V2DashboardPage from './pages/V2/V2DashboardPage';

// Admin imports
import AdminLayout from './pages/Admin/AdminLayout';
import LogsLayout from './pages/Admin/Logs/LogsLayout';
import LogsOverview from './pages/Admin/Logs/Overview';
import CallsLog from './components/Admin/CallsLog';
import SmsLog from './components/Admin/SmsLog';
import WebhooksLog from './components/Admin/WebhooksLog';
import CrmActionsLog from './components/Admin/CrmActionsLog';
import SchedulerLog from './components/Admin/SchedulerLog';
import ErrorsLog from './components/Admin/ErrorsLog';
import BarrierXInfo from './pages/Admin/BarrierXInfo';
import ClientsDeals from './pages/Admin/ClientsDeals';
import AgentXInvestigations from './pages/Admin/AgentXInvestigations';

// Onboarding (landing page + wizard)
import OnboardingPage from './pages/Onboarding/OnboardingPage';
import OnboardingWizard from './pages/Onboarding/OnboardingWizard';

/**
 * Redirects authenticated users away from the login page.
 * Evaluated on every render (not stale like a top-level function call).
 */
const GuestOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (authService.isAuthenticated()) {
    const user = authService.getUser();
    if (user?.onboardingCompleted) {
      return <Navigate to="/app/v2" replace />;
    }
    return <Navigate to="/app/onboarding" replace />;
  }
  return <>{children}</>;
};

/**
 * Requires SUPER_ADMIN role. Redirects others to /app/v2.
 */
const SuperAdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!authService.isSuperAdmin()) {
    return <Navigate to="/app/v2" replace />;
  }
  return <>{children}</>;
};

/**
 * Evaluated on every render to redirect /app to the right place.
 */
const AppRedirect = () => {
  if (authService.isAuthenticated()) {
    const user = authService.getUser();
    if (user?.onboardingCompleted) {
      return <Navigate to="/app/v2" replace />;
    }
    return <Navigate to="/app/onboarding" replace />;
  }
  return <Navigate to="/app/login" replace />;
};

const router = createBrowserRouter([
  // Public: Onboarding landing page at root
  {
    path: '/',
    element: <OnboardingPage />,
  },
  // Onboarding wizard (protected — must be logged in)
  {
    path: '/app/onboarding',
    element: (
      <ProtectedRoute>
        <OnboardingWizard />
      </ProtectedRoute>
    ),
  },
  // App root — dynamic redirect evaluated on every render
  {
    path: '/app',
    element: <AppRedirect />,
  },
  // Login — redirects away if already authenticated
  {
    path: '/app/login',
    element: (
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <UserLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/app/meetings',
        element: <MeetingsPage />,
      },
      {
        path: '/app/logs',
        element: <UserLogsPage />,
        children: [
          {
            index: true,
            element: <UserLogsOverview />,
          },
          {
            path: 'calls',
            element: <UserCallsLog />,
          },
          {
            path: 'activity',
            element: <UserActivityLog />,
          },
          {
            path: 'crm-actions',
            element: <UserCrmActionsLog />,
          },
        ],
      },
      {
        path: '/app/calls',
        element: <CallsLayout />,
        children: [
          {
            index: true,
            element: <UserCallsLog />,
          },
          {
            path: 'analytics',
            element: <UserCallAnalytics />,
          },
        ],
      },
    ],
  },
  // V2 Routes (AgentX v2.0 — Admin only, must be onboarded)
  {
    path: '/app/v2',
    element: (
      <ProtectedRoute>
        <V2Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/app/v2/calls" replace /> },
      { path: 'calls', element: <V2DashboardPage /> },
      { path: 'info-gatherings', element: <V2DashboardPage /> },
      { path: 'clients-meetings', element: <V2DashboardPage /> },
      { path: 'clients-deals', element: <V2DashboardPage /> },
      { path: 'sms-sent', element: <V2DashboardPage /> },
      { path: 'crm-actions', element: <V2DashboardPage /> },
    ],
  },
  // Admin Routes (SUPER_ADMIN only)
  {
    path: '/app/admin',
    element: (
      <ProtectedRoute>
        <SuperAdminOnly>
          <AdminLayout />
        </SuperAdminOnly>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/app/admin/meetings" replace />,
      },
      {
        path: 'meetings',
        element: <MeetingsPage />,
      },
      {
        path: 'deals',
        element: <ClientsDeals />,
      },
      {
        path: 'barrierx-info',
        element: <BarrierXInfo />,
      },
      {
        path: 'agentx-investigations',
        element: <AgentXInvestigations />,
      },
      {
        path: 'workflows',
        element: <SimpleWorkflow />,
      },
      {
        path: 'logs',
        element: <LogsLayout />,
        children: [
          {
            index: true,
            element: <LogsOverview />,
          },
          {
            path: 'calls',
            element: <CallsLog />,
          },
          {
            path: 'sms',
            element: <SmsLog />,
          },
          {
            path: 'webhooks',
            element: <WebhooksLog />,
          },
          {
            path: 'crm-actions',
            element: <CrmActionsLog />,
          },
          {
            path: 'scheduler',
            element: <SchedulerLog />,
          },
          {
            path: 'errors',
            element: <ErrorsLog />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;

