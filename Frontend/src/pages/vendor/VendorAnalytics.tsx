import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  IndianRupee,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  vendorOrderService,
  type VendorKPIItem,
  type VendorChartDataItem,
  type VendorPopularItem,
} from '../../services/vendorOrderService';

export const VendorAnalyticsPage: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'This Week' | 'This Month' | 'This Year'>('This Week');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kpis, setKpis] = useState<VendorKPIItem[]>([
    { label: 'Total Revenue', value: '₹0', trend: '0.0%', positive: true },
    { label: 'Total Orders', value: '0', trend: '0.0%', positive: true },
    { label: 'Avg. Prep Time', value: '--', trend: '0.0%', positive: true },
    { label: 'Cancellation Rate', value: '0.0%', trend: '0.0%', positive: true },
  ]);

  const [chartData, setChartData] = useState<VendorChartDataItem[]>([
    { name: 'Mon', revenue: 0 },
    { name: 'Tue', revenue: 0 },
    { name: 'Wed', revenue: 0 },
    { name: 'Thu', revenue: 0 },
    { name: 'Fri', revenue: 0 },
    { name: 'Sat', revenue: 0 },
    { name: 'Sun', revenue: 0 },
  ]);

  const [popularItems, setPopularItems] = useState<VendorPopularItem[]>([]);
  const [totalPeriodRevenue, setTotalPeriodRevenue] = useState<number>(0);

  const fetchAnalytics = useCallback(async (filter: string, isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await vendorOrderService.getAnalytics(filter);
      if (res.success && res.data) {
        if (res.data.kpis && res.data.kpis.length > 0) {
          setKpis(res.data.kpis);
        }
        if (res.data.chartData && res.data.chartData.length > 0) {
          setChartData(res.data.chartData);
        }
        if (res.data.popularItems) {
          setPopularItems(res.data.popularItems);
        }
        setTotalPeriodRevenue(
          typeof res.data.totalPeriodRevenue === 'number'
            ? res.data.totalPeriodRevenue
            : res.data.chartData.reduce((acc, curr) => acc + curr.revenue, 0)
        );
      } else {
        setError(res.message || 'Unable to load stall analytics');
      }
    } catch (err: any) {
      console.error('Failed to load vendor analytics:', err);
      setError(err?.message || 'Failed to fetch stall performance metrics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(timeFilter);
  }, [timeFilter, fetchAnalytics]);

  // Icon mapping for KPIs
  const getKpiIcon = (index: number) => {
    switch (index) {
      case 0:
        return IndianRupee;
      case 1:
        return Package;
      case 2:
        return Clock;
      case 3:
      default:
        return TrendingUp;
    }
  };

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900 text-white px-3.5 py-2.5 rounded-2xl shadow-xl border border-stone-800">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mb-0.5">
            {label}
          </p>
          <p className="text-sm font-black text-white">
            ₹{Number(payload[0].value || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-stone-400">Vendor Net Earnings</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fadeIn pb-20 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-[#E7E2D9] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              Stall Analytics & Insights
            </h1>
            <span className="flex items-center gap-1 bg-[#FCE8E6] text-[#D94A38] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> Live
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Real-time breakdown of your kitchen's sales volume, order throughput, and top dishes.
          </p>
        </div>

        {/* Action Controls: Refresh + Time Filter */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => fetchAnalytics(timeFilter, true)}
            title="Refresh Analytics"
            disabled={isRefreshing || isLoading}
            className="p-2.5 bg-stone-50 hover:bg-stone-100 border border-[#E7E2D9] rounded-xl text-stone-700 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#D94A38]' : ''}`}
            />
          </button>

          <div className="relative flex-1 sm:flex-none">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="tour-time-filter w-full sm:w-auto flex items-center justify-between gap-3 bg-stone-50 border border-[#E7E2D9] rounded-xl px-4 py-2.5 hover:bg-stone-100 transition-colors shadow-2xs cursor-pointer"
            >
              <span className="text-xs font-bold text-stone-800">{timeFilter}</span>
              <ChevronDown
                className={`w-4 h-4 text-stone-400 transition-transform ${
                  showDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E7E2D9] rounded-2xl shadow-xl overflow-hidden z-20 animate-scaleIn">
                {(['This Week', 'This Month', 'This Year'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setTimeFilter(option);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors hover:bg-stone-50 cursor-pointer ${
                      timeFilter === option
                        ? 'text-[#D94A38] bg-[#FCE8E6]/40'
                        : 'text-stone-700'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-700 font-bold">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="tour-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const IconComponent = getKpiIcon(index);

          return (
            <div
              key={index}
              className="bg-white rounded-3xl border border-[#E7E2D9] p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="w-11 h-11 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-700 group-hover:bg-[#FCE8E6] group-hover:text-[#D94A38] transition-colors">
                  <IconComponent className="w-5 h-5" />
                </div>

                {/* Trend Badge */}
                <div
                  className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full border ${
                    kpi.positive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {kpi.positive ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-rose-600" />
                  )}
                  {kpi.trend}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                  {kpi.label}
                </h3>
                {isLoading ? (
                  <div className="h-8 w-24 bg-stone-100 rounded-lg animate-pulse" />
                ) : (
                  <p className="text-2xl font-black text-stone-900 tracking-tight">
                    {kpi.value}
                  </p>
                )}
              </div>

              {/* Decorative accent */}
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-gradient-to-br from-transparent to-stone-100/60 rounded-full pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* Main Content: Chart (Left) + Top Performing Items (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E7E2D9] p-6 shadow-xs flex flex-col min-w-0">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-base font-black text-stone-900">Revenue Breakdown</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Periodic earnings trajectory for {timeFilter.toLowerCase()}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-stone-400 uppercase tracking-widest block font-extrabold">
                Period Earnings
              </span>
              <span className="text-lg font-black text-[#D94A38]">
                ₹{totalPeriodRevenue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="flex-1 w-full h-[300px] min-h-[300px]">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#D94A38]" />
                  <span className="text-xs text-stone-400 font-bold">Loading revenue data...</span>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2EFE9" />
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
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#FCE8E6', opacity: 0.4 }} />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="#D94A38" className="hover:opacity-85 transition-opacity" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {!isLoading && totalPeriodRevenue === 0 && (
            <p className="text-center text-xs text-stone-400 mt-3 font-semibold">
              Live earnings will populate in this chart as customer orders are fulfilled.
            </p>
          )}
        </div>

        {/* Popular Dishes / Top Performing Items */}
        <div className="bg-white rounded-3xl border border-[#E7E2D9] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-stone-100">
              <div>
                <h2 className="text-base font-black text-stone-900">Top Performing Dishes</h2>
                <p className="text-[11px] text-stone-500">Ranked by orders & revenue</p>
              </div>
              <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                {popularItems.length} items
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100" />
                    <div className="flex-1 space-y-2">
                      <div className="w-3/4 h-4 bg-stone-100 rounded" />
                      <div className="w-1/2 h-3 bg-stone-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : popularItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-400 mb-3 shadow-2xs">
                  <Package className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-stone-700">No Dish Sales Yet</p>
                <p className="text-xs text-stone-400 max-w-xs mt-1 leading-relaxed">
                  Dishes will automatically be ranked by order count and net revenue here once orders start coming in.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {popularItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-stone-50 transition-colors group"
                  >
                    {/* Rank Badge */}
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                        index === 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : index === 1
                          ? 'bg-stone-200 text-stone-700 border border-stone-300'
                          : index === 2
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* Dish Image */}
                    {item.image ? (
                      <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-[#E7E2D9] bg-stone-100">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-stone-900 truncate group-hover:text-[#D94A38] transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-semibold text-stone-500 mt-0.5">
                        {item.sales} {item.sales === 1 ? 'order' : 'orders'} fulfilled
                      </p>
                    </div>

                    {/* Revenue */}
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-stone-900">
                        {item.revenue}
                      </span>
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