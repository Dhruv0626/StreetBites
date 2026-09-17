import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { PageTransitionLoader } from '../PageTransitionLoader';
import { getRoleHomePath, type UserRole } from './ProtectedRoute';

interface CustomerRouteGuardProps {
  children?: React.ReactNode;
}

/**
 * Route guard for customer-facing pages.
 * - Allows guests (unauthenticated) and Customers.
 * - Redirects Vendors, Riders, and Admins to their respective dashboards.
 */
export const CustomerRouteGuard: React.FC<CustomerRouteGuardProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageTransitionLoader />;
  }

  if (isAuthenticated && user) {
    const role = (user.role || 'CUSTOMER').toUpperCase() as UserRole;
    if (role !== 'CUSTOMER') {
      return <Navigate to={getRoleHomePath(user)} replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default CustomerRouteGuard;
