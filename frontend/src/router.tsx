import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import MeetingsPage from './components/MeetingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { isAuthenticated } from './services/authService';
import UserLogsLayout from './pages/User/Logs/UserLogsLayout';
import UserCallsLog from './pages/User/Logs/UserCallsLog';
import UserCallAnalytics from './pages/User/Logs/UserCallAnalytics';

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
    path: '/calls',
    element: (
      <ProtectedRoute>
        <UserLogsLayout />
      </ProtectedRoute>
    ),
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
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
], {
  basename: import.meta.env.PROD ? '/app' : '/'
});

export default router;

