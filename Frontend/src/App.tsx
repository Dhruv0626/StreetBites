import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AlertProvider } from './context/AlertContext';
import { NotificationProvider } from './context/NotificationContext';

// Route Guards & Layouts
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute';
import { CustomerRouteGuard } from './components/auth/CustomerRouteGuard';
import CustomerLayout from './components/layout/CustomerLayout';
import AdminLayout from './components/layout/AdminLayout';
import VendorLayout from './components/layout/VendorLayout';
import RiderLayout from './components/layout/RiderLayout';
import {
  HomeSkeleton,
  StallDetailSkeleton,
  AllClustersSkeleton,
  AllStallsSkeleton,
  SearchSkeleton,
  CartSkeleton,
  OrdersSkeleton,
  ProfileSkeleton,
  AdminPageSkeleton,
  VendorPageSkeleton,
  RiderPageSkeleton,
  AuthPageSkeleton,
  RegistrationPageSkeleton,
} from './components/Skeleton';

// Public pages (Lazy loaded)
const SplashScreen = lazy(() => import('./pages/SplashScreen'));
const Home = lazy(() => import('./pages/customer/Home'));
const Profile = lazy(() => import('./pages/customer/Profile'));
const SignIn = lazy(() => import('./pages/auth/SignIn').then(m => ({ default: m.SignIn })));
const Signup = lazy(() => import('./pages/auth/Signup').then(m => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const StallsNearMe = lazy(() => import('./pages/customer/StallsNearMe'));
const Cart = lazy(() => import('./pages/customer/Cart'));
const Checkout = lazy(() => import('./pages/customer/Checkout'));
const Orders = lazy(() => import('./pages/customer/Orders'));
const Search = lazy(() => import('./pages/customer/Search'));
const StallDetail = lazy(() => import('./pages/customer/StallDetail'));
const Favorites = lazy(() => import('./pages/customer/Favorites'));
const CategoryDetail = lazy(() => import('./pages/customer/CategoryDetail'));
const AllClusters = lazy(() => import('./pages/customer/AllClusters'));
const AllStalls = lazy(() => import('./pages/customer/AllStalls'));
const Notifications = lazy(() => import('./pages/customer/Notifications'));

// Legal & Standards pages (Lazy loaded)
const TermsConditions = lazy(() => import('./pages/legal/TermsConditions'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const FoodHygieneStandards = lazy(() => import('./pages/legal/FoodHygieneStandards'));
const RefundCancellation = lazy(() => import('./pages/legal/RefundCancellation'));

// Admin pages (Lazy loaded)
const AdminRegister = lazy(() => import('./pages/admin/AdminRegister').then(m => ({ default: m.AdminRegister })));
const AdminSignIn = lazy(() => import('./pages/admin/AdminSignIn').then(m => ({ default: m.AdminSignIn })));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminVerification = lazy(() => import('./pages/admin/AdminVerification'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminTransactions = lazy(() => import('./pages/admin/AdminTransactions').then(m => ({ default: m.AdminTransactions })));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminClusters = lazy(() => import('./pages/admin/AdminClusters').then(m => ({ default: m.AdminClusters })));
const AdminComplaints = lazy(() => import('./pages/admin/AdminComplaints').then(m => ({ default: m.AdminComplaints })));
const AdminOffers = lazy(() => import('./pages/admin/AdminOffers').then(m => ({ default: m.AdminOffers })));

// Vendor pages (Lazy loaded)
const VendorRegistration = lazy(() => import('./pages/vendor/VendorRegistration').then(m => ({ default: m.VendorRegistration })));
const VendorOrders = lazy(() => import('./pages/vendor/VendorOrders'));
const VendorMenuPage = lazy(() => import('./pages/vendor/VendorMenu'));
const VendorAnalyticsPage = lazy(() => import('./pages/vendor/VendorAnalytics').then(m => ({ default: m.VendorAnalyticsPage })));
const VendorPayoutsPage = lazy(() => import('./pages/vendor/VendorPayouts').then(m => ({ default: m.VendorPayoutsPage })));
const VendorProfilePage = lazy(() => import('./pages/vendor/VendorProfile').then(m => ({ default: m.VendorProfilePage })));
const VendorSubmittedKycPage = lazy(() => import('./pages/vendor/VendorSubmittedKyc').then(m => ({ default: m.VendorSubmittedKycPage })));
const VendorSettingsPage = lazy(() => import('./pages/vendor/VendorSettings').then(m => ({ default: m.VendorSettingsPage })));
const VendorRulesPage = lazy(() => import('./pages/vendor/VendorRules').then(m => ({ default: m.VendorRulesPage })));

// Rider pages (Lazy loaded)
const RiderRegistration = lazy(() => import('./pages/rider/RiderRegistration').then(m => ({ default: m.RiderRegistration })));
const RiderRoute = lazy(() => import('./pages/rider/RiderRoute'));
const RiderQueuePage = lazy(() => import('./pages/rider/RiderQueue').then(m => ({ default: m.RiderQueuePage })));
const RiderEarningsPage = lazy(() => import('./pages/rider/RiderEarnings').then(m => ({ default: m.RiderEarningsPage })));
const RiderDebtPage = lazy(() => import('./pages/rider/RiderDebt').then(m => ({ default: m.RiderDebtPage })));
const RiderCompensationPage = lazy(() => import('./pages/rider/RiderCompensation').then(m => ({ default: m.RiderCompensationPage })));
const RiderProfilePage = lazy(() => import('./pages/rider/RiderProfile').then(m => ({ default: m.RiderProfilePage })));
const RiderHistoryPage = lazy(() => import('./pages/rider/RiderHistory').then(m => ({ default: m.RiderHistoryPage })));
const RiderRulesPage = lazy(() => import('./pages/rider/RiderRules').then(m => ({ default: m.RiderRulesPage })));

import './App.css';

// Helper component to wrap lazy elements in Suspense with page-specific skeleton fallback
const withSuspense = (Component: React.ComponentType<any>, props: any = {}, fallback: React.ReactNode = null) => (
  <Suspense fallback={fallback}>
    <Component {...props} />
  </Suspense>
);

const router = createBrowserRouter([
  // ── Public Auth (Redirects authenticated users to their respective home/dashboard) ──
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/', element: withSuspense(SplashScreen, {}, null) },
      { path: '/signin', element: withSuspense(SignIn, {}, <AuthPageSkeleton />) },
      { path: '/signup', element: withSuspense(Signup, {}, <AuthPageSkeleton />) },
      { path: '/forgot-password', element: withSuspense(ForgotPassword, {}, <AuthPageSkeleton />) },
      { path: '/reset-password', element: withSuspense(ResetPassword, {}, <AuthPageSkeleton />) },
      { path: '/admin/signin', element: withSuspense(AdminSignIn, {}, <AuthPageSkeleton />) },
      { path: '/admin/signup', element: withSuspense(AdminRegister, {}, <AuthPageSkeleton />) },
    ],
  },

  // ── Consumer / Customer Routes (Redirects Vendors, Riders, and Admins to their dashboard) ──
  {
    element: <CustomerRouteGuard />,
    children: [
      {
        path: '/',
        element: <CustomerLayout />,
        children: [
          // Public browsing for Customers & Guests
          { path: 'home', element: withSuspense(Home, {}, <HomeSkeleton />) },
          { path: 'stalls/:stallId?', element: withSuspense(StallsNearMe, {}, <StallDetailSkeleton />) },
          { path: 'stall/:stallId', element: withSuspense(StallDetail, {}, <StallDetailSkeleton />) },
          { path: 'search', element: withSuspense(Search, {}, <SearchSkeleton />) },
          { path: 'category/:categoryName', element: withSuspense(CategoryDetail, {}, <AllStallsSkeleton />) },
          { path: 'all-khaugallis', element: withSuspense(AllClusters, {}, <AllClustersSkeleton />) },
          { path: 'all-clusters', element: <Navigate to="/all-khaugallis" replace /> },
          { path: 'all-stalls', element: withSuspense(AllStalls, {}, <AllStallsSkeleton />) },
          { path: 'terms', element: withSuspense(TermsConditions) },
          { path: 'privacy', element: withSuspense(PrivacyPolicy) },
          { path: 'hygiene-standards', element: withSuspense(FoodHygieneStandards) },
          { path: 'refund-cancellation', element: withSuspense(RefundCancellation) },

          // Customer-only authenticated pages
          {
            element: <ProtectedRoute allowedRoles={['CUSTOMER']} unauthRedirect="/signin" />,
            children: [
              { path: 'profile', element: withSuspense(Profile, {}, <ProfileSkeleton />) },
              { path: 'cart', element: withSuspense(Cart, {}, <CartSkeleton />) },
              { path: 'checkout', element: withSuspense(Checkout, {}, <CartSkeleton />) },
              { path: 'orders', element: withSuspense(Orders, { activeOrder: null, onNavigate: () => { } }, <OrdersSkeleton />) },
              { path: 'favorites', element: withSuspense(Favorites, {}, <AllStallsSkeleton />) },
              { path: 'notifications', element: withSuspense(Notifications, {}, <OrdersSkeleton />) },
            ],
          },
        ],
      },
    ],
  },

  // ── Vendor Routes (Only VENDOR role allowed) ──
  {
    element: <ProtectedRoute allowedRoles={['VENDOR']} unauthRedirect="/signin" />,
    children: [
      { path: '/vendor/registration', element: withSuspense(VendorRegistration, {}, <RegistrationPageSkeleton />) },
      {
        path: '/vendor/Dashboard',
        element: <VendorLayout />,
        children: [
          { index: true, element: <Navigate to="orders" replace /> },
          { path: 'orders', element: withSuspense(VendorOrders, {}, <VendorPageSkeleton />) },
          { path: 'menu', element: withSuspense(VendorMenuPage, {}, <VendorPageSkeleton />) },
          { path: 'analytics', element: withSuspense(VendorAnalyticsPage, {}, <VendorPageSkeleton />) },
          { path: 'payouts', element: withSuspense(VendorPayoutsPage, {}, <VendorPageSkeleton />) },
          { path: 'profile', element: withSuspense(VendorProfilePage, {}, <ProfileSkeleton />) },
          { path: 'kyc', element: withSuspense(VendorSubmittedKycPage, {}, <ProfileSkeleton />) },
          { path: 'settings', element: withSuspense(VendorSettingsPage, {}, <ProfileSkeleton />) },
          { path: 'rules', element: withSuspense(VendorRulesPage, {}, <VendorPageSkeleton />) },
        ],
      },
    ],
  },

  // ── Rider Routes (Only RIDER role allowed) ──
  {
    element: <ProtectedRoute allowedRoles={['RIDER']} unauthRedirect="/signin" />,
    children: [
      { path: '/rider/registration', element: withSuspense(RiderRegistration, {}, <RegistrationPageSkeleton />) },
      {
        path: '/rider/Dashboard',
        element: <RiderLayout />,
        children: [
          { index: true, element: <Navigate to="route" replace /> },
          { path: 'route', element: withSuspense(RiderRoute, {}, <RiderPageSkeleton />) },
          { path: 'queue', element: withSuspense(RiderQueuePage, {}, <RiderPageSkeleton />) },
          { path: 'earnings', element: withSuspense(RiderEarningsPage, {}, <RiderPageSkeleton />) },
          { path: 'debt', element: withSuspense(RiderDebtPage, {}, <RiderPageSkeleton />) },
          { path: 'compensation', element: withSuspense(RiderCompensationPage, {}, <RiderPageSkeleton />) },
          { path: 'profile', element: withSuspense(RiderProfilePage, {}, <ProfileSkeleton />) },
          { path: 'history', element: withSuspense(RiderHistoryPage, {}, <OrdersSkeleton />) },
          { path: 'guidelines', element: withSuspense(RiderRulesPage, {}, <RiderPageSkeleton />) },
        ],
      },
    ],
  },

  // ── Admin Routes (Only ADMIN role allowed) ──
  {
    element: <ProtectedRoute allowedRoles={['ADMIN']} unauthRedirect="/admin/signin" />,
    children: [
      {
        path: '/admin/Dashboard',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: 'overview', element: withSuspense(AdminOverview, {}, <AdminPageSkeleton />) },
          { path: 'khau-gallis', element: withSuspense(AdminClusters, {}, <AdminPageSkeleton />) },
          { path: 'clusters', element: <Navigate to="/admin/Dashboard/khau-gallis" replace /> },
          { path: 'users', element: withSuspense(AdminUsers, {}, <AdminPageSkeleton />) },
          { path: 'verifications', element: withSuspense(AdminVerification, {}, <AdminPageSkeleton />) },
          { path: 'orders', element: withSuspense(AdminOrders, {}, <AdminPageSkeleton />) },
          { path: 'transactions', element: withSuspense(AdminTransactions, {}, <AdminPageSkeleton />) },
          { path: 'complaints', element: withSuspense(AdminComplaints, {}, <AdminPageSkeleton />) },
          { path: 'offers', element: withSuspense(AdminOffers, {}, <AdminPageSkeleton />) },
          { path: 'settings', element: withSuspense(AdminSettings, {}, <AdminPageSkeleton />) },
        ],
      },
    ],
  },

  // ── Catch-all ─────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/" replace /> },
]);

const App: React.FC = () => (
  <AuthProvider>
    <CartProvider>
      <AlertProvider>
        <NotificationProvider>
          <RouterProvider router={router} />
        </NotificationProvider>
      </AlertProvider>
    </CartProvider>
  </AuthProvider>
);

export default App;
