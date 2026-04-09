import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user?.onboardingCompleted) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <>{children}</>;
};

export default OnboardingGuard;
