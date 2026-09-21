import React, { useState, useEffect } from 'react';
import { IndianRupee, AlertCircle, CheckCircle2, CreditCard, Loader2 } from 'lucide-react';
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

      {/* Transactions List */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-stone-900">Recent COD Collections & Settlements</h2>
        </div>
        
        {isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-[#D94A38] animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">No COD Transactions Yet</h3>
            <p className="text-xs text-stone-500 max-w-sm">
              When you complete Cash on Delivery orders, recorded cash receipts and your settlements will be listed here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-white border border-[#EFEBE4] rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    tx.type === 'settlement' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#FCE8E6] text-[#D94A38]'
                  }`}>
                    {tx.type === 'settlement' ? <CheckCircle2 className="w-5 h-5" /> : <IndianRupee className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">
                      {tx.type === 'settlement' ? 'Settlement via Online/UPI' : `Collected for Order ${tx.order || tx.id}`}
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
        )}
      </div>
    </div>
  );
};

export default RiderDebtPage;
