import React, { useState } from 'react';
import { Clock, MapPin, CheckCircle2, ChevronLeft, Calendar, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';

export const RiderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [pastDeliveries, setPastDeliveries] = useState([
    { id: 'MO-77212', time: 'Today, 10:45 AM', stalls: 2, distance: '4.2 km', payout: '₹85', status: 'completed' },
    { id: 'MO-77211', time: 'Today, 09:30 AM', stalls: 1, distance: '1.8 km', payout: '₹40', status: 'completed' },
    { id: 'MO-77210', time: 'Today, 08:15 AM', stalls: 3, distance: '5.5 km', payout: '₹110', status: 'completed' },
    { id: 'MO-77199', time: 'Yesterday, 8:30 PM', stalls: 1, distance: '2.1 km', payout: '₹45', status: 'completed' },
    { id: 'MO-77190', time: 'Yesterday, 6:15 PM', stalls: 2, distance: '3.6 km', payout: '₹75', status: 'completed' },
  ]);

  const handleDelete = (id: string) => {
    setPastDeliveries(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white border border-[#EFEBE4] rounded-xl flex items-center justify-center hover:bg-stone-50 transition-colors shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Delivery History</h1>
          <p className="text-sm text-stone-500 mt-1">Review your past completed trips.</p>
        </div>
      </div>

      {/* Filter / Summary */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-stone-400" />
          <span className="text-sm font-bold text-stone-700">Last 7 Days</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">Total</span>
          <span className="text-lg font-black text-stone-900">{pastDeliveries.length} Trips</span>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {pastDeliveries.map(trip => (
          <div key={trip.id} className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold text-stone-900">{trip.id}</h3>
                  <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">{trip.time}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-500 font-medium">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {trip.distance}</span>
                  <span>·</span>
                  <span>{trip.stalls} stalls</span>
                </div>
              </div>
            </div>

            <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-0 border-stone-100 pt-3 sm:pt-0 gap-4 sm:gap-2">
              <span className="text-xs font-bold text-stone-400 sm:hidden">Payout</span>
              <span className="text-lg font-black text-[#D94A38]">{trip.payout}</span>
              <button 
                onClick={() => handleDelete(trip.id)}
                className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                title="Delete Record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
};
