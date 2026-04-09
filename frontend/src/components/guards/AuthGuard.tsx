import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AuthLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2.5">
        <span className="text-3xl font-extrabold tracking-tight text-heading dark:text-foreground select-none">
          Agent
        </span>
        <svg className="h-7 w-auto" viewBox="0 0 42 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M42 28H28V14L42 28Z" fill="#53A17D" />
          <path d="M28 14V0L42 2.00272e-06L28 14Z" fill="#2D6A4F" />
          <path d="M14 28V14H28L14 28Z" fill="#2D6A4F" />
          <path d="M28 14H14V0L28 14Z" fill="#53A17D" />
          <path d="M14 28H0L14 14V28Z" fill="#53A17D" />
          <path d="M14 14L0 0H14V14Z" fill="#53A17D" />
        </svg>
      </div>
      <div className="h-1 w-48 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800">
        <div className="h-full rounded-full bg-[#53A17D] animate-[loading_1.2s_ease-in-out_infinite]" />
      </div>
      <style>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  </div>
);

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;

  if (!isAuthenticated) {
    return <Navigate to="/app/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
export { AuthLoading };
