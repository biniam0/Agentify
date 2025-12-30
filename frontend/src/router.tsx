import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import MeetingsPage from './components/MeetingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { isAuthenticated } from './services/authService';

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
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;

