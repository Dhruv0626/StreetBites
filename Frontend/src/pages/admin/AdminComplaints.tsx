import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, MessageSquare, CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { CustomSelect } from '../../components/CustomSelect';
import { useAlert } from '../../context/AlertContext';

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
      title: 'Resolve Ticket',
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Complaints & Disputes</h1>
          <p className="text-sm text-stone-500 mt-1">Manage and resolve issues submitted by customers, vendors, and riders.</p>
        </div>
        <button
          onClick={fetchComplaints}
          className="bg-white border border-[#EFEBE4] hover:bg-stone-50 text-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#D94A38]' : ''}`} /> Refresh Tickets
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-stone-900">
              {isLoading ? '...' : complaints.filter(c => c.status === 'Open').length}
            </div>
            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-0.5">Open Tickets</div>
          </div>
        </div>
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-stone-900">
              {isLoading ? '...' : complaints.filter(c => c.status === 'In Progress').length}
            </div>
            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-0.5">In Progress</div>
          </div>
        </div>
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-stone-900">
              {isLoading ? '...' : complaints.filter(c => c.status === 'Resolved').length}
            </div>
            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-0.5">Resolved</div>
          </div>
        </div>
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-stone-900">
              {isLoading ? '...' : complaints.length}
            </div>
            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-0.5">Total Tickets</div>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#EFEBE4] flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket ID, user, or order..." 
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-[#EFEBE4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E54B3C]/20 focus:border-[#E54B3C]"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-stone-50/50 text-stone-500 font-medium">
              <tr>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Ticket Info</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Reporter</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Issue Description</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE4]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-400 text-xs font-medium">
                    <Loader2 className="w-5 h-5 animate-spin text-[#D94A38] mx-auto mb-2" />
                    Loading database complaints...
                  </td>
                </tr>
              ) : (
                <>
                  {filteredComplaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-stone-900">{complaint.id}</div>
                        <div className="text-xs text-stone-500 mt-0.5">{complaint.time}</div>
                        <div className="text-[10px] font-bold mt-1 uppercase tracking-wider text-stone-400">Order: {complaint.orderId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-stone-900">{complaint.user}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider">
                          {complaint.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-stone-900 font-medium truncate max-w-xs">{complaint.issue}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          complaint.priority === 'High' ? 'bg-red-50 text-red-700' :
                          complaint.priority === 'Medium' ? 'bg-amber-50 text-amber-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {complaint.priority} Priority
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center w-max gap-1.5 ${
                          complaint.status === 'Open' ? 'bg-red-50 text-red-700 border border-red-100' : 
                          complaint.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {complaint.status === 'Open' && <AlertCircle className="w-3.5 h-3.5" />}
                          {complaint.status === 'In Progress' && <Clock className="w-3.5 h-3.5" />}
                          {complaint.status === 'Resolved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {complaint.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {complaint.status !== 'Resolved' && (
                            <button 
                              disabled={isProcessing}
                              onClick={() => handleResolve(complaint.id, complaint._id)} 
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-emerald-200 disabled:opacity-50"
                            >
                              Resolve
                            </button>
                          )}
                          <button onClick={() => setSelectedComplaint(complaint)} className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredComplaints.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-stone-500 text-xs font-medium">
                        No complaints or disputes found in database.
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
          <div className="p-4 border-t border-[#EFEBE4] flex items-center justify-between text-sm text-stone-500">
            <div>Showing {filteredComplaints.length} of {complaints.length} tickets</div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-xl animate-fadeIn">
            <div className="p-6 border-b border-[#EFEBE4]">
              <h2 className="text-xl font-bold text-stone-900">Complaint Details</h2>
              <p className="text-sm text-stone-500 mt-1">{selectedComplaint.id}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Reporter</label>
                <div className="font-semibold text-stone-900">{selectedComplaint.user} ({selectedComplaint.role})</div>
                {selectedComplaint.email && <div className="text-xs text-stone-500">{selectedComplaint.email} • {selectedComplaint.phone}</div>}
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Issue</label>
                <div className="font-medium text-stone-800">{selectedComplaint.issue}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Order Reference</label>
                <div className="font-medium text-stone-800">{selectedComplaint.orderId}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Time</label>
                <div className="font-medium text-stone-800">{selectedComplaint.time}</div>
              </div>
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-4">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block">Resolution Status</label>
                <div className="text-xs text-stone-600">Current status is <strong>{selectedComplaint.status}</strong>.</div>
              </div>
            </div>
            <div className="p-6 border-t border-[#EFEBE4] flex justify-end gap-3">
              <button 
                onClick={() => setSelectedComplaint(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
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
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Mark Resolved
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
