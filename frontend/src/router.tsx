import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import MeetingsPage from './components/MeetingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { isAuthenticated } from './services/authService';
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

const router = createBrowserRouter([
  {
    path: '/',
    element: isAuthenticated() ? <Navigate to="/meetings" replace /> : <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  // All user routes share the same layout (header persists across navigation)
  {
    element: (
      <ProtectedRoute>
        <UserLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/meetings',
        element: <MeetingsPage />,
      },
      {
        path: '/logs',
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
        path: '/calls',
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
  // Admin Routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/meetings" replace />,
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
], {
  basename: '/app'
});

export default router;

