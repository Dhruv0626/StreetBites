import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Lock,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Store,
  RotateCw,
  ChefHat,
  BellRing,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import {
  vendorOrderService,
  type VendorOrder,
  type VendorOrderMetrics
} from '../../services/vendorOrderService';
import { useAlert } from '../../context/AlertContext';


interface MetricsProps {
  liveCount: number;
  avgPrep: string;
  rating: string;
  todayPayout: number;
}

const MetricsBar: React.FC<MetricsProps> = ({ liveCount, avgPrep, rating, todayPayout }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {[
      {
        label: 'Live Orders',
        value: liveCount.toString(),
        highlight: liveCount > 0,
      },
      { label: 'Avg Prep', value: avgPrep },
      { label: 'Rating', value: rating },
      { label: "Today's Payout", value: `₹${todayPayout.toLocaleString('en-IN')}` },
    ].map(m => (
      <div
        key={m.label}
        className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all ${
          m.highlight ? 'border-[#E54B3C]/50 ring-1 ring-[#E54B3C]/30 bg-[#FFF9F9]' : 'border-[#EFEBE4]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-stone-500">{m.label}</span>
          {m.highlight && (
            <span className="w-2.5 h-2.5 rounded-full bg-[#E54B3C] animate-ping" />
          )}
        </div>
        <div className="mt-4">
          <span className={`text-2xl font-bold leading-none ${m.highlight ? 'text-[#D94A38]' : 'text-stone-900'}`}>
            {m.value}
          </span>
        </div>
      </div>
    ))}
  </div>
);

export const VendorOrders: React.FC = () => {
  const { toast, showConfirm } = useAlert();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [metrics, setMetrics] = useState<VendorOrderMetrics>({
    liveCount: 0,
    avgPrep: '15m',
    rating: '4.8',
    todayPayout: 0,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Fetch orders from API
  const fetchOrders = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const res = await vendorOrderService.getOrders();
      if (res.success && res.data) {
        setOrders(res.data.orders || []);
        if (res.data.metrics) {
          setMetrics(res.data.metrics);
        }
      }
    } catch (err) {
      console.error('Failed to fetch kitchen orders:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Poll live kitchen orders every 6 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 6000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  const toggleOrder = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Sort orders so LIVE orders ('New' first, then 'Preparing') appear at the very top!
  const sortedOrders = useMemo(() => {
    const statusPriority: Record<string, number> = {
      New: 1,
      Preparing: 2,
      Completed: 3,
      Cancelled: 4,
    };

    return [...orders].sort((a, b) => {
      const pA = statusPriority[a.status] || 99;
      const pB = statusPriority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'All') return sortedOrders;
    return sortedOrders.filter(order => order.status === activeFilter);
  }, [sortedOrders, activeFilter]);

  const newOrdersCount = orders.filter(o => o.status === 'New').length;
  const preparingOrdersCount = orders.filter(o => o.status === 'Preparing').length;
  const liveOrdersCount = newOrdersCount + preparingOrdersCount;

  // Handle status update (Accept, Prep, Ready for Pickup, Cancel)
  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: 'Preparing' | 'Completed' | 'Cancelled'
  ) => {
    if (newStatus === 'Cancelled') {
      const confirmed = await showConfirm({
        title: 'Reject Order',
        message: 'Are you sure you want to reject/cancel this order?',
        type: 'warning',
      });
      if (!confirmed) return;
    }

    setUpdatingOrderId(orderId);
    // Optimistic UI update
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));

    try {
      const res = await vendorOrderService.updateOrderStatus(orderId, newStatus);
      if (res.success) {
        if (newStatus === 'Preparing') {
          toast.success(`Order #${orderId} accepted! Cooking timer started.`);
        } else if (newStatus === 'Completed') {
          toast.success(`Order #${orderId} marked Ready for Pickup! Rider notified.`);
        } else {
          toast.info(`Order #${orderId} cancelled.`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order status.');
      // Re-sync on error
      fetchOrders(true);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-20 animate-fadeIn">
      {/* Top Metrics Bar */}
      <MetricsBar
        liveCount={liveOrdersCount}
        avgPrep={metrics.avgPrep}
        rating={metrics.rating}
        todayPayout={metrics.todayPayout}
      />

      {/* Live Attention Alert Banner if new orders waiting */}
      {newOrdersCount > 0 && (
        <div className="bg-[#FFF4F2] border border-[#E54B3C] rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E54B3C] text-white flex items-center justify-center font-bold">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-900">
                {newOrdersCount} New Live Kitchen {newOrdersCount === 1 ? 'Order' : 'Orders'} Waiting!
              </p>
              <p className="text-xs text-[#D94A38] font-medium">
                Action required: Accept order to notify customer and dispatch riders.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveFilter('New')}
            className="px-4 py-2 bg-[#E54B3C] hover:bg-[#D43B2C] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            View New
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-medium text-stone-900">Kitchen Live Orders</h3>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">Manage and track your incoming kitchen queue in real time.</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={() => fetchOrders(false)}
              disabled={isRefreshing}
              title="Refresh live orders"
              className="p-2.5 rounded-xl border border-[#E7E2D9] bg-white hover:bg-stone-50 text-stone-600 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#E54B3C]' : ''}`} />
            </button>

            {/* Order Filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { label: 'All', count: orders.length },
                { label: 'New', count: newOrdersCount },
                { label: 'Preparing', count: preparingOrdersCount },
                { label: 'Completed', count: orders.filter(o => o.status === 'Completed').length },
              ].map(f => (
                <button
                  key={f.label}
                  onClick={() => setActiveFilter(f.label)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === f.label
                      ? 'bg-[#1C1917] text-white shadow-md'
                      : 'bg-white border border-[#E7E2D9] text-stone-600 hover:border-stone-400 hover:bg-stone-50'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeFilter === f.label
                          ? 'bg-white/20 text-white'
                          : f.label === 'New'
                          ? 'bg-[#E54B3C] text-white'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-[#E7E2D9] rounded-2xl p-5 animate-pulse flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-stone-200 rounded" />
                    <div className="w-48 h-3 bg-stone-100 rounded" />
                  </div>
                  <div className="w-20 h-6 bg-stone-100 rounded" />
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#E7E2D9] rounded-3xl p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-[#FCE8E6] text-[#D94A38] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Store className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-stone-800">
                No {activeFilter === 'All' ? 'active kitchen' : activeFilter.toLowerCase()} orders found
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
                Customer orders placed for your stall appear here live as soon as payment is confirmed. Keep your stall toggled online!
              </p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div
                key={order.id}
                className={`rounded-2xl relative overflow-hidden transition-all duration-300 ${
                  order.status === 'New'
                    ? 'tour-new-order-card bg-[#FCE8E6] border border-[#E54B3C] shadow-[0_4px_16px_rgba(229,75,60,0.12)]'
                    : order.status === 'Preparing'
                    ? 'bg-white border border-amber-300 shadow-sm'
                    : 'bg-[#FAF7F2] border border-[#EFEBE4] opacity-85'
                }`}
              >
                {/* Status Indicator Bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    order.status === 'New'
                      ? 'bg-[#E54B3C]'
                      : order.status === 'Preparing'
                      ? 'bg-amber-400'
                      : 'bg-stone-300'
                  }`}
                />

                {/* Card Header */}
                <div
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between pl-6 ${
                    order.status === 'Completed' ? '' : 'cursor-pointer hover:bg-black/5 transition-colors'
                  }`}
                  onClick={() => order.status !== 'Completed' && toggleOrder(order.id)}
                >
                  <div className="flex flex-1 items-start sm:items-center gap-4 sm:gap-8">
                    <div className="min-w-[80px]">
                      <div
                        className={`text-sm font-bold tracking-tight ${
                          order.status === 'Completed' ? 'text-stone-600' : 'text-stone-900'
                        }`}
                      >
                        {order.id}
                      </div>
                      <div
                        className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase mt-1 px-2 py-0.5 rounded-full ${
                          order.status === 'New'
                            ? 'bg-[#E54B3C] text-white animate-pulse'
                            : order.status === 'Preparing'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {order.status === 'New' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                        {order.status === 'Preparing' && <ChefHat className="w-3 h-3" />}
                        {order.status}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div
                        className={`text-sm font-bold leading-snug ${
                          order.status === 'Completed' ? 'text-stone-600' : 'text-stone-900'
                        }`}
                      >
                        {order.customer} · {order.items.reduce((s, it) => s + (it.quantity || 1), 0)} items
                      </div>
                      <div
                        className={`text-[11px] mt-0.5 flex items-center gap-1.5 ${
                          order.status === 'Completed' ? 'text-stone-400' : 'text-stone-600'
                        }`}
                      >
                        {order.status === 'Completed' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Clock className="w-3 h-3 text-stone-400" />
                        )}
                        <span>{order.status === 'Completed' ? 'Ready for Pickup / Delivered' : order.time}</span>
                        {order.customerPhone && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-stone-400">
                            · <Phone className="w-2.5 h-2.5" /> {order.customerPhone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-[80px] text-right">
                      <span
                        className={`text-lg font-extrabold ${
                          order.status === 'Completed' ? 'text-stone-500' : 'text-stone-900'
                        }`}
                      >
                        ₹{order.total}
                      </span>
                      <div className="text-[10px] text-emerald-600 font-bold">
                        Net: ₹{order.net}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex justify-end items-center sm:w-auto mt-2 sm:mt-0 ${
                      order.status === 'New' ? 'text-[#D94A38]' : order.status === 'Preparing' ? 'text-stone-500' : ''
                    }`}
                  >
                    {order.status === 'Completed' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider bg-white px-3 py-1.5 rounded-xl border border-stone-200">
                        <Lock className="w-3 h-3" /> Ready
                      </span>
                    ) : expandedId === order.id ? (
                      <ChevronUp className="w-5 h-5 text-stone-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-stone-600" />
                    )}
                  </div>
                </div>

                {/* Expanded Details View */}
                {expandedId === order.id && order.status !== 'Completed' && (
                  <div
                    className={`border-t p-4 sm:p-6 pl-6 animate-fadeIn ${
                      order.status === 'New' ? 'border-[#E54B3C]/20 bg-white/70' : 'border-[#E7E2D9] bg-stone-50/70'
                    }`}
                  >
                    {/* Delivery & Customer Info */}
                    {(order.deliveryAddress || order.deliveryNotes) && (
                      <div className="mb-4 bg-white p-3 rounded-xl border border-[#E7E2D9] space-y-1 text-xs">
                        {order.deliveryAddress && (
                          <div className="flex items-center gap-1.5 text-stone-700">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate">{order.deliveryAddress}</span>
                          </div>
                        )}
                        {order.deliveryNotes && (
                          <div className="flex items-center gap-1.5 text-amber-800 font-medium">
                            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Note: {order.deliveryNotes}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ordered Items List */}
                    <div className="space-y-2.5 mb-5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                        Kitchen Items to Prepare:
                      </div>
                      {order.items.map((item, i) => (
                        <div
                          key={i}
                          className="bg-white p-3 rounded-xl flex justify-between items-center text-sm font-medium border border-[#E7E2D9]"
                        >
                          <div className="flex items-center gap-2.5">
                            {item.quantity && item.quantity > 1 ? (
                              <span className="bg-[#FAF7F2] text-stone-800 font-bold px-2 py-0.5 rounded-lg border border-stone-200 text-xs">
                                {item.quantity}x
                              </span>
                            ) : (
                              <span className="text-stone-400 text-xs font-bold">1x</span>
                            )}
                            <span className="font-semibold text-stone-800">{item.name}</span>
                          </div>
                          <span className="font-bold text-stone-900">
                            ₹{item.price * (item.quantity || 1)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Payout Summary */}
                    <div className="border-t border-[#E7E2D9] pt-3.5 mb-6 space-y-1 text-xs">
                      <div className="flex justify-between items-center text-stone-500">
                        <span>Items Subtotal</span>
                        <strong className="text-stone-800 font-semibold">₹{order.total}</strong>
                      </div>
                      <div className="flex justify-between items-center text-emerald-700 font-bold">
                        <span>Vendor Net Payout (95%)</span>
                        <strong className="text-sm">₹{order.net}</strong>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'Cancelled')}
                        disabled={updatingOrderId === order.id}
                        className="flex-1 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-sm font-bold py-3.5 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {order.status === 'New' ? 'Reject Order' : 'Cancel Order'}
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateOrderStatus(
                            order.id,
                            order.status === 'New' ? 'Preparing' : 'Completed'
                          )
                        }
                        disabled={updatingOrderId === order.id}
                        className={`flex-1 text-white text-sm font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                          order.status === 'New'
                            ? 'bg-[#E54B3C] hover:bg-[#D43B2C] shadow-[0_4px_12px_rgba(229,75,60,0.25)]'
                            : 'bg-[#1C1917] hover:bg-black'
                        }`}
                      >
                        {updatingOrderId === order.id
                          ? 'Updating...'
                          : order.status === 'New'
                          ? 'Accept · Prep 10 min'
                          : 'Mark Ready for Pickup'}
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
