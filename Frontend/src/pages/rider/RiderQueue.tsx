import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Package, Check, X, History, Store, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import riderService, { type QueueOrder } from '../../services/riderService';

export const RiderQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      setAcceptError(null);
      const res = await riderService.getQueue();
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
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
  }, []);

  // Timer countdown for active requests in queue
  useEffect(() => {
    if (orders.length === 0) return;
    const timer = setInterval(() => {
      setOrders(prevOrders => 
        prevOrders
          .map(order => ({ ...order, timeLeft: Math.max(0, order.timeLeft - 1) }))
          .filter(order => order.timeLeft > 0)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [orders.length]);

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

  const handlePass = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Order Queue</h1>
          <p className="text-sm text-stone-500 mt-1">
            {orders.length > 0 
              ? `You have ${orders.length} delivery request${orders.length > 1 ? 's' : ''} available nearby.` 
              : 'Real-time orders looking for rider pickup.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchQueue}
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
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-fadeIn">
          {acceptError}
        </div>
      )}

      {/* Orders Grid or Empty State */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#EFEBE4]">
          <Loader2 className="w-10 h-10 text-[#D94A38] animate-spin" />
          <p className="text-sm font-bold text-stone-600">Checking for available orders nearby...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-16 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#FCE8E6] flex items-center justify-center text-[#D94A38]">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-stone-900">No Orders in Queue Right Now</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              You are active and online. When customers place multi-vendor orders from your nearby food street cluster, dispatch requests will appear here instantly.
            </p>
          </div>
          <button
            onClick={fetchQueue}
            className="bg-stone-900 hover:bg-black text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
          </button>
        </div>
      ) : (
        <div className="tour-order-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map(order => {
            const radius = 8;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (order.timeLeft / 120) * circumference;
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
                    <span className="text-xs font-bold text-stone-900 block">{order.id}</span>
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

                  <div className="border-t border-[#EFEBE4] pt-3 flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#D94A38] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Drop Location</span>
                      <span className="text-xs font-bold text-stone-800 line-clamp-1">{order.drop}</span>
                      <span className="text-[11px] text-stone-500 block mt-0.5">Approx. {order.distance}</span>
                    </div>
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
                    onClick={() => handlePass(order.id)}
                    disabled={isAccepting}
                    className="w-full bg-white hover:bg-stone-50 border border-[#EFEBE4] text-stone-600 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Pass
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
