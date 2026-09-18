import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Search, FileDown, CheckCircle2, Clock, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { TableRowsSkeleton } from '../../components/Skeleton';

export const AdminTransactions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payouts' | 'refunds'>('payouts');
  const [payouts, setPayouts] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
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
    p.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRefunds = refunds.filter(r => 
    r.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalNetRevenue = payouts
    .filter(p => p.status === 'completed')
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
        alert("All pending payouts have been processed and marked as completed.");
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
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Financials & Payouts</h1>
          <p className="text-sm text-stone-500 mt-1">Manage platform revenue, payouts, and customer refunds.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={fetchTransactions}
            className="bg-white border border-[#EFEBE4] hover:bg-stone-50 text-stone-700 font-bold py-2.5 px-3 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#D94A38]' : ''}`} /> Refresh
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-[#1C1917] hover:bg-black text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm shrink-0 cursor-pointer"
          >
            <FileDown className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Net Platform Revenue</span>
            <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg"><ArrowUpRight className="w-4 h-4" /></div>
          </div>
          <h3 className="text-3xl font-black text-stone-900">
            {isLoading ? '...' : `₹${totalNetRevenue.toLocaleString()}`}
          </h3>
          <p className="text-xs text-stone-400 mt-1">Live platform earnings</p>
        </div>
        
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Pending Payouts</span>
            <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg"><Clock className="w-4 h-4" /></div>
          </div>
          <h3 className="text-3xl font-black text-stone-900">
            {isLoading ? '...' : `₹${pendingPayoutTotal.toLocaleString()}`}
          </h3>
          <p className="text-xs text-stone-400 mt-1">{payouts.filter(p => p.status === 'pending').length} pending settlements</p>
        </div>
        
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Refunds Processed</span>
            <div className="bg-red-50 text-red-600 p-1.5 rounded-lg"><ArrowDownRight className="w-4 h-4" /></div>
          </div>
          <h3 className="text-3xl font-black text-stone-900">
            {isLoading ? '...' : `₹${totalRefundsProcessed.toLocaleString()}`}
          </h3>
          <p className="text-xs text-stone-400 mt-1">{refunds.length} total refunds recorded</p>
        </div>
      </div>

      {/* Main Payouts Section */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-5 border-b border-[#EFEBE4] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-2 bg-stone-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('payouts')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'payouts' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Order Settlements ({payouts.length})
            </button>
            <button 
              onClick={() => setActiveTab('refunds')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'refunds' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Customer Refunds ({refunds.length})
            </button>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Order or ID..." 
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#D94A38] transition-colors" 
              />
            </div>
            {activeTab === 'payouts' && (
              <button 
                disabled={isProcessing || payouts.filter(p => p.status === 'pending').length === 0}
                onClick={handleProcessAllPending}
                className="bg-[#D94A38] hover:bg-[#C43D2E] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Process Pending
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-stone-50 border-b border-[#EFEBE4]">
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Vendor Earning</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Rider Earning</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Platform Fee</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Total Value</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE4]">
              {isLoading ? (
                <TableRowsSkeleton columns={6} rows={5} />
              ) : activeTab === 'payouts' ? (
                <>
                  {filteredPayouts.map(tx => (
                    <tr key={tx.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-xs font-mono font-bold text-stone-800">{tx.orderId}</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">{tx.date}</div>
                        {tx.user?.name && <div className="text-[11px] text-stone-500 mt-0.5">{tx.user.name} ({tx.user.role})</div>}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                        {tx.vendorGain > 0 ? `+₹${tx.vendorGain}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-600">
                        {tx.riderGain > 0 ? `+₹${tx.riderGain}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-stone-900">
                        {tx.platformGain > 0 ? `+₹${tx.platformGain}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-stone-500">₹{tx.total}</td>
                      <td className="px-6 py-4 text-right">
                        {tx.status === 'pending' ? (
                          <button 
                            disabled={isProcessing}
                            onClick={() => handleProcessSingle(tx.id)}
                            className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-amber-100 transition-colors"
                          >
                            <Clock className="w-3 h-3" /> Settle
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredPayouts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-stone-500 text-xs font-medium">
                        No financial settlements found in database.
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <>
                  {filteredRefunds.map(ref => (
                    <tr key={ref.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-xs text-stone-800">{ref.orderId}</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">{ref.id}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-stone-800">{ref.customerName}</td>
                      <td className="px-6 py-4 text-xs text-stone-600">{ref.reason}</td>
                      <td className="px-6 py-4 text-xs font-bold text-red-600">₹{ref.amount}</td>
                      <td className="px-6 py-4 text-xs text-stone-400">{ref.date}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                          {ref.status || 'Refunded'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredRefunds.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-stone-500 text-xs font-medium">
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
