import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon, Store, Bike, Trash2, Ban, Shield, Loader2, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAlert } from '../../context/AlertContext';

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
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">User Management</h1>
          <p className="text-sm text-stone-500 mt-1">Manage and moderate all platform entities stored in the database.</p>
        </div>
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab} and press Enter...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#EFEBE4] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#D94A38] transition-colors shadow-sm"
          />
        </form>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tour-user-tabs flex gap-2 border-b border-[#EFEBE4] pb-px overflow-x-auto hide-scrollbar">
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
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id 
                ? 'border-[#D94A38] text-[#D94A38]' 
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-stone-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#D94A38]" />
              <span className="text-xs font-bold">Loading users from database...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-stone-50 border-b border-[#EFEBE4]">
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Name & Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Account Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Joined Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEBE4]">
                {users.map(user => {
                  const userId = String(user.id || user._id || '');
                  return (
                    <tr key={userId} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded">
                          {userId ? userId.slice(-8).toUpperCase() : 'USER'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-stone-900">{user.name || 'Anonymous User'}</span>
                          <span className="text-xs text-stone-500">{user.email || user.phone_number || 'No Email'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          user.status === 'suspended' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'active' ? 'bg-emerald-500' :
                            user.status === 'suspended' ? 'bg-red-500' : 'bg-stone-400'
                          }`} />
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-500">
                        {user.joined || 'Recent'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="tour-user-actions flex justify-end gap-2">
                          <button 
                            onClick={() => handleSuspend(userId, user.status)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              user.status === 'suspended' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'
                            }`}
                            title={user.status === 'suspended' ? 'Unban User' : 'Suspend User'}
                          >
                            {user.status === 'suspended' ? <Shield className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleDelete(userId)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-stone-500">
                      No registered {activeTab} found in database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
