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
  const [orderPrepTimes, setOrderPrepTimes] = useState<Record<string, number>>({});
  const [customPrepInputs, setCustomPrepInputs] = useState<Record<string, string>>({});
  const [editingPrepId, setEditingPrepId] = useState<string | null>(null);

  // Rejection modal state
  const [rejectModalOrder, setRejectModalOrder] = useState<VendorOrder | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('OUT_OF_STOCK');
  const [itemOutStock, setItemOutStock] = useState<boolean>(true);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

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

  // Handle status update (Accept with manual ETA, Prep, Ready for Pickup, Cancel)
  const handleUpdateOrderStatus = async (
    order: VendorOrder,
    newStatus: 'Preparing' | 'Completed' | 'Cancelled',
    prepTimeMinutesOverride?: number
  ) => {
    const targetOrderId = order.orderId || order.id;

    if (newStatus === 'Cancelled') {
      const confirmed = await showConfirm({
        title: 'Reject Order',
        message: 'Are you sure you want to reject/cancel this order?',
        type: 'warning',
      });
      if (!confirmed) return;
    }

    const prepTime =
      prepTimeMinutesOverride !== undefined
        ? prepTimeMinutesOverride
        : orderPrepTimes[order.id] || order.prepTimeMinutes || 15;

    setUpdatingOrderId(order.id);
    // Optimistic UI update for instant feedback
    setOrders(prev =>
      prev.map(o =>
        o.id === order.id || o.orderId === targetOrderId
          ? { ...o, status: newStatus, prepTimeMinutes: prepTime }
          : o
      )
    );

    try {
      const res = await vendorOrderService.updateOrderStatus(
        targetOrderId,
        newStatus,
        newStatus === 'Preparing' ? prepTime : undefined
      );
      if (res.success) {
        if (newStatus === 'Preparing') {
          toast.success(`Order #${order.id} accepted with ${prepTime}m ETA! Cooking started.`);
        } else if (newStatus === 'Completed') {
          toast.success(`Order #${order.id} marked Ready for Pickup! Rider notified.`);
        } else {
          toast.info(`Order #${order.id} cancelled.`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order status.');
      // Re-sync on error
      fetchOrders(true);
    } finally {
      setUpdatingOrderId(null);
      setEditingPrepId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalOrder) return;
    const targetOrderId = rejectModalOrder.orderId || rejectModalOrder.id;

    try {
      setIsRejecting(true);
      const reasonLabel =
        rejectReason === 'OUT_OF_STOCK'
          ? 'Item Out of Stock'
          : rejectReason === 'TOO_BUSY'
            ? 'Kitchen Overloaded / Too Busy'
            : rejectReason === 'STALL_CLOSED'
              ? 'Stall Closing Soon'
              : 'Kitchen unable to prepare order';

      const res = await vendorOrderService.rejectOrder(
        targetOrderId,
        reasonLabel,
        rejectReason === 'OUT_OF_STOCK' || itemOutStock
      );

      if (res.success) {
        toast.info(res.message || 'Order rejected. Customer notified and refunded.');
        const isOffline = Boolean((res as any)?.isStallOffline || res?.data?.isStallOffline);
        if (isOffline) {
          toast.warning('⚠️ Your stall has been placed in 30-minute busy cooldown after 2 missed/rejected orders.');
        }
        setOrders(prev =>
          prev.map(o =>
            o.id === rejectModalOrder.id || o.orderId === targetOrderId
              ? { ...o, status: 'Cancelled' }
              : o
          )
        );
        fetchOrders(true);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject order.');
    } finally {
      setIsRejecting(false);
      setRejectModalOrder(null);
    }
  };

  const getEffectivePrepTime = (order: VendorOrder) => {
    return orderPrepTimes[order.id] || order.prepTimeMinutes || 15;
  };

  const setOrderPrepTimeValue = (orderId: string, mins: number) => {
    setOrderPrepTimes(prev => ({ ...prev, [orderId]: mins }));
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
                Action required: Choose preparation time and accept to notify rider & customer.
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
            <p className="text-xs text-stone-500 mt-1">Manage sub-orders and set accurate cooking ETAs in real time.</p>
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
                Customer sub-orders placed for your stall appear here live as soon as payment is confirmed. Keep your stall toggled online!
              </p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const currentPrepTime = getEffectivePrepTime(order);
              const isExpanded = expandedId === order.id || (order.status === 'New' && expandedId !== `closed-${order.id}`);

              return (
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
                    onClick={() => {
                      if (order.status === 'Completed') return;
                      if (order.status === 'New') {
                        setExpandedId(expandedId === `closed-${order.id}` ? order.id : `closed-${order.id}`);
                      } else {
                        toggleOrder(order.id);
                      }
                    }}
                  >
                    <div className="flex flex-1 items-start sm:items-center gap-4 sm:gap-8">
                      <div className="min-w-[80px]">
                        <div
                          className={`text-sm font-bold tracking-tight ${
                            order.status === 'Completed' ? 'text-stone-600' : 'text-stone-900'
                          }`}
                        >
                          {order.orderNumber
                            ? `Order #${order.orderNumber.replace('MO-', '')}`
                            : (order.id?.startsWith('ORD-')
                              ? `Order #${order.id.replace('ORD-', '')}`
                              : `Order #${order.id}`)}
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
                          className={`text-[11px] mt-0.5 flex flex-wrap items-center gap-1.5 ${
                            order.status === 'Completed' ? 'text-stone-400' : 'text-stone-600'
                          }`}
                        >
                          {order.status === 'Completed' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Clock className="w-3 h-3 text-stone-400" />
                          )}
                          <span>{order.status === 'Completed' ? 'Ready for Pickup' : order.time}</span>

                          {order.status === 'Preparing' && (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <ChefHat className="w-2.5 h-2.5" /> ETA: {currentPrepTime} mins
                            </span>
                          )}

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
                      ) : isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-stone-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-stone-600" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details View */}
                  {isExpanded && order.status !== 'Completed' && (
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
                              <span className="break-words">{order.deliveryAddress}</span>
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

                      {/* Ordered Sub-Order Items List */}
                      <div className="space-y-2.5 mb-5">
                        <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-stone-400">
                          <span>Stall Items to Prepare:</span>
                          <span className="text-stone-500 font-normal">{order.items.length} sub-item(s)</span>
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
                            <div className="flex items-center gap-3">
                              {item.status === 'READY' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Ready
                                </span>
                              )}
                              <span className="font-bold text-stone-900">
                                ₹{item.price * (item.quantity || 1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Manual Preparation Time ETA Selection (Required when New / Adjusting) */}
                      {(order.status === 'New' || editingPrepId === order.id) && (
                        <div className="mb-5 p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#E54B3C]" />
                              Select Manual Preparation Time (ETA):
                            </label>
                            <span className="text-xs font-extrabold text-[#E54B3C] bg-[#FFF4F2] px-2.5 py-0.5 rounded-full border border-[#E54B3C]/30">
                              {currentPrepTime} Minutes
                            </span>
                          </div>

                          {/* Quick Select Preset Chips */}
                          <div className="flex flex-wrap gap-2">
                            {[5, 10, 15, 20, 25, 30].map(mins => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() => {
                                  setOrderPrepTimeValue(order.id, mins);
                                  setCustomPrepInputs(prev => ({ ...prev, [order.id]: '' }));
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  currentPrepTime === mins && !customPrepInputs[order.id]
                                    ? 'bg-[#E54B3C] text-white shadow-xs'
                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                                }`}
                              >
                                {mins} min
                              </button>
                            ))}

                            {/* Custom Minutes Input */}
                            <div className="flex items-center gap-1 bg-stone-100 rounded-xl px-2 border border-stone-200">
                              <input
                                type="number"
                                min="1"
                                max="120"
                                placeholder="Custom"
                                value={customPrepInputs[order.id] || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCustomPrepInputs(prev => ({ ...prev, [order.id]: val }));
                                  const num = parseInt(val, 10);
                                  if (!isNaN(num) && num > 0) {
                                    setOrderPrepTimeValue(order.id, num);
                                  }
                                }}
                                className="w-16 py-1 text-xs font-bold bg-transparent outline-none text-stone-800 placeholder-stone-400"
                              />
                              <span className="text-[10px] font-bold text-stone-500">min</span>
                            </div>
                          </div>

                          {editingPrepId === order.id && order.status === 'Preparing' && (
                            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                              <button
                                type="button"
                                onClick={() => setEditingPrepId(null)}
                                className="px-3 py-1 text-xs font-bold text-stone-500 hover:text-stone-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order, 'Preparing', currentPrepTime)}
                                className="px-3 py-1 bg-[#1C1917] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-black"
                              >
                                Save ETA
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* When Preparing, Show ETA with quick edit option */}
                      {order.status === 'Preparing' && editingPrepId !== order.id && (
                        <div className="mb-5 p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-amber-900 font-semibold">
                            <ChefHat className="w-4 h-4 text-amber-600" />
                            <span>Preparation ETA set to: <strong>{currentPrepTime} mins</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingPrepId(order.id)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-white text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            Change ETA
                          </button>
                        </div>
                      )}

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
                          onClick={() => {
                            if (order.status === 'New') {
                              setRejectModalOrder(order);
                            } else {
                              handleUpdateOrderStatus(order, 'Cancelled');
                            }
                          }}
                          disabled={updatingOrderId === order.id}
                          className="flex-1 bg-white border border-stone-300 hover:border-red-300 hover:text-red-700 text-stone-700 text-sm font-bold py-3.5 rounded-xl hover:bg-red-50/40 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {order.status === 'New' ? 'Reject Order' : 'Cancel Order'}
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateOrderStatus(
                              order,
                              order.status === 'New' ? 'Preparing' : 'Completed',
                              order.status === 'New' ? currentPrepTime : undefined
                            )
                          }
                          disabled={updatingOrderId === order.id}
                          className={`flex-1 text-white text-sm font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2 ${
                            order.status === 'New'
                              ? 'bg-[#E54B3C] hover:bg-[#D43B2C] shadow-[0_4px_12px_rgba(229,75,60,0.25)]'
                              : 'bg-[#1C1917] hover:bg-black'
                          }`}
                        >
                          {updatingOrderId === order.id ? (
                            <span className="flex items-center gap-2">
                              <RotateCw className="w-4 h-4 animate-spin" /> Updating...
                            </span>
                          ) : order.status === 'New' ? (
                            <>
                              <ChefHat className="w-4 h-4" />
                              <span>Accept & Prep ({currentPrepTime} min)</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Mark Ready for Pickup</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Vendor Order Rejection Engine Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">Reject Incoming Order</h3>
                <span className="text-xs text-stone-500 font-mono">Order #{rejectModalOrder.id}</span>
              </div>
              <button
                onClick={() => setRejectModalOrder(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                Select a reason for rejecting this order. The customer will be instantly notified and an automated refund will be processed for unavailable items.
              </p>

              {/* Rejection Reason Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-800 block">Select Rejection Reason:</label>
                {[
                  { id: 'OUT_OF_STOCK', label: 'Item(s) Out of Stock', desc: 'Auto-marks item unavailable for today' },
                  { id: 'TOO_BUSY', label: 'Kitchen Overloaded / Too Busy', desc: 'Too many pending orders to cook' },
                  { id: 'STALL_CLOSED', label: 'Stall Closing Soon', desc: 'Kitchen shutting down for shift' },
                  { id: 'OTHER', label: 'Other Reason', desc: 'Custom kitchen issue' },
                ].map((r) => (
                  <label
                    key={r.id}
                    onClick={() => {
                      setRejectReason(r.id);
                      if (r.id === 'OUT_OF_STOCK') setItemOutStock(true);
                    }}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      rejectReason === r.id
                        ? 'bg-[#FFF4F2] border-[#E54B3C] text-[#E54B3C]'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      checked={rejectReason === r.id}
                      onChange={() => setRejectReason(r.id)}
                      className="mt-0.5 accent-[#E54B3C]"
                    />
                    <div>
                      <span className="text-xs font-bold block text-stone-900">{r.label}</span>
                      <span className="text-[11px] text-stone-500 block">{r.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Item Auto Stockout Checkbox */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-amber-900">
                  <input
                    type="checkbox"
                    checked={itemOutStock}
                    onChange={(e) => setItemOutStock(e.target.checked)}
                    className="accent-amber-600 rounded"
                  />
                  <span>Automatically mark rejected items "Out of Stock"</span>
                </label>
                <span className="text-[10px] text-amber-700 block mt-1 ml-5">
                  Prevents other customers from ordering these items until you restock them in menu settings.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isRejecting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                {isRejecting ? 'Processing Refund...' : 'Confirm Rejection & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorOrders;
