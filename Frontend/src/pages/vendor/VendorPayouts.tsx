import React, { useState, useEffect } from 'react';
import { IndianRupee, ArrowDownLeft, Building2, ShieldCheck, Clock, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { onboardingService } from '../../services/onboardingService';
import { useAlert } from '../../context/AlertContext';

import { vendorOrderService } from '../../services/vendorOrderService';

export interface PayoutTransaction {
  id: string;
  date: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  type: string;
}

export const VendorPayoutsPage: React.FC = () => {
  const { user } = useAuth();
  const { showAlert, toast } = useAlert();
  const navigate = useNavigate();
  const [vendorData, setVendorData] = useState<{ user?: any; stall?: any } | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [transactions, setTransactions] = useState<PayoutTransaction[]>([]);
  const [pendingSettlement, setPendingSettlement] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const [detailsRes, ordersRes] = await Promise.allSettled([
          onboardingService.getVendorDetails(),
          vendorOrderService.getOrders(),
        ]);

        if (isMounted && detailsRes.status === 'fulfilled' && detailsRes.value?.success && detailsRes.value.data) {
          setVendorData(detailsRes.value.data);
        }

        if (isMounted && ordersRes.status === 'fulfilled' && ordersRes.value?.success && ordersRes.value.data) {
          const orders = ordersRes.value.data.orders || [];
          let pendingTotal = 0;
          const orderTxns: PayoutTransaction[] = orders.map((o: any) => {
            const isCompleted = o.status === 'Completed';
            if (!isCompleted && o.status !== 'Cancelled') {
              pendingTotal += Number(o.net || o.total * 0.95) || 0;
            }
            return {
              id: o.orderId || o.id,
              date: o.time || o.createdAt ? new Date(o.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently',
              amount: `+₹${Math.round((Number(o.net || o.total * 0.95) || 0) * 100) / 100}`,
              status: isCompleted ? 'completed' : 'pending',
              type: `Food Sales (${o.items?.length || 1} items)`,
            };
          });

          setTransactions(orderTxns);
          setPendingSettlement(Math.round(pendingTotal * 100) / 100);
        }
      } catch (err) {
        // Fall back gracefully to user context
      }
    };
    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentUser = vendorData?.user || user;
  const availableBalance = currentUser?.wallet_balance ?? 0;
  const bankName = currentUser?.bank_name;
  const bankAccountNo = currentUser?.bank_account_no;

  const handleWithdrawClick = () => {
    if (!bankName || !bankAccountNo) {
      showAlert('Please add your bank account details in Onboarding Details first.', 'warning');
      navigate('/vendor/registration');
      return;
    }
    if (availableBalance <= 0) {
      showAlert('You have ₹0 available balance. Complete customer orders to accumulate earnings.', 'info');
      return;
    }
    setShowWithdrawModal(true);
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      const res = await vendorOrderService.withdrawPayout();
      if (res.success && res.data) {
        setVendorData((prev: any) => ({
          ...prev,
          user: {
            ...(prev?.user || user),
            wallet_balance: res.data.remainingBalance,
          },
        }));

        const newTx: PayoutTransaction = {
          id: res.data.transactionId || `WD-${Date.now().toString().slice(-6)}`,
          date: 'Just now',
          amount: `-₹${res.data.withdrawnAmount}`,
          status: 'completed',
          type: 'Bank Transfer Settlement',
        };
        setTransactions((prev) => [newTx, ...prev]);

        setShowWithdrawModal(false);
        showAlert(`Withdrawal of ₹${res.data.withdrawnAmount} processed successfully to your registered bank account!`, 'success');
        toast.success('Payout withdrawal completed');
      } else {
        showAlert(res.message || 'Failed to process withdrawal.', 'error');
      }
    } catch (err: any) {
      showAlert(err?.message || 'Error processing payout withdrawal.', 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="animate-fadeIn pb-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Payouts & Financials</h1>
        <p className="text-sm text-stone-500 mt-1">Manage your earnings, linked bank account, and withdrawal settlements.</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-[#1C1917] to-[#2d2825] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <IndianRupee className="w-32 h-32 rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-stone-400 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-widest">Available to Withdraw</span>
            </div>
            <div className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8">
              ₹{availableBalance.toLocaleString('en-IN')}<span className="text-xl text-stone-500">.00</span>
            </div>
          </div>

          <div className="relative z-10">
            <button 
              onClick={handleWithdrawClick}
              className="tour-withdraw-button w-full sm:w-auto bg-white text-stone-900 hover:bg-stone-100 font-bold py-3 px-6 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Withdraw Now
            </button>
          </div>
        </div>

        {/* Bank Details & Pending */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#E7E2D9] p-6 shadow-sm flex flex-col justify-between h-[110px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-500">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Pending Settlement</span>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-stone-900 tracking-tight">
              ₹{pendingSettlement.toLocaleString('en-IN')}<span className="text-lg text-stone-400 font-normal">.00</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E7E2D9] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Linked Bank Account</span>
              <button 
                onClick={() => navigate('/vendor/registration')}
                className="text-xs font-bold text-[#D94A38] hover:text-[#B83E2F] cursor-pointer"
              >
                {bankName ? 'Edit' : 'Add Bank'}
              </button>
            </div>
            {bankName ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">{bankName}</h4>
                  <p className="text-xs font-medium text-stone-500 font-mono mt-0.5">
                    •••• {bankAccountNo ? bankAccountNo.slice(-4) : '----'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-stone-500 py-1">
                <Building2 className="w-5 h-5 text-stone-400" />
                <span className="text-xs">No bank account linked. Add bank details to enable payouts.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-3xl border border-[#E7E2D9] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E7E2D9] flex justify-between items-center bg-stone-50/50">
          <h2 className="text-base font-bold text-stone-900">Recent Withdrawals</h2>
          <span className="text-xs text-stone-400 font-medium">{transactions.length} recorded</span>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mx-auto mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-700">No Withdrawal History</h3>
            <p className="text-xs text-stone-400 max-w-xs mx-auto mt-1 leading-relaxed">
              When withdrawal payouts are initiated to your linked bank account, their status and settlement logs will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E7E2D9]">
            {transactions.map((txn, i) => (
              <div key={i} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${txn.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {txn.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">{txn.id}</h4>
                    <p className="text-xs text-stone-500 mt-0.5">{txn.date} · {txn.type}</p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                  <span className="text-base font-bold text-stone-900">{txn.amount}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${txn.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {txn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-6 border-b border-[#E7E2D9] flex justify-between items-center">
              <h3 className="text-lg font-bold text-stone-900">Withdraw Funds</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-stone-600 mb-6">
                You are about to withdraw your available balance to your linked account at {bankName || 'your registered bank'}.
              </p>
              
              <div className="bg-stone-50 rounded-2xl p-6 flex flex-col items-center mb-6">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Amount</span>
                <span className="text-4xl font-extrabold text-stone-900 tracking-tight">
                  ₹{availableBalance.toLocaleString('en-IN')}
                </span>
              </div>

              <button 
                onClick={handleWithdraw}
                disabled={isWithdrawing || availableBalance <= 0}
                className="w-full bg-[#1C1917] hover:bg-black text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isWithdrawing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Withdrawal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPayoutsPage;