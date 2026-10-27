import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Search, FileDown, CheckCircle2, Clock, Loader2, RefreshCw, AlertCircle, Banknote } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { TableRowsSkeleton } from '../../components/Skeleton';

export const AdminTransactions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payouts' | 'refunds'>('payouts');
  const [payouts, setPayouts] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [floatingCodCash, setFloatingCodCash] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getTransactions();
      if (res.success && res.data) {
        setPayouts(res.data.payouts || []);
        setRefunds(res.data.refunds || []);
        setFloatingCodCash(res.data.floatingCodCash || 0);
      } else {
        setErrorMessage(res.message || 'Failed to fetch transactions');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error connecting to database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredPayouts = payouts.filter(p => 
    p.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.vendorNames?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.riderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.note?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRefunds = refunds.filter(r => 
    r.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalNetRevenue = payouts
    .reduce((acc, p) => acc + (Number(p.platformGain) || 0), 0);

  const pendingPayoutTotal = payouts
    .filter(p => p.status === 'pending')
    .reduce((acc, p) => acc + (Number(p.vendorGain) || 0) + (Number(p.riderGain) || 0), 0);

  const totalRefundsProcessed = refunds
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  const handleProcessAllPending = async () => {
    const pendingList = payouts.filter(p => p.status === 'pending');
    if (pendingList.length === 0) {
      alert("No pending payouts to process.");
      return;
    }
    if (!window.confirm(`Process all ${pendingList.length} pending payouts?`)) return;

    setIsProcessing(true);
    try {
      const res = await adminService.processPayouts();
      if (res.success) {
        setPayouts(prev => prev.map(p => ({ ...p, status: 'completed' })));
        fetchTransactions();
      } else {
        alert(res.message || "Failed to process payouts");
      }
    } catch (err: any) {
      alert(err?.message || "Error processing payouts");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessSingle = async (txId: string) => {
    if (!window.confirm("Settle this payout now?")) return;
    setIsProcessing(true);
    try {
      const res = await adminService.processPayouts(txId);
      if (res.success) {
        setPayouts(prev => prev.map(p => p.id === txId ? { ...p, status: 'completed' } : p));
        fetchTransactions();
      } else {
        alert(res.message || "Failed to settle payout");
      }
    } catch (err: any) {
      alert(err?.message || "Error settling payout");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = () => {
    const rows = activeTab === 'payouts' ? filteredPayouts : filteredRefunds;
    if (rows.length === 0) {
      alert("No data available to export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    if (activeTab === 'payouts') {
      csvContent += "Transaction ID,Order ID,User,Role,Vendor Earning,Rider Earning,Platform Fee,Total,Status,Date\n";
      rows.forEach(r => {
        csvContent += `"${r.id}","${r.orderId}","${r.user?.name || ''}","${r.user?.role || ''}","${r.vendorGain}","${r.riderGain}","${r.platformGain}","${r.total}","${r.status}","${r.date}"\n`;
      });
    } else {
      csvContent += "Refund ID,Order ID,Customer Name,Reason,Amount,Status,Date\n";
      rows.forEach(r => {
        csvContent += `"${r.id}","${r.orderId}","${r.customerName}","${r.reason}","${r.amount}","${r.status}","${r.date}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `streetbites_${activeTab}_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-fadeIn pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
              Financial Operations Ledger
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settlements & Platform Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit platform commission retainers, floating COD debt, and vendor/rider payouts.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button 
            onClick={fetchTransactions}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#D94A38]' : 'text-slate-400'}`} /> Sync
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-xs shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-300" /> Export CSV
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Financial Overview Cards - Unified Slate Pods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Platform Revenue */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Platform Commission</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/80">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-950 font-mono tracking-tight mt-1">
            {isLoading ? '...' : `₹${totalNetRevenue.toLocaleString('en-IN')}`}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Net platform earnings retained</p>
        </div>

        {/* Floating Cash */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Floating Cash (COD)</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/80">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-950 font-mono tracking-tight mt-1">
            {isLoading ? '...' : `₹${floatingCodCash.toLocaleString('en-IN')}`}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Cash held by delivery riders</p>
        </div>
        
        {/* Pending Settlements */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Settlements</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/80">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-950 font-mono tracking-tight mt-1">
            {isLoading ? '...' : `₹${pendingPayoutTotal.toLocaleString('en-IN')}`}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">{payouts.filter(p => p.status === 'pending').length} payouts awaiting settlement</p>
        </div>
        
        {/* Refunds Processed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Refunds</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/80">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-950 font-mono tracking-tight mt-1">
            {isLoading ? '...' : `₹${totalRefundsProcessed.toLocaleString('en-IN')}`}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">{refunds.length} customer refunds processed</p>
        </div>
      </div>

      {/* Main Payouts Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/40">
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button 
              onClick={() => setActiveTab('payouts')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                activeTab === 'payouts' 
                  ? 'bg-white shadow-xs text-slate-900 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              Order Settlements ({payouts.length})
            </button>
            <button 
              onClick={() => setActiveTab('refunds')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                activeTab === 'refunds' 
                  ? 'bg-white shadow-xs text-slate-900 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              Customer Refunds ({refunds.length})
            </button>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Order or ID..." 
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#D94A38] transition-colors" 
              />
            </div>
            {activeTab === 'payouts' && (
              <button 
                disabled={isProcessing || payouts.filter(p => p.status === 'pending').length === 0}
                onClick={handleProcessAllPending}
                className="bg-[#D94A38] hover:bg-[#C43D2E] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Process Pending</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Reference & Stakeholder</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Vendor Earning</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Rider Earning</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Platform Fee</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Total Value</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px] text-right">Settlement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <TableRowsSkeleton columns={6} rows={5} />
              ) : activeTab === 'payouts' ? (
                <>
                  {filteredPayouts.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-slate-900">{tx.orderId}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{tx.date}</div>
                        {tx.user?.name ? (
                          <div className="text-[11px] text-slate-600 mt-0.5">{tx.user.name} ({tx.user.role})</div>
                        ) : tx.vendorNames ? (
                          <div className="text-[11px] text-slate-600 mt-0.5 font-medium">{tx.vendorNames}</div>
                        ) : tx.riderName ? (
                          <div className="text-[11px] text-slate-600 mt-0.5 font-medium">Rider: {tx.riderName}</div>
                        ) : (
                          <div className="text-[11px] font-medium text-slate-500 mt-0.5">{tx.note || 'Platform Direct Ledger'}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-900">
                        {tx.vendorGain > 0 ? `+₹${tx.vendorGain}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-900">
                        {tx.riderGain > 0 ? `+₹${tx.riderGain}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-900">
                        {tx.platformGain > 0 ? `+₹${tx.platformGain}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-700">₹{tx.total}</td>
                      <td className="px-5 py-3.5 text-right">
                        {tx.status === 'pending' ? (
                          <button 
                            disabled={isProcessing}
                            onClick={() => handleProcessSingle(tx.id)}
                            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                          >
                            <Clock className="w-3 h-3 text-slate-500" /> Settle
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredPayouts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                        No financial settlements found in database.
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <>
                  {filteredRefunds.map(ref => (
                    <tr key={ref.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-slate-900">{ref.orderId}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{ref.id}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-800 font-semibold">{ref.customerName}</td>
                      <td className="px-5 py-3.5 text-slate-600">{ref.reason}</td>
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-900">₹{ref.amount}</td>
                      <td className="px-5 py-3.5 text-slate-400">{ref.date}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
                          {ref.status || 'Refunded'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredRefunds.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                        No customer refunds found in database.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTransactions;
