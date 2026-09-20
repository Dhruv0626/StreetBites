import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router';
import { Store, Menu as MenuIcon, TrendingUp, Wallet, Settings, Search, BookOpen, HelpCircle, User, ShieldAlert, Lock, LogOut } from 'lucide-react';
// @ts-ignore
import { Joyride as OriginalJoyride, STATUS } from 'react-joyride';
const Joyride = OriginalJoyride as any;
import { PageTransitionLoader } from '../PageTransitionLoader';
import { useAuth } from '../../context/AuthContext';
import { onboardingService } from '../../services/onboardingService';
import logoImg from '../../assets/Logo/Logo.png';

export const VendorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLive, setIsLive] = useState(false);
  const [isTogglingLive, setIsTogglingLive] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [tourKey, setTourKey] = useState(0);

  // If verification_status is not yet VERIFIED (e.g. PENDING or empty), online button is disabled
  const isVerified = user?.verification_status === 'VERIFIED';

  // Load real stall online/offline state from database on mount
  React.useEffect(() => {
    let isMounted = true;
    const loadStallStatus = async () => {
      try {
        const res = await onboardingService.getVendorDetails({ userId: user?.id, email: user?.email });
        if (isMounted && res.success && res.data?.stall) {
          const stall = res.data.stall;
          const isOnline = stall.status !== 'CLOSED' && Boolean(stall.is_accepting_orders);
          setIsLive(isOnline);
        }
      } catch (err) {
        console.error('Failed to load vendor stall status:', err);
      }
    };

    if (user) {
      loadStallStatus();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleToggleOnline = async () => {
    if (isTogglingLive) return;
    const nextState = !isLive;
    setIsTogglingLive(true);
    // Optimistic UI update
    setIsLive(nextState);

    try {
      const res = await onboardingService.toggleVendorOnlineStatus(nextState, user?.id);
      if (res.success && res.data) {
        setIsLive(Boolean(res.data.is_accepting_orders));
      }
    } catch (err) {
      console.error('Failed to toggle vendor online status:', err);
      setIsLive(!nextState); // Revert on failure
    } finally {
      setIsTogglingLive(false);
    }
  };

  // If vendor has not added registration data yet, navigate to registration form
  if (user && !user.verification_status) {
    return <Navigate to="/vendor/registration" replace />;
  }

  const navItems = [
    { label: 'Live orders', icon: Store, path: '/vendor/Dashboard/orders', badge: '0', tourClass: 'tour-nav-orders' },
    { label: 'Menu', icon: MenuIcon, path: '/vendor/Dashboard/menu', tourClass: 'tour-nav-menu' },
    { label: 'Analytics', icon: TrendingUp, path: '/vendor/Dashboard/analytics', tourClass: 'tour-nav-analytics' },
  ];

  const businessItems = [
    { label: 'Payouts', icon: Wallet, path: '/vendor/Dashboard/payouts', badge: '₹0' },
    { label: 'Stall profile', icon: Store, path: '/vendor/Dashboard/profile' },
    { label: 'Settings', icon: Settings, path: '/vendor/Dashboard/settings' },
    { label: 'Rules & Regs', icon: BookOpen, path: '/vendor/Dashboard/rules' },
  ];

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const getTourSteps = () => {
    const path = location.pathname.toLowerCase();

    if (path.includes('/menu')) {
      const steps = [
        {
          target: '.tour-add-food',
          content: 'Add new food categories or main items to your menu here.',
          disableBeacon: true,
        },
        {
          target: '.tour-add-variety',
          content: 'Add specific varieties and set their prices here.',
        },
        {
          target: '.tour-item-availability',
          content: 'This is the Menu items You provide , Only enable that item which are available, otherwise unable that food item',
        }
      ];

      if (isMobile) {
        steps.push({
          target: '.tour-rules-mobile',
          content: 'please read the rules and regulation and must follow strictly',
        });
      }

      return steps;
    }

    if (path.includes('/analytics')) {
      return [
        {
          target: '.tour-time-filter',
          content: 'Change the time period to see your historical data.',
          disableBeacon: true,
        },
        {
          target: '.tour-kpi-grid',
          content: 'Keep track of your total revenue, orders, and overall performance at a glance.',
        }
      ];
    }

    if (path.includes('/payouts')) {
      return [
        {
          target: '.tour-withdraw-button',
          content: 'Withdraw your available balance directly to your bank account.',
          disableBeacon: true,
        }
      ];
    }

    return [
      {
        target: '.tour-go-online',
        content: 'Toggle this button to open or close your stall. When you are online, customers can see you and place orders!',
        disableBeacon: true,
      },
      {
        target: '.tour-new-order-card',
        content: 'This is a live order! Click on the order card to expand it, view the items, and accept or reject the order.',
      },
      {
        target: isMobile ? 'nav .tour-nav-menu' : 'aside .tour-nav-menu',
        content: 'Manage your food items and varieties. If something is out of stock, just flip the switch here!',
      },
      {
        target: isMobile ? 'nav .tour-nav-analytics' : 'aside .tour-nav-analytics',
        content: 'Track your total revenue, most popular items, and overall performance over time.',
      }
    ];
  };

  const tourSteps = getTourSteps();

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F1EA] text-[#1C1917] flex flex-col md:flex-row font-sans selection:bg-[#D94A38]/20 relative">
      <PageTransitionLoader />
      <Joyride
        key={tourKey}
        steps={tourSteps}
        run={runTour}
        continuous
        showSkipButton
        showProgress
        callback={handleJoyrideCallback}
        options={{
          primaryColor: '#E54B3C',
          textColor: '#1C1917',
          zIndex: 10000,
        }}
        styles={{
          tooltip: {
            borderRadius: '16px',
            padding: '20px',
          },
          buttonPrimary: {
            borderRadius: '8px',
            fontWeight: 'bold',
          },
          buttonBack: {
            marginRight: 10,
          }
        }}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#EFEBE4] h-screen sticky top-0 px-4 py-5 justify-between select-none z-20 shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-8 cursor-pointer" onClick={() => navigate('/vendor/Dashboard/orders')}>
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
              <img src={logoImg} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-800 leading-none tracking-tight">        Street<span className="text-[#D94A38]">Bites</span>
              </h2>
              <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest block mt-0.5">Vendor Console</span>
            </div>
          </div>

          {/* Nav */}
          <div className="space-y-5">
            <div>
              <nav className="space-y-1">
                {navItems.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl cursor-pointer transition-colors ${item.tourClass} ${isActive ? 'bg-[#FCE8E6] text-[#D94A38]' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'}`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="bg-white text-[#D94A38] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{item.badge}</span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div>
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest block mb-2 px-2.5">Business</span>
              <nav className="space-y-1">
                {businessItems.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl cursor-pointer transition-colors ${isActive ? 'bg-[#FCE8E6] text-[#D94A38]' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'}`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold">{item.badge}</span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Profile Footer */}
        <div className="pt-4 border-t border-[#EFEBE4]">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#E54B3C]/10 border border-[#E54B3C]/20 flex items-center justify-center text-[10px] font-bold text-[#E54B3C] shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'V'}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-[11px] font-bold text-stone-800 leading-none truncate">{user?.name || 'Vendor Stall'}</h4>
                <span className="text-[9px] text-stone-500 block truncate mt-0.5">{user?.phone_number || user?.email || 'Vendor'}</span>
              </div>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate('/signin');
              }}
              title="Log Out"
              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto pb-20 md:pb-0">

        {/* Header */}
        <header className="px-6 py-4 flex justify-between items-center gap-4 sticky top-0 bg-[#F4F1EA]/80 backdrop-blur-md z-10 shrink-0 border-b border-[#E7E2D9] md:border-none">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium whitespace-nowrap">
            <span className="hidden sm:inline">Vendor</span><span className="hidden sm:inline">›</span>
            <span className="text-stone-900 font-bold text-sm sm:text-xs">Stall Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setTourKey(prev => prev + 1);
                setRunTour(true);
              }}
              className="p-2 bg-white border border-[#E7E2D9] rounded-full text-stone-500 hover:text-stone-900 shadow-sm transition-colors"
              title="Help / Tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>


            {isVerified ? (
              <button
                onClick={handleToggleOnline}
                disabled={isTogglingLive}
                className={`tour-go-online flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${isLive
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-[#1C1917] border-[#1C1917] text-white hover:bg-black'
                  } ${isTogglingLive ? 'opacity-70 cursor-wait' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                {isLive ? 'You are Online' : 'Go Online'}
              </button>
            ) : (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold cursor-not-allowed opacity-80"
                title="Account awaiting Admin approval. You will be able to go online once approved."
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Pending Approval</span>
              </div>
            )}
          </div>
        </header>

        {/* Pending Verification Notice Banner */}
        {!isVerified && (
          <div className="mx-4 md:mx-6 mt-3 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center gap-3 text-xs shadow-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold block">Awaiting Admin Verification</span>
              <span className="text-[11px] text-amber-700">
                Your vendor stall details are submitted and undergoing admin verification. You can configure your menu and settings; your stall can go online once approved.
              </span>
            </div>
          </div>
        )}

        {/* Page Content via Outlet */}
        <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
          <Outlet context={{ setRunTour }} />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#EFEBE4] flex items-center justify-around px-2 py-3 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] overflow-x-auto">
        {[
          { path: '/vendor/Dashboard/orders', icon: Store, label: 'Orders', tourClass: 'tour-nav-orders' },
          { path: '/vendor/Dashboard/menu', icon: MenuIcon, label: 'Menu', tourClass: 'tour-nav-menu' },
          { path: '/vendor/Dashboard/analytics', icon: TrendingUp, label: 'Analytics', tourClass: 'tour-nav-analytics' },
          { path: '/vendor/Dashboard/payouts', icon: Wallet, label: 'Payouts' },
          { path: '/vendor/Dashboard/profile', icon: User, label: 'Profile' },
          { path: '/vendor/Dashboard/settings', icon: Settings, label: 'Settings' },
        ].map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 gap-1.5 transition-colors shrink-0 ${item.tourClass || ''} ${isActive ? 'text-[#E54B3C]' : 'text-stone-400 hover:text-stone-600'}`
            }
          >
            <item.icon className={`w-5 h-5 ${item.path === window.location.pathname ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
            <span className="text-[8px] font-bold uppercase tracking-wider truncate w-full text-center">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default VendorLayout;
