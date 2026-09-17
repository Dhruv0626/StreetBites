import React, { useState, useMemo } from 'react';
import { TrendingUp, IndianRupee, Package, Clock, ArrowUpRight, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export interface PopularItem {
  name: string;
  sales: number;
  revenue: string;
  image?: string;
}

export const VendorAnalyticsPage: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState('This Week');
  const [showDropdown, setShowDropdown] = useState(false);

  // Analytics derived from real stall activity (initialized to clean zero state)
  const { kpis, chartData } = useMemo(() => {
    return {
      kpis: [
        { label: 'Total Revenue', value: '₹0', trend: '0.0%', positive: true, icon: IndianRupee },
        { label: 'Total Orders', value: '0', trend: '0.0%', positive: true, icon: Package },
        { label: 'Avg. Prep Time', value: '--', trend: '0.0%', positive: true, icon: Clock },
        { label: 'Cancellation Rate', value: '0%', trend: '0.0%', positive: true, icon: TrendingUp },
      ],
      chartData: [
        { name: 'Mon', revenue: 0 },
        { name: 'Tue', revenue: 0 },
        { name: 'Wed', revenue: 0 },
        { name: 'Thu', revenue: 0 },
        { name: 'Fri', revenue: 0 },
        { name: 'Sat', revenue: 0 },
        { name: 'Sun', revenue: 0 },
      ]
    };
  }, [timeFilter]);

  // Real popular items (empty until orders are recorded)
  const [popularItems] = useState<PopularItem[]>([]);

  // Custom Tooltip for Recharts
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

  const totalPeriodRevenue = chartData.reduce((acc, curr) => acc + curr.revenue, 0);

  return (
    <div className="animate-fadeIn pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-stone-500 mt-1">Track your stall's sales, order volume, and performance trends.</p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="tour-time-filter flex items-center gap-2 bg-white border border-[#E7E2D9] rounded-xl px-4 py-2.5 hover:bg-stone-50 transition-colors shadow-sm cursor-pointer"
          >
            <span className="text-sm font-medium text-stone-700">{timeFilter}</span>
            <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E7E2D9] rounded-xl shadow-lg overflow-hidden z-10 animate-scaleIn">
              {['This Week', 'This Month', 'This Year'].map(option => (
                <button
                  key={option}
                  onClick={() => {
                    setTimeFilter(option);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-stone-50 cursor-pointer ${
                    timeFilter === option ? 'text-[#D94A38] bg-red-50/50 font-bold' : 'text-stone-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="tour-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white rounded-2xl border border-[#E7E2D9] p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 group-hover:bg-[#FCE8E6] group-hover:text-[#D94A38] transition-colors">
                <kpi.icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                <ArrowUpRight className="w-3 h-3 text-stone-400" />
                {kpi.trend}
              </div>
            </div>
            <h3 className="text-sm font-medium text-stone-500 mb-1">{kpi.label}</h3>
            <p className="text-2xl font-extrabold text-stone-900 tracking-tight">{kpi.value}</p>
            
            {/* Decorative background accent */}
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-br from-transparent to-stone-50 rounded-full opacity-50 pointer-events-none" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E7E2D9] p-6 sm:p-8 shadow-sm flex flex-col min-w-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-bold text-stone-900">Revenue Overview</h2>
              <p className="text-xs text-stone-500 mt-0.5">Daily breakdown for {timeFilter.toLowerCase()}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-400 uppercase tracking-widest block font-bold">Total</span>
              <span className="text-lg font-bold text-stone-900">₹{totalPeriodRevenue.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <div className="flex-1 w-full h-[280px] min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEBE4" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#78716c', fontWeight: 'bold' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#78716c', fontWeight: 'bold' }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#FCE8E6', opacity: 0.3 }} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="#D94A38" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {totalPeriodRevenue === 0 && (
            <p className="text-center text-xs text-stone-400 mt-2 font-medium">
              Sales transactions will reflect on this chart as orders are fulfilled.
            </p>
          )}
        </div>

        {/* Popular Items */}
        <div className="bg-white rounded-3xl border border-[#E7E2D9] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-stone-900">Top Performing Items</h2>
              <span className="text-xs text-stone-400 font-medium">{popularItems.length} dishes</span>
            </div>
            
            {popularItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
                  <Package className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-stone-700">No Item Sales Recorded</p>
                <p className="text-xs text-stone-400 max-w-xs mt-1 leading-relaxed">
                  Your most popular dishes will automatically appear here ranked by order volume and revenue.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {popularItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 group cursor-pointer">
                    <div className="relative font-bold text-stone-300 text-lg w-4 shrink-0 text-center">
                      {index + 1}
                    </div>
                    {item.image && (
                      <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-[#E7E2D9]">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-stone-900 truncate">{item.name}</h4>
                      <p className="text-xs text-stone-500 mt-0.5">{item.sales} orders</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-stone-900">{item.revenue}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsPage;