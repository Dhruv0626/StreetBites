import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Check, X, History, Store, Loader2, RefreshCw, Power, Sliders, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import riderService, { type QueueOrder } from '../../services/riderService';

export const RiderQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { triggerDrop } = useNotification();
  const knownQueueIdsRef = React.useRef<Set<string>>(new Set());
  const isFirstFetchRef = React.useRef<boolean>(true);

  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    const saved = localStorage.getItem('sb_rider_online');
    if (saved !== null) return saved === 'true';
    return Boolean((user as any)?.is_online);
  });
  const [rangeKm, setRangeKm] = useState<number>(10);
  const [isTogglingOnline, setIsTogglingOnline] = useState<boolean>(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const fetchQueue = async (customRange?: number) => {
    try {
      setIsLoading(true);
      setAcceptError(null);
      const effectiveRange = customRange !== undefined ? customRange : rangeKm;

      const res = await riderService.getQueue({
        riderId: user?._id || user?.id,
        email: user?.email,
        range: effectiveRange,
      });

      if (res.success) {
        if ((res as any).isOnline !== undefined) {
          const onlineState = Boolean((res as any).isOnline);
          setIsOnline(onlineState);
          localStorage.setItem('sb_rider_online', String(onlineState));
        }
        if ((res as any).deliveryRangeKm) {
          setRangeKm((res as any).deliveryRangeKm);
        }
        if (Array.isArray(res.data)) {
          const queueData = res.data;
          setOrders(queueData);

          if (isFirstFetchRef.current) {
            queueData.forEach((q: any) => knownQueueIdsRef.current.add(q.rawId || q.id));
            isFirstFetchRef.current = false;
          } else {
            const newArrivals = queueData.filter((q: any) => {
              const id = q.rawId || q.id;
              return id && !knownQueueIdsRef.current.has(id);
            });

            if (newArrivals.length > 0) {
              newArrivals.forEach((q: any) => knownQueueIdsRef.current.add(q.rawId || q.id));
              const newest = newArrivals[0];
              const cleanCode = newest.id
                ? (newest.id.startsWith('MO-') ? newest.id.replace('MO-', '') : newest.id)
                : '';
              triggerDrop({
                title: `New Delivery Task #${cleanCode}`,
                message: `Pickup from ${newest.cluster} · Drop: ${newest.drop} · Earn ${newest.payout}`,
                type: 'DELIVERY',
                role: 'RIDER',
                orderId: newest.rawId,
              });
            }
          }
        } else {
          setOrders([]);
        }
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to load rider queue:', err);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [user]);

  // Persistent 60-Second Countdown: Computes remaining seconds from server expiresAt timestamp
  useEffect(() => {
    if (orders.length === 0) return;
    const timer = setInterval(() => {
      setOrders(prevOrders => {
        let hasExpired = false;
        const updated = prevOrders
          .map(order => {
            let remaining = order.timeLeft - 1;
            if (order.expiresAt) {
              const diff = Math.round((new Date(order.expiresAt).getTime() - Date.now()) / 1000);
              remaining = Math.max(0, diff);
            }
            if (remaining <= 0) {
              hasExpired = true;
            }
            return { ...order, timeLeft: remaining };
          })
          .filter(order => order.timeLeft > 0);

        if (hasExpired) {
          // Re-fetch queue to receive next assigned order
          fetchQueue();
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orders.length]);

  const handleGoOnline = async () => {
    try {
      setIsTogglingOnline(true);
      setAcceptError(null);
      const res = await riderService.toggleOnlineStatus(true, {
        riderId: user?._id || user?.id,
        email: user?.email,
      });
      if (res.success) {
        setIsOnline(true);
        localStorage.setItem('sb_rider_online', 'true');
        await fetchQueue();
      }
    } catch (err: any) {
      setAcceptError(err?.message || 'Failed to switch online.');
    } finally {
      setIsTogglingOnline(false);
    }
  };

  const handleRangeChange = async (newRange: number) => {
    setRangeKm(newRange);
    try {
      await riderService.updateSettings(
        { deliveryRangeKm: newRange },
        { riderId: user?._id || user?.id, email: user?.email }
      );
      fetchQueue(newRange);
    } catch (err) {
      fetchQueue(newRange);
    }
  };

  const handleAccept = async (order: QueueOrder) => {
    try {
      setAcceptingId(order.id);
      setAcceptError(null);
      const res = await riderService.acceptOrder(order.rawId, {
        riderId: user?._id || user?.id,
        email: user?.email,
      });

      if (res.success) {
        // Navigate to active delivery route
        navigate('/rider/Dashboard/route');
      } else {
        setAcceptError(res.message || 'Failed to accept order.');
        fetchQueue();
      }
    } catch (err: any) {
      setAcceptError(err?.message || 'Order could not be accepted.');
      fetchQueue();
    } finally {
      setAcceptingId(null);
    }
  };

  const handlePass = async (order: QueueOrder) => {
    try {
      setOrders(prev => prev.filter(o => o.id !== order.id));
      await riderService.declineOrder(order.rawId, {
        riderId: user?._id || user?.id,
        email: user?.email,
      });
      fetchQueue();
    } catch (err) {
      fetchQueue();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Order Queue</h1>
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Online & Matching
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                <span className="w-2 h-2 rounded-full bg-stone-400" />
                Offline
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500 mt-1">
            {!isOnline
              ? 'You are offline. Go online to view and accept incoming delivery requests.'
              : orders.length > 0 
                ? `You have ${orders.length} delivery request${orders.length > 1 ? 's' : ''} available within ${rangeKm} km.` 
                : `Scanning for multi-stall food orders within ${rangeKm} km radius.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchQueue()}
            disabled={isLoading}
            className="bg-white border border-[#EFEBE4] text-stone-700 hover:bg-stone-50 font-bold py-2.5 px-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 text-sm cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#D94A38]' : ''}`} />
          </button>
          <button 
            onClick={() => navigate('/rider/Dashboard/history')}
            className="bg-white border border-[#EFEBE4] text-stone-700 hover:bg-stone-50 font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <History className="w-4 h-4" /> Delivery History
          </button>
        </div>
      </div>

      {acceptError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-fadeIn flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
          <span>{acceptError}</span>
        </div>
      )}

      {/* Range Controller Bar */}
      {isOnline && (
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] flex items-center justify-center text-[#D94A38] border border-[#EFEBE4]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-900">Delivery Search Radius:</span>
                <span className="text-xs font-black text-[#D94A38] bg-red-50 border border-red-100 px-2 py-0.5 rounded-lg">
                  {rangeKm} km
                </span>
              </div>
              <span className="text-[11px] text-stone-400 block mt-0.5">Only show orders with pickup clusters inside this distance</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#EFEBE4]">
              {[3, 5, 10, 15, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleRangeChange(preset)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    rangeKm === preset
                      ? 'bg-[#D94A38] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white'
                  }`}
                >
                  {preset} km
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/rider/Dashboard/profile')}
              className="text-xs font-bold text-stone-500 hover:text-stone-800 underline px-2 cursor-pointer"
            >
              Profile Settings
            </button>
          </div>
        </div>
      )}

      {/* Orders Grid or Empty / Offline State */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#EFEBE4]">
          <Loader2 className="w-10 h-10 text-[#D94A38] animate-spin" />
          <p className="text-sm font-bold text-stone-600">Scanning for available orders within {rangeKm} km...</p>
        </div>
      ) : !isOnline ? (
        /* OFFLINE State: Explicitly do not show order accept data, show prompt to go online */
        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-12 md:p-16 shadow-sm flex flex-col items-center justify-center text-center space-y-5 animate-fadeIn">
          <div className="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center text-stone-400 border border-stone-200">
            <Power className="w-10 h-10 text-stone-500" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-xl font-bold text-stone-900">You Are Currently Offline</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Order acceptance cards and dispatch requests are only displayed when your duty status is set to <strong className="text-stone-800">Online</strong>. Switch your status online to start receiving nearby multi-stall food delivery orders.
            </p>
          </div>
          <button
            onClick={handleGoOnline}
            disabled={isTogglingOnline}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3.5 px-8 rounded-2xl transition-all flex items-center gap-2.5 cursor-pointer shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isTogglingOnline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
            {isTogglingOnline ? 'Going Online...' : 'Go Online to Accept Orders'}
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-16 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#FCE8E6] flex items-center justify-center text-[#D94A38]">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-stone-900">No Orders in Range Right Now</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              You are online and monitoring within <strong className="text-stone-800">{rangeKm} km</strong>. When customers place multi-vendor orders from your nearby food street cluster, dispatch requests will appear here instantly.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleRangeChange(Math.min(25, rangeKm + 5))}
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
            >
              Expand Range to {Math.min(25, rangeKm + 5)} km
            </button>
            <button
              onClick={() => fetchQueue()}
              className="bg-stone-900 hover:bg-black text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
            </button>
          </div>
        </div>
      ) : (
        <div className="tour-order-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map(order => {
            const radius = 8;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (order.timeLeft / 60) * circumference;
            const formatTime = (secs: number) => {
              const m = Math.floor(secs / 60);
              const s = secs % 60;
              return `${m}:${s.toString().padStart(2, '0')}`;
            };

            const isAccepting = acceptingId === order.id;

            return (
              <div key={order.id} className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
                
                {/* Top Bar */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 bg-[#FCE8E6] px-2.5 py-1 rounded-full w-max border border-[#FAD1CC]">
                      <div className="relative w-5 h-5 flex items-center justify-center">
                        <svg className="w-5 h-5 -rotate-90 transform absolute">
                          <circle cx="10" cy="10" r={radius} stroke="#FAD1CC" strokeWidth="2" fill="none" />
                          <circle 
                            cx="10" cy="10" r={radius} 
                            stroke="#D94A38" strokeWidth="2" fill="none" 
                            strokeDasharray={circumference} 
                            strokeDashoffset={strokeDashoffset} 
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-linear"
                          />
                        </svg>
                        <Clock className="w-2.5 h-2.5 text-[#D94A38] absolute" />
                      </div>
                      <span className="text-[11px] font-bold text-[#D94A38] font-mono">{formatTime(order.timeLeft)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-900 block">
                        {order.id?.startsWith('MO-')
                          ? `Order #${order.id.replace('MO-', '')}`
                          : order.id?.startsWith('ORD-')
                            ? `Order #${order.id.replace('ORD-', '')}`
                            : `Order #${order.id}`}
                      </span>
                      {order.status === 'PREPARING' ? (
                        <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                          Cooking (~{order.prepTimeMinutes || 15}m)
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                          Ready for Pickup
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">Earn</span>
                    <span className="text-xl font-black text-[#D94A38]">{order.payout}</span>
                  </div>
                </div>

                {/* Details Card */}
                <div className="bg-[#FAF7F2] rounded-2xl p-4 mb-5 space-y-3 flex-1 border border-[#EFEBE4]">
                  <div className="flex items-start gap-3">
                    <Store className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Pickup Cluster</span>
                      <span className="text-xs font-bold text-stone-800">{order.cluster}</span>
                      <span className="text-[11px] text-stone-500 block mt-0.5">{order.stalls} stall{order.stalls > 1 ? 's' : ''} ({order.items} items)</span>
                    </div>
                  </div>

                  <div className="border-t border-[#EFEBE4] pt-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <MapPin className="w-4 h-4 text-[#D94A38] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Drop Location</span>
                        <span className="text-xs font-bold text-stone-800 break-words leading-snug block mt-0.5">{order.drop}</span>
                        <span className="text-[11px] text-stone-500 block mt-1">Approx. {order.distance}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md self-start shrink-0 border border-stone-200">
                      ≤ {rangeKm} km
                    </span>
                  </div>

                  {order.paymentMethod === 'COD' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-amber-800 flex items-center justify-between">
                      <span>Cash on Delivery</span>
                      <span>Collect ₹{order.totalAmount}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <button 
                    onClick={() => handlePass(order)}
                    disabled={isAccepting}
                    className="w-full bg-white hover:bg-stone-50 border border-[#EFEBE4] text-stone-600 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Decline
                  </button>
                  <button 
                    onClick={() => handleAccept(order)}
                    disabled={isAccepting}
                    className="tour-accept-btn w-full bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_4px_15px_rgba(217,74,56,0.3)] hover:shadow-[0_4px_20px_rgba(217,74,56,0.4)] cursor-pointer"
                  >
                    {isAccepting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {isAccepting ? 'Accepting...' : 'Accept'}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RiderQueuePage;
