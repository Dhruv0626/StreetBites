import React from 'react';
import { Outlet, useLocation, useNavigate, ScrollRestoration } from 'react-router';
import CustomerHeader from './CustomerHeader';
import { BottomNav } from '../BottomNav';
import { PageTransitionLoader } from '../PageTransitionLoader';
import CustomerFooter from './CustomerFooter';
import { useCart } from '../../context/CartContext';
import { RequirePhoneModal } from '../auth/RequirePhoneModal';

export const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const currentPath = location.pathname.split('/').pop() || 'home';

  // BottomNav uses activeTab string mapping from the old structure.
  // We'll map the route pathname to the closest activeTab equivalent for BottomNav.
  const getActiveTab = () => {
    if (currentPath.includes('search')) return 'search';
    if (currentPath.includes('cart') || currentPath.includes('checkout')) return 'cart';
    if (currentPath.includes('orders')) return 'orders';
    if (currentPath.includes('profile')) return 'profile';
    return 'discover'; // default for home
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'discover') navigate('/home');
    else if (tab === 'search') navigate('/search');
    else if (tab === 'cart') navigate('/cart');
    else if (tab === 'orders') navigate('/orders');
    else if (tab === 'profile') navigate('/profile');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1C1917] font-sans antialiased">
      <ScrollRestoration />
      <PageTransitionLoader />
      {/* Global Strict Mobile Number Enforcement Modal for OAuth/New Users */}
      <RequirePhoneModal />

      {/* Persistent Global Top Navigation */}
      <CustomerHeader />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* Child routes injected here */}
        <Outlet />
      </main>

      {/* Conditional Footer for Desktop and specific Mobile views */}
      {!['cart', 'checkout', 'orders'].some(path => location.pathname.includes(path)) && (
        <CustomerFooter />
      )}

      {/* Global Live Order Tracker Floating Button */}
      {/* {!location.pathname.includes('/orders') && (
        <button
          onClick={() => navigate('/orders')}
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 bg-[#D94A38] hover:bg-[#C43D2E] text-white px-6 py-3.5 rounded-full shadow-[0_8px_25px_rgba(217,74,56,0.35)] flex items-center gap-3.5 z-40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(217,74,56,0.5)] active:scale-95 cursor-pointer border border-[#E85D4B]/50 group"
        >
          <div className="relative flex items-center justify-center w-4 h-4">
            <span className="absolute inset-0 bg-white rounded-full animate-ping opacity-40"></span>
            <span className="relative w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)]"></span>
          </div>
          <span className="font-bold text-sm tracking-wide">Track Live Order</span>
        </button>
      )} */}
      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNav
        activeTab={getActiveTab()}
        setActiveTab={handleTabChange}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        liveOrdersCount={0}
      />
    </div>
  );
};

export default CustomerLayout;
