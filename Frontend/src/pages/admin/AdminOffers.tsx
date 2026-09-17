import React, { useState, useEffect } from 'react';
import { Search, Tag, Plus, Trash2, Power, X, Percent, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { offerService, type OfferData } from '../../services/offerService';

export const AdminOffers: React.FC = () => {
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
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle offer status');
    }
  };

  const deleteOffer = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this offer?')) {
      try {
        const res = await offerService.deleteOffer(id);
        if (res.success) {
          setOffers(prev => prev.filter(o => o._id !== id && o.id !== id));
        }
      } catch (err: any) {
        alert(err?.message || 'Failed to delete offer');
      }
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
        } else {
          alert(res.message || 'Failed to update offer');
        }
      } else {
        const res = await offerService.createOffer(payload);
        if (res.success && res.data) {
          const newItem: OfferData = (res.data as any)?.data || res.data;
          setOffers(prev => [newItem, ...prev]);
          setIsModalOpen(false);
        } else {
          alert(res.message || 'Failed to create offer');
        }
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving offer');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Offers & Promotions</h1>
          <p className="text-sm text-stone-500 mt-1">Manage platform coupons, targeted discounts, and cluster promo rules stored in the database.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create New Offer
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Total Offers</span>
          <div className="text-2xl font-black text-stone-900 mt-1">{offers.length}</div>
        </div>
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Active Promos</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{offers.filter(o => o.is_active).length}</div>
        </div>
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Audience Groups</span>
          <div className="text-2xl font-black text-stone-900 mt-1">
            {offers.length > 0 ? `${new Set(offers.map(o => o.target_audience || 'ALL')).size} Scopes` : '0 Scopes'}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl overflow-hidden shadow-sm flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#EFEBE4] flex flex-col sm:flex-row gap-4 justify-between items-center">
          <form onSubmit={handleSearchSubmit} className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search offers and press Enter..." 
              className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-[#EFEBE4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D94A38]/20 focus:border-[#D94A38]"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select 
              value={filterAudience}
              onChange={(e) => setFilterAudience(e.target.value)}
              className="bg-stone-50 border border-[#EFEBE4] text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D94A38]/20 text-stone-700"
            >
              <option value="All">All Audiences</option>
              <option value="ALL">Global (ALL)</option>
              <option value="NEW_USERS">New Users Only</option>
              <option value="CLUSTER_SPECIFIC">Cluster Specific</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-stone-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#D94A38]" />
              <span className="text-xs font-bold">Loading promotions from database...</span>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-stone-50/50 text-stone-500 font-medium border-b border-[#EFEBE4]">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Offer Details</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Audience / Scope</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Discount & Caps</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Min. Cart Value</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEBE4]">
                {offers.map((offer) => {
                  const offerId = offer._id || offer.id || '';
                  const isPercentage = (offer.discount_percentage || 0) > 0;
                  return (
                    <tr key={offerId} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                            <Tag className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-stone-900">{offer.title}</div>
                            <div className="text-xs text-stone-500 mt-0.5 max-w-xs truncate">{offer.description}</div>
                            <div className="text-[10px] font-mono font-bold mt-1 text-stone-400">{offerId.slice(-8).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 text-[11px] font-bold">
                          {offer.target_audience === 'ALL' ? 'Global · All Users' : offer.target_audience === 'NEW_USERS' ? 'New Users Only' : 'Cluster Specific'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-stone-900 font-black">
                          {isPercentage ? `${offer.discount_percentage}% OFF` : `FLAT ₹${offer.flat_discount_amount || 0}`}
                        </div>
                        {(offer.max_cap_amount || 0) > 0 && (
                          <div className="text-[11px] font-medium text-stone-500 mt-0.5">
                            Max Cap: <span className="font-bold text-stone-700">₹{offer.max_cap_amount}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-stone-800">₹{offer.min_order_amount || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                          offer.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-500 border border-stone-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${offer.is_active ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                          {offer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            onClick={() => openEditModal(offer)}
                            className="p-2 rounded-xl text-stone-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border border-stone-200"
                            title="Edit Offer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => toggleOfferStatus(offerId)} 
                            className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                              offer.is_active ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={offer.is_active ? "Deactivate Offer" : "Activate Offer"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteOffer(offerId)} 
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition-colors cursor-pointer border border-red-200"
                            title="Delete Offer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {offers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                      No offers found in the database.
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
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-fadeIn border border-[#EFEBE4]">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#EFEBE4] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  {editingOfferId ? 'Edit Offer & Promotion' : 'Create New Promotion'}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Save coupon codes, discount amounts, and caps directly to the Offer schema.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOffer} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto hide-scrollbar">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Offer Title / Coupon Code *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 50% OFF UPTO ₹100 or FESTIVALSPECIAL"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Terms & Description *
                </label>
                <textarea 
                  rows={2}
                  required
                  placeholder="e.g. Valid on all orders above ₹149 from selected cluster stalls"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                />
              </div>

              {/* Discount Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Discount Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discountType: 'PERCENTAGE' })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        formData.discountType === 'PERCENTAGE'
                          ? 'bg-[#FCE8E6] border-[#D94A38] text-[#D94A38]'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" /> Percentage %
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discountType: 'FLAT' })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        formData.discountType === 'FLAT'
                          ? 'bg-[#FCE8E6] border-[#D94A38] text-[#D94A38]'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      Flat ₹ OFF
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    {formData.discountType === 'PERCENTAGE' ? 'Discount Percentage (%) *' : 'Flat Discount Value (₹) *'}
                  </label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    placeholder={formData.discountType === 'PERCENTAGE' ? 'e.g. 50' : 'e.g. 75'}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Caps & Minimum Cart */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Max Discount Cap (₹) *
                  </label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    placeholder="e.g. 120"
                    value={formData.maxCap}
                    onChange={(e) => setFormData({ ...formData, maxCap: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Min Cart Order (₹) *
                  </label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    placeholder="e.g. 199"
                    value={formData.minOrder}
                    onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Target Scope */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Target Audience Scope
                </label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as any })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                >
                  <option value="ALL">Global (ALL Users & Stalls)</option>
                  <option value="NEW_USERS">New Users Only</option>
                  <option value="CLUSTER_SPECIFIC">Cluster Specific</option>
                </select>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[#EFEBE4] flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#D94A38] hover:bg-[#C43D2E] transition-all shadow-sm cursor-pointer flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingOfferId ? 'Update Promotion' : 'Publish Promotion'}</span>
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
