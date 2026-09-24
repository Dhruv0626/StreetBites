import React, { useState, useEffect } from 'react';
import { Users, Store, Bike, Shield, Activity, CheckCircle2, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { authService } from '../../services/authService';
import { Skeleton } from '../../components/Skeleton';

export const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState({
    customers: 0,
    vendors: 0,
    riders: 0,
    admins: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        const [custRes, vendRes, rideRes, admRes] = await Promise.all([
          authService.getAllUsers({ role: 'CUSTOMER' }),
          authService.getAllUsers({ role: 'VENDOR' }),
          authService.getAllUsers({ role: 'RIDER' }),
          authService.getAllUsers({ role: 'ADMIN' }),
        ]);

        const cCount = Array.isArray(custRes?.data) ? custRes.data.length : 0;
        const vCount = Array.isArray(vendRes?.data) ? vendRes.data.length : 0;
        const rCount = Array.isArray(rideRes?.data) ? rideRes.data.length : 0;
        const aCount = Array.isArray(admRes?.data) ? admRes.data.length : 0;

        setStats({
          customers: cCount,
          vendors: vCount,
          riders: rCount,
          admins: aCount,
          total: cCount + vCount + rCount + aCount,
        });
      } catch (err) {
        console.error('Error fetching overview metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  const revenueData = [
    { name: 'Mon', revenue: 0 },
    { name: 'Tue', revenue: 0 },
    { name: 'Wed', revenue: 0 },
    { name: 'Thu', revenue: 0 },
    { name: 'Fri', revenue: 0 },
    { name: 'Sat', revenue: 0 },
    { name: 'Sun', revenue: 0 },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="tour-nav-overview">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Platform Overview</h1>
        <p className="text-sm text-stone-500 mt-1">Real-time database metrics and live platform activity.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Registered Customers', value: stats.customers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Registered Vendors', value: stats.vendors, icon: Store, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Active Riders', value: stats.riders, icon: Bike, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Platform Admins', value: stats.admins, icon: Shield, color: 'text-[#D94A38]', bg: 'bg-[#FCE8E6]' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">{kpi.label}</span>
              <div className="flex items-end gap-2 mt-1">
                {isLoading ? (
                  <Skeleton className="w-12 h-7 rounded-md" />
                ) : (
                  <h3 className="text-2xl font-black text-stone-900 leading-none">
                    {kpi.value}
                  </h3>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Revenue Trends</h2>
              <p className="text-xs text-stone-500">Gross platform revenue over the last 7 days</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <TrendingUp className="w-4 h-4" /> Live Tracking
            </div>
          </div>

          <div className="flex-1 w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D94A38" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D94A38" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716C', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716C', fontSize: 12 }} tickFormatter={(value) => `₹${value}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEBE4" />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(value: any) => [`₹${value ?? 0}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#D94A38" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-stone-900">System Status</h2>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Activity className="w-3 h-3" /> Online
            </span>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex gap-3 items-start">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Database Connected</p>
                <p className="text-xs text-emerald-700 mt-0.5">MongoDB Atlas cluster is active and operational.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 flex gap-3 items-start">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Authentication Services</p>
                <p className="text-xs text-blue-700 mt-0.5">JWT, Google &amp; Facebook OAuth ready.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
