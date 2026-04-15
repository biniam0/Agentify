import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import MeetingsPage from './components/MeetingsPage';
import AuthGuard from './components/guards/AuthGuard';
import GuestGuard from './components/guards/GuestGuard';
import RoleGuard from './components/guards/RoleGuard';
import OnboardingGuard from './components/guards/OnboardingGuard';
import NotOnboardedGuard from './components/guards/NotOnboardedGuard';
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
import V2SettingsPage from './pages/V2/Settings/V2SettingsPage';
import UserGeneral from './pages/V2/Settings/components/UserGeneral';
import UsersManagement from './pages/V2/Settings/components/UsersManagement';

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

// Lazy evaluated redirect — uses AuthContext via guards
import { useAuth } from './contexts/AuthContext';
import { AuthLoading } from './components/guards/AuthGuard';

const AppRedirect = () => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <AuthLoading />;
  if (isAuthenticated) {
    return user?.onboardingCompleted
      ? <Navigate to="/app/v2" replace />
      : <Navigate to="/app/onboarding" replace />;
  }
  return <Navigate to="/app/login" replace />;
};

const router = createBrowserRouter([
  // Public: Onboarding landing page at root
  {
    path: '/',
    element: <OnboardingPage />,
  },
  // Onboarding wizard (must be logged in, must NOT be already onboarded)
  {
    path: '/app/onboarding',
    element: (
      <AuthGuard>
        <NotOnboardedGuard>
          <OnboardingWizard />
        </NotOnboardedGuard>
      </AuthGuard>
    ),
  },
  // App root — dynamic redirect
  {
    path: '/app',
    element: <AppRedirect />,
  },
  // Login — redirects away if already authenticated
  {
    path: '/app/login',
    element: (
      <GuestGuard>
        <LoginPage />
      </GuestGuard>
    ),
  },
  // Regular user routes
  {
    element: (
      <AuthGuard>
        <UserLayout />
      </AuthGuard>
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
          { index: true, element: <UserLogsOverview /> },
          { path: 'calls', element: <UserCallsLog /> },
          { path: 'activity', element: <UserActivityLog /> },
          { path: 'crm-actions', element: <UserCrmActionsLog /> },
        ],
      },
      {
        path: '/app/calls',
        element: <CallsLayout />,
        children: [
          { index: true, element: <UserCallsLog /> },
          { path: 'analytics', element: <UserCallAnalytics /> },
        ],
      },
    ],
  },
  // V2 Routes — ADMIN or SUPER_ADMIN, must be onboarded
  {
    path: '/app/v2',
    element: (
      <AuthGuard>
        <RoleGuard roles={['ADMIN', 'SUPER_ADMIN']} fallback="/app/meetings">
          <OnboardingGuard>
            <V2Layout />
          </OnboardingGuard>
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/app/v2/calls" replace /> },
      { path: 'calls', element: <V2DashboardPage /> },
      { path: 'info-gatherings', element: <V2DashboardPage /> },
      { path: 'clients-meetings', element: <V2DashboardPage /> },
      { path: 'clients-deals', element: <V2DashboardPage /> },
      { path: 'sms-sent', element: <V2DashboardPage /> },
      { path: 'crm-actions', element: <V2DashboardPage /> },
      {
        path: 'settings',
        element: <V2SettingsPage />,
        children: [
          { index: true, element: <UserGeneral /> },
          { path: 'users', element: <UsersManagement /> },
        ],
      },
    ],
  },
  // Admin Routes — ADMIN or SUPER_ADMIN
  {
    path: '/app/admin',
    element: (
      <AuthGuard>
        <RoleGuard roles={['ADMIN', 'SUPER_ADMIN']} fallback="/app/meetings">
          <AdminLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/app/admin/meetings" replace /> },
      { path: 'meetings', element: <MeetingsPage /> },
      { path: 'deals', element: <ClientsDeals /> },
      { path: 'barrierx-info', element: <BarrierXInfo /> },
      { path: 'agentx-investigations', element: <AgentXInvestigations /> },
      { path: 'workflows', element: <SimpleWorkflow /> },
      {
        path: 'logs',
        element: <LogsLayout />,
        children: [
          { index: true, element: <LogsOverview /> },
          { path: 'calls', element: <CallsLog /> },
          { path: 'sms', element: <SmsLog /> },
          { path: 'webhooks', element: <WebhooksLog /> },
          { path: 'crm-actions', element: <CrmActionsLog /> },
          { path: 'scheduler', element: <SchedulerLog /> },
          { path: 'errors', element: <ErrorsLog /> },
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

