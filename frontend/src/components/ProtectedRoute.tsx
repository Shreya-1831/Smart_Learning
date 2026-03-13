import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('student' | 'parent' | 'teacher')[];
  requiresFirstLogin?: boolean;
}

const ProtectedRoute = ({ children, allowedRoles, requiresFirstLogin }: ProtectedRouteProps) => {
  const { currentUser, userData } = useAuth();

  if (!currentUser || !userData) {
    return <Navigate to="/login" replace />;
  }

  if (requiresFirstLogin && !userData.firstLogin) {
    return <Navigate to="/student-dashboard" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    if (userData.role === 'student' && userData.firstLogin) {
      return <Navigate to="/mental-age-test" replace />;
    } else if (userData.role === 'student') {
      return <Navigate to="/student-dashboard" replace />;
    } else if (userData.role === 'parent') {
      return <Navigate to="/parent-dashboard" replace />;
    } else {
      return <Navigate to="/teacher-dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
