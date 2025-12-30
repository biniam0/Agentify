import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import MeetingsPage from './components/MeetingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { isAuthenticated } from './services/authService';
import UserLogsLayout from './pages/User/UserLogsLayout';
import UserLogsOverview from './pages/User/Logs/Overview';
import UserCallsLog from './pages/User/Logs/UserCallsLog';
import UserActivityLog from './pages/User/Logs/UserActivityLog';
import UserCrmActionsLog from './pages/User/Logs/UserCrmActionsLog';

const router = createBrowserRouter([
  {
    path: '/',
    element: isAuthenticated() ? <Navigate to="/meetings" replace /> : <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/meetings',
    element: (
      <ProtectedRoute>
        <MeetingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my-logs',
    element: (
      <ProtectedRoute>
        <UserLogsLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/my-logs/overview" replace />,
      },
      {
        path: 'overview',
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
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;

