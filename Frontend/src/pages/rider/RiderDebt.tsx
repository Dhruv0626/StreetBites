import React, { useState, useEffect } from 'react';
import { IndianRupee, AlertCircle, CheckCircle2, CreditCard, Loader2, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import riderService from '../../services/riderService';
import { razorpayService } from '../../services/razorpayService';

export const RiderDebtPage: React.FC = () => {
  const { user } = useAuth();
  const [debt, setDebt] = useState<number>(0);
  const [cashLimit, setCashLimit] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [settleMessage, setSettleMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'debt' | 'credit' | 'settlement'>('all');

  const fetchDebtData = async () => {
    try {
      setIsLoading(true);
      const res = await riderService.getStats({
        riderId: user?._id || user?.id,
        email: user?.email,
      });

      if (res?.success && res.data) {
        setDebt(res.data.currentCodDebt || 0);
        setCashLimit(res.data.cashLimit ?? 0);
        setTransactions(res.data.codTransactions || []);
      }
    } catch (err) {
      console.error('Failed to load rider debt:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtData();
  }, [user]);

  const handleSettleDebt = async () => {
    if (debt <= 0) return;
    try {
      setIsSettling(true);
      setSettleMessage(null);

      const rzpOrderRes = await razorpayService.createRiderDebtOrder(user?._id || user?.id);
      if (rzpOrderRes.success && rzpOrderRes.data) {
        const d = rzpOrderRes.data;
        await razorpayService.openCheckout({
          key: d.keyId,
          amount: d.amount,
          currency: d.currency,
          order_id: d.orderId,
          customerName: user?.name || 'Rider',
          customerEmail: user?.email,
          customerPhone: user?.phone_number,
          description: `COD Cash Debt Settlement (₹${debt})`,
          onSuccess: async (rzpResp) => {
            try {
              const verifyRes = await razorpayService.verifyRiderDebtRepay({
                razorpay_order_id: rzpResp.razorpay_order_id,
                razorpay_payment_id: rzpResp.razorpay_payment_id,
                razorpay_signature: rzpResp.razorpay_signature,
                riderId: user?._id || user?.id,
              });

              if (verifyRes.success) {
                setSettleMessage(`Successfully settled ₹${debt} of COD cash debt online!`);
                setDebt(0);
                fetchDebtData();
              } else {
                setSettleMessage(verifyRes.message || 'Settlement verification failed.');
              }
            } catch (vErr: any) {
              setSettleMessage(vErr?.message || 'Error completing settlement verification.');
            } finally {
              setIsSettling(false);
            }
          },
          onDismiss: () => {
            setIsSettling(false);
          },
        });
      } else {
        // Fallback to direct settle API
        const res = await riderService.settleDebt({
          riderId: user?._id || user?.id,
          email: user?.email,
        });

        if (res.success) {
          setSettleMessage(res.message || `Successfully settled ₹${debt} debt!`);
          setDebt(0);
          fetchDebtData();
        } else {
          setSettleMessage(res.message || 'Failed to settle debt.');
        }
        setIsSettling(false);
      }
    } catch (err: any) {
      setSettleMessage(err?.message || 'Failed to settle debt.');
      setIsSettling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">COD Cash Debt</h1>
        <p className="text-sm text-stone-500 mt-1">Manage cash collected from customers during Cash-on-Delivery orders.</p>
      </div>

      {settleMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {settleMessage}
        </div>
      )}

      {/* Main Debt Card */}
      <div className="bg-[#1C1917] rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden text-white">
        <div className="absolute -top-24 -right-12 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Current Outstanding</span>
              <div className={`w-2 h-2 rounded-full ${debt > 0 ? 'bg-[#D94A38] animate-pulse' : 'bg-emerald-400'}`} />
            </div>
            <h2 className="text-5xl font-black tracking-tighter">
              {isLoading ? '...' : `₹${debt}`}
            </h2>
            <p className="text-sm text-stone-400 mt-3 max-w-sm">
              {debt > 0
                ? cashLimit > 0
                  ? `Please settle your cash debt before it exceeds the platform limit of ₹${cashLimit} to keep your delivery account active.`
                  : `Platform admin has set cash limit to ₹0. Please settle your collected cash immediately to accept new orders.`
                : cashLimit > 0
                  ? `All cash collections are fully settled. Platform cash limit: ₹${cashLimit}.`
                  : `All cash collections are fully settled. You have ₹0 outstanding debt.`}
            </p>
          </div>
          
          <button 
            onClick={handleSettleDebt}
            disabled={debt <= 0 || isSettling}
            className={`tour-debt-btn w-full sm:w-auto font-bold py-4 px-8 rounded-2xl transition-all flex items-center justify-center gap-2 shrink-0 ${
              debt > 0
                ? 'bg-[#D94A38] hover:bg-[#C43D2E] text-white shadow-[0_4px_20px_rgba(217,74,56,0.3)] hover:shadow-[0_4px_25px_rgba(217,74,56,0.4)] hover:-translate-y-0.5 cursor-pointer'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed opacity-75'
            }`}
          >
            {isSettling ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CreditCard className="w-5 h-5" />
            )}
            {isSettling ? 'Settling...' : debt > 0 ? 'Settle Debt Now' : 'No Debt to Settle'}
          </button>
        </div>
      </div>

      {/* Warning/Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-amber-800">Settlement Rules & Platform Cash Limit</h4>
          <p className="text-xs text-amber-700 mt-1">
            Cash collected on delivery belongs to StreetBites platform. The platform admin has configured a maximum COD cash debt limit of ₹{cashLimit}. You keep the hard cash, but must transfer the equivalent amount online. Settlements are processed instantly via UPI or admin ledger.
          </p>
        </div>
      </div>

      {/* Rider Fund & Debt Ledger */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Rider Fund & Debt Ledger</h2>
            <p className="text-xs text-stone-500 mt-0.5">Real-time ledger of delivery fee earnings credited, COD cash debt, and online settlements.</p>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F5F2EB] rounded-2xl shrink-0 overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'debt', label: 'COD Debt' },
              { id: 'credit', label: 'Fund Credits' },
              { id: 'settlement', label: 'Settlements' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-[#D94A38] animate-spin" />
          </div>
        ) : transactions.filter(tx => {
            if (activeTab === 'debt') return tx.type === 'debt' || tx.type === 'collection';
            if (activeTab === 'credit') return tx.type === 'credit';
            if (activeTab === 'settlement') return tx.type === 'settlement' || tx.type === 'withdrawal';
            return true;
          }).length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">No Records in Selected View</h3>
            <p className="text-xs text-stone-500 max-w-sm">
              {activeTab === 'debt'
                ? 'You currently have no outstanding COD cash debt!'
                : activeTab === 'credit'
                ? 'Delivery earnings and compensation credits will appear here once trips are completed.'
                : 'Settlements and payout withdrawals will be recorded here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions
              .filter(tx => {
                if (activeTab === 'debt') return tx.type === 'debt' || tx.type === 'collection';
                if (activeTab === 'credit') return tx.type === 'credit';
                if (activeTab === 'settlement') return tx.type === 'settlement' || tx.type === 'withdrawal';
                return true;
              })
              .map(tx => {
                const isCredit = tx.type === 'credit';
                const isDebt = tx.type === 'debt' || tx.type === 'collection';
                const isSettlement = tx.type === 'settlement';
                const isWithdrawal = tx.type === 'withdrawal';

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-white border border-[#EFEBE4] rounded-2xl hover:border-stone-300 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isCredit
                            ? 'bg-emerald-50 text-emerald-600'
                            : isDebt
                            ? 'bg-amber-50 text-amber-600'
                            : isSettlement
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {isCredit ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : isDebt ? (
                          <IndianRupee className="w-5 h-5" />
                        ) : isSettlement ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <CreditCard className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-stone-900 truncate">
                            {tx.title || (isSettlement ? 'Settlement via Online/UPI' : `Order ${tx.order || tx.id}`)}
                          </h4>
                          {tx.order && (
                            <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
                              {tx.order}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                          <span>{tx.time}</span>
                          {tx.note && <span>· {tx.note}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span
                        className={`text-base font-extrabold ${
                          isCredit
                            ? 'text-emerald-600'
                            : isSettlement
                            ? 'text-emerald-600'
                            : isDebt
                            ? 'text-stone-900'
                            : 'text-stone-800'
                        }`}
                      >
                        {isCredit ? '+' : isSettlement || isWithdrawal ? '-' : ''}
                        {tx.amount.replace(/^[-+]/, '')}
                      </span>
                      {isDebt && tx.status === 'pending' && (
                        <span className="block text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-widest mt-0.5">
                          Outstanding Debt
                        </span>
                      )}
                      {isCredit && (
                        <span className="block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-widest mt-0.5">
                          Credited to Fund
                        </span>
                      )}
                      {isSettlement && (
                        <span className="block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-widest mt-0.5">
                          Debt Cleared
                        </span>
                      )}
                      {isWithdrawal && (
                        <span className="block text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200 uppercase tracking-widest mt-0.5">
                          Transferred
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderDebtPage;
