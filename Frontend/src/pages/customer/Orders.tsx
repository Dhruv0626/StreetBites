import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  ChevronDown,
  MapPin,
  CheckCircle2,
  Clock,
  Bike,
  ChefHat,
  ShoppingBag,
  Home,
  Phone,
  ShieldCheck,
  Star,
  XCircle,
  HelpCircle,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import type { CartItem } from '../../types';
import { useNavigate } from 'react-router';
import { OrdersSkeleton } from '../../components';
import { razorpayService } from '../../services/razorpayService';
import { reviewService } from '../../services/reviewService';
import { useAlert } from '../../context/AlertContext';
import riderAvatarImg from '../../assets/images/rider_avatar.jpg';

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
  const { toast } = useAlert();
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);

  // Cancel Order Modal State
  const [cancellingOrder, setCancellingOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Changed my mind');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Review & Rating Modal State
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);
  const [ratingScores, setRatingScores] = useState<Record<string, number>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Support / Complaint Modal State
  const [complaintOrder, setComplaintOrder] = useState<any | null>(null);
  const [complaintIssueType, setComplaintIssueType] = useState<string>('FOOD_QUALITY');
  const [complaintComment, setComplaintComment] = useState<string>('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState<boolean>(false);

  const handleNav = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    }
    navigate(tab === 'home' || tab === 'discover' ? '/' : `/${tab}`);
  };

  // Cancel order handler calling real backend endpoint
  const handleCancelOrder = async () => {
    if (!cancellingOrder) return;
    const targetId = cancellingOrder.realId || cancellingOrder.id;
    setIsCancelling(true);
    try {
      const res = await razorpayService.cancelOrder(targetId, cancelReason);
      if (res?.success) {
        toast.success(res.message || 'Order cancelled successfully.');
        setCancellingOrder(null);
        // Refresh orders immediately
        const ordersRes = await razorpayService.getCustomerOrders();
        if (ordersRes?.success && Array.isArray(ordersRes.data)) {
          setLiveOrders(ordersRes.data);
        }
      } else {
        toast.error(res?.message || 'Failed to cancel order.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error connecting to server.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Submit reviews handler calling real backend endpoint
  const handleSubmitReview = async () => {
    if (!reviewOrder) return;
    const targetOrderId = reviewOrder.realId || reviewOrder.id;

    const stalls =
      reviewOrder.stallsList && reviewOrder.stallsList.length > 0
        ? reviewOrder.stallsList
        : reviewOrder.stalls.map((sName: string) => ({ id: sName, name: sName }));

    const reviewsPayload: Array<{ stall_id: string; rating: number; comment?: string }> = [];

    for (const st of stalls) {
      const stId = String(st.id || st._id || st.name);
      const rScore = ratingScores[stId] || 5;
      const rComment = reviewComments[stId] || 'Delicious street food!';
      reviewsPayload.push({
        stall_id: stId,
        rating: rScore,
        comment: rComment,
      });
    }

    setIsSubmittingReview(true);
    try {
      const res = await reviewService.submitReview({
        order_id: targetOrderId,
        reviews: reviewsPayload,
      });
      if (res?.success) {
        toast.success(res.message || 'Thank you for your rating and review!');
        setReviewOrder(null);
        setLiveOrders((prev) =>
          prev.map((o) =>
            o.id === targetOrderId || o._id === targetOrderId ? { ...o, isReviewed: true } : o
          )
        );
      } else {
        toast.error(res?.message || 'Failed to submit review.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error submitting review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Submit customer complaint handler calling real backend endpoint
  const handleSubmitComplaint = async () => {
    if (!complaintOrder) return;
    if (!complaintComment.trim()) {
      toast.error('Please describe the problem or issue you experienced.');
      return;
    }

    const orderId = complaintOrder.realId || complaintOrder.id;
    const stallId = complaintOrder.stallsList?.[0]?.id || undefined;

    setIsSubmittingComplaint(true);
    try {
      const res = await reviewService.submitComplaint({
        order_id: orderId,
        stall_id: stallId,
        issue_type: complaintIssueType,
        comment: complaintComment.trim(),
      });
      if (res?.success) {
        toast.success(res.message || 'Support ticket created successfully!');
        setComplaintOrder(null);
        setComplaintComment('');
      } else {
        toast.error(res?.message || 'Failed to submit complaint.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error connecting to support.');
    } finally {
      setIsSubmittingComplaint(false);
    }
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

    const interval = setInterval(() => {
      fetchOrders();
    }, 4000);

    return () => clearInterval(interval);
  }, [activeOrder]);

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
      status:
        o.status === 'DELIVERED'
          ? 'Delivered'
          : o.status === 'OUT_FOR_DELIVERY'
            ? 'Out for Delivery'
            : o.status === 'CANCELLED'
              ? 'Cancelled'
              : 'Preparing',
      rawStatus: o.status,
      payment: o.paymentMethod || 'Online',
      paymentStatus: o.paymentStatus || 'PAID',
      deliveryOtp: o.status === 'DELIVERED' || o.status === 'CANCELLED' ? '- - - -' : o.deliveryOtp,
      address: cleanAddress,
      rider: o.rider,
      stallsList: o.stallsList || [],
      isReviewed: Boolean(o.isReviewed),
      reviews: o.reviews || [],
      refundedAmount: o.refundedAmount || o.refunded_amount || 0,
      deliveredAt: o.delivered_at || o.deliveredAt || o.updatedAt || o.createdAt,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
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
        status: (it as any).status || 'PENDING',
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

  // ── Calculate Distance & Live Estimated Arrival Time (ETA) ─────────────────
  const calculateDistanceKm = (c1?: [number, number] | null, c2?: [number, number] | null): number => {
    if (!c1 || !c2 || !Array.isArray(c1) || !Array.isArray(c2) || c1.length < 2 || c2.length < 2) {
      return 2.4;
    }
    const [lng1, lat1] = c1;
    const [lng2, lat2] = c2;
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return isNaN(dist) || dist <= 0 ? 2.4 : Number(dist.toFixed(1));
  };

  const getEtaDetails = (order: any) => {
    if (!order) return { minutes: 20, timeStr: '15–20 mins', arrivalClock: '', distanceKm: 2.4 };

    const rawStatus = String(order.rawStatus || order.status || '').toUpperCase();
    const isDelivered = rawStatus === 'DELIVERED' || order.status === 'Delivered';
    if (isDelivered) {
      return { minutes: 0, timeStr: 'Delivered', arrivalClock: 'Completed', distanceKm: 0 };
    }

    const dropCoords = order.deliveryCoordinates || [72.5815, 23.1118];
    const riderCoords = order.rider?.coordinates;
    const originCoords = (rawStatus === 'OUT_FOR_DELIVERY' && riderCoords)
      ? riderCoords
      : (order.clusterCoordinates || [72.5873, 23.0248]);

    const distanceKm = calculateDistanceKm(originCoords, dropCoords);

    const travelMins = Math.max(3, Math.round(distanceKm * 2.7));
    let totalMins = travelMins;

    if (rawStatus === 'OUT_FOR_DELIVERY') {
      totalMins = Math.max(4, travelMins + 2);
    } else if (rawStatus === 'READY_FOR_PICKUP') {
      totalMins = Math.max(8, travelMins + 5);
    } else {
      const prepMins = (order.items && Array.isArray(order.items))
        ? Math.max(12, ...order.items.map((i: any) => i.prepTimeMinutes || 12))
        : 14;
      totalMins = Math.max(12, prepMins + travelMins + 3);
    }

    const arrivalTime = new Date(Date.now() + totalMins * 60000);
    const arrivalClock = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      minutes: totalMins,
      timeStr: `${Math.max(2, totalMins - 3)}–${totalMins + 2} mins`,
      arrivalClock,
      distanceKm,
    };
  };

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
          const isCompleted = order.status === 'Delivered' || order.rawStatus === 'DELIVERED' || order.status === 'Cancelled' || order.rawStatus === 'CANCELLED';

          // 12-hour resolution window after order delivery / completion
          const completionTimestamp = new Date(order.deliveredAt || order.updatedAt || order.createdAt || Date.now()).getTime();
          const hoursSinceCompletion = (Date.now() - completionTimestamp) / (1000 * 60 * 60);
          const isReportAllowed = !isCompleted || hoursSinceCompletion <= 12;
          const hoursRemaining = Math.max(0, Math.ceil(12 - hoursSinceCompletion));

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
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${
                        order.status === 'Delivered'
                          ? 'bg-[#E6F4EA] text-[#137333] border-[#A7E1BA]'
                          : order.status === 'Cancelled'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-[#FFF8F0] text-[#B76E00] border-[#FFE1C2]'
                      }`}
                    >
                      {order.status}
                    </span>
                    {order.status === 'Delivered' ? (
                      <span className="bg-[#E6F4EA] text-[#137333] border border-[#A7E1BA] text-[10px] font-black px-2 py-0.5 rounded-md font-mono tracking-wider">
                        OTP: - - - -
                      </span>
                    ) : order.deliveryOtp ? (
                      <span className="bg-[#FAF0ED] text-[#D94A38] border border-[#FCE8E6] text-[10px] font-black px-2 py-0.5 rounded-md">
                        OTP: {order.deliveryOtp}
                      </span>
                    ) : null}
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
                        {order.rawStatus === 'CANCELLED' && order.refundedAmount > 0 && (
                          <div className="flex justify-between text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-xs">
                            <span className="font-semibold">Refund Status:</span>
                            <span className="font-bold">₹{order.refundedAmount} Refunded to Wallet</span>
                          </div>
                        )}
                        <div className="flex justify-between items-start text-[#4B5563] gap-2">
                          <span className="shrink-0">Delivered to:</span>
                          <span className="font-bold text-[#1C1917] text-right truncate max-w-[220px]">
                            {order.address}
                          </span>
                        </div>
                        <div className="flex justify-between text-[#4B5563]">
                          <span>Delivery OTP:</span>
                          <span className="font-mono font-bold text-[#1C1917]">
                            {order.status === 'Delivered' || order.rawStatus === 'DELIVERED' || order.status === 'Cancelled' || order.rawStatus === 'CANCELLED' ? '- - - -' : (order.deliveryOtp || '- - - -')}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Actions per Order */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#F5F0E8] items-center">
                        {order.status === 'Delivered' && (
                          <>
                            {order.isReviewed ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold shadow-3xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Reviewed & Rated</span>
                              </div>
                            ) : (
                              <button
                                disabled={isCompleted}
                                title={isCompleted ? "Order is completed" : "Rate & Review Food"}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 border border-stone-200 text-stone-400 rounded-xl text-xs font-bold shadow-3xs cursor-not-allowed select-none"
                              >
                                <Star className="w-3.5 h-3.5 text-stone-300" />
                                <span>Rate & Review Food</span>
                              </button>
                            )}
                          </>
                        )}

                        {(order.rawStatus === 'PENDING' ||
                          order.rawStatus === 'PREPARING' ||
                          order.rawStatus === 'READY_FOR_PICKUP') && (
                          <button
                            disabled={isCompleted}
                            onClick={() => !isCompleted && setCancellingOrder(order)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-3xs transition-all ${
                              isCompleted
                                ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed select-none'
                                : 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 cursor-pointer'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel Order</span>
                          </button>
                        )}

                        {/* Report Issue Button: Stays enabled for 12 hours after delivery, then disabled */}
                        {isCompleted && !isReportAllowed ? (
                          <button
                            disabled={true}
                            title="Complaint window expired (12 hours after delivery has passed)"
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 border border-stone-200 text-stone-400 rounded-xl text-xs font-bold shadow-3xs cursor-not-allowed select-none"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-stone-300" />
                            <span>Report Issue (Closed)</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setComplaintOrder(order);
                              setComplaintComment('');
                            }}
                            title={isCompleted ? `Complaint enabled (${hoursRemaining}h remaining in 12h resolution window)` : "Report an issue"}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#FAF7F2] border border-[#EAE4DA] text-stone-700 hover:border-stone-400 rounded-xl text-xs font-bold shadow-3xs transition-all cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
                            <span>
                              {isCompleted ? `Report Issue (${hoursRemaining}h left)` : 'Report Issue'}
                            </span>
                          </button>
                        )}
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
            {currentLiveOrder ? (() => {
              const rawStatus = String(currentLiveOrder?.rawStatus || currentLiveOrder?.status || '').toUpperCase();
              const isDelivered = rawStatus === 'DELIVERED' || currentLiveOrder?.status === 'Delivered';
              const isAtDoor = rawStatus === 'RIDER_AT_DOOR' || rawStatus === 'AT_DOOR' || currentLiveOrder?.rider_at_door || currentLiveOrder?.status === 'Rider at Door' || currentLiveOrder?.status === 'At Door';
              const isOutForDelivery = rawStatus === 'OUT_FOR_DELIVERY' || currentLiveOrder?.status === 'Out for Delivery';
              const isReadyForPickup = rawStatus === 'READY_FOR_PICKUP' || currentLiveOrder?.status === 'Ready for Pickup';
              const allStallsReady = liveItems.length > 0 && liveItems.every((it: any) => it.status === 'READY');
              const hasRider = !!currentLiveOrder?.rider;

              // Step Indices: 0: Stall Status, 1: Rider Collected Food, 2: Rider on the Way, 3: Rider is on Door, 4: Delivered
              let currentStep = 0;
              if (isDelivered) {
                currentStep = 4;
              } else if (isAtDoor) {
                currentStep = 3; // Rider arrived at customer doorstep
              } else if (isOutForDelivery) {
                currentStep = 2; // Rider collected from stalls & on the way
              } else if (isReadyForPickup || allStallsReady) {
                currentStep = 1; // Food ready / collected by rider
              } else {
                currentStep = 0; // Stall Status (Cooking / Preparing / Rider Assigned)
              }

              const steps = [
                {
                  id: 0,
                  label: 'Stall Status',
                  desc: 'Kitchens Preparing',
                  icon: ChefHat,
                  color: '#D94A38',
                },
                {
                  id: 1,
                  label: 'Food Collected',
                  desc: 'Gathered by Rider',
                  icon: ShoppingBag,
                  color: '#F59E0B',
                },
                {
                  id: 2,
                  label: 'Rider on the Way',
                  desc: 'En Route to Address',
                  icon: Bike,
                  color: '#0284C7',
                },
                {
                  id: 3,
                  label: 'Rider on Door',
                  desc: 'Doorstep & OTP Handoff',
                  icon: Home,
                  color: '#059669',
                },
              ];

              const etaInfo = getEtaDetails(currentLiveOrder);

              return (
                <div className="space-y-6">
                  {/* Header info */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-[#FAF0ED] text-[#D94A38] border border-[#FCE8E6] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Live Order Tracking
                        </span>
                        <span className="text-xs text-[#8E8B85] font-semibold">
                          Order #{currentLiveOrder?.orderNumber || currentLiveOrder?.id || ''}
                        </span>
                      </div>
                      <h1 className="text-3xl font-bold text-[#1C1917]">
                        {isDelivered
                          ? 'Order Delivered!'
                          : isAtDoor
                            ? '🚪 Rider is at Your Doorstep!'
                            : isOutForDelivery
                              ? 'Rider is On The Way to You!'
                              : isReadyForPickup || allStallsReady
                                ? hasRider
                                  ? 'Food Ready — Rider Collecting from Stalls'
                                  : 'Food is Ready for Pickup'
                                : hasRider
                                  ? 'Kitchens Preparing — Delivery Partner Assigned'
                                  : 'Kitchens are Preparing Your Order'}
                      </h1>
                      <p className="text-xs text-[#8E8B85] mt-1">
                        {currentLiveOrder?.cluster || 'StreetBites Khau Galli'} · {liveStalls.length} Food Stall{liveStalls.length > 1 ? 's' : ''} Consolidated
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                      {!isDelivered && !isOutForDelivery && !isAtDoor && rawStatus !== 'CANCELLED' && (
                        <button
                          onClick={() => setCancellingOrder(currentLiveOrder)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3.5 py-2 border border-red-200 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Order</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setComplaintOrder(currentLiveOrder);
                          setComplaintComment('');
                        }}
                        className="bg-white hover:bg-[#FAF7F2] text-stone-700 text-xs font-bold px-3.5 py-2 border border-[#EAE4DA] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                        <span>Need Help?</span>
                      </button>
                      <button
                        onClick={() => handleNav('home')}
                        className="bg-white hover:bg-[#FAF7F2] text-[#4B5563] text-xs font-bold px-4 py-2 border border-[#EAE4DA] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                      >
                        <span>Explore More Food</span>
                      </button>
                    </div>
                  </div>

                  {/* ─── LIVE ESTIMATED ARRIVAL TIME (ETA) & DISTANCE BANNER ─── */}
                  {!isDelivered && (
                    <div className="bg-gradient-to-r from-[#1C1917] via-[#241F1D] to-[#1C1917] text-white rounded-3xl p-6 shadow-xl border border-stone-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#D94A38]/15 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-[#D94A38]/20 border border-[#D94A38]/40 flex items-center justify-center shrink-0 shadow-inner">
                          <Clock className="w-7 h-7 text-[#D94A38] animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-[#D94A38] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                              Estimated Delivery Time
                            </span>
                            <span className="text-stone-400 text-xs font-semibold">
                              {etaInfo.distanceKm} km away
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 mt-1">
                            <h2 className="text-3xl font-black text-white tracking-tight">
                              {etaInfo.timeStr}
                            </h2>
                            <span className="text-xs text-stone-300 font-medium">
                              (Arriving by {etaInfo.arrivalClock})
                            </span>
                          </div>
                          <p className="text-xs text-stone-300 mt-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                            {isOutForDelivery
                              ? 'Rider is currently on the road traveling to your doorstep'
                              : isReadyForPickup || allStallsReady
                                ? 'Food packed! Rider is gathering packages from Khau Galli'
                                : 'Fresh street food being cooked by vendors'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-stone-900/90 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-stone-800 shrink-0 w-full md:w-auto justify-between md:justify-start">
                        <div className="text-left">
                          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                            Road Distance
                          </span>
                          <span className="text-base font-extrabold text-white">
                            {etaInfo.distanceKm} KM
                          </span>
                        </div>
                        <div className="h-8 w-[1px] bg-stone-800 mx-1" />
                        <div className="text-left">
                          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                            Delivery Mode
                          </span>
                          <span className="text-base font-extrabold text-emerald-400 flex items-center gap-1">
                            <Bike className="w-4 h-4" /> Live Ride
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── 4-STAGE FULL TRACKING FLOW STEPPER ─── */}
                  <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#D94A38] animate-ping" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1917]">
                          Live Journey Tracking
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-[#8E8B85]">
                        {isDelivered
                          ? 'All 4 Milestones Completed'
                          : `Milestone ${Math.min(currentStep + 1, 4)} of 4`}
                      </span>
                    </div>

                    <div className="relative">
                      {/* Connecting Line Background */}
                      <div className="absolute top-6 left-10 right-10 h-1 bg-[#F0ECE6] -translate-y-1/2 z-0 rounded-full" />
                      {/* Active Connecting Line Progress */}
                      <div
                        className="absolute top-6 left-10 h-1 bg-gradient-to-r from-[#D94A38] via-[#F59E0B] to-[#059669] -translate-y-1/2 z-0 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, Math.max(0, (currentStep / 3) * 100))}%`,
                          maxWidth: 'calc(100% - 80px)',
                        }}
                      />

                      <div className="grid grid-cols-4 gap-2 relative z-10">
                        {steps.map((step) => {
                          const isDone = currentStep > step.id || isDelivered;
                          const isCurrent = currentStep === step.id && !isDelivered;
                          const IconComp = step.icon;

                          return (
                            <div key={step.id} className="flex flex-col items-center text-center">
                              {/* Step Icon Badge */}
                              <div
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${isDone
                                    ? 'bg-[#059669] text-white border-2 border-[#059669]'
                                    : isCurrent
                                      ? 'bg-white text-[#D94A38] border-2 border-[#D94A38] ring-4 ring-[#D94A38]/15 scale-110'
                                      : 'bg-[#FAF7F2] text-[#8E8B85] border-2 border-[#EAE4DA]'
                                  }`}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-6 h-6 text-white" />
                                ) : (
                                  <IconComp className={`w-5 h-5 ${isCurrent ? 'animate-bounce' : ''}`} />
                                )}
                              </div>

                              {/* Label & Description */}
                              <div className="mt-3">
                                <span
                                  className={`text-xs font-black block ${isDone
                                      ? 'text-[#059669]'
                                      : isCurrent
                                        ? 'text-[#D94A38]'
                                        : 'text-[#8E8B85]'
                                    }`}
                                >
                                  {step.label}
                                </span>
                                <span className="text-[10px] text-[#8E8B85] font-semibold block mt-0.5 max-w-[130px] leading-tight">
                                  {step.desc}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Main Grid: Left Details & Right Actions */}
                  <div className="grid grid-cols-12 gap-8 items-start">
                    {/* Left: Stalls, Rider & Delivery Info */}
                    <div className="col-span-8 space-y-6">
                      {/* Multi-Stall Sub-orders Live Breakdown */}
                      <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs">
                        <div className="flex justify-between items-center pb-4 border-b border-[#F5F0E8] mb-4">
                          <div>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917]">
                              Multi-Stall Preparation Status
                            </h3>
                            <p className="text-[11px] text-[#8E8B85] mt-0.5">
                              Real-time cooking progress from {liveStalls.length} vendor stall{liveStalls.length > 1 ? 's' : ''}
                            </p>
                          </div>
                          <span className="text-[10px] text-[#8E8B85] font-bold uppercase bg-[#FAF7F2] border border-[#EAE4DA] px-2.5 py-1 rounded-full">
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
                            const isRejected = stallItems.length > 0 && stallItems.every((it: any) => it.status === 'REJECTED' || it.status === 'Cancelled');
                            const isAllReady = !isRejected && stallItems.length > 0 && stallItems.every((it: any) => it.status === 'READY');
                            const isCooking = !isRejected && !isAllReady && stallItems.some((it: any) => it.status === 'PREPARING');
                            const isAccepted = !isRejected && !isAllReady && !isCooking && stallItems.some((it: any) => it.status === 'ACCEPTED');
                            const prepMins = stallItems.find((it: any) => it.prepTimeMinutes)?.prepTimeMinutes || 15;
                            const isPickedUp = currentStep >= 1;

                            return (
                              <div
                                key={sIdx}
                                className={`flex justify-between items-center p-4 border rounded-2xl transition-all ${isRejected
                                    ? 'bg-red-50/50 border-red-200 opacity-80'
                                    : isPickedUp
                                      ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                                      : 'bg-[#FAF7F2] border-[#EAE4DA]'
                                  }`}
                              >
                                <div className="flex gap-3.5 items-center">
                                  <span
                                    className={`w-9 h-9 rounded-2xl text-xs font-black flex items-center justify-center select-none shadow-3xs ${isRejected
                                        ? 'bg-red-100 text-red-600'
                                        : isPickedUp
                                          ? 'bg-[#059669] text-white'
                                          : 'bg-[#1C1917] text-white'
                                      }`}
                                  >
                                    S{sIdx + 1}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-[#1C1917]">
                                        {stallTitle}
                                      </span>
                                      {isPickedUp && (
                                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.2 rounded-md">
                                          Collected
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-[#8E8B85] block mt-0.5">
                                      {isRejected
                                        ? 'Item unavailable (Refund processed)'
                                        : stallItems.length > 0
                                          ? stallItems.map((i: any) => `${i.quantity || 1}x ${typeof i.name === 'string' ? i.name : (i.name?.name || 'Item')}`).join(' · ')
                                          : 'Consolidated Items'}
                                    </span>
                                  </div>
                                </div>

                                {isRejected ? (
                                  <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold px-3 py-1 rounded-full">
                                    Out of Stock (Refunded)
                                  </span>
                                ) : isPickedUp ? (
                                  <span className="bg-[#E6F4EA] text-[#137333] border border-[#A7E1BA] text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#137333]" /> Picked Up by Rider
                                  </span>
                                ) : isAllReady ? (
                                  <span className="bg-[#E6F4EA] text-[#137333] border border-[#A7E1BA] text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#137333]" /> Food Ready
                                  </span>
                                ) : isCooking ? (
                                  <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-700 animate-spin" /> Cooking ({prepMins}m)
                                  </span>
                                ) : isAccepted ? (
                                  <span className="bg-[#FAF0ED] text-[#D94A38] border border-[#FCE8E6] text-[10px] font-extrabold px-3 py-1 rounded-full">
                                    Accepted
                                  </span>
                                ) : (
                                  <span className="bg-[#FAF7F2] text-[#8E8B85] border border-[#EAE4DA] text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[#8E8B85]" /> Waiting for stall...
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Assigned Rider Contact Banner */}
                      {currentLiveOrder?.rider && (
                        <div className="bg-gradient-to-r from-[#FAF0ED] to-white rounded-3xl border border-[#FCE8E6] p-5 shadow-2xs flex justify-between items-center gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[#EAE4DA] shrink-0 shadow-sm bg-white">
                              <img
                                src={currentLiveOrder.rider.avatar || riderAvatarImg}
                                alt="Rider"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#1C1917]">
                                  {currentLiveOrder.rider.name || 'StreetBites Delivery Partner'}
                                </span>
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Rider
                                </span>
                              </div>
                              <p className="text-[11px] text-[#8E8B85] mt-0.5">
                                Dedicated motorbike courier delivering all your stalls together
                              </p>
                            </div>
                          </div>

                          {currentLiveOrder.rider.phone && (
                            <a
                              href={`tel:${currentLiveOrder.rider.phone}`}
                              className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-2 shadow-3xs transition-all no-underline shrink-0"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call Rider</span>
                            </a>
                          )}
                        </div>
                      )}

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
                            Current Milestone
                          </span>
                          <span className="bg-[#E6F4EA] text-[#137333] border border-[#A7E1BA] text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#137333] animate-pulse" />
                            {isDelivered
                              ? 'COMPLETED'
                              : currentStep === 3
                                ? 'AT DOOR'
                                : currentStep === 2
                                  ? 'ON THE WAY'
                                  : currentStep === 1
                                    ? 'COLLECTING'
                                    : 'COOKING'}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-xl font-bold text-[#1C1917]">
                            {isDelivered
                              ? 'Delivered to Doorstep'
                              : currentStep === 3
                                ? 'Rider is at Your Door!'
                                : currentStep === 2
                                  ? 'Rider is On The Way'
                                  : currentStep === 1
                                    ? 'Rider Collecting Food'
                                    : 'Kitchens are Cooking'}
                          </h3>
                          <p className="text-xs text-[#8E8B85] mt-1 leading-relaxed">
                            {isDelivered
                              ? 'Your delivery is verified and completed. Enjoy your hot street food meal!'
                              : currentStep === 3
                                ? 'Your delivery partner has arrived outside. Share your 4-digit Delivery OTP below to collect your food.'
                                : currentStep === 2
                                  ? 'Your multi-stall packages have been collected and are riding straight to your destination address.'
                                  : currentStep === 1
                                    ? 'Your rider is picking up hot items from the market stalls.'
                                    : 'Participating Khau Galli stalls are preparing your items freshly in their kitchen.'}
                          </p>
                        </div>

                        {/* Delivery Verification OTP */}
                        {isDelivered || currentLiveOrder?.deliveryOtp === '- - - -' ? (
                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                            <span className="text-[10px] uppercase font-extrabold text-emerald-800 tracking-wider block">
                              Delivery Completed
                            </span>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-2xl font-mono font-black text-emerald-700 tracking-widest">
                                - - - -
                              </span>
                              <span className="text-[10px] text-emerald-700 font-bold max-w-[140px] text-right flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" /> Verified at Doorstep
                              </span>
                            </div>
                          </div>
                        ) : currentLiveOrder?.deliveryOtp ? (
                          <div className="p-4 bg-gradient-to-r from-[#FAF0ED] to-[#FFF8F0] border border-[#FCE8E6] rounded-2xl shadow-3xs">
                            <span className="text-[10px] uppercase font-extrabold text-[#8E8B85] tracking-wider block">
                              Your 4-Digit Delivery OTP
                            </span>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-3xl font-mono font-black text-[#D94A38] tracking-widest">
                                {currentLiveOrder?.deliveryOtp}
                              </span>
                              <span className="text-[10px] text-[#8E8B85] font-semibold max-w-[120px] text-right">
                                Share with rider upon doorstep delivery
                              </span>
                            </div>
                          </div>
                        ) : null}

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
              );
            })() : (
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
            {currentLiveOrder ? (() => {
              const rawStatus = String(currentLiveOrder?.rawStatus || currentLiveOrder?.status || '').toUpperCase();
              const isDelivered = rawStatus === 'DELIVERED' || currentLiveOrder?.status === 'Delivered';
              const isAtDoor = rawStatus === 'RIDER_AT_DOOR' || rawStatus === 'AT_DOOR' || currentLiveOrder?.rider_at_door || currentLiveOrder?.status === 'Rider at Door' || currentLiveOrder?.status === 'At Door';
              const isOutForDelivery = rawStatus === 'OUT_FOR_DELIVERY' || currentLiveOrder?.status === 'Out for Delivery';
              const isReadyForPickup = rawStatus === 'READY_FOR_PICKUP' || currentLiveOrder?.status === 'Ready for Pickup';
              const allStallsReady = liveItems.length > 0 && liveItems.every((it: any) => it.status === 'READY');
              const hasRider = !!currentLiveOrder?.rider;

              let currentStep = 0;
              if (isDelivered) {
                currentStep = 4;
              } else if (isAtDoor) {
                currentStep = 3;
              } else if (isOutForDelivery) {
                currentStep = 2;
              } else if (isReadyForPickup || allStallsReady) {
                currentStep = 1;
              } else {
                currentStep = 0;
              }

              const mobileSteps = [
                { id: 0, label: 'Stall Status', icon: ChefHat },
                { id: 1, label: 'Food Collected', icon: ShoppingBag },
                { id: 2, label: 'On The Way', icon: Bike },
                { id: 3, label: 'At Door', icon: Home },
              ];

              const mobileEtaInfo = getEtaDetails(currentLiveOrder);

              return (
                <div className="space-y-4 animate-fadeIn">
                  {/* Mobile Live ETA Header Card */}
                  {!isDelivered && (
                    <div className="bg-gradient-to-br from-[#1C1917] to-[#2B2320] text-white rounded-2xl p-4 shadow-lg border border-stone-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D94A38]/25 border border-[#D94A38]/40 flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5 text-[#D94A38] animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase text-[#D94A38] tracking-wider bg-[#D94A38]/20 px-2 py-0.5 rounded-full">
                              ETA
                            </span>
                            <span className="text-[11px] text-stone-400 font-semibold">
                              {mobileEtaInfo.distanceKm} km away
                            </span>
                          </div>
                          <div className="text-lg font-black text-white mt-0.5">
                            {mobileEtaInfo.timeStr}
                          </div>
                          <span className="text-[10px] text-stone-400 block -mt-0.5">
                            Expected by {mobileEtaInfo.arrivalClock}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 bg-stone-900/80 px-3 py-2 rounded-xl border border-stone-800">
                        <span className="text-[9px] uppercase font-bold text-stone-400 block">
                          Delivery
                        </span>
                        <span className="text-xs font-black text-emerald-400">
                          🛵 Fast Track
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Active Order Card */}
                  <div className="bg-white rounded-2xl border border-[#EAE4DA] p-4 shadow-3xs space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-[#8E8B85]">
                        #{currentLiveOrder?.orderNumber || currentLiveOrder?.id || ''}
                      </span>
                      <span className="bg-[#E6F4EA] text-[#137333] text-[9px] font-black px-2 py-0.5 rounded-full uppercase border border-[#A7E1BA]">
                        {isDelivered
                          ? 'Delivered'
                          : isOutForDelivery
                            ? 'On The Way'
                            : isReadyForPickup || allStallsReady
                              ? 'Food Ready'
                              : hasRider
                                ? 'Rider Assigned'
                                : 'Cooking'}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-[#1C1917]">
                      {isDelivered
                        ? 'Order Delivered!'
                        : isOutForDelivery
                          ? 'Rider is on the way!'
                          : isReadyForPickup || allStallsReady
                            ? hasRider ? 'Food Ready — Collecting' : 'Food Ready for Pickup'
                            : hasRider
                              ? 'Kitchens Cooking'
                              : 'Kitchens Cooking'}
                    </h2>
                    <p className="text-xs text-[#8E8B85]">
                      {currentLiveOrder?.cluster || 'StreetBites Khau Galli'} · {liveStalls.length} Stalls
                    </p>

                    {/* Mobile 4-Step Visual Flow */}
                    <div className="pt-2 border-t border-[#F5F0E8]">
                      <div className="grid grid-cols-4 gap-1">
                        {mobileSteps.map((mStep) => {
                          const isDone = currentStep > mStep.id || isDelivered;
                          const isCurrent = currentStep === mStep.id && !isDelivered;
                          const MIcon = mStep.icon;

                          return (
                            <div key={mStep.id} className="flex flex-col items-center text-center">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDone
                                    ? 'bg-[#059669] text-white'
                                    : isCurrent
                                      ? 'bg-[#D94A38] text-white ring-2 ring-[#D94A38]/20'
                                      : 'bg-stone-100 text-stone-400'
                                  }`}
                              >
                                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <MIcon className="w-4 h-4" />}
                              </div>
                              <span
                                className={`text-[9px] font-black mt-1 leading-tight ${isDone
                                    ? 'text-[#059669]'
                                    : isCurrent
                                      ? 'text-[#D94A38]'
                                      : 'text-[#8E8B85]'
                                  }`}
                              >
                                {mStep.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* OTP display on mobile */}
                    {isDelivered || currentLiveOrder?.deliveryOtp === '- - - -' ? (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" /> Delivered:
                        </span>
                        <span className="text-lg font-mono font-black text-emerald-700 tracking-widest">
                          - - - -
                        </span>
                      </div>
                    ) : currentLiveOrder?.deliveryOtp ? (
                      <div className="p-3 bg-[#FAF0ED] rounded-xl border border-[#FCE8E6] flex justify-between items-center">
                        <span className="text-[10px] font-bold text-[#8E8B85] uppercase">Delivery OTP:</span>
                        <span className="text-lg font-mono font-black text-[#D94A38] tracking-widest">
                          {currentLiveOrder?.deliveryOtp}
                        </span>
                      </div>
                    ) : null}

                    {/* Mobile Quick Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-[#F5F0E8]">
                      {!isDelivered && !isOutForDelivery && !isAtDoor && rawStatus !== 'CANCELLED' && (
                        <button
                          onClick={() => setCancellingOrder(currentLiveOrder)}
                          className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold rounded-xl border border-red-200 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Order</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setComplaintOrder(currentLiveOrder);
                          setComplaintComment('');
                        }}
                        className="flex-1 py-2 bg-[#FAF7F2] hover:bg-stone-100 text-stone-700 text-[11px] font-bold rounded-xl border border-[#EAE4DA] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                        <span>Need Help?</span>
                      </button>
                    </div>
                  </div>

                  {/* Rider Info Mobile Card */}
                  {currentLiveOrder?.rider && (
                    <div className="bg-white rounded-2xl border border-[#EAE4DA] p-3.5 shadow-3xs flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#EAE4DA] shrink-0 shadow-3xs bg-white">
                          <img
                            src={currentLiveOrder.rider.avatar || riderAvatarImg}
                            alt="Rider"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#1C1917] block">
                            {currentLiveOrder.rider.name || 'Delivery Partner'}
                          </span>
                          <span className="text-[10px] text-[#8E8B85]">StreetBites Delivery Partner</span>
                        </div>
                      </div>
                      {currentLiveOrder.rider.phone && (
                        <a
                          href={`tel:${currentLiveOrder.rider.phone}`}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 no-underline"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Mobile Stalls List */}
                  <div className="bg-white rounded-2xl border border-[#EAE4DA] p-4 shadow-3xs space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8B85]">
                      Sub-Orders ({liveStalls.length} Stalls)
                    </h3>
                    <div className="space-y-2">
                      {liveStalls.map((sName: any, idx: number) => {
                        const stallTitle = typeof sName === 'string' ? sName : (sName?.name || 'Food Stall');
                        const stallItems = liveItems.filter((it: any) => {
                          const itemStall = typeof it.stallName === 'string' ? it.stallName : it.stallName?.name;
                          return !itemStall || itemStall === stallTitle;
                        });
                        const isRejected = stallItems.length > 0 && stallItems.every((it: any) => it.status === 'REJECTED' || it.status === 'Cancelled');
                        const isAllReady = !isRejected && stallItems.length > 0 && stallItems.every((it: any) => it.status === 'READY');
                        const isCooking = !isRejected && !isAllReady && stallItems.some((it: any) => it.status === 'PREPARING');
                        const isAccepted = !isRejected && !isAllReady && !isCooking && stallItems.some((it: any) => it.status === 'ACCEPTED');
                        const prepMins = stallItems.find((it: any) => it.prepTimeMinutes)?.prepTimeMinutes || 15;
                        const isPickedUp = currentStep >= 1;

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex justify-between items-center text-xs ${isPickedUp ? 'bg-emerald-50/60 border-emerald-200' : 'bg-[#FAF7F2] border-[#EAE4DA]'
                              }`}
                          >
                            <div>
                              <span className="font-bold text-[#1C1917] block">{stallTitle}</span>
                              {stallItems.length > 0 && (
                                <span className="text-[10px] text-[#8E8B85]">
                                  {stallItems.map((i: any) => `${i.quantity || 1}x ${typeof i.name === 'string' ? i.name : i.name?.name}`).join(', ')}
                                </span>
                              )}
                            </div>
                            {isRejected ? (
                              <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                                Out of Stock
                              </span>
                            ) : isPickedUp ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Collected
                              </span>
                            ) : isAllReady ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready
                              </span>
                            ) : isCooking ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                Cooking ({prepMins}m)
                              </span>
                            ) : isAccepted ? (
                              <span className="text-[10px] font-bold text-[#D94A38] bg-[#FAF0ED] px-2.5 py-0.5 rounded-full border border-[#FCE8E6]">
                                Accepted
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-[#8E8B85] bg-[#FAF7F2] px-2.5 py-0.5 rounded-full border border-[#EAE4DA] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#8E8B85]" /> Waiting
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })() : (
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

      {/* ─── CANCEL ORDER CONFIRMATION MODAL ─── */}
      {cancellingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EAE4DA] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1C1917]">Cancel Order</h3>
                  <span className="text-[11px] text-[#8E8B85] font-mono">
                    #{cancellingOrder.orderNumber || cancellingOrder.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCancellingOrder(null)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] text-stone-500 hover:text-stone-900 flex items-center justify-center cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to cancel your order from <strong>{cancellingOrder.cluster}</strong>?
            </p>

            {cancellingOrder.payment !== 'COD' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Full Refund:</strong> ₹{cancellingOrder.total} will be instantly refunded to your StreetBites wallet.
                </span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1.5 uppercase tracking-wider">
                Reason for Cancellation
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs font-semibold p-3 border border-[#EAE4DA] rounded-xl bg-[#FAF7F2] outline-none focus:border-[#D94A38]"
              >
                <option value="Changed my mind">Changed my mind</option>
                <option value="Ordered wrong food items / quantity">Ordered wrong food items / quantity</option>
                <option value="Delivery wait time is too long">Delivery wait time is too long</option>
                <option value="Need to change delivery address">Need to change delivery address</option>
                <option value="Other reason">Other reason</option>
              </select>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setCancellingOrder(null)}
                disabled={isCancelling}
                className="flex-1 py-2.5 bg-[#FAF7F2] hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-xl border border-[#EAE4DA] transition-all cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RATE & REVIEW MODAL ─── */}
      {reviewOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE4DA] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1C1917]">Rate Your Street Food</h3>
                  <span className="text-[11px] text-[#8E8B85]">
                    Order #{reviewOrder.orderNumber || reviewOrder.id} · {reviewOrder.cluster}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setReviewOrder(null)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] text-stone-500 hover:text-stone-900 flex items-center justify-center cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Your honest feedback helps street vendors maintain high standards and helps fellow foodies discover great dishes!
            </p>

            {/* Individual Stalls Reviews */}
            <div className="space-y-4">
              {(reviewOrder.stallsList && reviewOrder.stallsList.length > 0
                ? reviewOrder.stallsList
                : reviewOrder.stalls.map((s: string) => ({ id: s, name: s }))
              ).map((stall: any, sIdx: number) => {
                const sId = String(stall.id || stall._id || stall.name);
                const sName = stall.name || stall.stall_name || stall;
                const currentRating = ratingScores[sId] || 5;
                const currentComment = reviewComments[sId] || '';

                return (
                  <div key={sIdx} className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE4DA] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1C1917]">{sName}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setRatingScores((prev) => ({ ...prev, [sId]: star }))
                            }
                            className="p-1 cursor-pointer bg-transparent border-0"
                          >
                            <Star
                              className={`w-5 h-5 transition-transform hover:scale-110 ${
                                star <= currentRating
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-stone-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Share your thoughts on taste, quantity, or packaging..."
                      value={currentComment}
                      onChange={(e) =>
                        setReviewComments((prev) => ({ ...prev, [sId]: e.target.value }))
                      }
                      className="w-full text-xs font-medium p-2.5 bg-white border border-[#EAE4DA] rounded-xl outline-none focus:border-[#D94A38]"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setReviewOrder(null)}
                disabled={isSubmittingReview}
                className="flex-1 py-2.5 bg-[#FAF7F2] hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-xl border border-[#EAE4DA] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                className="flex-1 py-2.5 bg-[#D94A38] hover:bg-[#C43D2E] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmittingReview ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Reviews</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REPORT ISSUE / COMPLAINT MODAL ─── */}
      {complaintOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EAE4DA] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1C1917]">Report Issue / Get Help</h3>
                  <span className="text-[11px] text-[#8E8B85]">
                    Order #{complaintOrder.orderNumber || complaintOrder.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setComplaintOrder(null)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] text-stone-500 hover:text-stone-900 flex items-center justify-center cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1.5 uppercase tracking-wider">
                What went wrong?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'FOOD_QUALITY', label: 'Food Quality / Taste' },
                  { id: 'WRONG_ITEM', label: 'Missing / Wrong Item' },
                  { id: 'LATE_DELIVERY', label: 'Late Delivery' },
                  { id: 'RIDER_BEHAVIOR', label: 'Rider Behavior' },
                  { id: 'OTHER', label: 'Other Support Issue' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setComplaintIssueType(t.id)}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all ${
                      complaintIssueType === t.id
                        ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs'
                        : 'bg-[#FAF7F2] text-stone-700 border-[#EAE4DA] hover:bg-stone-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1.5 uppercase tracking-wider">
                Describe the problem
              </label>
              <textarea
                rows={3}
                placeholder="Please describe what happened in detail so our operations team can resolve it..."
                value={complaintComment}
                onChange={(e) => setComplaintComment(e.target.value)}
                className="w-full text-xs font-medium p-3 bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl outline-none focus:border-[#D94A38] resize-none"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-800">
              Your ticket will be routed directly to StreetBites admin support for immediate dispute resolution.
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setComplaintOrder(null)}
                disabled={isSubmittingComplaint}
                className="flex-1 py-2.5 bg-[#FAF7F2] hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-xl border border-[#EAE4DA] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComplaint}
                disabled={isSubmittingComplaint}
                className="flex-1 py-2.5 bg-[#D94A38] hover:bg-[#C43D2E] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmittingComplaint ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Ticket</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;

