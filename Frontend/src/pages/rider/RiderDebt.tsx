import React from 'react';
import { IndianRupee, AlertCircle, CheckCircle2, CreditCard, } from 'lucide-react';

export const RiderDebtPage: React.FC = () => {
  const debtTransactions = [
    { id: 'TX-991', type: 'collection', amount: '₹430', order: 'MO-77213', time: 'Today, 2:15 PM', status: 'pending' },
    { id: 'TX-990', type: 'collection', amount: '₹120', order: 'MO-77209', time: 'Today, 11:30 AM', status: 'pending' },
    { id: 'TX-989', type: 'settlement', amount: '₹850', method: 'UPI', time: 'Yesterday, 8:00 PM', status: 'completed' },
    { id: 'TX-988', type: 'collection', amount: '₹350', order: 'MO-77150', time: 'Yesterday, 4:45 PM', status: 'completed' },
    { id: 'TX-987', type: 'collection', amount: '₹500', order: 'MO-77142', time: 'Yesterday, 2:10 PM', status: 'completed' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">COD Debt</h1>
        <p className="text-sm text-stone-500 mt-1">Manage cash collected from customers.</p>
      </div>

      {/* Main Debt Card */}
      <div className="bg-[#1C1917] rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden text-white">
        {/* Decor */}
        <div className="absolute -top-24 -right-12 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Current Outstanding</span>
              <div className="w-2 h-2 rounded-full bg-[#D94A38] animate-pulse" />
            </div>
            <h2 className="text-5xl font-black tracking-tighter">₹450</h2>
            <p className="text-sm text-stone-400 mt-3 max-w-sm">
              Please settle your debt before it exceeds ₹500 to avoid account suspension.
            </p>
          </div>
          
          <button className="tour-debt-btn w-full sm:w-auto bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-[0_4px_20px_rgba(217,74,56,0.3)] hover:shadow-[0_4px_25px_rgba(217,74,56,0.4)] hover:-translate-y-0.5 flex items-center justify-center gap-2 shrink-0">
            <CreditCard className="w-5 h-5" /> Settle Debt Now
          </button>
        </div>
      </div>

      {/* Warning/Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-amber-800">Settlement Rules</h4>
          <p className="text-xs text-amber-700 mt-1">Cash collected on delivery belongs to StreetBites. You can keep the cash, but you must transfer the equivalent amount online. Settlements are processed instantly via UPI.</p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-stone-900">Recent Transactions</h2>
        </div>
        
        <div className="space-y-4">
          {debtTransactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-white border border-[#EFEBE4] rounded-2xl">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  tx.type === 'settlement' ? 'bg-[#FCE8E6] text-[#D94A38]' : 'bg-[#FCE8E6] text-[#D94A38]'
                }`}>
                  {tx.type === 'settlement' ? <CheckCircle2 className="w-5 h-5" /> : <IndianRupee className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    {tx.type === 'settlement' ? `Settlement via ${tx.method}` : `Collected for ${tx.order}`}
                  </h4>
                  <span className="text-xs text-stone-500">{tx.time}</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-base font-bold ${tx.type === 'settlement' ? 'text-emerald-600' : 'text-stone-900'}`}>
                  {tx.type === 'settlement' ? '-' : '+'}{tx.amount}
                </span>
                {tx.status === 'pending' && (
                  <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">Unsettled</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
