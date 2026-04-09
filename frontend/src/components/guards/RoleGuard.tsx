import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface RoleGuardProps {
  roles: string[];
  fallback?: string;
  children: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ roles, fallback = '/app/v2', children }) => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
