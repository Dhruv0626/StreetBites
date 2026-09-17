import React, { useState, useEffect } from 'react';
import { Menu as MenuIcon, Plus, Search, MoreVertical, X, Upload, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon} from 'lucide-react';
import { useNavigate } from 'react-router';
import { vendorMenuService, type VendorMenuItem } from '../../services/vendorMenuService';
import { Skeleton } from '../../components/Skeleton';
import { CustomSelect } from '../../components/CustomSelect';

export const VendorMenuPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>(['All']);
  const [menuItems, setMenuItems] = useState<VendorMenuItem[]>([]);
  const [stallInfo, setStallInfo] = useState<any>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState<string | null>(null);

  // Variety item form state (including image upload)
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    category: '',
    base_price: '',
    price: '',
    imageUrl: '',
  });

  // Dropdown state
  const [activeDropdownMenu, setActiveDropdownMenu] = useState<string | null>(null);

  // Load menu items from MongoDB
  const loadMenu = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await vendorMenuService.getVendorMenu();
      if (res.success && res.data) {
        setStallInfo(res.data.stall);
        setCategories(res.data.categories || ['All']);
        setMenuItems(res.data.menuItems || []);
      } else {
        setErrorMessage(res.message || 'Failed to load menu items from database.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting to menu service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  /**
   * Client-side canvas compression for food item images
   */
  const compressImage = (file: File, maxWidth = 800, maxHeight = 600, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(event.target?.result as string);
      };
      reader.onerror = () => resolve('');
    });
  };

  // Image Upload handler for Category Modal (Add Food Item)
  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const MAX_SIZE = 1 * 1024 * 1024; // 1 MB limit
      if (file.size >= MAX_SIZE) {
        alert(`Image size must be less than 1MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Please choose a smaller image.`);
        e.target.value = '';
        return;
      }
      try {
        const compressed = await compressImage(file);
        setNewCategoryImage(compressed);
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => setNewCategoryImage(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  // Image Upload handler for Variety Food Item Modal (Add Variety)
  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const MAX_SIZE = 1 * 1024 * 1024; // 1 MB limit
      if (file.size >= MAX_SIZE) {
        alert(`Image size must be less than 1MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Please choose a smaller image.`);
        e.target.value = '';
        return;
      }
      try {
        const compressed = await compressImage(file);
        setNewItem(prev => ({ ...prev, imageUrl: compressed }));
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => setNewItem(prev => ({ ...prev, imageUrl: reader.result as string }));
        reader.readAsDataURL(file);
      }
    }
  };

  // Add Master Food Item / Category in MongoDB
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Please enter a category name");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await vendorMenuService.addCategory({
        name: newCategoryName.trim(),
        image_url: newCategoryImage || undefined
      });

      if (res.success && res.data) {
        setSuccessMessage(`Food item "${res.data.name}" added and stored in database successfully!`);
        if (!categories.includes(res.data.name)) {
          setCategories(prev => [...prev, res.data.name]);
        }
        if ((res.data as any).menuItem) {
          setMenuItems(prev => [(res.data as any).menuItem, ...prev]);
        }
        setNewCategoryName('');
        setNewCategoryImage(null);
        setShowCategoryModal(false);
        loadMenu();
      } else {
        setErrorMessage(res.message || "Failed to add category.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error adding category.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Add Variety of Food Item to Stall's menu_items array in MongoDB
  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      alert("Please enter the variety food item name.");
      return;
    }

    const basePriceNum = parseFloat(newItem.base_price);
    if (isNaN(basePriceNum) || basePriceNum <= 0) {
      alert("Please enter a valid base price greater than 0.");
      return;
    }

    const customerPriceNum = newItem.price ? parseFloat(newItem.price) : Math.round(basePriceNum * 1.10);
    const selectedCategory = newItem.category || categories.find(c => c !== 'All') || 'General';

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await vendorMenuService.addMenuItem({
        name: newItem.name.trim(),
        description: newItem.description.trim(),
        base_price: basePriceNum,
        price: customerPriceNum,
        category: selectedCategory,
        image_url: newItem.imageUrl || undefined,
        is_available: true
      });

      if (res.success && res.data) {
        setSuccessMessage(`Food item variety "${res.data.name}" saved in database!`);
        setMenuItems(prev => [res.data, ...prev.filter(i => i.id !== res.data.id)]);
        if (selectedCategory && !categories.includes(selectedCategory)) {
          setCategories(prev => [...prev, selectedCategory]);
        }
        setNewItem({ name: '', description: '', category: '', base_price: '', price: '', imageUrl: '' });
        setShowItemModal(false);
        loadMenu();
      } else {
        setErrorMessage(res.message || "Failed to add food item variety.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error adding food item.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Toggle item availability in MongoDB
  const handleToggleAvailability = async (item: VendorMenuItem) => {
    try {
      // Optimistic UI update
      setMenuItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, available: !i.available, is_available: !i.available } : i))
      );

      const res = await vendorMenuService.toggleAvailability(item.id);
      if (!res.success) {
        // Revert if failed
        setMenuItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, available: item.available, is_available: item.available } : i))
        );
        setErrorMessage(res.message || "Failed to update availability.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error toggling item availability.");
      loadMenu();
    }
  };

  // Delete item from stall in MongoDB
  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to remove this food item variety from your menu?")) return;

    try {
      const res = await vendorMenuService.deleteMenuItem(itemId);
      if (res.success) {
        setMenuItems(prev => prev.filter(i => i.id !== itemId));
        setSuccessMessage("Food item deleted from your menu.");
      } else {
        setErrorMessage(res.message || "Failed to delete item.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error deleting item.");
    } finally {
      setActiveDropdownMenu(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const filtered = menuItems.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 pb-20 animate-fadeIn font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex justify-between items-center w-full sm:w-auto">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider bg-[#D94A38]/10 text-[#D94A38] px-2.5 py-0.5 rounded-md">
                {stallInfo?.name || 'My Stall Menu'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Menu Manager</h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {menuItems.length} Total Varieties · {menuItems.filter(i => i.available).length} Available for Ordering
            </p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="tour-add-food flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-white border border-[#E7E2D9] text-stone-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors hover:bg-stone-50 cursor-pointer shadow-3xs"
          >
            <Plus className="w-4 h-4 text-[#D94A38]" /> Add Food Item
          </button>
          <button
            onClick={() => setShowItemModal(true)}
            className="tour-add-variety flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-[#D94A38] hover:bg-[#C43D2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Variety
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative w-full lg:w-72 flex items-center bg-white border border-[#E7E2D9] rounded-2xl px-3.5 py-2.5 text-xs focus-within:border-[#D94A38] transition-colors shadow-3xs">
          <Search className="w-4 h-4 text-stone-400 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search dishes or ingredients..."
            className="bg-transparent outline-none w-full placeholder-stone-400 text-stone-800 font-medium"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none w-full">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeCategory === cat
                ? 'bg-[#1C1917] text-white shadow-md'
                : 'bg-white border border-[#E7E2D9] text-stone-600 hover:border-stone-400 hover:bg-stone-50'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl p-5 border border-[#E7E2D9] shadow-3xs space-y-4">
              <Skeleton className="w-full h-36 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="w-3/4 h-4 rounded-md" />
                <Skeleton className="w-1/2 h-3 rounded-md" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="w-16 h-5 rounded-md" />
                <Skeleton className="w-10 h-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Menu Items Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => {
            const itemImage = item.image_url || item.imageUrl || stallInfo?.image_url;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl p-4.5 shadow-3xs transition-all hover:shadow-sm border flex flex-col justify-between ${item.available ? 'border-[#E7E2D9]' : 'border-dashed border-stone-300 bg-stone-50/60'
                  }`}
              >
                <div>
                  {/* Food Item Image */}
                  <div className="w-full h-36 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/80 mb-3 relative group">
                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={item.name}
                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${!item.available ? 'grayscale opacity-75' : ''
                          }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className={`text-sm font-bold truncate ${item.available ? 'text-stone-900' : 'text-stone-500'}`}>
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                          {item.category || 'General'}
                        </span>
                      </div>
                    </div>

                    {/* Actions dropdown */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setActiveDropdownMenu(activeDropdownMenu === item.id ? null : item.id)}
                        className="text-stone-400 hover:text-stone-700 transition-colors bg-stone-50 hover:bg-stone-100 p-1.5 rounded-xl cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeDropdownMenu === item.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownMenu(null)} />
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-2xl shadow-xl border border-[#E7E2D9] py-1.5 z-20 animate-scaleIn origin-top-right">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              Delete Variety
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price & Availability Toggle */}
                <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-[#E7E2D9]/70">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-lg font-black tracking-tight ${item.available ? 'text-stone-900' : 'text-stone-400'}`}>
                        ₹{item.base_price}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${item.available ? 'text-emerald-600' : 'text-stone-400'}`}>
                      {item.available ? 'In Stock' : 'Sold Out'}
                    </span>
                    {/* Custom Toggle Switch */}
                    <div
                      onClick={() => handleToggleAvailability(item)}
                      className={`tour-item-availability relative w-10 h-6 rounded-full transition-colors cursor-pointer shadow-inner ${item.available ? 'bg-[#D94A38]' : 'bg-stone-300'
                        }`}
                      title={item.available ? 'Click to mark sold out' : 'Click to mark in stock'}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${item.available ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[#E7E2D9] rounded-3xl bg-stone-50/50 p-6">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-3xs text-stone-400">
            <MenuIcon className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-stone-800">No items match your filter</p>
          <p className="text-xs text-stone-500 mt-1 max-w-sm">
            Try selecting another category or click "Add Variety" to upload new food dishes.
          </p>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. Add Food Item / Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scaleIn border border-[#E7E2D9]">
            <div className="p-5 border-b border-[#E7E2D9] flex justify-between items-center bg-stone-50/70">
              <div>
                <h3 className="text-base font-bold text-stone-900">Add New Food Item</h3>
                <p className="text-[11px] text-stone-500">Create a master food category</p>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-stone-400 hover:text-stone-700 bg-white p-1.5 rounded-xl shadow-3xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Food Item / Category Name *
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Dabeli, Momos, Dosa, Parotha..."
                  className="w-full bg-stone-50 border border-[#E7E2D9] rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Upload Food Image
                </label>
                {newCategoryImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 group h-32">
                    <img
                      src={newCategoryImage}
                      alt="Food Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="cursor-pointer bg-white text-stone-800 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-stone-100 transition-colors shadow-sm flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5 text-[#D94A38]" /> Change
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCategoryImageUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewCategoryImage(null)}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#E7E2D9] hover:border-[#D94A38] rounded-2xl p-5 flex flex-col items-center justify-center bg-stone-50 cursor-pointer hover:bg-[#FFF8F6] transition-colors text-center group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCategoryImageUpload}
                      className="hidden"
                    />
                    <Upload className="w-6 h-6 text-stone-400 group-hover:text-[#D94A38] mb-1.5 transition-colors" />
                    <span className="text-xs font-bold text-stone-700 group-hover:text-[#D94A38] transition-colors">
                      Click to upload dish photo
                    </span>
                    <span className="text-[10px] text-stone-400 mt-0.5">PNG, JPG, JPEG strictly under 1MB</span>
                  </label>
                )}
              </div>

              <button
                onClick={handleAddCategory}
                disabled={isSubmitting}
                className="w-full bg-[#1C1917] hover:bg-black text-white font-bold py-3 rounded-xl transition-colors text-xs cursor-pointer shadow-sm disabled:opacity-75 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Submit Food_Item_Category for Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Variety (Menu Item) Modal with Image Upload */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn border border-[#E7E2D9]">
            <div className="p-5 border-b border-[#E7E2D9] flex justify-between items-center bg-stone-50/70 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-stone-900">Add New Variety</h3>
                <p className="text-[11px] text-stone-500">Add dish variety with image and pricing</p>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-stone-400 hover:text-stone-700 bg-white p-1.5 rounded-xl shadow-3xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Variety Name */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Variety Name *
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Cheese Burst Pav Bhaji, Mysore Masala Dosa"
                  className="w-full bg-stone-50 border border-[#E7E2D9] rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Dish Description
                </label>
                <textarea
                  rows={2}
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="e.g. Made with fresh butter, secret spices, and served with 2 toasted pav..."
                  className="w-full bg-stone-50 border border-[#E7E2D9] rounded-xl px-4 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors resize-none"
                />
              </div>

              {/* Category and Base Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <CustomSelect
                    value={newItem.category || (categories.find(c => c !== 'All') || '')}
                    onChange={(val) => setNewItem({ ...newItem, category: val })}
                    options={
                      categories.filter(c => c !== 'All').length === 0
                        ? ["No food items yet (Click 'Add Food Item' first)"]
                        : categories.filter(c => c !== 'All')
                    }
                    placeholder="Select category"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={newItem.base_price}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = parseFloat(val);
                      setNewItem({
                        ...newItem,
                        base_price: val,
                        price: num > 0 ? String(Math.round(num * 1.10)) : ''
                      });
                    }}
                    placeholder="e.g. 100"
                    className="w-full bg-stone-50 border border-[#E7E2D9] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Customer Selling Price Preview */}
              {newItem.base_price && (
                <div className="bg-[#FAF7F2] border border-[#EAE4DA] rounded-2xl p-3 flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium">Customer App Price (Base + 10% Service Factor):</span>
                  <span className="font-mono font-black text-stone-900 text-sm">
                    ₹{newItem.price || Math.round(parseFloat(newItem.base_price) * 1.10)}
                  </span>
                </div>
              )}

              {/* Image Upload for Variety Food Item */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Variety Food Dish Photo *
                </label>
                {newItem.imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 group h-32">
                    <img
                      src={newItem.imageUrl}
                      alt="Variety Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="cursor-pointer bg-white text-stone-800 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-stone-100 transition-colors shadow-sm flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5 text-[#D94A38]" /> Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleItemImageUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewItem(prev => ({ ...prev, imageUrl: '' }))}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#E7E2D9] hover:border-[#D94A38] rounded-2xl p-5 flex flex-col items-center justify-center bg-stone-50 cursor-pointer hover:bg-[#FFF8F6] transition-colors text-center group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleItemImageUpload}
                      className="hidden"
                    />
                    <Upload className="w-6 h-6 text-stone-400 group-hover:text-[#D94A38] mb-1.5 transition-colors" />
                    <span className="text-xs font-bold text-stone-700 group-hover:text-[#D94A38] transition-colors">
                      Upload food variety photo
                    </span>
                    <span className="text-[10px] text-stone-400 mt-0.5">PNG, JPG, WEBP strictly under 1MB</span>
                  </label>
                )}
              </div>

              <button
                onClick={handleAddItem}
                disabled={isSubmitting}
                className="w-full bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold py-3.5 rounded-xl transition-all text-xs mt-2 shadow-sm disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Add Variety to Stall Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorMenuPage;

