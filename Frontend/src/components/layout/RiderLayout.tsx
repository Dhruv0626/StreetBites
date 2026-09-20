import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router';
import { Compass, FileText, Wallet, HelpCircle, User, CreditCard, AlertCircle, FileWarning, ShieldAlert, Lock, LogOut } from 'lucide-react';
import logoImg from '../../assets/Logo/Logo.png';
// @ts-ignore
import { Joyride as OriginalJoyride, STATUS } from 'react-joyride';
const Joyride = OriginalJoyride as any;
import { PageTransitionLoader } from '../PageTransitionLoader';
import { useAuth } from '../../context/AuthContext';
import { useLocationPermission } from '../../hooks/useLocationPermission';
import { MapPin, Navigation } from 'lucide-react';

export const RiderLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { isGranted, requestLocation, isLocating } = useLocationPermission();
  const [showLocationAlert, setShowLocationAlert] = useState(false);

  // If rider has not added registration data yet, navigate to registration form
  if (user && !user.verification_status) {
    return <Navigate to="/rider/registration" replace />;
  }

  // If verification_status is not yet VERIFIED (e.g. PENDING or empty), online button is disabled
  const isVerified = user?.verification_status === 'VERIFIED';

  const [isOnline, setIsOnline] = useState(false);

  const handleToggleOnline = async () => {
    if (!isOnline) {
      if (!isGranted) {
        const coords = await requestLocation();
        if (!coords) {
          setShowLocationAlert(true);
          return;
        }
      }
      setShowLocationAlert(false);
      setIsOnline(true);
    } else {
      setIsOnline(false);
    }
  };
  const [runTour, setRunTour] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const navToday = [
    { label: 'Active route', icon: Compass, path: '/rider/Dashboard/route', badge: '0' },
    { label: 'Queue', icon: FileText, path: '/rider/Dashboard/queue', badge: '0' },
    { label: 'Earnings', icon: Wallet, path: '/rider/Dashboard/earnings' },
  ];

  const navLedger = [
    { label: 'COD debt', icon: CreditCard, path: '/rider/Dashboard/debt', badge: '₹0' },
    { label: 'Compensation', icon: AlertCircle, path: '/rider/Dashboard/compensation' },
    { label: 'Rules', icon: FileWarning, path: '/rider/Dashboard/guidelines' },
    { label: 'Profile', icon: User, path: '/rider/Dashboard/profile' },
  ];

  const getTourSteps = () => {
    const path = location.pathname.toLowerCase();

    if (path.includes('/queue')) {
      return [
        {
          target: '.tour-order-cards',
          content: 'Here you can see nearby orders. The red timer shows how long you have left to accept!',
          disableBeacon: true,
        },
        {
          target: '.tour-accept-btn',
          content: 'Click Accept to grab the order, or Pass to let another rider take it.',
        }
      ];
    }

    if (path.includes('/earnings')) {
      return [
        {
          target: '.tour-filter',
          content: 'Filter your earnings by Today, This Week, or This Month.',
          disableBeacon: true,
        },
        {
          target: '.tour-rules-btn',
          content: 'Please read the rules and regulation and must follow strictly.',
        }
      ];
    }

    if (path.includes('/route')) {
      return [
        {
          target: '.tour-go-online',
          content: 'Toggle your status here to start receiving new delivery requests!',
          disableBeacon: true,
        },
        {
          target: '.tour-checkpoints',
          content: 'Follow these checkpoints to complete your delivery. Mark them as you go!',
          disableBeacon: true,
        },
        {
          target: '.tour-payout-math',
          content: 'This shows how your trip payout is calculated based on distance and stalls.',
          disableBeacon: true,
        }
      ];
    }

    if (path.includes('/debt')) {
      return [
        {
          target: '.tour-debt-btn',
          content: 'Click here to settle your outstanding COD debt instantly via UPI.',
          disableBeacon: true,
        }
      ];
    }

    if (path.includes('/compensation')) {
      return [
        {
          target: '.tour-claim-btn',
          content: 'Click here to file a new claim for extra wait time or customer cancellations.',
          disableBeacon: true,
        }
      ];
    }// Default Steps
    return [
      {
        target: '.tour-go-online',
        content: 'Toggle your status here to start receiving new delivery requests!',
        disableBeacon: true,
      },
      {
        target: isMobile ? 'nav .tour-nav-queue' : 'aside .tour-nav-queue',
        content: 'Check your queue to accept new orders in your area.',
      },
      {
        target: isMobile ? 'nav .tour-nav-active' : 'aside .tour-nav-active',
        content: 'View your active route and delivery checkpoints here.',
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
    <div className="w-full min-h-screen bg-[#F4F1EA] text-[#1C1917] flex flex-col md:flex-row font-sans selection:bg-[#1C1917]/20 relative">
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
          primaryColor: '#D94A38',
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
      <aside className="w-64 bg-white border-r border-[#EFEBE4] shrink-0 p-5 hidden md:flex flex-col justify-between sticky top-0 h-screen">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => navigate('/rider/Dashboard/route')}>
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
              <img src={logoImg} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-800 leading-none">        Street<span className="text-[#D94A38]">Bites</span>
      </h2>
              <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest block mt-0.5">Rider Console</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Today */}
            <div>
              <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest block mb-3 px-2.5">Today</span>
              <nav className="space-y-1">
                {navToday.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `tour-nav-${item.label.toLowerCase().split(' ')[0]} flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl cursor-pointer transition-colors ${isActive ? 'bg-[#FCE8E6] text-[#D94A38]' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'}`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="bg-stone-100 text-stone-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Ledger */}
            <div>
              <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest block mb-3 px-2.5">Ledger</span>
              <nav className="space-y-1">
                {navLedger.map(item => (
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
                      <span className="text-[10px] font-bold font-mono">{item.badge}</span>
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
              <div className="w-8 h-8 rounded-full bg-[#D94A38]/10 border border-[#D94A38]/20 flex items-center justify-center text-[10px] font-bold text-[#D94A38] shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-[11px] font-bold text-stone-800 leading-none truncate">{user?.name || 'StreetBites Rider'}</h4>
                <span className="text-[9px] text-stone-500 block truncate mt-0.5">{user?.phone_number || (isOnline ? 'Online' : 'Offline')}</span>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0">
        {/* Header */}
        <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-[#F4F1EA]/80 backdrop-blur-md z-10 shrink-0 border-b border-[#EFEBE4] md:border-b-0">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
            <span>Rider</span><span>›</span>
            <span className="text-stone-900 font-bold">Console</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setRunTour(true); setTourKey(prev => prev + 1); }}
              className="cursor-pointer text-stone-500 hover:text-stone-800 transition-colors bg-white border border-stone-200 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
              title="Help & Tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            {isVerified ? (
              <div
                onClick={handleToggleOnline}
                className={`tour-go-online flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${isOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-stone-300 text-stone-500 hover:bg-stone-50'}`}
              >
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-stone-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider select-none">{isOnline ? 'Online · accepting' : 'Offline'}</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-bold uppercase tracking-wider cursor-not-allowed opacity-80"
                title="Account awaiting Admin approval. You will be able to go online once approved."
              >
                <Lock className="w-3 h-3 text-amber-600" />
                <span>Pending Approval</span>
              </div>
            )}
          </div>
        </header>

        {/* Location Required Alert Banner for Rider */}
        {showLocationAlert && !isGranted && (
          <div className="mx-4 md:mx-6 mt-3 p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-[#D94A38] shrink-0" />
              <div>
                <span className="font-bold block">Allow Location Permission</span>
                <span className="text-[11px] text-red-700">
                  Location access is strictly required to go online, receive order dispatch, and navigate delivery routes.
                </span>
              </div>
            </div>
            <button
              onClick={async () => {
                const res = await requestLocation();
                if (res) {
                  setShowLocationAlert(false);
                  setIsOnline(true);
                }
              }}
              disabled={isLocating}
              className="bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl cursor-pointer border-0 shrink-0 shadow-3xs disabled:opacity-60"
            >
              {isLocating ? 'Detecting...' : 'Enable GPS'}
            </button>
          </div>
        )}

        {/* Pending Verification Notice Banner */}
        {!isVerified && (
          <div className="mx-4 md:mx-6 mt-3 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center gap-3 text-xs shadow-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold block">Awaiting Admin Verification</span>
              <span className="text-[11px] text-amber-700">
                Your rider documents and vehicle details are submitted and undergoing admin verification. You can review guidelines and route maps; accepting deliveries will be enabled once approved.
              </span>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#EFEBE4] flex items-center justify-around px-2 py-3 pb-6 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] overflow-x-auto">
        {[
          { path: '/rider/Dashboard/route', icon: Compass, label: 'Route' },
          { path: '/rider/Dashboard/queue', icon: FileText, label: 'Queue' },
          { path: '/rider/Dashboard/earnings', icon: Wallet, label: 'Earnings' },
          { path: '/rider/Dashboard/debt', icon: CreditCard, label: 'Debt' },
          { path: '/rider/Dashboard/compensation', icon: AlertCircle, label: 'Claims' },
          { path: '/rider/Dashboard/profile', icon: User, label: 'Profile' },
        ].map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `tour-nav-${item.label.toLowerCase().split(' ')[0]} flex flex-col items-center justify-center w-14 gap-1.5 transition-colors shrink-0 ${isActive ? 'text-[#D94A38]' : 'text-stone-400 hover:text-stone-600'}`
            }
          >
            <item.icon className={`w-5 h-5 ${window.location.pathname.includes(item.path) ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
            <span className="text-[8px] font-bold uppercase tracking-wider truncate w-full text-center">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default RiderLayout;
