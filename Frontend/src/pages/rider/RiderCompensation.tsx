import React, { useState } from 'react';
import { FileText, Clock, CheckCircle2, XCircle, Plus } from 'lucide-react';

export const RiderCompensationPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const claims = [
    { id: 'C-881', date: 'Aug 14, 2026', type: 'Long wait at stall', order: 'MO-77190', amount: '₹30', status: 'approved' },
    { id: 'C-880', date: 'Aug 12, 2026', type: 'Customer cancelled', order: 'MO-77112', amount: '₹40', status: 'pending' },
    { id: 'C-879', date: 'Aug 10, 2026', type: 'Address change', order: 'MO-77055', amount: '₹15', status: 'rejected' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Compensations</h1>
          <p className="text-sm text-stone-500 mt-1">File claims for extra wait time or cancellations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="tour-claim-btn bg-[#1C1917] hover:bg-black text-white font-bold py-3 px-5 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> File New Claim
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block mb-1">Approved This Week</span>
          <span className="text-3xl font-black text-[#D94A38]">₹125</span>
        </div>
        <div className="w-16 h-16 bg-[#FCE8E6] rounded-2xl flex items-center justify-center">
          <FileText className="w-8 h-8 text-[#D94A38]" />
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-stone-900 mb-6">Recent Claims</h2>
        
        <div className="space-y-4">
          {claims.map(claim => (
            <div key={claim.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-stone-50 border border-[#EFEBE4] rounded-2xl gap-4">
              
              <div className="flex gap-4 items-start">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  claim.status === 'approved' ? 'bg-red-100 text-red-600' :
                  claim.status === 'pending' ? 'bg-red-100 text-red-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {claim.status === 'approved' && <CheckCircle2 className="w-5 h-5" />}
                  {claim.status === 'pending' && <Clock className="w-5 h-5" />}
                  {claim.status === 'rejected' && <XCircle className="w-5 h-5" />}
                </div>
                
                <div>
                  <h4 className="text-sm font-bold text-stone-900">{claim.type}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-stone-500 bg-white border border-stone-200 px-2 py-0.5 rounded-md">{claim.order}</span>
                    <span className="text-xs text-stone-400">{claim.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-stone-200 pt-3 sm:pt-0">
                <span className="text-base font-bold text-stone-900">{claim.amount}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${
                  claim.status === 'approved' ? 'text-emerald-600' :
                  claim.status === 'pending' ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {claim.status}
                </span>
              </div>
              
            </div>
          ))}
        </div>
      </div>

      {/* New Claim Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-stone-900">File New Claim</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Claim Type</label>
                <select className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-700 focus:outline-none focus:border-[#D94A38] bg-white">
                  <option>Long wait at stall ( 15 mins)</option>
                  <option>Customer cancelled after pickup</option>
                   <option>Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Order ID (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. MO-12345"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-700 focus:outline-none focus:border-[#D94A38]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Provide brief details about the issue..."
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-700 focus:outline-none focus:border-[#D94A38] resize-none"
                />
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold py-3.5 rounded-xl transition-colors shadow-md mt-4"
              >
                Submit Claim
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
