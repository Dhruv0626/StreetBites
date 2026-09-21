import React, { useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, Clock, MapPin, ChevronRight, Loader2, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import riderService, { type RiderStats } from '../../services/riderService';

export const RiderEarningsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState('This Week');
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const res = await riderService.getStats({
          riderId: user?._id || user?.id,
          email: user?.email,
        });
        if (isMounted && res?.success && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to load rider earnings stats:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const defaultChartData = [
    { name: 'Mon', earnings: 0 },
    { name: 'Tue', earnings: 0 },
    { name: 'Wed', earnings: 0 },
    { name: 'Thu', earnings: 0 },
    { name: 'Fri', earnings: 0 },
    { name: 'Sat', earnings: 0 },
    { name: 'Sun', earnings: 0 },
  ];

  const chartData = stats?.chartData?.length ? stats.chartData : defaultChartData;
  const recentTrips = stats?.recentTrips || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900 text-white p-3 rounded-xl shadow-lg border border-stone-800">
          <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">{label}</p>
          <p className="text-sm font-bold">₹{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Earnings & Payouts</h1>
            <button 
              onClick={() => navigate('/rider/Dashboard/guidelines')}
              className="tour-rules-btn md:hidden bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors shadow-sm"
            >
              Rules & Regulations
            </button>
          </div>
          <p className="text-sm text-stone-500 mt-1">Real-time tracking of your delivered orders and payout balance.</p>
        </div>
        <div className="tour-filter bg-white border border-[#EFEBE4] p-1 rounded-xl flex text-sm shadow-sm">
          {['Today', 'This Week', 'This Month'].map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-1.5 rounded-lg font-bold transition-colors ${
                timeFilter === filter 
                  ? 'bg-stone-900 text-white shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#EFEBE4]">
          <Loader2 className="w-10 h-10 text-[#D94A38] animate-spin" />
          <p className="text-sm font-bold text-stone-600">Loading your real earnings data...</p>
        </div>
      ) : (
        <>
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { 
                label: "Today's Earnings", 
                value: `₹${stats?.todayEarnings ?? 0}`, 
                icon: IndianRupee, 
                color: 'text-[#D94A38]', 
                bg: 'bg-[#FCE8E6]' 
              },
              { 
                label: 'Completed Trips', 
                value: `${stats?.completedTripsCount ?? 0}`, 
                icon: TrendingUp, 
                color: 'text-[#D94A38]', 
                bg: 'bg-[#FCE8E6]' 
              },
              { 
                label: 'Time Online', 
                value: stats?.timeOnline ?? 'Offline', 
                icon: Clock, 
                color: 'text-[#D94A38]', 
                bg: 'bg-[#FCE8E6]' 
              },
            ].map((metric, i) => (
              <div key={i} className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${metric.bg} flex items-center justify-center shrink-0`}>
                  <metric.icon className={`w-6 h-6 ${metric.color}`} />
                </div>
                <div>
                  <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">{metric.label}</span>
                  <span className="text-2xl font-bold text-stone-900">{metric.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="lg:col-span-2 bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col min-w-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-stone-900">This Week's Trajectory</h2>
                <span className="text-2xl font-bold text-[#D94A38]">₹{stats?.totalWeekEarnings ?? 0}</span>
              </div>
              
              <div className="flex-1 w-full h-[250px] min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E2D9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#78716c', fontWeight: 'bold' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#78716c', fontWeight: 'bold' }}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#FCE8E6', opacity: 0.4 }} />
                    <Bar dataKey="earnings" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.earnings > 0 ? '#D94A38' : '#F4F1EA'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Breakdown Section */}
            <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col">
              <h2 className="text-lg font-bold text-stone-900 mb-6">Today's Breakdown</h2>
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center p-4 bg-[#F4F1EA]/50 rounded-2xl">
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">Base Pickup Fare</span>
                    <span className="text-xs text-stone-500">
                      {stats?.completedTripsCount ? `${stats.completedTripsCount} trips × ₹20` : '0 trips completed'}
                    </span>
                  </div>
                  <span className="text-base font-bold text-stone-900">₹{stats?.breakdown?.baseFare ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#F4F1EA]/50 rounded-2xl">
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">Distance Payout</span>
                    <span className="text-xs text-stone-500">Distance traveled pay</span>
                  </div>
                  <span className="text-base font-bold text-stone-900">₹{stats?.breakdown?.distancePay ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#F4F1EA]/50 rounded-2xl">
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">Multi-stall Bonus</span>
                    <span className="text-xs text-stone-500">Multi-vendor pickups</span>
                  </div>
                  <span className="text-base font-bold text-stone-900">₹{stats?.breakdown?.bonusPay ?? 0}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-[#EFEBE4] mt-4 flex justify-between items-center">
                <span className="text-sm font-bold text-stone-500 uppercase">Total Today</span>
                <span className="text-xl font-black text-[#D94A38]">₹{stats?.breakdown?.total ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Trips */}
          <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-stone-900">Recent Trips</h2>
              <button 
                className="cursor-pointer text-sm font-bold text-[#D94A38] hover:text-[#C43D2E]" 
                onClick={() => navigate('/rider/Dashboard/history')}
              >
                View Full History
              </button>
            </div>
            
            {recentTrips.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
                  <Package className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-stone-800 text-sm">No Delivery Trips Completed Yet</h4>
                <p className="text-xs text-stone-400 max-w-sm">
                  Completed deliveries and earned delivery fees will appear here once you accept and deliver orders.
                </p>
                <button
                  onClick={() => navigate('/rider/Dashboard/queue')}
                  className="mt-2 bg-[#D94A38] hover:bg-[#c43d2e] text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  View Order Queue
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTrips.map(trip => (
                  <div 
                    key={trip.id} 
                    className="flex items-center justify-between p-4 bg-white border border-[#EFEBE4] rounded-2xl hover:border-[#D94A38]/30 transition-colors cursor-pointer group"
                    onClick={() => navigate('/rider/Dashboard/history')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0 group-hover:bg-[#FCE8E6] transition-colors">
                        <MapPin className="w-4 h-4 text-stone-500 group-hover:text-[#D94A38]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{trip.id}</h4>
                        <span className="text-xs text-stone-500">{trip.time} · {trip.distance} · {trip.stalls} stall{trip.stalls > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-[#D94A38]">{trip.payout}</span>
                      <ChevronRight className="w-4 h-4 text-stone-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RiderEarningsPage;
