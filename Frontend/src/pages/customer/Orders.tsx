import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  FileText,
  ChevronDown,
  MapPin,
} from 'lucide-react';
import type { CartItem } from '../../types';
import { useNavigate } from 'react-router';
import { OrdersSkeleton } from '../../components';
import buttonLoader from '../../assets/Loader/button_loading.gif';
import { razorpayService } from '../../services/razorpayService';

interface OrdersProps {
  activeOrder?: {
    items: CartItem[];
    paymentMethod: string;
    timestamp: string;
  } | null;
  onNavigate?: (tab: string) => void;
}

export const Orders: React.FC<OrdersProps> = ({ activeOrder, onNavigate }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);

  const handleNav = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    }
    navigate(tab === 'home' || tab === 'discover' ? '/' : `/${tab}`);
  };

  // Load real customer orders from backend MongoDB
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchOrders = async () => {
      try {
        const res = await razorpayService.getCustomerOrders();
        if (res.success && res.data && Array.isArray(res.data)) {
          setLiveOrders(res.data);
          // If there's an ongoing live order, keep 'live' tab; otherwise switch to 'past'
          const hasActive = res.data.some(
            (o: any) => o.status && o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
          );
          if (!activeOrder && !hasActive && res.data.length > 0) {
            setActiveTab('past');
          }
        }
      } catch (err) {
        console.error('Failed to load customer orders:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [activeOrder]);

  const handleReorder = (orderId: string) => {
    setReorderingId(orderId);
    setTimeout(() => {
      setReorderingId(null);
      handleNav('home');
    }, 1500);
  };

  // Convert real MongoDB orders into UI display items
  const ordersToDisplay = liveOrders.map((o: any) => {
    const idStr = String(o.id || o._id || Math.random().toString(36).substring(2, 7));
    const orderNum = o.orderNumber || `MO-${idStr.slice(-5).toUpperCase()}`;
    const rawStalls = Array.isArray(o.stalls) && o.stalls.length > 0 ? o.stalls : [o.clusterName || 'Street Stall'];
    const cleanStalls = rawStalls.map((s: any) => (typeof s === 'string' ? s : s?.name || 'Street Stall'));
    const cleanAddress = typeof o.deliveryAddress === 'string'
      ? o.deliveryAddress
      : (o.deliveryAddress?.formatted || o.deliveryAddress?.street || 'Saved Delivery Address');

    return {
      id: orderNum,
      orderNumber: orderNum,
      realId: o.id || o._id,
      date: o.createdAt
        ? new Date(o.createdAt).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        : 'Recently',
      total: o.totalAmount || 0,
      foodItemsTotal: o.foodItemsTotal || 0,
      deliveryFee: o.deliveryFee || 0,
      taxAmount: o.taxAmount || 0,
      cluster: o.clusterName || 'StreetBites Khau Galli',
      stalls: cleanStalls,
      itemsCount: o.itemsCount || (Array.isArray(o.items) ? o.items.length : 1),
      items: Array.isArray(o.items) ? o.items : [],
      status: o.status === 'DELIVERED' ? 'Delivered' : o.status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : 'Preparing',
      rawStatus: o.status,
      payment: o.paymentMethod || 'Online',
      deliveryOtp: o.deliveryOtp,
      address: cleanAddress,
      rider: o.rider,
    };
  });

  // Identify active order for live tracking
  const currentLiveOrder: any = activeOrder
    ? {
      id: 'LIVE',
      orderNumber: 'LIVE-ORDER',
      cluster: 'StreetBites Khau Galli',
      status: 'Preparing',
      total: activeOrder.items.reduce((acc, i) => acc + (i.price || 0) * (i.quantity || 1), 0) + 49 + 5,
      items: activeOrder.items.map((it) => ({
        name: it.name,
        quantity: it.quantity || 1,
        price: it.price || 0,
        stallName: it.vendorName || it.stallName || 'Food Stall',
      })),
      stalls: Array.from(new Set(activeOrder.items.map((i) => i.vendorName || i.stallName || 'Food Stall').filter(Boolean))),
      payment: activeOrder.paymentMethod || 'Online',
      deliveryOtp: '',
      address: 'Saved Delivery Address',
      rider: null,
    }
    : ordersToDisplay.find((o) => o.rawStatus && o.rawStatus !== 'DELIVERED' && o.rawStatus !== 'CANCELLED') || null;

  const liveStalls: string[] = Array.isArray(currentLiveOrder?.stalls) && currentLiveOrder.stalls.length > 0
    ? currentLiveOrder.stalls.map((s: any) => (typeof s === 'string' ? s : s?.name || 'Food Stall'))
    : [currentLiveOrder?.cluster || 'StreetBites Khau Galli'];

  const liveItems: any[] = Array.isArray(currentLiveOrder?.items) ? currentLiveOrder.items : [];

  const renderPastOrders = () => {
    if (ordersToDisplay.length === 0) {
      return (
        <div className="bg-white border border-[#EAE4DA] rounded-3xl p-16 text-center space-y-4 max-w-2xl mx-auto my-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center mx-auto shadow-inner text-[#D94A38]">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1C1917]">No Past Orders Yet</h3>
            <p className="text-xs text-[#8E8B85] mt-1 max-w-sm mx-auto">
              Your order history will appear here once you place an order with StreetBites stalls.
            </p>
          </div>
          <button
            onClick={() => handleNav('home')}
            className="px-6 py-2.5 bg-[#D94A38] text-white text-xs font-bold rounded-xl shadow-xs border-0 cursor-pointer hover:bg-[#C43D2E] transition-all"
          >
            Explore Street Stalls
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4 max-w-4xl animate-fadeIn">
        {ordersToDisplay.map((order) => {
          const isExpanded = expandedOrderId === order.id;

          return (
            <div
              key={order.id}
              className={`bg-white rounded-3xl border ${isExpanded ? 'border-[#D94A38]' : 'border-[#EAE4DA]'
                } shadow-2xs overflow-hidden transition-all duration-300`}
            >
              {/* Clickable Header */}
              <div
                className="p-5 cursor-pointer hover:bg-[#FAF7F2] transition-colors flex flex-col md:flex-row justify-between gap-4 select-none"
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${order.status === 'Delivered'
                          ? 'bg-[#E6F4EA] text-[#137333] border-[#A7E1BA]'
                          : 'bg-[#FFF8F0] text-[#B76E00] border-[#FFE1C2]'
                        }`}
                    >
                      {order.status}
                    </span>
                    {order.deliveryOtp && (
                      <span className="bg-[#FAF0ED] text-[#D94A38] border border-[#FCE8E6] text-[10px] font-black px-2 py-0.5 rounded-md">
                        OTP: {order.deliveryOtp}
                      </span>
                    )}
                    <span className="text-xs text-[#8E8B85] font-semibold">{order.date}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1C1917] mb-1">
                    {order.cluster} Order <span className="text-[#8E8B85] font-mono font-medium ml-1">#{order.id}</span>
                  </h3>
                  <p className="text-xs text-[#4B5563]">{order.stalls.join(' · ')}</p>
                  <p className="text-xs font-black text-[#1C1917] mt-2">
                    ₹{order.total} <span className="text-[#8E8B85] font-medium mx-1">•</span>{' '}
                    <span className="font-medium text-[#4B5563]">{order.itemsCount} items</span>
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'bg-[#FCE8E6] text-[#D94A38] rotate-180' : 'bg-[#F5F0E8] text-[#8E8B85]'
                      }`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Expanded Content with Real Item Breakdown */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-[#F5F0E8] animate-fadeIn bg-[#FAF8F5]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Real Order Items */}
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#8E8B85] mb-3">
                        Order Breakdown
                      </h4>
                      <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#EAE4DA]">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="font-bold text-[#4B5563]">
                                {item.quantity || 1}x {item.name}
                                {item.stallName && (
                                  <span className="text-[10px] text-[#8E8B85] font-normal ml-1.5">
                                    ({item.stallName})
                                  </span>
                                )}
                              </span>
                              <span className="font-bold text-[#1C1917]">
                                ₹{(item.price || 0) * (item.quantity || 1)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-[#8E8B85] italic py-1">Order processed successfully</div>
                        )}
                        <div className="pt-3 mt-2 border-t border-[#F5F0E8] flex justify-between items-center text-xs text-[#8E8B85]">
                          <span>Delivery Fee</span>
                          <span>₹{order.deliveryFee}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-[#8E8B85]">
                          <span>Taxes (5% GST)</span>
                          <span>₹{order.taxAmount}</span>
                        </div>
                        <div className="pt-3 mt-2 border-t border-[#F5F0E8] flex justify-between items-center text-sm font-black text-[#D94A38]">
                          <span>Total Paid</span>
                          <span>₹{order.total}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions & Address Info */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#8E8B85] mb-3">
                        Delivery & Details
                      </h4>
                      <div className="bg-white p-4 rounded-2xl border border-[#EAE4DA] text-xs flex flex-col gap-2.5">
                        <div className="flex justify-between text-[#4B5563]">
                          <span>Payment Method:</span>
                          <span className="font-bold text-[#1C1917]">{order.payment}</span>
                        </div>
                        <div className="flex justify-between items-start text-[#4B5563] gap-2">
                          <span className="shrink-0">Delivered to:</span>
                          <span className="font-bold text-[#1C1917] text-right truncate max-w-[220px]">
                            {order.address}
                          </span>
                        </div>
                        {order.deliveryOtp && (
                          <div className="flex justify-between text-[#4B5563]">
                            <span>Delivery OTP:</span>
                            <span className="font-mono font-bold text-[#D94A38]">{order.deliveryOtp}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder(order.id);
                          }}
                          disabled={reorderingId === order.id}
                          className="w-full bg-[#D94A38] hover:bg-[#C43D2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-80"
                        >
                          {reorderingId === order.id ? (
                            <img src={buttonLoader} alt="Loading..." className="h-4 w-auto" />
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4" />
                              <span>Order Again</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return <OrdersSkeleton />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-24">
      {/* ─── DESKTOP VIEW ─── */}
      <div className="hidden md:block">
        {/* Navigation Tabs Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-xs text-[#8E8B85]">
            <button
              onClick={() => handleNav('home')}
              className="hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Home
            </button>
            <span className="mx-1">›</span>
            <span className="text-[#1C1917] font-semibold">
              {activeTab === 'live'
                ? currentLiveOrder
                  ? `${currentLiveOrder?.orderNumber || currentLiveOrder?.id || 'Live'} · Live Tracking`
                  : 'Live Order'
                : 'Order History'}
            </span>
          </div>

          <div className="bg-[#F5F0E8] p-1.5 rounded-full flex gap-1 shadow-inner border border-[#EAE4DA]">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-5 py-1.5 rounded-full text-xs font-black tracking-wide transition-all cursor-pointer border-0 ${activeTab === 'live'
                  ? 'bg-white shadow-sm text-[#D94A38]'
                  : 'text-[#8E8B85] hover:text-[#1C1917] bg-transparent'
                }`}
            >
              Live Order {currentLiveOrder ? '•' : ''}
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-5 py-1.5 rounded-full text-xs font-black tracking-wide transition-all cursor-pointer border-0 ${activeTab === 'past'
                  ? 'bg-white shadow-sm text-[#D94A38]'
                  : 'text-[#8E8B85] hover:text-[#1C1917] bg-transparent'
                }`}
            >
              Order History ({ordersToDisplay.length})
            </button>
          </div>

          <div className="w-[150px] text-right">
            {activeTab === 'live' && currentLiveOrder && (
              <span className="bg-[#E6F4EA] text-[#137333] border border-[#A7E1BA] text-[10px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-3xs select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#137333] animate-pulse" />
                Live Hub Sync
              </span>
            )}
          </div>
        </div>

        {/* ─── DESKTOP LIVE ORDER VIEW ─── */}
        {activeTab === 'live' && (
          <div className="animate-fadeIn">
            {currentLiveOrder ? (
              <div>
                {/* Header info */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-[#1C1917]">
                      Order in Progress
                    </h1>
                    <p className="text-xs text-[#8E8B85] mt-1">
                      {currentLiveOrder?.cluster || 'StreetBites Khau Galli'} · Order #{currentLiveOrder?.orderNumber || currentLiveOrder?.id || ''}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleNav('home')}
                      className="bg-white hover:bg-[#FAF7F2] text-[#4B5563] text-xs font-bold px-4 py-2 border border-[#EAE4DA] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                    >
                      <span>Explore More Food</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 items-start">
                  {/* Left: Stalls & Real Items in Order */}
                  <div className="col-span-8 space-y-6">
                    {/* Multi-Stall Sub-orders List */}
                    <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs">
                      <div className="flex justify-between items-center pb-4 border-b border-[#F5F0E8] mb-4">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917]">
                          Multi-Stall Sub-Orders
                        </h3>
                        <span className="text-[10px] text-[#8E8B85] font-bold uppercase">
                          {liveStalls.length} Stalls Consolidated
                        </span>
                      </div>
                      <div className="space-y-3">
                        {liveStalls.map((stallName: string, sIdx: number) => {
                          const stallTitle = typeof stallName === 'string' ? stallName : (stallName as any)?.name || 'Food Stall';
                          const stallItems = liveItems.filter((it: any) => {
                            const itemStall = typeof it.stallName === 'string' ? it.stallName : it.stallName?.name;
                            return !itemStall || itemStall === stallTitle;
                          });
                          return (
                            <div
                              key={sIdx}
                              className="flex justify-between items-center p-4 bg-[#FAF7F2] border border-[#EAE4DA] rounded-2xl"
                            >
                              <div className="flex gap-3 items-center">
                                <span className="w-8 h-8 rounded-full bg-[#1C1917] text-white text-xs font-black flex items-center justify-center select-none">
                                  S{sIdx + 1}
                                </span>
                                <div>
                                  <span className="text-xs font-bold text-[#1C1917] block">
                                    {stallTitle}
                                  </span>
                                  <span className="text-[10px] text-[#8E8B85] block mt-0.5">
                                    {stallItems.length > 0
                                      ? stallItems.map((i: any) => `${i.quantity || 1}x ${typeof i.name === 'string' ? i.name : (i.name?.name || 'Item')}`).join(' · ')
                                      : 'Consolidated Items'}
                                  </span>
                                </div>
                              </div>
                              <span className="bg-[#FAF0ED] text-[#D94A38] border border-[#FCE8E6] text-[10px] font-extrabold px-3 py-1 rounded-full">
                                Preparing
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delivery Address Card */}
                    <div className="bg-white rounded-3xl border border-[#EAE4DA] p-5 shadow-2xs flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#FAF0ED] text-[#D94A38] flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] uppercase font-bold text-[#8E8B85] block tracking-wider">
                          Delivering to
                        </span>
                        <span className="text-xs font-bold text-[#1C1917] block mt-0.5">
                          {typeof currentLiveOrder?.address === 'string'
                            ? currentLiveOrder.address
                            : (currentLiveOrder?.address as any)?.formatted || 'Saved Delivery Address'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Status & Delivery OTP */}
                  <div className="col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8E8B85]">
                          Order Status
                        </span>
                        <span className="bg-[#E6F4EA] text-[#137333] border border-[#A7E1BA] text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#137333] animate-pulse" />
                          CONFIRMED
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-[#1C1917]">
                          Kitchens are Cooking
                        </h3>
                        <p className="text-xs text-[#8E8B85] mt-1 leading-relaxed">
                          Your street food order is confirmed and being prepared simultaneously across participating stalls.
                        </p>
                      </div>

                      {/* Delivery Verification OTP */}
                      {currentLiveOrder?.deliveryOtp && (
                        <div className="p-4 bg-gradient-to-r from-[#FAF0ED] to-[#FFF8F0] border border-[#FCE8E6] rounded-2xl">
                          <span className="text-[10px] uppercase font-extrabold text-[#8E8B85] tracking-wider block">
                            Your 4-Digit Delivery OTP
                          </span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-2xl font-mono font-black text-[#D94A38] tracking-widest">
                              {currentLiveOrder?.deliveryOtp}
                            </span>
                            <span className="text-[10px] text-[#8E8B85] font-semibold max-w-[120px] text-right">
                              Share with rider upon doorstep delivery
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Payment summary */}
                      <div className="pt-3 border-t border-[#F5F0E8] flex justify-between items-center text-xs">
                        <span className="text-[#8E8B85]">Payment Method:</span>
                        <span className="font-bold text-[#1C1917]">{currentLiveOrder?.payment || 'Online'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-[#1C1917]">
                        <span>Total Paid:</span>
                        <span className="text-base text-[#D94A38]">₹{currentLiveOrder?.total || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty Live Order State */
              <div className="bg-white border border-[#EAE4DA] rounded-3xl p-16 text-center space-y-4 max-w-xl mx-auto my-8 animate-fadeIn">
                <div>
                  <h3 className="text-base font-bold text-[#1C1917]">No Active Orders in Progress</h3>
                  <p className="text-xs text-[#8E8B85] mt-1 max-w-sm mx-auto">
                    You don't have any food orders currently cooking or on the way.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => handleNav('home')}
                    className="px-5 py-2.5 bg-[#D94A38] hover:bg-[#C43D2E] text-white text-xs font-bold rounded-xl shadow-xs border-0 cursor-pointer transition-all"
                  >
                    Order Delicious Food
                  </button>
                  {ordersToDisplay.length > 0 && (
                    <button
                      onClick={() => setActiveTab('past')}
                      className="px-5 py-2.5 bg-[#FAF7F2] border border-[#EAE4DA] text-[#1C1917] text-xs font-bold rounded-xl cursor-pointer hover:bg-white transition-all"
                    >
                      View Past Orders ({ordersToDisplay.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── DESKTOP ORDER HISTORY VIEW ─── */}
        {activeTab === 'past' && (
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-[#1C1917] mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#D94A38]" /> Order History
            </h1>
            {renderPastOrders()}
          </div>
        )}
      </div>

      {/* ─── MOBILE VIEW ─── */}
      <div className="md:hidden block">
        {/* Top Mobile Bar */}
        <div className="flex items-center justify-between py-3.5 px-2 bg-white border-b border-[#EAE4DA] sticky top-0 z-30 mb-4">
          <button
            onClick={() => handleNav('home')}
            className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#1C1917]" />
          </button>

          <div className="bg-[#F5F0E8] p-1 rounded-full flex gap-1 shadow-inner border border-[#EAE4DA]">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-4 py-1 rounded-full text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer border-0 ${activeTab === 'live' ? 'bg-white shadow-sm text-[#D94A38]' : 'text-[#8E8B85] bg-transparent'
                }`}
            >
              Live
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 py-1 rounded-full text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer border-0 ${activeTab === 'past' ? 'bg-white shadow-sm text-[#D94A38]' : 'text-[#8E8B85] bg-transparent'
                }`}
            >
              History ({ordersToDisplay.length})
            </button>
          </div>
        </div>

        {/* Mobile Live View */}
        {activeTab === 'live' && (
          <div>
            {currentLiveOrder ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-white rounded-2xl border border-[#EAE4DA] p-4 shadow-3xs space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-[#8E8B85]">Active Order</span>
                    <span className="bg-[#E6F4EA] text-[#137333] text-[9px] font-black px-2 py-0.5 rounded-full uppercase border border-[#A7E1BA]">
                      Confirmed
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#1C1917]">Preparing Food</h2>
                  <p className="text-xs text-[#8E8B85]">
                    {currentLiveOrder?.cluster || 'StreetBites Khau Galli'} · #{currentLiveOrder?.orderNumber || currentLiveOrder?.id || ''}
                  </p>

                  {/* OTP display on mobile */}
                  {currentLiveOrder?.deliveryOtp && (
                    <div className="p-3 bg-[#FAF0ED] rounded-xl border border-[#FCE8E6] flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[#8E8B85] uppercase">Delivery OTP:</span>
                      <span className="text-lg font-mono font-black text-[#D94A38] tracking-widest">
                        {currentLiveOrder?.deliveryOtp}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#EAE4DA] p-4 shadow-3xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8B85]">
                    Sub-Orders ({liveStalls.length} Stalls)
                  </h3>
                  <div className="space-y-2">
                    {liveStalls.map((sName: any, idx: number) => {
                      const stallTitle = typeof sName === 'string' ? sName : (sName?.name || 'Food Stall');
                      return (
                        <div key={idx} className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EAE4DA] flex justify-between items-center text-xs">
                          <span className="font-bold text-[#1C1917]">{stallTitle}</span>
                          <span className="text-[10px] font-bold text-[#D94A38]">Preparing</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#EAE4DA] rounded-2xl p-10 text-center space-y-3 animate-fadeIn my-4">
                <h3 className="text-sm font-bold text-[#1C1917]">No Active Orders</h3>
                <p className="text-xs text-[#8E8B85]">
                  Order from street food stalls to track your delivery in real-time.
                </p>
                <button
                  onClick={() => handleNav('home')}
                  className="px-5 py-2 bg-[#D94A38] text-white text-xs font-bold rounded-xl border-0 cursor-pointer shadow-xs"
                >
                  Order Food
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile History View */}
        {activeTab === 'past' && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D94A38]" /> Past Orders
            </h2>
            {renderPastOrders()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
