import React, { useState } from 'react';
import { Lock, ChevronDown, ChevronUp, Clock, CheckCircle2, Store } from 'lucide-react';

export interface VendorOrderItem {
  name: string;
  price: number;
}

export interface VendorOrder {
  id: string;
  status: 'New' | 'Preparing' | 'Completed' | 'Cancelled';
  customer: string;
  time: string;
  items: VendorOrderItem[];
  total: number;
  net: number;
  commission: number;
}

interface MetricsProps {
  liveCount: number;
  avgPrep: string;
  rating: string;
  todayPayout: number;
}

const MetricsBar: React.FC<MetricsProps> = ({ liveCount, avgPrep, rating, todayPayout }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {[
      { label: 'Live Orders', value: liveCount.toString() },
      { label: 'Avg Prep', value: avgPrep },
      { label: 'Rating', value: rating },
      { label: "Today's Payout", value: `₹${todayPayout.toLocaleString('en-IN')}` },
    ].map(m => (
      <div key={m.label} className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">{m.label}</span>
        <div className="mt-4">
          <span className="text-2xl font-medium text-stone-900 leading-none">{m.value}</span>
        </div>
      </div>
    ))}
  </div>
);

export const VendorOrders: React.FC = () => {
  // Real orders state (initialized empty for vendor's live queue)
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const toggleOrder = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'All') return true;
    return order.status === activeFilter;
  });

  const liveOrdersCount = orders.filter(o => o.status === 'New' || o.status === 'Preparing').length;
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const todayPayout = completedOrders.reduce((sum, o) => sum + (o.net || o.total * 0.95), 0);
  const avgPrep = orders.length > 0 ? '15m' : '--';
  const stallRating = '--';

  const handleUpdateOrderStatus = (orderId: string, newStatus: 'Preparing' | 'Completed' | 'Cancelled') => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-20 animate-fadeIn">
      <MetricsBar
        liveCount={liveOrdersCount}
        avgPrep={avgPrep}
        rating={stallRating}
        todayPayout={todayPayout}
      />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-medium text-stone-900">Active Orders</h3>
            <p className="text-xs text-stone-500 mt-1">Manage and track your incoming orders in real time.</p>
          </div>

          {/* Order Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['All', 'New', 'Preparing', 'Completed'].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeFilter === filter
                  ? 'bg-[#1C1917] text-white shadow-md'
                  : 'bg-white border border-[#E7E2D9] text-stone-600 hover:border-stone-400 hover:bg-stone-50'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#E7E2D9] rounded-3xl p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-[#FCE8E6] text-[#D94A38] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Store className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-stone-800">
                No {activeFilter === 'All' ? 'active' : activeFilter.toLowerCase()} orders found
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
                Customer orders placed for your stall will appear here automatically. Ensure your stall is toggled Online and menu dishes are marked Available.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className={`rounded-2xl relative overflow-hidden transition-all duration-300 ${order.status === 'New' ? 'tour-new-order-card bg-[#FCE8E6] border border-[#E54B3C] shadow-[0_4px_12px_rgba(229,75,60,0.1)]' :
                  order.status === 'Preparing' ? 'bg-white border border-amber-300 shadow-sm' :
                    'bg-[#FAF7F2] border border-[#EFEBE4] opacity-80 cursor-not-allowed'
                  }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${order.status === 'New' ? 'bg-[#E54B3C]' :
                  order.status === 'Preparing' ? 'bg-amber-400' :
                    'bg-stone-300'
                  }`} />

                <div
                  className={`p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between pl-6 ${order.status === 'Completed' ? '' : 'cursor-pointer hover:bg-black/5 transition-colors'
                    }`}
                  onClick={() => order.status !== 'Completed' && toggleOrder(order.id)}
                >
                  <div className="flex flex-1 items-start sm:items-center gap-4 sm:gap-8">
                    <div className="min-w-[70px]">
                      <div className={`text-sm font-bold ${order.status === 'Completed' ? 'text-stone-600' : 'text-stone-800'}`}>
                        {order.id}
                      </div>
                      <div className={`text-[10px] font-bold mt-0.5 ${order.status === 'New' ? 'text-[#D94A38] animate-pulse' :
                        order.status === 'Preparing' ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                        {order.status}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className={`text-sm font-bold leading-snug ${order.status === 'Completed' ? 'text-stone-600' : 'text-stone-900'}`}>
                        {order.customer} · {order.items.length} items
                      </div>
                      <div className={`text-[11px] mt-0.5 flex items-center gap-1 ${order.status === 'Completed' ? 'text-stone-400' : 'text-stone-600'}`}>
                        {order.status === 'Completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {order.status === 'Completed' ? 'Completed' : order.time}
                      </div>
                    </div>

                    <div className="min-w-[60px] text-right">
                      <span className={`text-lg font-extrabold ${order.status === 'Completed' ? 'text-stone-500' : 'text-stone-800'}`}>
                        ₹{order.total}
                      </span>
                    </div>
                  </div>

                  <div className={`flex justify-end items-center sm:w-auto mt-2 sm:mt-0 ${order.status === 'New' ? 'text-[#D94A38]' :
                    order.status === 'Preparing' ? 'text-stone-400' : ''
                    }`}>
                    {order.status === 'Completed' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider bg-white px-3 py-2 rounded-xl border border-stone-200">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    ) : (
                      expandedId === order.id ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />
                    )}
                  </div>
                </div>

                {expandedId === order.id && order.status !== 'Completed' && (
                  <div className={`border-t p-4 sm:p-6 pl-6 animate-fadeIn ${order.status === 'New' ? 'border-[#E54B3C]/20 bg-white/50' : 'border-[#E7E2D9] bg-stone-50/50'
                    }`}>
                    <div className="space-y-3 mb-6">
                      {order.items.map((item, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl flex justify-between items-center text-sm font-medium border border-[#E7E2D9]">
                          <span>{item.name}</span>
                          <span className="font-bold">₹{item.price}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[#E7E2D9] pt-4 flex justify-between items-center text-xs mb-6">
                      <span className="font-semibold text-stone-600">Order Amount</span>
                      <strong className="text-stone-900 text-base">₹{order.total}</strong>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'Cancelled')}
                        className="flex-1 bg-white border border-stone-300 text-stone-700 text-sm font-bold py-3.5 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer"
                      >
                        {order.status === 'New' ? 'Reject Order' : 'Cancel Order'}
                      </button>
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, order.status === 'New' ? 'Preparing' : 'Completed')}
                        className={`flex-1 text-white text-sm font-bold py-3.5 rounded-xl transition-colors cursor-pointer ${order.status === 'New' ? 'bg-[#E54B3C] hover:bg-[#D43B2C] shadow-[0_4px_12px_rgba(229,75,60,0.2)]' : 'bg-[#1C1917] hover:bg-black'
                          }`}
                      >
                        {order.status === 'New' ? 'Accept · Prep 10 min' : 'Mark Ready for Pickup'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorOrders;
