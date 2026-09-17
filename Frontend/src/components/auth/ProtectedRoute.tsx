import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { PageTransitionLoader } from '../PageTransitionLoader';

export type UserRole = 'CUSTOMER' | 'VENDOR' | 'RIDER' | 'ADMIN';

/**
 * Returns the default home/dashboard path based on the user's role and onboarding status.
 */
export const getRoleHomePath = (userOrRole?: any): string => {
  if (!userOrRole) return '/home';
  const role = (typeof userOrRole === 'string' ? userOrRole : userOrRole.role || 'CUSTOMER').toUpperCase();
  const verificationStatus = typeof userOrRole === 'object' ? userOrRole.verification_status : undefined;

  switch (role) {
    case 'VENDOR':
      // If vendor has not added registration data yet (verification_status is not set)
      if (!verificationStatus) {
        return '/vendor/registration';
      }
      return '/vendor/Dashboard';
    case 'RIDER':
      // If rider has not added registration data yet (verification_status is not set)
      if (!verificationStatus) {
        return '/rider/registration';
      }
      return '/rider/Dashboard';
    case 'ADMIN':
      return '/admin/Dashboard';
    case 'CUSTOMER':
    default:
      return '/home';
  }
};

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  unauthRedirect?: string;
  children?: React.ReactNode;
}

/**
 * Route guard for authenticated and role-restricted pages.
 * - If session is still loading, renders a smooth loader.
 * - If not logged in, redirects to login page.
 * - If logged in but role is not permitted, redirects to user's own home/dashboard.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  unauthRedirect = '/signin',
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageTransitionLoader />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={unauthRedirect} replace />;
  }

  const userRole = (user.role || 'CUSTOMER').toUpperCase() as UserRole;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={getRoleHomePath(user)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
