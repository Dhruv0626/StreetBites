import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon, Store, Bike, Trash2, Ban, Shield, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAlert } from '../../context/AlertContext';
import { TableRowsSkeleton } from '../../components/Skeleton';

export const AdminUsers: React.FC = () => {
  const { showAlert, showConfirm, toast } = useAlert();
  const [activeTab, setActiveTab] = useState<'customers' | 'vendors' | 'riders' | 'admins'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roleMap: Record<string, string> = {
    customers: 'CUSTOMER',
    vendors: 'VENDOR',
    riders: 'RIDER',
    admins: 'ADMIN',
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await authService.getAllUsers({
        role: roleMap[activeTab],
        search: searchQuery.trim() || undefined,
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
        setUsers(list);
      } else {
        setErrorMessage(res.message || 'Failed to fetch users from database');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error connecting to user service');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleSuspend = async (id: string, currentStatus: string) => {
    const isSuspending = currentStatus !== 'suspended';
    const newStatus = isSuspending ? 'SUSPENDED' : 'ACTIVE';
    const confirmed = await showConfirm({
      title: isSuspending ? 'Suspend User Account' : 'Reactivate User Account',
      message: `Are you sure you want to ${isSuspending ? 'suspend' : 'unsuspend'} this user account?`,
      confirmText: isSuspending ? 'Suspend' : 'Reactivate',
      type: isSuspending ? 'danger' : 'info',
    });
    if (!confirmed) return;

    try {
      const res = await authService.updateUserStatus(id, newStatus);
      if (res.success) {
        setUsers(prev =>
          prev.map(u => (u.id === id || u._id === id ? { ...u, status: newStatus.toLowerCase() } : u))
        );
        toast.success(`User successfully ${newStatus.toLowerCase()}!`);
      } else {
        showAlert(res.message || 'Failed to update user status', 'error');
      }
    } catch (err: any) {
      showAlert(err?.message || 'Error updating user status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete User Account',
      message: 'Are you sure you want to permanently delete this user from the database? This action cannot be undone.',
      confirmText: 'Delete User',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await authService.deleteUser(id);
      if (res.success) {
        setUsers(prev => prev.filter(u => u.id !== id && u._id !== id));
        toast.success('User permanently deleted.');
      } else {
        showAlert(res.message || 'Failed to delete user', 'error');
      }
    } catch (err: any) {
      showAlert(err?.message || 'Error deleting user', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-fadeIn pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
              Identity & Access Management
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">User Directory & Governance</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage and moderate all platform accounts, roles, and security credentials.</p>
        </div>
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80 shrink-0 self-start sm:self-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab} by name or contact...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-all"
          />
        </form>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tour-user-tabs flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60 w-max overflow-x-auto no-scrollbar">
        {[
          { id: 'customers', label: 'Customers', icon: UserIcon },
          { id: 'vendors', label: 'Vendors', icon: Store },
          { id: 'riders', label: 'Riders', icon: Bike },
          { id: 'admins', label: 'Admins', icon: Shield },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-white text-slate-900 shadow-xs font-bold' 
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">User ID</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Name & Contact</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Account Status</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Joined Date</th>
                <th className="px-5 py-3.5 uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <TableRowsSkeleton columns={5} rows={5} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    No {activeTab} found in database.
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  const userId = String(user.id || user._id || '');
                  return (
                    <tr key={userId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                          {userId ? userId.slice(-8).toUpperCase() : 'USER'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">{user.name || 'Anonymous User'}</span>
                          <span className="text-[11px] text-slate-500">{user.email || user.phone_number || 'No Email'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          user.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' :
                          user.status === 'suspended' ? 'bg-rose-50 text-rose-700 border-rose-200/70' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'active' ? 'bg-emerald-500' :
                            user.status === 'suspended' ? 'bg-rose-500' : 'bg-slate-400'
                          }`} />
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {user.joined || 'Recent'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="tour-user-actions flex justify-end gap-1.5">
                          <button 
                            onClick={() => handleSuspend(userId, user.status)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                              user.status === 'suspended' 
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/70' 
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                            }`}
                            title={user.status === 'suspended' ? 'Unban User' : 'Suspend User'}
                          >
                            {user.status === 'suspended' ? <Shield className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>
                          <button 
                            onClick={() => handleDelete(userId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-slate-200/80"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
