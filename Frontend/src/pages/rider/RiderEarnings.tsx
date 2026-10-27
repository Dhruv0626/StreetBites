import React, { useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, Clock, MapPin, ChevronRight, Loader2, Package, ArrowDownLeft, Building2, ShieldCheck, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import riderService, { type RiderStats } from '../../services/riderService';

export const RiderEarningsPage: React.FC = () => {
  const { user } = useAuth();
  const { showAlert, toast } = useAlert();
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState('This Week');
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankFormData, setBankFormData] = useState({
    bankName: '',
    bankAccountNo: '',
    bankIfsc: '',
    upiId: '',
  });

  const availableBalance = stats?.walletBalance ?? user?.wallet_balance ?? 0;
  const bankName = stats?.bankName || user?.bank_name;
  const bankAccountNo = stats?.bankAccountNo || user?.bank_account_no;
  const bankIfsc = stats?.bankIfsc || user?.bank_ifsc;
  const upiId = stats?.upiId || user?.upi_id;

  const handleWithdrawClick = () => {
    if (availableBalance <= 0) {
      showAlert('You have ₹0 available balance. Complete deliveries to accumulate earnings.', 'info');
      return;
    }
    if (!bankName || !bankAccountNo) {
      setBankFormData({
        bankName: bankName || '',
        bankAccountNo: bankAccountNo || '',
        bankIfsc: bankIfsc || '',
        upiId: upiId || '',
      });
      setShowBankModal(true);
      return;
    }
    setShowWithdrawModal(true);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankFormData.bankName.trim() || !bankFormData.bankAccountNo.trim()) {
      showAlert('Please enter bank name and account number.', 'warning');
      return;
    }
    setIsSavingBank(true);
    try {
      const res = await riderService.updateBankDetails(bankFormData, {
        riderId: user?._id || user?.id,
        email: user?.email,
      });
      if (res.success && res.data) {
        setStats((prev: any) => prev ? ({
          ...prev,
          bankName: res.data.bankName,
          bankAccountNo: res.data.bankAccountNo,
          bankIfsc: res.data.bankIfsc,
          upiId: res.data.upiId,
        }) : prev);
        setShowBankModal(false);
        toast.success('Bank details linked successfully!');
      } else {
        showAlert(res.message || 'Failed to save bank details.', 'error');
      }
    } catch (err: any) {
      showAlert(err?.message || 'Error saving bank details.', 'error');
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      const res = await riderService.withdrawPayout(
        {
          amount: availableBalance,
          bankName: bankName || undefined,
          bankAccountNo: bankAccountNo || undefined,
          bankIfsc: bankIfsc || undefined,
          upiId: upiId || undefined,
        },
        {
          riderId: user?._id || user?.id,
          email: user?.email,
        }
      );
      if (res.success && res.data) {
        const payoutData = res.data;
        setStats((prev: any) => prev ? ({
          ...prev,
          walletBalance: payoutData.remainingBalance,
        }) : prev);

        setShowWithdrawModal(false);
        showAlert(`Withdrawal of ₹${payoutData.withdrawnAmount} processed successfully to your registered bank account!`, 'success');
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

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const res = await riderService.getStats({
          riderId: user?._id || user?.id,
          email: user?.email,
        });
        if (isMounted && res?.success && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to load rider earnings stats:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const defaultChartData = [
    { name: 'Mon', earnings: 0 },
    { name: 'Tue', earnings: 0 },
    { name: 'Wed', earnings: 0 },
    { name: 'Thu', earnings: 0 },
    { name: 'Fri', earnings: 0 },
    { name: 'Sat', earnings: 0 },
    { name: 'Sun', earnings: 0 },
  ];

  const chartData = stats?.chartData?.length ? stats.chartData : defaultChartData;
  const recentTrips = stats?.recentTrips || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900 text-white p-3 rounded-xl shadow-lg border border-stone-800">
          <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">{label}</p>
          <p className="text-sm font-bold">₹{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Earnings & Payouts</h1>
            <button 
              onClick={() => navigate('/rider/Dashboard/guidelines')}
              className="tour-rules-btn md:hidden bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors shadow-sm"
            >
              Rules & Regulations
            </button>
          </div>
          <p className="text-sm text-stone-500 mt-1">Real-time tracking of your delivered orders and payout balance.</p>
        </div>
        <div className="tour-filter bg-white border border-[#EFEBE4] p-1 rounded-xl flex text-sm shadow-sm">
          {['Today', 'This Week', 'This Month'].map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-1.5 rounded-lg font-bold transition-colors ${
                timeFilter === filter 
                  ? 'bg-stone-900 text-white shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#EFEBE4]">
          <Loader2 className="w-10 h-10 text-[#D94A38] animate-spin" />
          <p className="text-sm font-bold text-stone-600">Loading your real earnings data...</p>
        </div>
      ) : (
        <>
          {/* Balance & Withdrawal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            {/* Available Balance Card */}
            <div className="bg-gradient-to-br from-[#1C1917] to-[#2d2825] rounded-3xl p-6 text-white relative overflow-hidden shadow-lg flex flex-col justify-between min-h-[190px]">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <IndianRupee className="w-28 h-28 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-stone-400 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-widest">Available to Withdraw</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
                  ₹{availableBalance.toLocaleString('en-IN')}<span className="text-lg text-stone-500">.00</span>
                </div>
              </div>

              <div className="relative z-10">
                <button 
                  onClick={handleWithdrawClick}
                  className="w-full sm:w-auto bg-white text-stone-900 hover:bg-stone-100 font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Withdraw Now
                </button>
              </div>
            </div>

            {/* Linked Bank Account Card */}
            <div className="bg-white rounded-3xl border border-[#EFEBE4] p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Linked Bank Account</span>
                <button 
                  onClick={() => {
                    setBankFormData({
                      bankName: bankName || '',
                      bankAccountNo: bankAccountNo || '',
                      bankIfsc: bankIfsc || '',
                      upiId: upiId || '',
                    });
                    setShowBankModal(true);
                  }}
                  className="text-xs font-bold text-[#D94A38] hover:text-[#B83E2F] cursor-pointer"
                >
                  {bankName ? 'Edit Details' : 'Add Bank'}
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
                <div 
                  onClick={() => {
                    setBankFormData({
                      bankName: bankName || '',
                      bankAccountNo: bankAccountNo || '',
                      bankIfsc: bankIfsc || '',
                      upiId: upiId || '',
                    });
                    setShowBankModal(true);
                  }}
                  className="flex items-center gap-3 text-stone-500 py-2 cursor-pointer hover:text-stone-800 transition-colors"
                >
                  <Building2 className="w-5 h-5 text-stone-400" />
                  <span className="text-xs underline decoration-dotted">No bank account linked. Click to link bank details for payouts.</span>
                </div>
              )}
              <div className="text-[11px] text-stone-400 mt-2">
                Delivery fees are credited to your wallet balance after each completed order.
              </div>
            </div>
          </div>

          {/* Top Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { 
                label: "Today's Earnings", 
                value: `₹${stats?.todayEarnings ?? 0}`, 
                icon: IndianRupee, 
                color: 'text-[#D94A38]', 
                bg: 'bg-[#FCE8E6]' 
              },
              { 
                label: 'Completed Trips', 
                value: `${stats?.completedTripsCount ?? 0}`, 
                icon: TrendingUp, 
                color: 'text-[#D94A38]', 
                bg: 'bg-[#FCE8E6]' 
              },
              { 
                label: 'Time Online', 
                value: stats?.timeOnline ?? 'Offline', 
                icon: Clock, 
                color: 'text-[#D94A38]', 
                bg: 'bg-[#FCE8E6]' 
              },
            ].map((metric, i) => (
              <div key={i} className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${metric.bg} flex items-center justify-center shrink-0`}>
                  <metric.icon className={`w-6 h-6 ${metric.color}`} />
                </div>
                <div>
                  <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">{metric.label}</span>
                  <span className="text-2xl font-bold text-stone-900">{metric.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="lg:col-span-2 bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col min-w-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-stone-900">This Week's Trajectory</h2>
                <span className="text-2xl font-bold text-[#D94A38]">₹{stats?.totalWeekEarnings ?? 0}</span>
              </div>
              
              <div className="flex-1 w-full h-[250px] min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E2D9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#78716c', fontWeight: 'bold' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#78716c', fontWeight: 'bold' }}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#FCE8E6', opacity: 0.4 }} />
                    <Bar dataKey="earnings" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.earnings > 0 ? '#D94A38' : '#F4F1EA'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Breakdown Section */}
            <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col">
              <h2 className="text-lg font-bold text-stone-900 mb-6">Today's Breakdown</h2>
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center p-4 bg-[#F4F1EA]/50 rounded-2xl">
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">Base Pickup Fare</span>
                    <span className="text-xs text-stone-500">
                      {stats?.completedTripsCount ? `${stats.completedTripsCount} trips × ₹20` : '0 trips completed'}
                    </span>
                  </div>
                  <span className="text-base font-bold text-stone-900">₹{stats?.breakdown?.baseFare ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#F4F1EA]/50 rounded-2xl">
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">Distance Payout</span>
                    <span className="text-xs text-stone-500">Distance traveled pay</span>
                  </div>
                  <span className="text-base font-bold text-stone-900">₹{stats?.breakdown?.distancePay ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#F4F1EA]/50 rounded-2xl">
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">Multi-stall Bonus</span>
                    <span className="text-xs text-stone-500">Multi-vendor pickups</span>
                  </div>
                  <span className="text-base font-bold text-stone-900">₹{stats?.breakdown?.bonusPay ?? 0}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-[#EFEBE4] mt-4 flex justify-between items-center">
                <span className="text-sm font-bold text-stone-500 uppercase">Total Today</span>
                <span className="text-xl font-black text-[#D94A38]">₹{stats?.breakdown?.total ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Trips */}
          <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-stone-900">Recent Trips</h2>
              <button 
                className="cursor-pointer text-sm font-bold text-[#D94A38] hover:text-[#C43D2E]" 
                onClick={() => navigate('/rider/Dashboard/history')}
              >
                View Full History
              </button>
            </div>
            
            {recentTrips.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
                  <Package className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-stone-800 text-sm">No Delivery Trips Completed Yet</h4>
                <p className="text-xs text-stone-400 max-w-sm">
                  Completed deliveries and earned delivery fees will appear here once you accept and deliver orders.
                </p>
                <button
                  onClick={() => navigate('/rider/Dashboard/queue')}
                  className="mt-2 bg-[#D94A38] hover:bg-[#c43d2e] text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  View Order Queue
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTrips.map(trip => {
                  const cleanCode = trip.id
                    ? (trip.id.startsWith('MO-')
                        ? trip.id.replace('MO-', '')
                        : (trip.id.length > 8 ? trip.id.slice(-5).toUpperCase() : trip.id))
                    : '';

                  return (
                    <div 
                      key={trip.id} 
                      className="flex items-center justify-between p-4 bg-white border border-[#EFEBE4] rounded-2xl hover:border-[#D94A38]/30 transition-colors cursor-pointer group"
                      onClick={() => navigate('/rider/Dashboard/history')}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0 group-hover:bg-[#FCE8E6] transition-colors">
                          <MapPin className="w-4 h-4 text-stone-500 group-hover:text-[#D94A38]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-stone-900">Delivery Trip Earnings</h4>
                            {cleanCode && (
                              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                                Order #{cleanCode}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-stone-500 mt-0.5 block">{trip.time} · {trip.distance} · {trip.stalls} stall{trip.stalls > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold text-[#D94A38]">{trip.payout}</span>
                        <ChevronRight className="w-4 h-4 text-stone-300" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-6 border-b border-[#EFEBE4] flex justify-between items-center">
              <h3 className="text-lg font-bold text-stone-900">Withdraw Delivery Earnings</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-stone-600 mb-6">
                You are about to withdraw your available earnings to your linked bank account at {bankName || 'your registered bank'}.
              </p>
              
              <div className="bg-stone-50 rounded-2xl p-6 flex flex-col items-center mb-6">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Available Balance</span>
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

      {/* Link / Edit Bank Account Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-6 border-b border-[#EFEBE4] flex justify-between items-center bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Link Bank Account</h3>
                  <p className="text-xs text-stone-500">For rider payouts and settlements</p>
                </div>
              </div>
              <button onClick={() => setShowBankModal(false)} className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveBank} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Bank Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Bank of India / HDFC Bank"
                  value={bankFormData.bankName}
                  onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                  className="w-full bg-stone-50 border border-[#EFEBE4] rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Account Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter 9-18 digit account number"
                  value={bankFormData.bankAccountNo}
                  onChange={(e) => setBankFormData({ ...bankFormData, bankAccountNo: e.target.value })}
                  className="w-full bg-stone-50 border border-[#EFEBE4] rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SBIN0001234"
                    value={bankFormData.bankIfsc}
                    onChange={(e) => setBankFormData({ ...bankFormData, bankIfsc: e.target.value.toUpperCase() })}
                    className="w-full bg-stone-50 border border-[#EFEBE4] rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    UPI ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. rider@okhdfc"
                    value={bankFormData.upiId}
                    onChange={(e) => setBankFormData({ ...bankFormData, upiId: e.target.value })}
                    className="w-full bg-stone-50 border border-[#EFEBE4] rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="flex-1 py-3 border border-[#EFEBE4] hover:bg-stone-50 text-stone-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBank}
                  className="flex-1 py-3 bg-[#1C1917] hover:bg-black text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSavingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save & Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderEarningsPage;
