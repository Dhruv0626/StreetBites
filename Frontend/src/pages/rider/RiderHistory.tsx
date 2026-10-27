import React, { useState, useEffect } from 'react';
import {  MapPin, CheckCircle2, ChevronLeft, Calendar, Loader2, Package } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import riderService, { type RiderHistoryItem } from '../../services/riderService';

export const RiderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pastDeliveries, setPastDeliveries] = useState<RiderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const res = await riderService.getHistory({
          riderId: user?._id || user?.id,
          email: user?.email,
        });
        if (isMounted && res.success && Array.isArray(res.data)) {
          setPastDeliveries(res.data);
        }
      } catch (err) {
        console.error('Failed to load rider history:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white border border-[#EFEBE4] rounded-xl flex items-center justify-center hover:bg-stone-50 transition-colors shrink-0 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Delivery History</h1>
          <p className="text-sm text-stone-500 mt-1">Review your real completed trips and received payouts.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-stone-400" />
          <span className="text-sm font-bold text-stone-700">All Completed Deliveries</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">Total</span>
          <span className="text-lg font-black text-stone-900">{pastDeliveries.length} Trips</span>
        </div>
      </div>

      {/* History List or Empty State */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#EFEBE4]">
          <Loader2 className="w-10 h-10 text-[#D94A38] animate-spin" />
          <p className="text-sm font-bold text-stone-600">Loading delivery records...</p>
        </div>
      ) : pastDeliveries.length === 0 ? (
        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-16 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-stone-900 text-base">No Past Deliveries Found</h3>
          <p className="text-xs text-stone-500 max-w-sm">
            Once you accept and successfully deliver orders to customers, your trip timestamps and fees will be permanently recorded here.
          </p>
          <button
            onClick={() => navigate('/rider/Dashboard/queue')}
            className="mt-2 bg-[#D94A38] hover:bg-[#c43d2e] text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            Check Queue for Orders
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pastDeliveries.map(trip => {
            const cleanCode = trip.id
              ? (trip.id.startsWith('MO-')
                  ? trip.id.replace('MO-', '')
                  : (trip.id.length > 8 ? trip.id.slice(-5).toUpperCase() : trip.id))
              : '';

            return (
              <div key={trip.id} className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-stone-900">Delivered Order</h3>
                      {cleanCode && (
                        <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
                          Order #{cleanCode}
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">{trip.time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-500 font-medium">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {trip.distance}</span>
                      <span>·</span>
                      <span>{trip.stalls} stall{trip.stalls > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-0 border-stone-100 pt-3 sm:pt-0 gap-4 sm:gap-2">
                  <span className="text-xs font-bold text-stone-400 sm:hidden">Payout</span>
                  <span className="text-lg font-black text-[#D94A38]">{trip.payout}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Delivered
                  </span>
                </div>
                
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RiderHistoryPage;
