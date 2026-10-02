import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, ScrollRestoration } from 'react-router';
import CustomerHeader from './CustomerHeader';
import { BottomNav } from '../BottomNav';
import { PageTransitionLoader } from '../PageTransitionLoader';
import CustomerFooter from './CustomerFooter';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { RequirePhoneModal } from '../auth/RequirePhoneModal';
import { CustomerLocationBanner } from '../common/CustomerLocationBanner';
import { razorpayService } from '../../services/razorpayService';
import { Bike, ChefHat, Sparkles } from 'lucide-react';

export const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const { isAuthenticated } = useAuth();
  const [activeLiveOrder, setActiveLiveOrder] = useState<any | null>(null);
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

  // Poll for active live orders to display global tracking button across the app
  useEffect(() => {
    let isMounted = true;

    const checkActiveOrders = async () => {
      if (!isAuthenticated) {
        if (isMounted) setActiveLiveOrder(null);
        return;
      }
      try {
        const res = await razorpayService.getCustomerOrders();
        if (isMounted && res.success && Array.isArray(res.data)) {
          const live = res.data.find(
            (o: any) => o.status && o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
          );
          setActiveLiveOrder(live || null);
        }
      } catch (e) {
        // quiet fallback
      }
    };

    checkActiveOrders();
    const interval = setInterval(checkActiveOrders, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, location.pathname]);

  const isOutForDelivery = activeLiveOrder?.status === 'OUT_FOR_DELIVERY' || activeLiveOrder?.status === 'Out for Delivery';

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1C1917] font-sans antialiased">
      <ScrollRestoration />
      <PageTransitionLoader />
      {/* Global Strict Mobile Number Enforcement Modal for OAuth/New Users */}
      <RequirePhoneModal />

      {/* Persistent Global Top Navigation */}
      <CustomerHeader />

      {/* Soft Location Permission Prompt */}
      <CustomerLocationBanner />

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
      {activeLiveOrder && !location.pathname.includes('/orders') && (
        <button
          onClick={() => navigate('/orders')}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 bg-gradient-to-r from-[#D94A38] to-[#B33525] hover:from-[#C43D2E] hover:to-[#99281A] text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-[0_10px_30px_rgba(217,74,56,0.4)] flex items-center gap-3 z-40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(217,74,56,0.55)] active:scale-95 cursor-pointer border border-white/20 group animate-fadeIn"
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner">
            {isOutForDelivery ? (
              <Bike className="w-4 h-4 animate-bounce" />
            ) : (
              <ChefHat className="w-4 h-4 animate-pulse" />
            )}
          </div>
          <div className="text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Live Order
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
            </div>
            <span className="font-extrabold text-xs sm:text-sm tracking-tight block">
              {isOutForDelivery ? 'Rider on the Way' : 'Cooking in Progress'} &rarr;
            </span>
          </div>
        </button>
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNav
        activeTab={getActiveTab()}
        setActiveTab={handleTabChange}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        liveOrdersCount={activeLiveOrder ? 1 : 0}
      />
    </div>
  );
};

export default CustomerLayout;
