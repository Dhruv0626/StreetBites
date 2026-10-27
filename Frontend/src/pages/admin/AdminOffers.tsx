import React, { useState, useEffect } from 'react';
import { Search, Tag, Plus, Trash2, Power, X, Percent, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { offerService, type OfferData } from '../../services/offerService';
import { CustomSelect } from '../../components/CustomSelect';
import { useAlert } from '../../context/AlertContext';

export const AdminOffers: React.FC = () => {
  const { showAlert, showConfirm, toast } = useAlert();
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAudience, setFilterAudience] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_audience: 'ALL' as 'ALL' | 'NEW_USERS' | 'CLUSTER_SPECIFIC',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
    discountValue: '20',
    maxCap: '100',
    minOrder: '150',
    isActive: true,
  });

  // Fetch offers from MongoDB schema
  const fetchOffers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await offerService.getOffers({
        audience: filterAudience !== 'All' ? filterAudience : undefined,
        search: searchQuery.trim() || undefined,
      });
      if (res.success && res.data) {
        const items = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as any)?.data)
            ? (res.data as any).data
            : [];
        setOffers(items);
      } else {
        setErrorMessage(res.message || 'Failed to fetch offers');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to connect to offers API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [filterAudience]);

  // Handle Search input with enter or live debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOffers();
  };

  const toggleOfferStatus = async (id: string) => {
    try {
      const res = await offerService.toggleOfferStatus(id);
      if (res.success) {
        setOffers(prev =>
          prev.map(o => (o._id === id || o.id === id ? { ...o, is_active: !o.is_active } : o))
        );
        toast.success('Offer status updated');
      }
    } catch (err: any) {
      showAlert(err?.message || 'Failed to toggle offer status', 'error');
    }
  };

  const deleteOffer = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Promotion Offer',
      message: 'Are you sure you want to permanently remove this offer from the platform?',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await offerService.deleteOffer(id);
      if (res.success) {
        setOffers(prev => prev.filter(o => o._id !== id && o.id !== id));
        toast.success('Offer removed successfully');
      }
    } catch (err: any) {
      showAlert(err?.message || 'Failed to delete offer', 'error');
    }
  };

  const openCreateModal = () => {
    setEditingOfferId(null);
    setFormData({
      title: '',
      description: '',
      target_audience: 'ALL',
      discountType: 'PERCENTAGE',
      discountValue: '20',
      maxCap: '100',
      minOrder: '150',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (offer: OfferData) => {
    const offerId = offer._id || offer.id || '';
    setEditingOfferId(offerId);
    const isFlat = (offer.flat_discount_amount || 0) > 0 && (offer.discount_percentage || 0) === 0;
    setFormData({
      title: offer.title || '',
      description: offer.description || '',
      target_audience: offer.target_audience || 'ALL',
      discountType: isFlat ? 'FLAT' : 'PERCENTAGE',
      discountValue: isFlat ? String(offer.flat_discount_amount || 0) : String(offer.discount_percentage || 0),
      maxCap: String(offer.max_cap_amount || 0),
      minOrder: String(offer.min_order_amount || 0),
      isActive: offer.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please enter an offer title');
      return;
    }

    const val = Number(formData.discountValue) || 0;
    const cap = Number(formData.maxCap) || 0;
    const min = Number(formData.minOrder) || 0;

    const payload: Partial<OfferData> = {
      title: formData.title.trim(),
      description: formData.description.trim() || 'Promotional discount',
      discount_percentage: formData.discountType === 'PERCENTAGE' ? val : 0,
      flat_discount_amount: formData.discountType === 'FLAT' ? val : 0,
      max_cap_amount: cap,
      min_order_amount: min,
      target_audience: formData.target_audience,
      is_active: formData.isActive,
    };

    setIsSaving(true);
    try {
      if (editingOfferId) {
        const res = await offerService.updateOffer(editingOfferId, payload);
        if (res.success && res.data) {
          const updatedItem: OfferData = (res.data as any)?.data || res.data;
          setOffers(prev =>
            prev.map(o => (o._id === editingOfferId || o.id === editingOfferId ? updatedItem : o))
          );
          setIsModalOpen(false);
          toast.success('Offer updated successfully!');
        } else {
          showAlert(res.message || 'Failed to update offer', 'error');
        }
      } else {
        const res = await offerService.createOffer(payload);
        if (res.success && res.data) {
          const newItem: OfferData = (res.data as any)?.data || res.data;
          setOffers(prev => [newItem, ...prev]);
          setIsModalOpen(false);
          toast.success('New promotion offer created!');
        } else {
          showAlert(res.message || 'Failed to create offer', 'error');
        }
      }
    } catch (err: any) {
      showAlert(err?.message || 'Error saving offer', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-fadeIn pb-12 font-sans">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Campaign & Promotion Engine</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D94A38]/10 text-[#D94A38] border border-[#D94A38]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D94A38] animate-pulse mr-1.5" />
              {offers.filter(o => o.is_active).length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Configure promotional discount coupons, caps, and cluster incentives.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#D94A38] hover:bg-[#C43D2E] text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-xs hover:shadow-sm flex items-center justify-center gap-2 text-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Promotion</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-slate-100 border border-slate-300 text-slate-900 text-xs rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#D94A38]" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Campaigns</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">{offers.length}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">Configured promo rules</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#D94A38]/10 text-[#D94A38] border border-[#D94A38]/20 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Discounts</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">{offers.filter(o => o.is_active).length}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">Live at customer checkout</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
            <Power className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Audience Scopes</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {offers.length > 0 ? `${new Set(offers.map(o => o.target_audience || 'ALL')).size} Groups` : '0 Groups'}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">Target segmentation</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-50/40">
          <form onSubmit={handleSearchSubmit} className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search promotions and press Enter..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D94A38]/20 focus:border-[#D94A38] transition-all"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-56">
            <CustomSelect
              value={filterAudience}
              onChange={(val) => setFilterAudience(val)}
              options={[
                { value: "All", label: "All Audiences" },
                { value: "ALL", label: "Global (ALL)" },
                { value: "NEW_USERS", label: "New Users Only" },
                { value: "CLUSTER_SPECIFIC", label: "Cluster Specific" },
              ]}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-[#D94A38]" />
              <span className="text-xs font-semibold">Loading promotions from database...</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Offer Title & Code</th>
                  <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Target Scope</th>
                  <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Discount & Max Cap</th>
                  <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Min. Order</th>
                  <th className="px-5 py-3.5 uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-5 py-3.5 uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {offers.map((offer) => {
                  const offerId = offer._id || offer.id || '';
                  const isPercentage = (offer.discount_percentage || 0) > 0;
                  return (
                    <tr key={offerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 font-bold">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{offer.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">{offer.description}</div>
                            <div className="text-[10px] font-mono font-bold mt-1 text-slate-400">ID: {offerId.slice(-8).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/70 text-slate-700 text-[11px] font-semibold">
                          {offer.target_audience === 'ALL' ? 'Global · All Stalls' : offer.target_audience === 'NEW_USERS' ? 'New Users Only' : 'Khau Galli Specific'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-slate-900 font-extrabold text-xs">
                          {isPercentage ? `${offer.discount_percentage}% OFF` : `FLAT ₹${offer.flat_discount_amount || 0}`}
                        </div>
                        {(offer.max_cap_amount || 0) > 0 && (
                          <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                            Max Cap: <span className="font-semibold text-slate-800">₹{offer.max_cap_amount}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800 font-mono">₹{offer.min_order_amount || 0}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 border border-slate-200 bg-slate-100 text-slate-700">
                          <span className={`w-1.5 h-1.5 rounded-full ${offer.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {offer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(offer)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/80"
                            title="Edit Campaign"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleOfferStatus(offerId)}
                            className="p-1.5 rounded-lg transition-colors cursor-pointer border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title={offer.is_active ? "Deactivate Campaign" : "Activate Campaign"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteOffer(offerId)}
                            className="p-1.5 rounded-lg transition-colors cursor-pointer border border-slate-200/80 text-slate-400 hover:text-[#D94A38] hover:bg-[#D94A38]/10"
                            title="Delete Campaign"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {offers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                      No promotion campaigns found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Offer Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-fadeIn border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200/60 font-bold">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingOfferId ? 'Edit Campaign Rule' : 'Create Promotion Campaign'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Save discount coupon terms directly to the Offer collection.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOffer} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Offer Title / Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50% OFF UPTO ₹100 or STREETSPECIAL"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Terms & Description *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Valid on all orders above ₹149 across Khau Galli stalls"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                />
              </div>

              {/* Discount Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Discount Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discountType: 'PERCENTAGE' })}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        formData.discountType === 'PERCENTAGE'
                          ? 'bg-[#FCE8E6] border-[#D94A38] text-[#D94A38]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" /> % Off
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discountType: 'FLAT' })}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        formData.discountType === 'FLAT'
                          ? 'bg-[#FCE8E6] border-[#D94A38] text-[#D94A38]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Flat ₹ Off
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    {formData.discountType === 'PERCENTAGE' ? 'Discount Percentage (%) *' : 'Flat Discount Value (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={formData.discountType === 'PERCENTAGE' ? 'e.g. 50' : 'e.g. 75'}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Caps & Minimum Cart */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Max Discount Cap (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 100"
                    value={formData.maxCap}
                    onChange={(e) => setFormData({ ...formData, maxCap: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Min Cart Order (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 149"
                    value={formData.minOrder}
                    onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Target Scope */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Target Audience Scope
                </label>
                <CustomSelect
                  value={formData.target_audience}
                  onChange={(val) => setFormData({ ...formData, target_audience: val as any })}
                  options={[
                    { value: "ALL", label: "Global (ALL Users & Stalls)" },
                    { value: "NEW_USERS", label: "New Users Only" },
                    { value: "CLUSTER_SPECIFIC", label: "Khau Galli Specific" },
                  ]}
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#D94A38] hover:bg-[#C43D2E] transition-all shadow-xs cursor-pointer flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingOfferId ? 'Save Changes' : 'Publish Campaign'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOffers;

