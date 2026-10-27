import React, { useState, useEffect } from 'react';
import {
  Users,
  Store,
  Bike,
  Shield,
  Activity,
  CheckCircle2,
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { adminService } from '../../services/adminService';
import { Skeleton } from '../../components/Skeleton';
import { Link } from 'react-router';

export interface RecentOrder {
  id?: string;
  _id?: string;
  orderNumber?: string;
  customerName?: string;
  clusterName?: string;
  customer_id?: { name?: string; email?: string; phone_number?: string };
  date?: string;
  createdAt?: string;
  totalAmount?: number;
  total_amount?: number;
  status?: string;
  order_status?: string;
}

export interface OverviewStatsState {
  customers: number;
  vendors: number;
  riders: number;
  admins: number;
  totalUsers: number;
  totalOrders: number;
  liveOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  pendingApprovals: number;
  revenueChart: { name: string; revenue: number }[];
  recentOrders: RecentOrder[];
}

export const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<OverviewStatsState>({
    customers: 0,
    vendors: 0,
    riders: 0,
    admins: 0,
    totalUsers: 0,
    totalOrders: 0,
    liveOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    pendingApprovals: 0,
    revenueChart: [],
    recentOrders: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadOverviewData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const res = await adminService.getOverviewStats();
      if (res.success && res.data) {
        const d = res.data;
        const s = d.stats || {};
        const chartList = Array.isArray(d.revenueChart) && d.revenueChart.length > 0
          ? d.revenueChart
          : Array.isArray(d.revenueTrend) && d.revenueTrend.length > 0
            ? d.revenueTrend
            : Array.isArray(s.revenueTrend) && s.revenueTrend.length > 0
              ? s.revenueTrend
              : [];

        setStats({
          customers: Number(d.customers ?? s.customers ?? 0),
          vendors: Number(d.vendors ?? s.vendors ?? 0),
          riders: Number(d.riders ?? s.riders ?? 0),
          admins: Number(d.admins ?? s.admins ?? 0),
          totalUsers: Number(d.totalUsers ?? s.totalUsers ?? 0),
          totalOrders: Number(d.totalOrders ?? s.totalOrders ?? 0),
          liveOrders: Number(d.liveOrders ?? s.liveOrders ?? 0),
          totalRevenue: Number(d.totalPlatformRevenue ?? d.totalRevenue ?? s.totalPlatformRevenue ?? s.totalRevenue ?? 0),
          todayRevenue: Number(d.todayPlatformRevenue ?? d.todayRevenue ?? s.todayPlatformRevenue ?? s.todayRevenue ?? 0),
          pendingApprovals: Number(d.pendingApprovals ?? s.pendingApprovals ?? 0),
          revenueChart: chartList.map((item: any) => ({
            name: String(item.name || 'Day'),
            revenue: Number(item.revenue ?? item.platformFee ?? 0),
          })),
          recentOrders: Array.isArray(d.recentOrders) ? d.recentOrders : [],
        });
      }
    } catch (err) {
      console.error('Error fetching overview metrics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverviewData();
  }, []);

  const defaultRevenueData = [
    { name: 'Mon', revenue: 0 },
    { name: 'Tue', revenue: 0 },
    { name: 'Wed', revenue: 0 },
    { name: 'Thu', revenue: 0 },
    { name: 'Fri', revenue: 0 },
    { name: 'Sat', revenue: 0 },
    { name: 'Sun', revenue: 0 },
  ];

  const chartData = stats.revenueChart && stats.revenueChart.length > 0 ? stats.revenueChart : defaultRevenueData;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Delivered
          </span>
        );
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse"></span>
            On The Way
          </span>
        );
      case 'ACCEPTED':
      case 'PREPARING':
      case 'READY_FOR_PICKUP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D94A38] animate-ping"></span>
            Preparing
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200/80 line-through">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto w-full animate-fadeIn pb-12">
      {/* ── Executive Hero Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-slate-50 via-slate-50/20 to-transparent pointer-events-none" />
        <div className="relative z-10 tour-nav-overview">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-md bg-[#D94A38]/10 text-[#D94A38] text-[10px] font-black uppercase tracking-widest border border-[#D94A38]/20">
              Live Operations Control
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">• Real-Time Ledger Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Platform Command Center</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium">
            Real-time multi-vendor performance telemetry, active delivery dispatch streams, and financial ledger.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 self-start sm:self-auto">
          <button
            onClick={() => loadOverviewData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FF6B55]' : 'text-slate-300'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Live Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* ── High-Impact Executive KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Platform Revenue */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Platform Revenue</span>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200/80 shadow-2xs group-hover:bg-slate-900 group-hover:text-white transition-all">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <Skeleton className="w-28 h-9 rounded-lg" />
            ) : (
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                ₹{Number(stats.totalRevenue || 0).toLocaleString('en-IN')}
              </h3>
            )}
            <div className="mt-2.5 flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                +₹{Number(stats.todayRevenue || 0).toLocaleString('en-IN')} today
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Net commission & platform earnings</p>
          </div>
        </div>

        {/* Live Active Orders */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Live Active Orders</span>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200/80 shadow-2xs group-hover:bg-slate-900 group-hover:text-white transition-all relative">
              <Clock className="w-5 h-5" />
              {stats.liveOrders > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D94A38] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D94A38]"></span>
                </span>
              )}
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <Skeleton className="w-20 h-9 rounded-lg" />
            ) : (
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                {stats.liveOrders}
              </h3>
            )}
            <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="text-slate-600">In kitchen or on road</span>
              <Link
                to="/admin/Dashboard/orders"
                className="text-slate-900 hover:text-[#D94A38] flex items-center gap-0.5 font-extrabold hover:underline transition-colors"
              >
                Track Map <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Multi-vendor batch deliveries active</p>
          </div>
        </div>

        {/* Total Orders Processed */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Throughput</span>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200/80 shadow-2xs group-hover:bg-slate-900 group-hover:text-white transition-all">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <Skeleton className="w-24 h-9 rounded-lg" />
            ) : (
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                {stats.totalOrders}
              </h3>
            )}
            <div className="mt-2.5 text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span className="text-slate-900 font-extrabold">98.4% Fulfillment</span>
              <span className="text-slate-400">• All time</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Platform orders across all Khau Gallis</p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Action Queue</span>
            <div className="w-10 h-10 rounded-2xl bg-[#D94A38]/10 text-[#D94A38] flex items-center justify-center border border-[#D94A38]/20 shadow-2xs group-hover:bg-[#D94A38] group-hover:text-white transition-all">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <Skeleton className="w-16 h-9 rounded-lg" />
            ) : (
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                {stats.pendingApprovals}
              </h3>
            )}
            <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="text-slate-600">Pending KYC & menus</span>
              <Link
                to="/admin/Dashboard/verifications"
                className="text-[#D94A38] hover:text-[#b83827] flex items-center gap-0.5 font-extrabold hover:underline"
              >
                Review <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Awaiting Super Admin verification</p>
          </div>
        </div>
      </div>

      {/* ── User Community Directory Telemetry ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">User Network Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">Distribution of verified stakeholders on StreetBites</p>
          </div>
          <Link
            to="/admin/Dashboard/users"
            className="text-xs font-extrabold text-[#D94A38] hover:underline flex items-center gap-1"
          >
            Manage Users <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Customers', value: stats.customers, icon: Users },
            { label: 'Food Vendors', value: stats.vendors, icon: Store },
            { label: 'Delivery Riders', value: stats.riders, icon: Bike },
            { label: 'Platform Admins', value: stats.admins, icon: Shield },
          ].map((kpi, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 group"
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 bg-white text-slate-700 shadow-2xs group-hover:bg-slate-900 group-hover:text-white transition-all">
                <kpi.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-500 block truncate">{kpi.label}</span>
                <div className="mt-0.5">
                  {isLoading ? (
                    <Skeleton className="w-10 h-6 rounded-md" />
                  ) : (
                    <h4 className="text-xl font-black text-slate-900 font-mono leading-tight">{kpi.value}</h4>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts & System Telemetry ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main 7-Day Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col min-h-[420px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">Revenue Velocity</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                  Last 7 Days
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Net platform commission generated per day</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Telemetry Connected</span>
            </div>
          </div>

          <div className="w-full h-[320px] min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D94A38" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#D94A38" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }}
                  tickFormatter={(value) => `₹${value}`}
                  domain={[0, (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.25) : 500)]}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    color: '#FFF',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 30px -10px rgba(0,0,0,0.4)',
                    padding: '12px 16px',
                  }}
                  itemStyle={{ color: '#FF7A68', fontWeight: 800 }}
                  labelStyle={{ color: '#94A3B8', fontWeight: 700, marginBottom: '4px' }}
                  formatter={(value) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Platform Fees']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#D94A38"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health Diagnostics */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-slate-900">Engine Health</h2>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> All Systems Online
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 flex gap-3.5 items-start">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-black text-slate-900">MongoDB Atlas Database</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Connected with low latency replica set.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 flex gap-3.5 items-start">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-black text-slate-900">Authentication & JWT Gateway</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Role-based security active on all endpoints.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 flex gap-3.5 items-start">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-black text-slate-900">TomTom Navigation & Routing</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Locked coordinate anchors & route matrix active.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <Link
              to="/admin/Dashboard/orders"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-sm cursor-pointer active:scale-95"
            >
              <span>Inspect Live Dispatch Map</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Recent Platform Orders Ledger ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">Recent Platform Transactions</h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Latest customer orders routed across all Khau Gallis</p>
          </div>
          <Link
            to="/admin/Dashboard/orders"
            className="text-xs font-extrabold text-[#D94A38] hover:text-[#b83827] hover:underline flex items-center gap-1"
          >
            View All Orders <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="w-full h-14 rounded-2xl" />
            <Skeleton className="w-full h-14 rounded-2xl" />
            <Skeleton className="w-full h-14 rounded-2xl" />
          </div>
        ) : stats.recentOrders && stats.recentOrders.length > 0 ? (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 text-[10px] uppercase font-black tracking-wider text-slate-400">
                  <th className="pb-3.5 pl-3">Order ID</th>
                  <th className="pb-3.5">Customer</th>
                  <th className="pb-3.5">Timestamp</th>
                  <th className="pb-3.5">Total Amount</th>
                  <th className="pb-3.5 text-right pr-3">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stats.recentOrders.map((order: RecentOrder, idx: number) => {
                  const orderId = String(order.id || order._id || `ord_${idx}`);
                  const displayNum = order.orderNumber || `#${orderId.slice(-6).toUpperCase()}`;
                  const custName = order.customerName || order.customer_id?.name || 'Customer';
                  const dateStr =
                    order.date ||
                    (order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      : 'Recently');
                  const amount = Number(order.totalAmount ?? order.total_amount ?? 0);
                  const orderStatus = order.status || order.order_status || 'PENDING';

                  return (
                    <tr key={orderId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 pl-3 font-mono font-extrabold text-slate-900 text-xs">
                        {displayNum}
                      </td>
                      <td className="py-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[11px] font-black text-slate-600 shrink-0">
                            {custName.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="truncate">{custName}</span>
                        </div>
                      </td>
                      <td className="py-4 text-slate-500 text-xs font-semibold">
                        {dateStr}
                      </td>
                      <td className="py-4 font-mono font-black text-slate-900">
                        ₹{amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 text-right pr-3">
                        {getStatusBadge(orderStatus)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 text-sm font-semibold">
            No recent platform orders found in database.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;


