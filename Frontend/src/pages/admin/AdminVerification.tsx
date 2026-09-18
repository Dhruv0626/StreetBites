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
  RotateCcw,
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
          if (!selectedAppId || !list.some(a => a.id === selectedAppId)) {
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
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-12 font-sans">
      {/* Header with Title and Global Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Approvals & Verifications</h1>
          <p className="text-sm text-stone-500 mt-1">
            Review KYC onboarding documents and manage vendor food item approval for the customer Home page.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="bg-white border border-[#EFEBE4] hover:bg-stone-50 text-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
        </button>
      </div>

      {/* Primary Section Switcher */}
      <div className="flex bg-stone-200/60 p-1.5 rounded-2xl w-full sm:w-auto self-start border border-[#E7E2D9] gap-1">
        <button
          onClick={() => setActiveSection('foodItems')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSection === 'foodItems'
            ? 'bg-white text-stone-900 shadow-sm border border-stone-200/50'
            : 'text-stone-600 hover:text-stone-900'
            }`}
        >
          <UtensilsCrossed className="w-4 h-4 text-[#D94A38]" />
          <span>Food Items Approval</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${pendingFoodCount > 0
              ? 'bg-[#FCE8E6] text-[#D94A38]'
              : 'bg-stone-100 text-stone-600'
              }`}
          >
            {pendingFoodCount} Pending
          </span>
        </button>

        <button
          onClick={() => setActiveSection('kyc')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSection === 'kyc'
            ? 'bg-white text-stone-900 shadow-sm border border-stone-200/50'
            : 'text-stone-600 hover:text-stone-900'
            }`}
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>KYC Applications</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-100 text-stone-600 font-bold">
            {applications.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: FOOD ITEMS & DISHES APPROVAL                   */}
      {/* ========================================================= */}
      {activeSection === 'foodItems' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Status & Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setFoodTab('Review_pending')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${foodTab === 'Review_pending'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
                : 'bg-white border-[#EFEBE4] hover:border-amber-200'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending Review</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              </div>
              <div className="text-2xl font-extrabold text-amber-900 mt-2">{pendingFoodCount}</div>
              <p className="text-[11px] text-amber-700 mt-0.5">Hidden from Home page</p>
            </div>

            <div
              onClick={() => setFoodTab('Approved')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${foodTab === 'Approved'
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/20'
                : 'bg-white border-[#EFEBE4] hover:border-emerald-200'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Approved</span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-900 mt-2">{approvedFoodCount}</div>
              <p className="text-[11px] text-emerald-700 mt-0.5">Live on Home page</p>
            </div>

            <div
              onClick={() => setFoodTab('Rejected')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${foodTab === 'Rejected'
                ? 'bg-red-50/70 border-red-300 ring-2 ring-red-400/20'
                : 'bg-white border-[#EFEBE4] hover:border-red-200'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-800 uppercase tracking-wider">Rejected</span>
                <XCircle className="w-3.5 h-3.5 text-red-600" />
              </div>
              <div className="text-2xl font-extrabold text-red-900 mt-2">{rejectedFoodCount}</div>
              <p className="text-[11px] text-red-700 mt-0.5">Declined items</p>
            </div>

            <div
              onClick={() => setFoodTab('all')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${foodTab === 'all'
                ? 'bg-stone-100 border-stone-400 ring-2 ring-stone-400/20'
                : 'bg-white border-[#EFEBE4] hover:border-stone-300'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">All Items</span>
                <Store className="w-3.5 h-3.5 text-stone-500" />
              </div>
              <div className="text-2xl font-extrabold text-stone-900 mt-2">{foodItems.length}</div>
              <p className="text-[11px] text-stone-500 mt-0.5">Across all vendor stalls</p>
            </div>
          </div>

          {/* Success / Alert Toast */}
          {actionSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-3 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {foodError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{foodError}</span>
            </div>
          )}

          {/* Search & Filter Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#EFEBE4]">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={foodSearch}
                onChange={e => setFoodSearch(e.target.value)}
                placeholder="Search food item, stall, or Khau Galli..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#D94A38] transition-colors"
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
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
            <div className="lg:col-span-1 bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm flex flex-col min-h-[440px] max-h-[580px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EFEBE4]">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Dishes Queue ({filteredFoodItems.length})
                </span>
                <span className="text-[10px] text-stone-400">Select to inspect</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 hide-scrollbar">
                {isLoadingFood ? (
                  <QueueItemSkeleton count={4} />
                ) : filteredFoodItems.length === 0 ? (
                  <div className="text-center text-stone-400 py-16 text-xs font-medium">
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
                          ? 'border-[#D94A38] bg-[#FDF6F5] shadow-xs'
                          : 'border-[#EFEBE4] hover:border-stone-300 bg-stone-50/40'
                          }`}
                      >
                        {/* Food Image Thumbnail */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200 flex items-center justify-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UtensilsCrossed className="w-6 h-6 text-stone-400" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h4 className="text-sm font-bold text-stone-900 truncate">
                              {item.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${isApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                                }`}
                            >
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
            <div className="lg:col-span-2 bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col h-auto relative overflow-hidden">
              {selectedFood ? (
                <div className="flex flex-col h-full animate-fadeIn">
                  {/* Inspector Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3.5 border-b border-[#EFEBE4]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-stone-900">{selectedFood.name}</h2>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg ${selectedFood.status?.toLowerCase() === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedFood.status === 'Review_pending' ||
                              selectedFood.status === 'PENDING_REVIEW'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {selectedFood.status?.toLowerCase() === 'approved'
                            ? 'Approved & Live'
                            : selectedFood.status === 'Review_pending' ||
                              selectedFood.status === 'PENDING_REVIEW'
                              ? 'Review Pending'
                              : 'Rejected'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <Store className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>
                          {selectedFood.stallName} · {selectedFood.stallCategory}
                        </span>
                        <span className="text-stone-300">·</span>
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
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
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-900">
                          <p className="font-bold">
                            Review Pending · Visible in Stall Menu Only
                          </p>
                          <p className="mt-0.5 text-amber-800 leading-relaxed text-[11px]">
                            This food item is currently shown in its vendor stall's menu, but is{' '}
                            <strong>hidden from the customer Home page ("What's on your mind?")</strong>.
                            Click <strong>"Approve Food Item"</strong> below to publish it to the Home page.
                          </p>
                        </div>
                      </div>
                    ) : selectedFood.status?.toLowerCase() === 'approved' ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <div className="text-xs text-emerald-900">
                          <p className="font-bold">Approved & Published Globally</p>
                          <p className="mt-0.5 text-emerald-800 leading-relaxed text-[11px]">
                            This food item is <strong>active in the stall menu</strong> AND{' '}
                            <strong>featured on the customer Home page ("What's on your mind?")</strong>.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                        <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                        <div className="text-xs text-red-900">
                          <p className="font-bold">Rejected by Admin</p>
                          <p className="mt-0.5 text-red-800 leading-relaxed text-[11px]">
                            This food item has been declined and is hidden from the customer Home page.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dish Media & Info Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-1">
                    {/* Dish Image */}
                    <div className="rounded-2xl border border-stone-200 bg-stone-100 overflow-hidden h-44 flex items-center justify-center relative shadow-inner">
                      {selectedFood.image_url ? (
                        <img
                          src={selectedFood.image_url}
                          alt={selectedFood.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-stone-400">
                          <UtensilsCrossed className="w-8 h-8" />
                          <span className="text-xs font-bold">No Image Provided</span>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                        Dish Preview
                      </div>
                    </div>

                    {/* Dish & Vendor Metadata */}
                    <div className="space-y-2.5 bg-stone-50/70 p-3.5 rounded-2xl border border-[#EFEBE4]">
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                          Description
                        </span>
                        <p className="text-xs text-stone-700 mt-0.5 leading-relaxed">
                          {selectedFood.description ||
                            'Standard freshly prepared authentic street food specialty.'}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-stone-200">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                          Vendor Contact Info
                        </span>
                        <div className="text-xs text-stone-700 mt-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="font-semibold text-stone-900">{selectedFood.vendorName || 'Vendor Partner'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-stone-500">
                            <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>{selectedFood.vendorPhone || '+91 98765 43210'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-stone-500 truncate">
                            <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>{selectedFood.vendorEmail || 'vendor@streetbites.in'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Actions: Only displayed when food item is in Pending state */}
                  {(selectedFood.status === 'Review_pending' ||
                    selectedFood.status === 'PENDING_REVIEW') && (
                    <div className="mt-4 pt-3.5 border-t border-[#EFEBE4] flex items-center justify-end gap-3">
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
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-stone-400">
                  <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center mb-3">
                    <UtensilsCrossed className="w-8 h-8 text-stone-300" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-700">No Food Item Selected</h3>
                  <p className="text-xs text-stone-400 mt-1 max-w-xs text-center">
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
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{kycError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Application List */}
            <div className="lg:col-span-1 bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm flex flex-col h-[650px]">
              <div className="flex gap-2 border-b border-[#EFEBE4] pb-3 mb-4">
                {['pending', 'approved', 'rejected'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 text-xs font-bold uppercase tracking-wider py-2 rounded-xl transition-colors cursor-pointer ${activeTab === tab
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
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
                  <div className="text-center text-stone-500 py-16 text-xs font-medium">
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
                        ? 'border-[#D94A38] bg-[#FCE8E6]'
                        : 'border-[#EFEBE4] hover:border-stone-300 bg-stone-50/30'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${app.type === 'vendor'
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-orange-100 text-orange-700 border border-orange-200'
                            }`}
                        >
                          {app.type}
                        </span>
                        <span className="text-xs text-stone-400">{app.date}</span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900">{app.name}</h4>
                      <p className="text-xs text-stone-500 mt-0.5">{app.applicant}</p>
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-stone-400">
                        <FileText className="w-3.5 h-3.5 text-stone-500" />
                        <span>{app.docs} documents attached</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Document Viewer & Details */}
            <div className="lg:col-span-2 bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col h-[650px] relative overflow-hidden">
              {currentApplication ? (
                <div className="flex flex-col h-full animate-fadeIn">
                  {/* Review Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-4 border-b border-[#EFEBE4]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-stone-900">
                          {currentApplication.name}
                        </h2>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${currentApplication.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : currentApplication.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                            }`}
                        >
                          {currentApplication.status}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
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
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => handleUpdateKycStatus(currentApplication.id, 'approved')}
                          disabled={isProcessingKyc}
                          className="bg-[#1C1917] hover:bg-black text-white px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
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
                          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span>Application Approved</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span>Application Rejected</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Application Metadata Quick Strip */}
                  <div className="bg-stone-50 border border-stone-200/70 rounded-xl px-3.5 py-2 mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans">
                    <div className="flex flex-wrap items-center gap-4 text-stone-600">
                      <div>
                        <span className="text-stone-400 font-semibold">Khau Galli: </span>
                        <strong className="text-stone-800 font-bold">{currentApplication.details?.cluster || 'Ahmedabad Khau Galli'}</strong>
                      </div>
                      {currentApplication.type === 'vendor' ? (
                        <>
                          <div>
                            <span className="text-stone-400 font-semibold">Category: </span>
                            <strong className="text-stone-800 font-bold">{currentApplication.details?.stallCategory || 'Fast Food & Dosa'}</strong>
                          </div>
                          {currentApplication.details?.openTill && (
                            <div>
                              <span className="text-stone-400 font-semibold">Open Till: </span>
                              <strong className="text-stone-800">{currentApplication.details.openTill}</strong>
                            </div>
                          )}
                        </>
                      ) : (
                        currentApplication.details?.vehicleModel && (
                          <div>
                            <span className="text-stone-400 font-semibold">Vehicle: </span>
                            <strong className="text-stone-800 font-bold">{currentApplication.details.vehicleModel}</strong>
                          </div>
                        )
                      )}
                      {currentApplication.details?.bankName && (
                        <div>
                          <span className="text-stone-400 font-semibold">Bank: </span>
                          <span className="text-stone-700">{currentApplication.details.bankName}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] bg-white border border-stone-200 px-2 py-0.5 rounded-md font-bold text-stone-600">
                      {currentDocs.length} KYC Documents
                    </span>
                  </div>

                  {/* Document Display Canvas */}
                  <div className="flex-1 bg-stone-50 rounded-2xl border border-stone-200/80 p-4 flex flex-col items-center justify-center relative group overflow-hidden">
                    {currentDoc ? (
                      <>
                        <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-xs border border-stone-200 px-3 py-1 rounded-lg text-xs font-bold text-stone-700 z-10">
                          {currentDoc.name}
                        </div>
                        <button
                          onClick={() => setIsExpanded(true)}
                          className="absolute top-3 right-3 bg-white/80 hover:bg-white backdrop-blur-xs border border-stone-200 p-2 rounded-lg text-stone-700 transition-colors shadow-xs z-10 cursor-pointer"
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
                      <div className="text-center text-stone-400">
                        <FileText className="w-12 h-12 mb-2 opacity-30" />
                        <p className="text-xs font-bold">No documents attached.</p>
                      </div>
                    )}
                  </div>

                  {/* Document Navigation Controls */}
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#EFEBE4]">
                    <button
                      onClick={() => setCurrentDocIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentDocIndex === 0}
                      className="text-xs font-bold text-stone-900 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Previous Document
                    </button>
                    <span className="text-xs text-stone-400 font-medium">
                      {currentDocs.length > 0
                        ? `${currentDocIndex + 1} / ${currentDocs.length}`
                        : '0 Documents'}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentDocIndex(prev => Math.min(currentDocs.length - 1, prev + 1))
                      }
                      disabled={currentDocIndex >= currentDocs.length - 1}
                      className="text-xs font-bold text-stone-900 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Next Document
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
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
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-4xl flex justify-between items-center mb-3">
                <div className="text-white">
                  <h3 className="text-base font-bold">
                    {currentApplication?.name} — {currentDoc.name}
                  </h3>
                  <p className="text-xs text-stone-400">Cloudinary KYC Inspection</p>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors cursor-pointer"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="w-full max-w-4xl h-[80vh] bg-stone-900 rounded-2xl border border-stone-800 flex items-center justify-center p-4 shadow-2xl overflow-hidden">
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
