import React, { useState, useEffect } from 'react';
import { TomTomMap } from '../../components/map/TomTomMap';
import { type MapMarker } from '../../types/map';
import { Compass, CheckCircle2, Navigation, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import riderService, { type ActiveRouteData } from '../../services/riderService';

export const RiderRoute: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeRoute, setActiveRoute] = useState<ActiveRouteData | null>(null);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchActiveRoute = async () => {
      try {
        setIsLoading(true);
        const res = await riderService.getActiveRoute({
          riderId: user?._id || user?.id,
          email: user?.email,
        });

        if (isMounted && res && res.success) {
          setActiveRoute(res.data || null);
          setActiveStopIndex(0);
        }
      } catch (err) {
        console.error('Failed to load active route:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchActiveRoute();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const checkpoints = activeRoute?.checkpoints || [];
  const activeCheckpoint = checkpoints.length > 0 
    ? checkpoints[Math.min(activeStopIndex, checkpoints.length - 1)] 
    : null;

  // Map markers for active checkpoints
  const routeMarkers: MapMarker[] = checkpoints.map((cp) => ({
    id: (cp.id || 'stop').toLowerCase(),
    position: Array.isArray(cp.position) && cp.position.length >= 2
      ? [cp.position[0], cp.position[1]] as [number, number]
      : [72.5873, 23.0242],
    title: cp.title || 'Stop',
    description: cp.desc || '',
    type: cp.type === 'drop' ? 'customer' : 'stall',
    popupHtml: `
      <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; padding: 4px; max-width: 200px;">
        <div style="font-weight: 800; font-size: 13px; color: #1c1917; margin-bottom: 2px;">
          ${cp.id}. ${cp.title}
        </div>
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">${cp.desc || ''}</div>
        <div style="font-size: 11px; font-weight: 700; color: #D94A38;">${cp.amount || ''}</div>
      </div>
    `,
  }));

  const handleNextCheckpoint = () => {
    if (activeStopIndex < checkpoints.length - 1) {
      setActiveStopIndex(prev => prev + 1);
    }
  };

  const handleCompleteDelivery = () => {
    if (!activeRoute) return;
    if (activeRoute.deliveryOtp && enteredOtp.trim() !== activeRoute.deliveryOtp.trim()) {
      setOtpError('Invalid Customer OTP. Please check with customer.');
      return;
    }
    setOtpError(null);
    setIsCompleting(true);
    setTimeout(() => {
      setIsCompleting(false);
      navigate('/rider/Dashboard/earnings');
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#EFEBE4] max-w-5xl mx-auto w-full">
        <Loader2 className="w-10 h-10 text-[#D94A38] animate-spin" />
        <p className="text-sm font-bold text-stone-600">Checking for active delivery assignment...</p>
      </div>
    );
  }

  // When no active delivery order is assigned
  if (!activeRoute || checkpoints.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto w-full animate-fadeIn pb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Active Delivery Route</h1>
          <p className="text-sm text-stone-500 mt-1">Live turn-by-turn checkpoints for ongoing orders.</p>
        </div>

        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-16 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
            <Compass className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-stone-900">No Active Route In Progress</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              You are not currently delivering an order. Head over to the Order Queue to accept nearby requests from Khau Galli food stalls.
            </p>
          </div>
          <button
            onClick={() => navigate('/rider/Dashboard/queue')}
            className="bg-[#D94A38] hover:bg-[#c43d2e] text-white text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-[0_4px_15px_rgba(217,74,56,0.3)] flex items-center gap-2 cursor-pointer"
          >
            Go to Order Queue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const mapCenter: [number, number] = activeCheckpoint && Array.isArray(activeCheckpoint.position) && activeCheckpoint.position.length >= 2
    ? [activeCheckpoint.position[0], activeCheckpoint.position[1]]
    : [72.5873, 23.0242];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
      {/* Top Title & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest block">
            Order · {activeRoute.orderId} · {Math.max(1, checkpoints.length - 1)} Pickups · 1 Drop
          </span>
          <h1 className="text-3xl font-medium text-stone-900 mt-2">
            Route <span className="text-[#D94A38] font-bold">{Math.min(activeStopIndex + 1, checkpoints.length)} of {checkpoints.length} stops</span>
          </h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left md:text-right w-full md:w-auto">
          <div className="bg-white md:bg-transparent p-4 md:p-0 rounded-xl border border-[#EFEBE4] md:border-none shadow-sm md:shadow-none">
            <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">Payment</span>
            <span className="text-lg font-bold text-stone-900">{activeRoute.paymentMethod}</span>
          </div>
          <div className="bg-white md:bg-transparent p-4 md:p-0 rounded-xl border border-[#EFEBE4] md:border-none shadow-sm md:shadow-none">
            <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">Earning</span>
            <span className="text-xl font-bold text-[#D94A38]">₹{activeRoute.riderEarnedFee}</span>
          </div>
          {activeRoute.paymentMethod === 'COD' && (
            <div className="bg-white md:bg-transparent p-4 md:p-0 rounded-xl border border-[#EFEBE4] md:border-none shadow-sm md:shadow-none col-span-2 sm:col-span-1">
              <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">Collect Cash</span>
              <span className="text-xl font-bold text-stone-900">₹{activeRoute.totalAmount}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Interactive TomTom Map Navigation Area */}
        <div className="lg:col-span-3 bg-white border border-[#EFEBE4] rounded-3xl h-[380px] md:h-[560px] overflow-hidden relative shadow-sm">
          <TomTomMap
            center={mapCenter}
            zoom={15}
            markers={routeMarkers}
            className="w-full h-full rounded-3xl overflow-hidden relative"
          />
          <div className="absolute bottom-6 right-6 bg-[#D94A38] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg z-10 flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5" />
            Navigating to {activeCheckpoint?.title || 'Stop'}
          </div>
        </div>

        {/* Right Col: Checkpoints */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="tour-checkpoints bg-white border border-[#EFEBE4] rounded-3xl p-6 flex-1 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-stone-900">Checkpoints</h3>
              <span className="text-xs text-stone-500 uppercase font-bold text-right">
                {checkpoints.length} STOPS
              </span>
            </div>
            
            <div className="space-y-4">
              {checkpoints.map((cp, index) => {
                const isDone = index < activeStopIndex;
                const isActive = index === activeStopIndex;

                if (isDone) {
                  return (
                    <div key={cp.id} className="bg-[#FAF7F2] border border-[#EFEBE4] rounded-2xl p-4 flex gap-4 opacity-60 transition-all">
                      <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center font-bold text-sm shrink-0">{cp.id}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <div>
                            <h4 className="text-stone-900 font-bold text-sm">{cp.title}</h4>
                            <span className="text-xs text-stone-500">{cp.desc}</span>
                          </div>
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                            {cp.type === 'drop' ? 'Delivered' : 'Collected'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isActive) {
                  return (
                    <div key={cp.id} className="bg-white border-2 border-[#D94A38] rounded-2xl p-4 flex gap-4 shadow-sm transition-all">
                      <div className="w-8 h-8 rounded-full bg-[#D94A38] text-white flex items-center justify-center font-bold text-sm shrink-0">{cp.id}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <div>
                            <h4 className="text-stone-900 font-bold text-sm">{cp.title}</h4>
                            <span className="text-xs text-stone-500">{cp.desc}</span>
                          </div>
                          <span className="bg-[#FCE8E6] text-[#D94A38] text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                            {cp.type === 'drop' ? 'Next Drop' : 'Next Pickup'}
                          </span>
                        </div>
                        <div className="mt-2 flex justify-between text-xs font-medium">
                          <span className="text-stone-500">{cp.dist}</span>
                          <span className="text-[#D94A38] font-bold">{cp.amount}</span>
                        </div>

                        {cp.type === 'pickup' ? (
                          <button
                            onClick={handleNextCheckpoint}
                            className="mt-3 w-full bg-[#D94A38] hover:bg-[#c33f2e] text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
                          >
                            Mark Collected & Proceed
                          </button>
                        ) : (
                          <div className="mt-4 space-y-2 border-t border-stone-100 pt-3">
                            <label className="text-[11px] font-bold text-stone-700 block">
                              Ask Customer for 4-Digit Delivery OTP
                            </label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Enter OTP"
                              value={enteredOtp}
                              onChange={(e) => setEnteredOtp(e.target.value)}
                              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-center tracking-widest font-mono font-bold text-base focus:border-[#D94A38] focus:outline-none"
                            />
                            {otpError && (
                              <p className="text-[10px] text-red-600 font-bold">{otpError}</p>
                            )}
                            <button
                              onClick={handleCompleteDelivery}
                              disabled={isCompleting}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                            >
                              {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              Verify OTP & Complete Delivery
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={cp.id} className="bg-white border border-[#EFEBE4] rounded-2xl p-4 flex gap-4 opacity-75">
                    <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-bold text-sm shrink-0">{cp.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <div>
                          <h4 className="text-stone-900 font-bold text-sm">{cp.title}</h4>
                          <span className="text-xs text-stone-500">{cp.desc}</span>
                        </div>
                        <span className="bg-stone-100 text-stone-600 text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                          Pending
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderRoute;
