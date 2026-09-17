import React, { useState } from 'react';
import { IndianRupee, TrendingUp, Clock, MapPin, ChevronRight} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router';

export const RiderEarningsPage: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState('This Week');
  const navigate = useNavigate();
  const chartData = [
    { name: 'Mon', earnings: 450 },
    { name: 'Tue', earnings: 520 },
    { name: 'Wed', earnings: 380 },
    { name: 'Thu', earnings: 610 },
    { name: 'Fri', earnings: 780 },
    { name: 'Sat', earnings: 950 },
    { name: 'Sun', earnings: 820 },
  ];

  const recentTrips = [
    { id: 'MO-77212', time: '10:45 AM', stalls: 2, distance: '4.2 km', payout: '₹85' },
    { id: 'MO-77211', time: '09:30 AM', stalls: 1, distance: '1.8 km', payout: '₹40' },
    { id: 'MO-77210', time: '08:15 AM', stalls: 3, distance: '5.5 km', payout: '₹110' },
  ];

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
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Earnings</h1>
            <button 
              onClick={() => navigate('/rider/Dashboard/guidelines')}
              className="tour-rules-btn md:hidden bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors shadow-sm"
            >
              Rules & Regulations
            </button>
          </div>
          <p className="text-sm text-stone-500 mt-1">Track your performance and payouts.</p>
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

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Today's Earnings", value: '₹1,215', icon: IndianRupee, color: 'text-[#D94A38]', bg: 'bg-[#FCE8E6]' },
          { label: 'Completed Trips', value: '14', icon: TrendingUp, color: 'text-[#D94A38]', bg: 'bg-[#FCE8E6]' },
          { label: 'Time Online', value: '5h 30m', icon: Clock, color: 'text-[#D94A38]', bg: 'bg-[#FCE8E6]' },
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
            <h2 className="text-lg font-bold text-stone-900">This Week</h2>
            <span className="text-2xl font-bold text-[#D94A38]">₹4,510</span>
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
                    <Cell key={`cell-${index}`} fill={index === 4 ? '#D94A38' : '#FAD1CC'} />
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
                <span className="text-sm font-bold text-stone-900 block">Base Fare</span>
                <span className="text-xs text-stone-500">14 trips × ₹20</span>
              </div>
              <span className="text-base font-bold text-stone-900">₹280</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-[#F4F1EA]/50 rounded-2xl">
              <div>
                <span className="text-sm font-bold text-stone-900 block">Distance Pay</span>
                <span className="text-xs text-stone-500">42 km total</span>
              </div>
              <span className="text-base font-bold text-stone-900">₹510</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-[#F4F1EA]/50 rounded-2xl">
              <div>
                <span className="text-sm font-bold text-stone-900 block">Multi-stall Bonus</span>
                <span className="text-xs text-stone-500">Extra pickups</span>
              </div>
              <span className="text-base font-bold text-stone-900">₹425</span>
            </div>
          </div>
          <div className="pt-4 border-t border-[#EFEBE4] mt-4 flex justify-between items-center">
            <span className="text-sm font-bold text-stone-500 uppercase">Total</span>
            <span className="text-xl font-black text-[#D94A38]">₹1,215</span>
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-stone-900">Recent Trips</h2>
          <button className="cursor-pointer text-sm font-bold text-[#D94A38] hover:text-[#C43D2E]" onClick={() => navigate('/rider/Dashboard/history')}>View All</button>
        </div>
        <div className="space-y-3">
          {recentTrips.map(trip => (
            <div key={trip.id} className="flex items-center justify-between p-4 bg-white border border-[#EFEBE4] rounded-2xl hover:border-[#D94A38]/30 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0 group-hover:bg-[#FCE8E6] transition-colors">
                  <MapPin className="w-4 h-4 text-stone-500 group-hover:text-[#D94A38]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">{trip.id}</h4>
                  <span className="text-xs text-stone-500">{trip.time} · {trip.distance} · {trip.stalls} stalls</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-[#D94A38]">{trip.payout}</span>
                <ChevronRight className="w-4 h-4 text-stone-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
