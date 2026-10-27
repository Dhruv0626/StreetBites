import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import {
  PieChart,
  Users,
  ShieldCheck,
  Map,
  IndianRupee,
  Settings,
  MapPin,
  MessageSquare,
  HelpCircle,
  Activity,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import logoImg from '../../assets/Logo/Logo.png';
// @ts-ignore
import { Joyride as OriginalJoyride, STATUS } from 'react-joyride';
const Joyride = OriginalJoyride as any;
import { PageTransitionLoader } from '../PageTransitionLoader';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { user } = useAuth();
  const [runTour, setRunTour] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const [counts, setCounts] = useState<{ approvals: number; orders: number; complaints: number }>({
    approvals: 0,
    orders: 0,
    complaints: 0,
  });
  const [currentTime, setCurrentTime] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const navSections = [
    {
      title: 'OPERATIONS & TELEMETRY',
      items: [
        { label: 'Overview', icon: PieChart, path: '/admin/Dashboard/overview' },
        {
          label: 'Live Orders',
          icon: Map,
          path: '/admin/Dashboard/orders',
          badge: counts.orders > 0 ? String(counts.orders) : undefined,
          badgeColor: 'bg-emerald-500 text-white',
        },
        { label: 'Khau Gallis', icon: MapPin, path: '/admin/Dashboard/khau-gallis' },
      ],
    },
    {
      title: 'MANAGEMENT & GOVERNANCE',
      items: [
        { label: 'User Directory', icon: Users, path: '/admin/Dashboard/users' },
        {
          label: 'Approvals & KYC',
          icon: ShieldCheck,
          path: '/admin/Dashboard/verifications',
          badge: counts.approvals > 0 ? String(counts.approvals) : undefined,
          badgeColor: 'bg-[#D94A38] text-white',
        },
        { label: 'Transactions & Payouts', icon: IndianRupee, path: '/admin/Dashboard/transactions' },
        {
          label: 'Customer Complaints',
          icon: MessageSquare,
          path: '/admin/Dashboard/complaints',
          badge: counts.complaints > 0 ? String(counts.complaints) : undefined,
          badgeColor: 'bg-amber-500 text-white',
        },
      ],
    },
    {
      title: 'PLATFORM ENGINE',
      items: [
        { label: 'Offers & Campaigns', icon: Activity, path: '/admin/Dashboard/offers' },
        { label: 'System Settings', icon: Settings, path: '/admin/Dashboard/settings' },
      ],
    },
  ];

  const allNavItems = navSections.flatMap((s) => s.items);

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
        },
      ];
    }

    if (path.includes('/verifications')) {
      return [
        {
          target: '.tour-approval-queue',
          content: 'Review pending vendor KYC and menu item additions here.',
          disableBeacon: true,
        },
      ];
    }

    if (path.includes('/orders')) {
      return [
        {
          target: '.tour-live-map',
          content: 'Track all active deliveries in real-time across the platform.',
          disableBeacon: true,
        },
      ];
    }

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
      },
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

  const getCurrentPageTitle = () => {
    const match = allNavItems.find((item) => location.pathname.includes(item.path));
    return match ? match.label : 'Command Center';
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row font-sans selection:bg-[#D94A38]/15 relative">
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
          textColor: '#0F172A',
          zIndex: 10000,
        }}
        styles={{
          tooltip: {
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.25)',
          },
          buttonPrimary: {
            borderRadius: '10px',
            fontWeight: 'bold',
            padding: '8px 16px',
          },
          buttonBack: {
            marginRight: 10,
          },
        }}
      />

      {/* ── Desktop Command Center Sidebar (Obsidian Theme) ── */}
      <aside className="hidden md:flex flex-col w-72 bg-[#0B0F19] border-r border-slate-800/80 h-screen sticky top-0 px-4 py-5 justify-between select-none z-30 shrink-0 text-slate-300">
        <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar pr-1">
          {/* Brand Logo & Platform Badge */}
          <div
            className="flex items-center gap-3.5 px-3 py-2 rounded-2xl bg-slate-900/60 border border-slate-800/90 cursor-pointer hover:border-slate-700/80 transition-all shadow-inner group"
            onClick={() => navigate('/admin/Dashboard/overview')}
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 ring-2 ring-white/10 group-hover:ring-[#D94A38]/50 transition-all bg-white p-0.5">
              <img src={logoImg} alt="StreetBites Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-white tracking-tight leading-none">
                  Street<span className="text-[#FF5E4D]">Bites</span>
                </h2>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-[#D94A38]/20 text-[#FF5E4D] border border-[#D94A38]/30">
                  HQ
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">
                Enterprise Console
              </span>
            </div>
          </div>

          {/* Nav Categories */}
          <div className="space-y-5">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-3 mb-2">
                  {section.title}
                </span>
                <nav className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `tour-nav-${item.label.toLowerCase().replace(/[^a-z0-9]/g, '-')} group flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-[#D94A38] to-[#FF5E4D] text-white shadow-lg shadow-[#D94A38]/25 font-extrabold translate-x-1'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs ${
                            location.pathname.includes(item.path)
                              ? 'bg-white text-[#D94A38]'
                              : item.badgeColor || 'bg-[#D94A38] text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Live System Telemetry Card Footer */}
        <div className="tour-system-status pt-4 border-t border-slate-800/90 mt-2">
          <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex items-center justify-center shrink-0">
                <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-extrabold text-white leading-none truncate">Core Services Active</h4>
                <span className="text-[10px] text-emerald-400 font-bold block mt-1">99.98% High Uptime</span>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold text-slate-300 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700">
              24ms
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main Executive Content Area ── */}
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 relative max-w-[100vw] overflow-x-hidden">
        {/* Glassmorphic Topbar Header */}
        <header className="px-5 sm:px-8 py-3.5 flex justify-between items-center sticky top-0 bg-white/85 backdrop-blur-xl z-20 shrink-0 border-b border-slate-200/80 shadow-xs">
          {/* Left: Breadcrumbs & Current Page Indicator */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <span className="text-slate-500 font-bold hidden sm:inline">StreetBites HQ</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              <span className="text-slate-900 font-extrabold text-xs sm:text-sm tracking-tight truncate">
                {getCurrentPageTitle()}
              </span>
            </div>
          </div>

          {/* Right: Operational Status, Live IST Clock, Tour & Super Admin Pill */}
          <div className="flex items-center gap-3">
            {/* Live IST Clock */}
            {currentTime && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-mono font-bold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{currentTime}</span>
              </div>
            )}

            {/* Platform Live Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Engine</span>
            </div>

            {/* Quick Interactive Tour Trigger */}
            <button
              onClick={() => {
                setRunTour(true);
                setTourKey((prev) => prev + 1);
              }}
              className="text-slate-500 hover:text-slate-900 transition-colors bg-white hover:bg-slate-50 border border-slate-200/90 w-9 h-9 rounded-xl flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
              title="Launch Console Tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Authenticated Admin Profile Pill */}
            <div
              onClick={() => navigate('/admin/Dashboard/settings')}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs cursor-pointer transition-all active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#D94A38] to-[#FF7A68] text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0 overflow-hidden">
                {(user?.profile_image || user?.avatar_url) ? (
                  <img src={user.profile_image || user.avatar_url} alt={user.name || 'Admin'} className="w-full h-full object-cover" />
                ) : (
                  (user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'AD')
                )}
              </div>
              <div className="hidden md:block text-left leading-tight">
                <div className="text-xs font-extrabold text-slate-900 group-hover:text-[#D94A38] transition-colors truncate max-w-[150px]">
                  {user?.name || 'Administrator'}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {user?.role || 'Super Admin'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content Canvas with ambient background styling */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Executive Floating Dock Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0B0F19]/95 backdrop-blur-xl border-t border-slate-800 flex items-center px-3 py-2.5 pb-5 z-30 shadow-2xl overflow-x-auto gap-2 no-scrollbar">
        {allNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `tour-nav-${item.label.toLowerCase().replace(/[^a-z0-9]/g, '-')} flex flex-col items-center justify-center min-w-[62px] px-2 py-1.5 rounded-xl gap-1 transition-all shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-[#D94A38] to-[#FF5E4D] text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`
            }
          >
            <div className="relative">
              <item.icon className="w-4 h-4" />
              {item.badge && (
                <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 bg-[#D94A38] rounded-full border border-[#0B0F19] flex items-center justify-center text-[8px] text-white font-extrabold">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[9px] font-extrabold truncate w-full text-center">
              {item.label.split(' ')[0]}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AdminLayout;

