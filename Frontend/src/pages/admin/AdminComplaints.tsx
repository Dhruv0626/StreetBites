import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, MessageSquare, CheckCircle2, Clock, RefreshCw, X, ShieldAlert, Hash } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { CustomSelect } from '../../components/CustomSelect';
import { useAlert } from '../../context/AlertContext';
import { TableRowsSkeleton } from '../../components/Skeleton';

export const AdminComplaints: React.FC = () => {
  const { showAlert, showConfirm, toast } = useAlert();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fetchComplaints = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getComplaints();
      if (res.success && res.data) {
        setComplaints(res.data);
      } else {
        setErrorMessage(res.message || 'Failed to fetch complaints');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error connecting to database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = 
      (c.id && c.id.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (c.user && c.user.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (c.orderId && c.orderId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.issue && c.issue.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === 'All Roles' || c.role === roleFilter;
    const matchesStatus = statusFilter === 'All Statuses' || c.status === statusFilter.replace('Status: ', '');
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleResolve = async (id: string, mongoId?: string) => {
    const targetId = mongoId || id.replace('TKT-', '');
    const confirmed = await showConfirm({
      title: 'Resolve Dispute Ticket',
      message: 'Mark this complaint ticket as resolved in the database?',
      confirmText: 'Mark Resolved',
      type: 'success',
    });
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const res = await adminService.updateComplaintStatus(targetId, 'RESOLVED');
      if (res.success) {
        setComplaints(prev => prev.map(c => (c.id === id || c._id === targetId) ? { ...c, status: 'Resolved' } : c));
        if (selectedComplaint && (selectedComplaint.id === id || selectedComplaint._id === targetId)) {
          setSelectedComplaint((prev: any) => ({ ...prev, status: 'Resolved' }));
        }
        toast.success('Complaint ticket resolved');
      } else {
        showAlert(res.message || 'Failed to update complaint status', 'error');
      }
    } catch (err: any) {
      showAlert(err?.message || 'Error updating status', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openCount = complaints.filter(c => c.status === 'Open').length;
  const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-fadeIn pb-12 font-sans">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Complaints & Disputes Console</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D94A38]/10 text-[#D94A38] border border-[#D94A38]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D94A38] animate-pulse mr-1.5" />
              {openCount} Open
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Live customer, vendor, and rider grievance resolution queue.</p>
        </div>
        <button
          onClick={fetchComplaints}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs hover:border-slate-300 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#D94A38]' : 'text-slate-400'}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-slate-100 border border-slate-300 text-slate-900 text-xs rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#D94A38]" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Open Disputes</div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {isLoading ? '...' : openCount}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">Requires intervention</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#D94A38]/10 text-[#D94A38] border border-[#D94A38]/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Progress</div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {isLoading ? '...' : inProgressCount}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">Under investigation</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resolved</div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {isLoading ? '...' : resolvedCount}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">Successfully closed</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tickets</div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {isLoading ? '...' : complaints.length}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">Historical volume</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-50/40">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket ID, reporter name, or order..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D94A38]/20 focus:border-[#D94A38] transition-all"
            />
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="w-36">
              <CustomSelect
                value={roleFilter}
                onChange={(val) => setRoleFilter(val)}
                options={['All Roles', 'Customer', 'Vendor', 'Rider']}
              />
            </div>
            <div className="w-44">
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={['All Statuses', 'Status: Open', 'Status: In Progress', 'Status: Resolved']}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Ticket ID & Time</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Reporter</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Issue & Priority</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <TableRowsSkeleton columns={5} rows={5} />
              ) : (
                <>
                  {filteredComplaints.map((complaint) => {
                    return (
                      <tr key={complaint.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 font-mono tracking-tight">{complaint.id}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{complaint.time}</div>
                          {complaint.orderId && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 mt-1 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                              <Hash className="w-2.5 h-2.5" /> {complaint.orderId}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/80">
                              {complaint.user ? complaint.user.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{complaint.user}</div>
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                {complaint.role}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 max-w-sm">
                          <div className="text-slate-800 font-medium truncate max-w-xs">{complaint.issue}</div>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            complaint.priority === 'High' ? 'bg-[#D94A38]/10 text-[#D94A38] border-[#D94A38]/20' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {complaint.priority || 'Normal'} Priority
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 border border-slate-200 bg-slate-100 text-slate-700">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              complaint.status === 'Open' ? 'bg-[#D94A38] animate-pulse' :
                              complaint.status === 'In Progress' ? 'bg-slate-400' :
                              'bg-emerald-500'
                            }`} />
                            {complaint.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end items-center gap-2">
                            {complaint.status !== 'Resolved' && (
                              <button 
                                disabled={isProcessing}
                                onClick={() => handleResolve(complaint.id, complaint._id)} 
                                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Resolve
                              </button>
                            )}
                            <button 
                              onClick={() => setSelectedComplaint(complaint)} 
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredComplaints.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                        No complaints or disputes match the current criteria.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer info */}
        {filteredComplaints.length > 0 && (
          <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>Showing <span className="font-semibold text-slate-700">{filteredComplaints.length}</span> of {complaints.length} tickets</div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs">
                  <ShieldAlert className="w-5 h-5 text-[#D94A38]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Complaint Details</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedComplaint.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Reporter Information</span>
                <div className="font-bold text-sm text-slate-900">{selectedComplaint.user}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold text-[10px] uppercase">
                    {selectedComplaint.role}
                  </span>
                  {selectedComplaint.email && (
                    <span className="text-slate-500 text-[11px]">{selectedComplaint.email}</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Issue Description</span>
                <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl font-medium text-slate-800 leading-relaxed">
                  {selectedComplaint.issue}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Order Reference</span>
                  <div className="font-mono font-bold text-slate-800">{selectedComplaint.orderId || 'N/A'}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filed Timestamp</span>
                  <div className="font-semibold text-slate-800">{selectedComplaint.time}</div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Status</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5">{selectedComplaint.status}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200 bg-slate-100 text-slate-700">
                  {selectedComplaint.status}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
              <button 
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
              {selectedComplaint.status !== 'Resolved' && (
                <button 
                  disabled={isProcessing}
                  onClick={() => {
                    handleResolve(selectedComplaint.id, selectedComplaint._id);
                    setSelectedComplaint(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComplaints;

