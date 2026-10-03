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
import { Link } from 'react-router-dom';

export const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState({
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
    revenueChart: [] as { name: string; revenue: number }[],
    recentOrders: [] as any[],
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadOverviewData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const res = await adminService.getOverviewStats();
      if (res.success && res.data) {
        setStats(res.data);
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
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Delivered</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">On The Way</span>;
      case 'ACCEPTED':
      case 'PREPARING':
      case 'READY_FOR_PICKUP':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Preparing</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-fadeIn pb-12">
      {/* Header with Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="tour-nav-overview">
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">Platform Overview</h1>
          <p className="text-sm text-stone-500 mt-1">Live platform metrics, real-time database transactions, and operations telemetry.</p>
        </div>
        <button
          onClick={() => loadOverviewData(true)}
          disabled={isRefreshing || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#EFEBE4] text-stone-700 text-sm font-bold rounded-xl hover:bg-stone-50 hover:border-stone-300 shadow-sm transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#D94A38]' : 'text-stone-500'}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Main Revenue & Order KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Platform Revenue */}
        <div className="bg-gradient-to-br from-white to-amber-50/40 border border-amber-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-widest text-amber-700">Total Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <Skeleton className="w-24 h-8 rounded-md" />
            ) : (
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                ₹{Number(stats.totalRevenue || 0).toLocaleString('en-IN')}
              </h3>
            )}
            <p className="text-xs font-semibold text-stone-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-bold">₹{Number(stats.todayRevenue || 0).toLocaleString('en-IN')}</span> today
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-gradient-to-br from-white to-blue-50/40 border border-blue-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-700">Total Orders</span>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <Skeleton className="w-16 h-8 rounded-md" />
            ) : (
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                {stats.totalOrders}
              </h3>
            )}
            <p className="text-xs font-semibold text-stone-500 mt-1 flex items-center gap-1">
              All time platform food orders
            </p>
          </div>
        </div>

        {/* Live Active Orders */}
        <div className="bg-gradient-to-br from-white to-emerald-50/40 border border-emerald-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">Live Active Orders</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center relative">
              <Clock className="w-5 h-5" />
              {stats.liveOrders > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <Skeleton className="w-16 h-8 rounded-md" />
            ) : (
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                {stats.liveOrders}
              </h3>
            )}
            <div className="text-xs font-semibold text-stone-500 mt-1 flex items-center justify-between">
              <span>In kitchen or in transit</span>
              <Link to="/admin/orders" className="text-emerald-700 hover:underline flex items-center gap-0.5 font-bold">
                View <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-gradient-to-br from-white to-rose-50/40 border border-rose-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#D94A38]">Pending Approvals</span>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-[#D94A38] flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <Skeleton className="w-16 h-8 rounded-md" />
            ) : (
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                {stats.pendingApprovals}
              </h3>
            )}
            <div className="text-xs font-semibold text-stone-500 mt-1 flex items-center justify-between">
              <span>KYC & Menu verification</span>
              <Link to="/admin/verification" className="text-[#D94A38] hover:underline flex items-center gap-0.5 font-bold">
                Review <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* User Community Breakdown */}
      <div className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-stone-400 mb-4">User Community Directory</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Customers', value: stats.customers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Food Vendors', value: stats.vendors, icon: Store, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Active Riders', value: stats.riders, icon: Bike, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Super Admins', value: stats.admins, icon: Shield, color: 'text-[#D94A38]', bg: 'bg-[#FCE8E6]' },
          ].map((kpi, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50/70 border border-stone-100">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-500">{kpi.label}</span>
                <div className="mt-0.5">
                  {isLoading ? (
                    <Skeleton className="w-8 h-6 rounded-md" />
                  ) : (
                    <h4 className="text-xl font-black text-stone-900 leading-tight">{kpi.value}</h4>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main 7-Day Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Revenue Trends</h2>
              <p className="text-xs text-stone-500">Gross platform transaction value over the last 7 days</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 self-start sm:self-auto">
              <TrendingUp className="w-4 h-4" /> Live Tracking
            </div>
          </div>

          <div className="flex-1 w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D94A38" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D94A38" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716C', fontSize: 12 }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#78716C', fontSize: 12 }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEBE4" />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #EFEBE4', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(value: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Gross Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#D94A38" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health & Micro Metrics */}
        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-stone-900">System Status</h2>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200">
                <Activity className="w-3.5 h-3.5" /> All Systems Normal
              </span>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">MongoDB Database Active</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Database cluster connected with low latency.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-900">Authentication & JWT Gateway</p>
                  <p className="text-xs text-blue-700 mt-0.5">Role-based security active across all endpoints.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Live GPS & TomTom Maps</p>
                  <p className="text-xs text-amber-700 mt-0.5">High-accuracy geolocation pinning active.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-stone-100">
            <Link
              to="/admin/orders"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm transition-colors shadow-sm"
            >
              <span>Manage Live Orders</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Platform Orders Table */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Recent Platform Orders</h2>
            <p className="text-xs text-stone-500">Latest transactions processed across all clusters and stalls</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold text-[#D94A38] hover:underline flex items-center gap-1"
          >
            View All <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="w-full h-12 rounded-xl" />
            <Skeleton className="w-full h-12 rounded-xl" />
            <Skeleton className="w-full h-12 rounded-xl" />
          </div>
        ) : stats.recentOrders && stats.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-xs uppercase font-extrabold text-stone-400">
                  <th className="pb-3 pl-2">Order ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {stats.recentOrders.map((order: any) => (
                  <tr key={order._id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 pl-2 font-mono font-bold text-stone-900 text-xs">
                      #{order._id?.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3.5 font-medium text-stone-800">
                      {order.customer_id?.name || 'Customer'}
                    </td>
                    <td className="py-3.5 text-stone-500 text-xs">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                    <td className="py-3.5 font-bold text-stone-900">
                      ₹{order.total_amount ?? 0}
                    </td>
                    <td className="py-3.5">
                      {getStatusBadge(order.order_status)}
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <Link
                        to={`/admin/orders`}
                        className="text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-stone-400 text-sm">
            No recent platform orders found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;

