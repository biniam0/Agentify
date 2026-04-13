import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLoading } from './AuthGuard';

interface GuestGuardProps {
  children: React.ReactNode;
}

const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <AuthLoading />;

  if (isAuthenticated) {
    if (user?.onboardingCompleted) {
      return <Navigate to="/app/v2" replace />;
    }
    return <Navigate to="/app/onboarding" replace />;
  }

  return <>{children}</>;
};

export default GuestGuard;
