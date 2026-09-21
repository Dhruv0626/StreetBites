import React, { useState } from 'react';
import { FileText, Clock, CheckCircle2, XCircle, Plus, AlertCircle } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect';

interface ClaimItem {
  id: string;
  date: string;
  type: string;
  order: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const RiderCompensationPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [claimType, setClaimType] = useState('Long wait at stall (>15 mins)');
  const [orderNumber, setOrderNumber] = useState('');
  const [claimAmount, setClaimAmount] = useState('30');
  const [claimNotes, setClaimNotes] = useState('');

  // Clean dynamic claims list
  const [claims, setClaims] = useState<ClaimItem[]>(() => {
    const saved = localStorage.getItem('sb_rider_claims');
    return saved ? JSON.parse(saved) : [];
  });

  const approvedTotal = claims
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + parseInt(c.amount.replace(/[^0-9]/g, '') || '0', 10), 0);

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    const newClaim: ClaimItem = {
      id: `C-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      type: claimType,
      order: orderNumber.startsWith('MO-') ? orderNumber : `MO-${orderNumber}`,
      amount: `₹${claimAmount}`,
      status: 'pending',
    };

    const updated = [newClaim, ...claims];
    setClaims(updated);
    localStorage.setItem('sb_rider_claims', JSON.stringify(updated));
    setOrderNumber('');
    setClaimNotes('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Rider Compensations</h1>
          <p className="text-sm text-stone-500 mt-1">File claims for excessive stall wait time, customer cancellations, or route diversions.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="tour-claim-btn bg-[#1C1917] hover:bg-black text-white font-bold py-3 px-5 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" /> File New Claim
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block mb-1">Approved This Week</span>
          <span className="text-3xl font-black text-[#D94A38]">₹{approvedTotal}</span>
        </div>
        <div className="w-16 h-16 bg-[#FCE8E6] rounded-2xl flex items-center justify-center">
          <FileText className="w-8 h-8 text-[#D94A38]" />
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-stone-900 mb-6">Filed Claims</h2>
        
        {claims.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
              <AlertCircle className="w-7 h-7 text-stone-400" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">No Compensation Claims Filed</h3>
            <p className="text-xs text-stone-500 max-w-sm">
              If you experience more than 15 minutes of vendor preparation wait time or customer cancellation after pickup, you can submit a compensation claim.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 bg-stone-900 hover:bg-black text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-colors cursor-pointer"
            >
              File a Claim
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map(claim => (
              <div key={claim.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-stone-50 border border-[#EFEBE4] rounded-2xl gap-4">
                
                <div className="flex gap-4 items-start">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    claim.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                    claim.status === 'pending' ? 'bg-amber-100 text-amber-600' :
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
        )}
      </div>

      {/* New Claim Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-stone-900">File New Claim</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600 cursor-pointer">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitClaim} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Claim Type</label>
                <CustomSelect
                  value={claimType}
                  onChange={(val) => setClaimType(val)}
                  options={[
                    { value: 'Long wait at stall (>15 mins)', label: 'Long wait at stall (>15 mins)' },
                    { value: 'Customer cancelled after pickup', label: 'Customer cancelled after pickup' },
                    { value: 'Customer incorrect address / route change', label: 'Customer incorrect address / route change' },
                    { value: 'Vendor stall closed or out of stock', label: 'Vendor stall closed or out of stock' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Order ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. MO-77215"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#EFEBE4] rounded-xl px-4 py-2.5 text-sm font-bold text-stone-900 focus:outline-none focus:border-[#D94A38]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Requested Compensation Amount (₹)</label>
                <input 
                  type="number" 
                  min="10"
                  max="100"
                  required
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#EFEBE4] rounded-xl px-4 py-2.5 text-sm font-bold text-stone-900 focus:outline-none focus:border-[#D94A38]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Notes / Explanation</label>
                <textarea 
                  rows={3}
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  placeholder="Describe what happened at the stall or drop location..."
                  className="w-full bg-[#FAF7F2] border border-[#EFEBE4] rounded-xl p-3 text-sm text-stone-900 focus:outline-none focus:border-[#D94A38] resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer shadow-md"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderCompensationPage;
