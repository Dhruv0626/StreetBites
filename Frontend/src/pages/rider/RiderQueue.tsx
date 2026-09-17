import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Package, Check, X, Navigation, History, Store } from 'lucide-react';
import { useNavigate } from 'react-router';

export const RiderQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([
    {
      id: 'MO-77215',
      timeLeft: 120, // 2 minutes in seconds
      stalls: 2,
      items: 4,
      distance: '2.8 km',
      cluster: 'HL Commerce Cluster',
      drop: 'Navrangpura',
      payout: '₹55',
    },
    {
      id: 'MO-77216',
      timeLeft: 85,
      stalls: 1,
      items: 1,
      distance: '4.1 km',
      cluster: 'Vastrapur Lake Food Zone',
      drop: 'Vastrapur',
      payout: '₹72',
    },
    {
      id: 'MO-77217',
      timeLeft: 30,
      stalls: 3,
      items: 6,
      distance: '1.5 km',
      cluster: 'Manek Chowk Night Market',
      drop: 'Lal Darwaja',
      payout: '₹48',
    }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setOrders(prevOrders => 
        prevOrders
          .map(order => ({ ...order, timeLeft: order.timeLeft - 1 }))
          .filter(order => order.timeLeft > 0)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Order Queue</h1>
          <p className="text-sm text-stone-500 mt-1">You have {orders.length} new requests nearby.</p>
        </div>
        <button 
          onClick={() => navigate('/rider/Dashboard/history')}
          className="bg-white border border-[#EFEBE4] text-stone-700 hover:bg-stone-50 font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
        >
          <History className="w-4 h-4" /> Delivery History
        </button>
      </div>

      {/* Orders Grid */}
      <div className="tour-order-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {orders.map(order => {
          // Calculate circle properties (max 120s)
          const radius = 8;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (order.timeLeft / 120) * circumference;
          const formatTime = (secs: number) => {
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            return `${m}:${s.toString().padStart(2, '0')}`;
          };

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
                    <span className="text-[10px] text-[#D94A38] font-bold tracking-widest tabular-nums">
                      {formatTime(order.timeLeft)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">{order.id}</h3>
                </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#D94A38] block">{order.payout}</span>
                <span className="text-xs text-stone-400 font-medium">Est. Payout</span>
              </div>
            </div>

            {/* Middle Info */}
            <div className="space-y-3 mb-6 bg-[#F4F1EA]/50 rounded-2xl p-4 flex-1">
              <div className="flex items-center gap-3 text-sm text-stone-700 font-medium">
                <Package className="w-4 h-4 text-stone-400" />
                <span>{order.stalls} Stalls · {order.items} Items</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-stone-700 font-medium">
                <Store className="w-4 h-4 text-stone-400" />
                <span>Pickup: {order.cluster}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-stone-700 font-medium">
                <MapPin className="w-4 h-4 text-stone-400" />
                <span>Drop at {order.drop}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-stone-700 font-medium">
                <Navigation className="w-4 h-4 text-stone-400" />
                <span>{order.distance} total distance</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-auto">
              <button 
                onClick={() => setOrders(prev => prev.filter(o => o.id !== order.id))}
                className="flex-1 bg-white border-2 border-stone-200 text-stone-600 font-bold py-3 rounded-xl hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Pass
              </button>
              <button 
                onClick={() => setOrders(prev => prev.filter(o => o.id !== order.id))}
                className="tour-accept-btn flex-1 bg-[#1C1917] text-white font-bold py-3 rounded-xl hover:bg-black transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Accept
              </button>
            </div>

          </div>
        )})}
      </div>
    </div>
  );
};
