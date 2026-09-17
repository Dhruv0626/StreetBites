import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { PageTransitionLoader } from '../PageTransitionLoader';
import { getRoleHomePath } from './ProtectedRoute';

interface PublicOnlyRouteProps {
  children?: React.ReactNode;
}

/**
 * Route wrapper for pages that should only be accessible to unauthenticated guests (e.g., SignIn, SignUp, Splash).
 * If the user is already authenticated, redirects them immediately to their designated home/dashboard.
 */
export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageTransitionLoader />;
  }

  if (isAuthenticated && user) {
    const isAddingPhone =
      window.location.pathname === '/signup' &&
      (window.location.search.includes('phone') || !user.phone_number);

    if (!isAddingPhone) {
      return <Navigate to={getRoleHomePath(user)} replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default PublicOnlyRoute;
