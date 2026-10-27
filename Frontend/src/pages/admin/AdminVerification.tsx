import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Loader2,
  RefreshCw,
  User,
  Phone,
  Mail,
  UtensilsCrossed,
  Search,
  Check,
  Store,
  MapPin,
  Info,
} from 'lucide-react';
import { onboardingService } from '../../services/onboardingService';
import { adminService } from '../../services/adminService';
import { useAlert } from '../../context/AlertContext';
import { QueueItemSkeleton } from '../../components/Skeleton';

export const AdminVerification: React.FC = () => {
  const { showAlert, showConfirm, toast } = useAlert();
  // Top-level Section Switcher: 'kyc' | 'foodItems'
  const [activeSection, setActiveSection] = useState<'kyc' | 'foodItems'>('foodItems');

  // --- KYC Applications State ---
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingKyc, setIsLoadingKyc] = useState<boolean>(true);
  const [kycError, setKycError] = useState<string | null>(null);
  const [isProcessingKyc, setIsProcessingKyc] = useState<boolean>(false);

  // --- Food Items Approvals State ---
  const [foodTab, setFoodTab] = useState<'all' | 'Review_pending' | 'Approved' | 'Rejected'>('Review_pending');
  const [foodSearch, setFoodSearch] = useState<string>('');
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [isLoadingFood, setIsLoadingFood] = useState<boolean>(true);
  const [foodError, setFoodError] = useState<string | null>(null);
  const [isProcessingFood, setIsProcessingFood] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Fetch KYC Applications
  const fetchApplications = async () => {
    setIsLoadingKyc(true);
    setKycError(null);
    try {
      const res = await onboardingService.getVerifications({
        status: activeTab,
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
        setApplications(list);
        if (list.length > 0) {
          if (!selectedAppId || !list.some((a: any) => a.id === selectedAppId)) {
            setSelectedAppId(list[0].id);
            setCurrentDocIndex(0);
          }
        } else {
          setSelectedAppId(null);
        }
      } else {
        setKycError(res.message || 'Failed to fetch verification applications');
      }
    } catch (err: any) {
      setKycError(err?.message || 'Error connecting to onboarding service');
    } finally {
      setIsLoadingKyc(false);
    }
  };

  // Fetch Food Items
  const fetchFoodItems = async () => {
    setIsLoadingFood(true);
    setFoodError(null);
    try {
      const res = await adminService.getFoodItems();
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : [];
        setFoodItems(items);
        if (items.length > 0) {
          if (!selectedFoodId || !items.some(i => i.id === selectedFoodId)) {
            setSelectedFoodId(items[0].id);
          }
        } else {
          setSelectedFoodId(null);
        }
      } else {
        setFoodError(res.message || 'Failed to fetch food items for verification');
      }
    } catch (err: any) {
      setFoodError(err?.message || 'Error connecting to food items service');
    } finally {
      setIsLoadingFood(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [activeTab]);

  useEffect(() => {
    fetchFoodItems();
  }, []);

  const handleRefresh = () => {
    if (activeSection === 'kyc') {
      fetchApplications();
    } else {
      fetchFoodItems();
    }
  };

  // Handle KYC Status update
  const handleUpdateKycStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    const isApproved = newStatus === 'approved';
    const confirmed = await showConfirm({
      title: isApproved ? 'Approve Application' : 'Reject Application',
      message: `Are you sure you want to mark this KYC application as ${newStatus.toUpperCase()}?`,
      confirmText: isApproved ? 'Approve' : 'Reject',
      type: isApproved ? 'success' : 'danger',
    });
    if (!confirmed) return;

    setIsProcessingKyc(true);
    try {
      const res = await onboardingService.updateVerificationStatus(id, newStatus);
      if (res.success) {
        setApplications(prev => prev.filter(a => a.id !== id));
        setSelectedAppId(null);
        setCurrentDocIndex(0);
        toast.success(`Application successfully ${newStatus}!`);
        fetchApplications();
      } else {
        showAlert(res.message || 'Failed to update verification status', 'error');
      }
    } catch (err: any) {
      showAlert(err?.message || 'Error updating verification status', 'error');
    } finally {
      setIsProcessingKyc(false);
    }
  };

  // Handle Food Item Status update (Approve / Reject / Reset)
  const handleUpdateFoodStatus = async (
    id: string,
    newStatus: 'Approved' | 'Rejected' | 'Review_pending',
    stallId?: string
  ) => {
    setIsProcessingFood(true);
    setActionSuccessMsg(null);
    try {
      const res = await adminService.updateFoodItemStatus(id, newStatus, stallId);
      if (res.success) {
        // Optimistically update local state
        setFoodItems(prev =>
          prev.map(item => (item.id === id ? { ...item, status: newStatus } : item))
        );

        const statusLabel =
          newStatus === 'Approved'
            ? 'Approved! Item is now published to customer Home page "What\'s on your mind?".'
            : newStatus === 'Rejected'
              ? 'Rejected. Item is hidden from customer Home page.'
              : 'Reset to Review Pending. Item is visible in stall menu only.';

        setActionSuccessMsg(`"${selectedFood?.name || 'Food item'}" marked as ${statusLabel}`);
        setTimeout(() => setActionSuccessMsg(null), 5000);
        toast.success(`Food item status set to ${newStatus}`);

        // Background refetch to ensure database sync
        fetchFoodItems();
      } else {
        showAlert(res.message || 'Failed to update food item status', 'error');
      }
    } catch (err: any) {
      showAlert(err?.message || 'Error updating food item status', 'error');
    } finally {
      setIsProcessingFood(false);
    }
  };

  // Current selected KYC app
  const currentApplication = applications.find(a => a.id === selectedAppId);
  const currentDocs = currentApplication?.documents || [];
  const currentDoc = currentDocs[currentDocIndex];

  // Filtered Food Items
  const filteredFoodItems = foodItems.filter(item => {
    const matchesTab =
      foodTab === 'all'
        ? true
        : foodTab === 'Review_pending'
          ? item.status === 'Review_pending' || item.status === 'PENDING_REVIEW'
          : item.status?.toLowerCase() === foodTab.toLowerCase();

    const q = foodSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.name?.toLowerCase().includes(q) ||
      item.stallName?.toLowerCase().includes(q) ||
      item.vendorName?.toLowerCase().includes(q) ||
      item.clusterName?.toLowerCase().includes(q);

    return matchesTab && matchesSearch;
  });

  const selectedFood =
    filteredFoodItems.find(f => f.id === selectedFoodId) ||
    (filteredFoodItems.length > 0 ? filteredFoodItems[0] : null);

  // Counters
  const pendingFoodCount = foodItems.filter(
    f => f.status === 'Review_pending' || f.status === 'PENDING_REVIEW'
  ).length;
  const approvedFoodCount = foodItems.filter(f => f.status?.toLowerCase() === 'approved').length;
  const rejectedFoodCount = foodItems.filter(f => f.status?.toLowerCase() === 'rejected').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-fadeIn pb-12 font-sans">
      {/* Header with Title and Global Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
              Governance & Compliance
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Approvals & Verifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review vendor food items and examine KYC identity credentials for platform approval.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Primary Section Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto self-start border border-slate-200/70 gap-1.5">
        <button
          onClick={() => setActiveSection('foodItems')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeSection === 'foodItems'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5 text-[#D94A38]" />
          <span>Food Items Approval</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              pendingFoodCount > 0
                ? 'bg-[#D94A38] text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {pendingFoodCount}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('kyc')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeSection === 'kyc'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-slate-600" />
          <span>KYC Applications</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 text-slate-700 font-bold">
            {applications.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: FOOD ITEMS & DISHES APPROVAL                   */}
      {/* ========================================================= */}
      {activeSection === 'foodItems' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Top Status & Metrics Grid - Unified Slate Palette */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div
              onClick={() => setFoodTab('Review_pending')}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                foodTab === 'Review_pending'
                  ? 'border-slate-900 ring-1 ring-slate-900 shadow-xs'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Review</span>
                <span className="w-2 h-2 rounded-full bg-[#D94A38] animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-slate-950 font-mono mt-2">{pendingFoodCount}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Hidden from customer app</p>
            </div>

            <div
              onClick={() => setFoodTab('Approved')}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                foodTab === 'Approved'
                  ? 'border-slate-900 ring-1 ring-slate-900 shadow-xs'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approved</span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-950 font-mono mt-2">{approvedFoodCount}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Live on customer menu</p>
            </div>

            <div
              onClick={() => setFoodTab('Rejected')}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                foodTab === 'Rejected'
                  ? 'border-slate-900 ring-1 ring-slate-900 shadow-xs'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rejected</span>
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-950 font-mono mt-2">{rejectedFoodCount}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Declined items</p>
            </div>

            <div
              onClick={() => setFoodTab('all')}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                foodTab === 'all'
                  ? 'border-slate-900 ring-1 ring-slate-900 shadow-xs'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Dishes</span>
                <Store className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-950 font-mono mt-2">{foodItems.length}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Across all registered stalls</p>
            </div>
          </div>

          {/* Success / Alert Toast */}
          {actionSuccessMsg && (
            <div className="p-4 bg-slate-900 text-white text-xs font-bold rounded-2xl flex items-center gap-3 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {foodError && (
            <div className="p-4 bg-slate-100 border border-slate-300 text-slate-900 text-xs rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#D94A38]" />
              <span>{foodError}</span>
            </div>
          )}

          {/* Search & Filter Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={foodSearch}
                onChange={e => setFoodSearch(e.target.value)}
                placeholder="Search food item, stall, or Khau Galli..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#D94A38] transition-colors"
              />
            </div>

            <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'Review_pending', label: 'Pending Review' },
                { id: 'Approved', label: 'Approved' },
                { id: 'Rejected', label: 'Rejected' },
                { id: 'all', label: 'All Dishes' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFoodTab(tab.id as any)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${foodTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Food Items Dual Panel Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Food Items Queue */}
            <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col min-h-[440px] max-h-[580px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Dishes Queue ({filteredFoodItems.length})
                </span>
                <span className="text-[10px] text-slate-400">Select to inspect</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 hide-scrollbar">
                {isLoadingFood ? (
                  <QueueItemSkeleton count={4} />
                ) : filteredFoodItems.length === 0 ? (
                  <div className="text-center text-slate-400 py-16 text-xs font-medium">
                    No food items match the current filter.
                  </div>
                ) : (
                  filteredFoodItems.map(item => {
                    const isSelected = selectedFoodId === item.id;
                    const isPending =
                      item.status === 'Review_pending' || item.status === 'PENDING_REVIEW';
                    const isApproved = item.status?.toLowerCase() === 'approved';

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedFoodId(item.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${isSelected
                          ? 'border-[#D94A38] bg-[#D94A38]/5 shadow-xs'
                          : 'border-slate-200/80 hover:border-slate-300 bg-white'
                          }`}
                      >
                        {/* Food Image Thumbnail */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UtensilsCrossed className="w-6 h-6 text-slate-400" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {item.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 ${isApproved
                                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                : isPending
                                  ? 'bg-[#D94A38]/10 text-[#D94A38] border border-[#D94A38]/20'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200 line-through'
                                }`}
                            >
                              <span className={`w-1 h-1 rounded-full ${isApproved ? 'bg-emerald-500' : isPending ? 'bg-[#D94A38]' : 'bg-slate-400'}`} />
                              {isApproved ? 'Approved' : isPending ? 'Pending' : 'Rejected'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Detailed Dish Inspector & Approval Workspace */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col h-auto relative overflow-hidden">
              {selectedFood ? (
                <div className="flex flex-col h-full animate-fadeIn">
                  {/* Inspector Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900">{selectedFood.name}</h2>
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${selectedFood.status?.toLowerCase() === 'approved'
                            ? 'bg-slate-100 text-slate-800 border border-slate-200'
                            : selectedFood.status === 'Review_pending' ||
                              selectedFood.status === 'PENDING_REVIEW'
                              ? 'bg-[#D94A38]/10 text-[#D94A38] border border-[#D94A38]/20'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedFood.status?.toLowerCase() === 'approved' ? 'bg-emerald-500' : selectedFood.status === 'Review_pending' || selectedFood.status === 'PENDING_REVIEW' ? 'bg-[#D94A38]' : 'bg-slate-400'}`} />
                          {selectedFood.status?.toLowerCase() === 'approved'
                            ? 'Approved & Live'
                            : selectedFood.status === 'Review_pending' ||
                              selectedFood.status === 'PENDING_REVIEW'
                              ? 'Review Pending'
                              : 'Rejected'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {selectedFood.stallName} · {selectedFood.stallCategory}
                        </span>
                        <span className="text-slate-300">·</span>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {selectedFood.clusterName ? `${selectedFood.clusterName}, ${selectedFood.clusterCity || 'Ahmedabad'}` : 'Ahmedabad'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* System Visibility Notice Banner */}
                  <div className="my-3">
                    {selectedFood.status === 'Review_pending' ||
                      selectedFood.status === 'PENDING_REVIEW' ? (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                        <Info className="w-4 h-4 text-[#D94A38] shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-700">
                          <p className="font-bold text-slate-900">
                            Review Pending · Visible in Stall Menu Only
                          </p>
                          <p className="mt-0.5 text-slate-600 leading-relaxed text-[11px]">
                            This food item is currently shown in its vendor stall's menu, but is{' '}
                            <strong>hidden from the customer Home page ("What's on your mind?")</strong>.
                            Click <strong>"Approve Food Item"</strong> below to publish it globally.
                          </p>
                        </div>
                      </div>
                    ) : selectedFood.status?.toLowerCase() === 'approved' ? (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-700">
                          <p className="font-bold text-slate-900">Approved & Published Globally</p>
                          <p className="mt-0.5 text-slate-600 leading-relaxed text-[11px]">
                            This food item is <strong>active in the stall menu</strong> AND{' '}
                            <strong>featured on the customer Home page ("What's on your mind?")</strong>.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                        <XCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-700">
                          <p className="font-bold text-slate-900">Rejected by Admin</p>
                          <p className="mt-0.5 text-slate-600 leading-relaxed text-[11px]">
                            This food item has been declined and is hidden from the customer Home page.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dish Media & Info Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-1">
                    {/* Dish Image */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden h-44 flex items-center justify-center relative shadow-inner">
                      {selectedFood.image_url ? (
                        <img
                          src={selectedFood.image_url}
                          alt={selectedFood.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <UtensilsCrossed className="w-8 h-8" />
                          <span className="text-xs font-bold">No Image Provided</span>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                        Dish Preview
                      </div>
                    </div>

                    {/* Dish & Vendor Metadata */}
                    <div className="space-y-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Description
                        </span>
                        <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                          {selectedFood.description ||
                            'Standard freshly prepared authentic street food specialty.'}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Vendor Contact Info
                        </span>
                        <div className="text-xs text-slate-700 mt-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-900">{selectedFood.vendorName || 'Vendor Partner'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{selectedFood.vendorPhone || '+91 98765 43210'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{selectedFood.vendorEmail || 'vendor@streetbites.in'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Actions: Only displayed when food item is in Pending state */}
                  {(selectedFood.status === 'Review_pending' ||
                    selectedFood.status === 'PENDING_REVIEW') && (
                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        disabled={isProcessingFood}
                        onClick={() =>
                          handleUpdateFoodStatus(
                            selectedFood.id,
                            'Rejected',
                            selectedFood.stallId
                          )
                        }
                        className="bg-slate-100 hover:bg-[#D94A38]/10 hover:text-[#D94A38] text-slate-700 border border-slate-200 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Item</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingFood}
                        onClick={() =>
                          handleUpdateFoodStatus(
                            selectedFood.id,
                            'Approved',
                            selectedFood.stallId
                          )
                        }
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingFood ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 stroke-[3]" />
                        )}
                        <span>Approve Food Item</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                    <UtensilsCrossed className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No Food Item Selected</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
                    {filteredFoodItems.length === 0
                      ? 'No dishes match the selected filter or all items in this filter have been processed.'
                      : 'Select a food item from the queue on the left to inspect details.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: KYC & ONBOARDING APPLICATIONS                  */}
      {/* ========================================================= */}
      {activeSection === 'kyc' && (
        <div className="space-y-6 animate-fadeIn">
          {kycError && (
            <div className="p-4 bg-slate-100 border border-slate-300 text-slate-900 text-xs rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#D94A38]" />
              <span>{kycError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Application List */}
            <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col h-[650px]">
              <div className="flex gap-2 border-b border-slate-100 pb-3 mb-4">
                {['pending', 'approved', 'rejected'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 text-xs font-bold uppercase tracking-wider py-2 rounded-xl transition-colors cursor-pointer ${activeTab === tab
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="tour-approval-queue flex-1 overflow-y-auto space-y-3 hide-scrollbar">
                {isLoadingKyc ? (
                  <QueueItemSkeleton count={4} />
                ) : applications.length === 0 ? (
                  <div className="text-center text-slate-400 py-16 text-xs font-medium">
                    No {activeTab} applications found in database.
                  </div>
                ) : (
                  applications.map(app => (
                    <div
                      key={app.id}
                      onClick={() => {
                        setSelectedAppId(app.id);
                        setCurrentDocIndex(0);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedAppId === app.id
                        ? 'border-[#D94A38] bg-[#D94A38]/5 shadow-xs'
                        : 'border-slate-200/80 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {app.type}
                        </span>
                        <span className="text-xs text-slate-400">{app.date}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{app.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{app.applicant}</p>
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>{app.docs} documents attached</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Document Viewer & Details */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col h-[650px] relative overflow-hidden">
              {currentApplication ? (
                <div className="flex flex-col h-full animate-fadeIn">
                  {/* Review Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          {currentApplication.name}
                        </h2>
                        <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${currentApplication.status === 'approved' ? 'bg-emerald-500' : currentApplication.status === 'pending' ? 'bg-[#D94A38]' : 'bg-slate-400'}`} />
                          {currentApplication.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>Applicant: {currentApplication.applicant}</span>
                        <span>·</span>
                        <span>{currentApplication.email}</span>
                        <span>·</span>
                        <span>{currentApplication.phone}</span>
                      </p>
                    </div>

                    {/* Action buttons show ONLY for pending applications */}
                    {currentApplication.status?.toLowerCase() === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateKycStatus(currentApplication.id, 'rejected')}
                          disabled={isProcessingKyc}
                          className="bg-slate-100 hover:bg-[#D94A38]/10 hover:text-[#D94A38] text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => handleUpdateKycStatus(currentApplication.id, 'approved')}
                          disabled={isProcessingKyc}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {isProcessingKyc ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approve
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {currentApplication.status?.toLowerCase() === 'approved' ? (
                          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span>Application Approved</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold">
                            <XCircle className="w-4 h-4 text-slate-400" />
                            <span>Application Rejected</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Application Metadata Quick Strip */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans">
                    <div className="flex flex-wrap items-center gap-4 text-slate-600">
                      <div>
                        <span className="text-slate-400 font-semibold">Khau Galli: </span>
                        <strong className="text-slate-900 font-bold">{currentApplication.details?.cluster || 'Ahmedabad Khau Galli'}</strong>
                      </div>
                      {currentApplication.type === 'vendor' ? (
                        <>
                          <div>
                            <span className="text-slate-400 font-semibold">Category: </span>
                            <strong className="text-slate-900 font-bold">{currentApplication.details?.stallCategory || 'Fast Food & Dosa'}</strong>
                          </div>
                          {currentApplication.details?.openTill && (
                            <div>
                              <span className="text-slate-400 font-semibold">Open Till: </span>
                              <strong className="text-slate-900">{currentApplication.details.openTill}</strong>
                            </div>
                          )}
                        </>
                      ) : (
                        currentApplication.details?.vehicleModel && (
                          <div>
                            <span className="text-slate-400 font-semibold">Vehicle: </span>
                            <strong className="text-slate-900 font-bold">{currentApplication.details.vehicleModel}</strong>
                          </div>
                        )
                      )}
                      {currentApplication.details?.bankName && (
                        <div>
                          <span className="text-slate-400 font-semibold">Bank: </span>
                          <span className="text-slate-700">{currentApplication.details.bankName}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-700">
                      {currentDocs.length} KYC Documents
                    </span>
                  </div>

                  {/* Document Display Canvas */}
                  <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200/80 p-4 flex flex-col items-center justify-center relative group overflow-hidden">
                    {currentDoc ? (
                      <>
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 z-10">
                          {currentDoc.name}
                        </div>
                        <button
                          onClick={() => setIsExpanded(true)}
                          className="absolute top-3 right-3 bg-white/90 hover:bg-white backdrop-blur-xs border border-slate-200 p-2 rounded-lg text-slate-700 transition-colors shadow-xs z-10 cursor-pointer"
                          title="Full Screen View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <img
                          src={currentDoc.url}
                          alt={currentDoc.name}
                          className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                        />
                      </>
                    ) : (
                      <div className="text-center text-slate-400">
                        <FileText className="w-12 h-12 mb-2 opacity-30" />
                        <p className="text-xs font-bold">No documents attached.</p>
                      </div>
                    )}
                  </div>

                  {/* Document Navigation Controls */}
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setCurrentDocIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentDocIndex === 0}
                      className="text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Previous Document
                    </button>
                    <span className="text-xs text-slate-400 font-medium">
                      {currentDocs.length > 0
                        ? `${currentDocIndex + 1} / ${currentDocs.length}`
                        : '0 Documents'}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentDocIndex(prev => Math.min(currentDocs.length - 1, prev + 1))
                      }
                      disabled={currentDocIndex >= currentDocs.length - 1}
                      className="text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Next Document
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <AlertCircle className="w-12 h-12 mb-3 opacity-25" />
                  <p className="text-sm font-semibold">
                    Select an application from the queue to inspect KYC documents.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Expanded Document Modal */}
          {isExpanded && currentDoc && currentDoc.url && (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-4xl flex justify-between items-center mb-3">
                <div className="text-white">
                  <h3 className="text-base font-bold">
                    {currentApplication?.name} — {currentDoc.name}
                  </h3>
                  <p className="text-xs text-slate-400">Cloudinary KYC Inspection</p>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors cursor-pointer"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="w-full max-w-4xl h-[80vh] bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center p-4 shadow-2xl overflow-hidden">
                <img
                  src={currentDoc.url}
                  alt={currentDoc.name}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminVerification;
