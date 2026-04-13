import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface NotOnboardedGuardProps {
  children: React.ReactNode;
}

const NotOnboardedGuard: React.FC<NotOnboardedGuardProps> = ({ children }) => {
  const { user } = useAuth();

  if (user?.onboardingCompleted) {
    return <Navigate to="/app/v2" replace />;
  }

  return <>{children}</>;
};

export default NotOnboardedGuard;
