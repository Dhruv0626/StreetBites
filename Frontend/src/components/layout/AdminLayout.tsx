import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { PieChart, Users, ShieldCheck, Map, IndianRupee, Settings, MapPin, MessageSquare, HelpCircle, Activity } from 'lucide-react';
import logoImg from '../../assets/Logo/Logo.png';
// @ts-ignore
import { Joyride as OriginalJoyride, STATUS } from 'react-joyride';
const Joyride = OriginalJoyride as any;
import { PageTransitionLoader } from '../PageTransitionLoader';
import { adminService } from '../../services/adminService';

export const AdminLayout: React.FC = () => {
  const [runTour, setRunTour] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const [counts, setCounts] = useState<{ approvals: number; orders: number; complaints: number }>({
    approvals: 0,
    orders: 0,
    complaints: 0,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const fetchCounts = async () => {
    try {
      const res = await adminService.getAdminCounts();
      if (res.success && res.data) {
        setCounts({
          approvals: res.data.approvals || 0,
          orders: res.data.orders || 0,
          complaints: res.data.complaints || 0,
        });
      }
    } catch (e) {
      console.warn('Could not fetch admin counts:', e);
    }
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const navItems = [
    { label: 'Overview', icon: PieChart, path: '/admin/Dashboard/overview' },
    { label: 'Khau Gallis', icon: MapPin, path: '/admin/Dashboard/khau-gallis' },
    { label: 'Users', icon: Users, path: '/admin/Dashboard/users' },
    {
      label: 'Approvals',
      icon: ShieldCheck,
      path: '/admin/Dashboard/verifications',
      badge: counts.approvals > 0 ? String(counts.approvals) : undefined,
    },
    {
      label: 'Orders',
      icon: Map,
      path: '/admin/Dashboard/orders',
      badge: counts.orders > 0 ? String(counts.orders) : undefined,
    },
    { label: 'Transactions', icon: IndianRupee, path: '/admin/Dashboard/transactions' },
    {
      label: 'Complaints',
      icon: MessageSquare,
      path: '/admin/Dashboard/complaints',
      badge: counts.complaints > 0 ? String(counts.complaints) : undefined,
    },
    { label: 'Offers', icon: Activity, path: '/admin/Dashboard/offers' },
    { label: 'Settings', icon: Settings, path: '/admin/Dashboard/settings' },
  ];

  const getTourSteps = () => {
    const path = location.pathname.toLowerCase();

    if (path.includes('/users')) {
      return [
        {
          target: '.tour-user-tabs',
          content: 'Switch between Customers, Vendors, and Riders here.',
          disableBeacon: true,
        },
        {
          target: '.tour-user-actions',
          content: 'Use these actions to suspend accounts or reset passwords.',
          disableBeacon: true,
        }
      ];
    }

    if (path.includes('/verifications')) {
      return [
        {
          target: '.tour-approval-queue',
          content: 'Review pending vendor and rider applications here.',
          disableBeacon: true,
        }
      ];
    }

    if (path.includes('/orders')) {
      return [
        {
          target: '.tour-live-map',
          content: 'Track all active deliveries in real-time across the platform.',
          disableBeacon: true,
        }
      ];
    }

    // Default Steps
    return [
      {
        target: '.tour-system-status',
        content: 'Monitor the platform health and server status here.',
        disableBeacon: true,
      },
      {
        target: isMobile ? 'nav .tour-nav-overview' : 'aside .tour-nav-overview',
        content: 'Check high-level metrics and revenue trends.',
        disableBeacon: true,
      },
      {
        target: isMobile ? 'nav .tour-nav-users' : 'aside .tour-nav-users',
        content: 'Manage all users, vendors, and riders across StreetBites.',
        disableBeacon: true,
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
    <div className="w-full min-h-screen bg-[#F4F1EA] text-[#1C1917] flex flex-col md:flex-row font-sans selection:bg-[#E54B3C]/20 relative">
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
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#EFEBE4] h-screen sticky top-0 px-4 py-5 justify-between select-none z-20 shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-8 cursor-pointer" onClick={() => navigate('/admin/Dashboard/overview')}>
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
              <img src={logoImg} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-800 leading-none">        Street<span className="text-[#D94A38]">Bites</span>
              </h2>
              <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest block mt-0.5">Admin Console</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest block mb-3 px-2">Management</span>
            <nav className="space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `tour-nav-${item.label.toLowerCase()} flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-colors ${isActive ? 'bg-[#1C1917] text-white shadow-sm' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${window.location.pathname.includes(item.path) ? 'bg-white/20 text-white' : 'bg-[#FCE8E6] text-[#D94A38]'
                      }`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* System Status Footer */}
        <div className="tour-system-status pt-4 border-t border-[#EFEBE4]">
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-emerald-200">
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-emerald-800 leading-none">Systems Normal</h4>
              <span className="text-[9px] text-emerald-600 block mt-0.5 uppercase tracking-wider font-bold">100% Uptime</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 relative max-w-[100vw] overflow-x-hidden">
        {/* Mobile Header (and Desktop Header for actions) */}
        <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-[#F4F1EA]/90 backdrop-blur-md z-10 shrink-0 border-b border-[#EFEBE4] md:border-b-0">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
            <span className="hidden md:inline">Admin</span><span className="hidden md:inline">›</span>
            <span className="text-stone-900 font-bold uppercase tracking-widest text-[10px]">Command Center</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setRunTour(true); setTourKey(prev => prev + 1); }}
              className="text-stone-500 hover:text-stone-800 transition-colors bg-white border border-stone-200 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
              title="Help & Tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <div
              onClick={() => navigate('/admin/Dashboard/settings')}
              className="w-8 h-8 rounded-full bg-stone-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-xs font-bold text-stone-600 cursor-pointer hover:bg-stone-300 transition-colors"
            >
              AD
            </div>
          </div>
        </header>

        {/* Render child routes */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation (Horizontal Scroll if needed) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#EFEBE4] flex items-center px-2 py-3 pb-6 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] overflow-x-auto gap-2 hide-scrollbar">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `tour-nav-${item.label.toLowerCase()} flex flex-col items-center justify-center w-16 gap-1.5 transition-colors shrink-0 ${isActive ? 'text-[#1C1917]' : 'text-stone-400 hover:text-stone-600'
              }`
            }
          >
            <div className="relative">
              <item.icon className={`w-5 h-5 ${window.location.pathname.includes(item.path) ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              {item.badge && (
                <span className="absolute -top-1 -right-1.5 w-3 h-3 bg-[#D94A38] rounded-full border border-white flex items-center justify-center text-[7px] text-white font-bold">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[8px] font-bold uppercase tracking-wider truncate w-full text-center">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AdminLayout;
