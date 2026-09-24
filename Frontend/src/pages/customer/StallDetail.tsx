import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Plus,
  Minus,
  ShoppingBag,
  ChevronRight,
  Star,
  UtensilsCrossed,
  Heart,
  CheckCircle2,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../hooks/useFavorites';
import { clusterService } from '../../services/clusterService';
import { StallDetailSkeleton } from '../../components/Skeleton';
import type { Stall, Dish } from '../../data/mockData';

interface StallDetailProps {
  onNavigate?: (tab: string) => void;
}

export const StallDetail: React.FC<StallDetailProps> = () => {
  const { cartItems, addToCart, removeFromCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { stallId } = useParams<{ stallId: string }>();
  const navigate = useNavigate();

  const [currentStall, setCurrentStall] = useState<Stall | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All Items');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Scroll to top on mount / stallId change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [stallId]);

  useEffect(() => {
    let isMounted = true;

    const parseStallFromClusters = (clustersData: any[]) => {
      let foundStall: Stall | null = null;
      for (const c of clustersData) {
        const match = (c.stalls || []).find(
          (s: any) => String(s.id) === String(stallId) || String(s._id) === String(stallId)
        );
        if (match) {
          const mappedDishes: Dish[] = (match.menu_items || []).map((m: any, mIdx: number) => ({
            id: String(m._id || `dish_${mIdx}`),
            name: m.name || 'Dish',
            price: Number(m.price ?? m.base_price ?? 0),
            description: m.description || '',
            image_url: m.image_url || '',
            category: m.category || m.food_item_id?.name || match.stall_category || 'Specialties',
            is_available: m.is_available !== false,
            status: m.status || 'Approved',
          }));

          const rawCategories = Array.from(new Set(mappedDishes.map((d) => d.category))).filter(Boolean);
          const categories = rawCategories.length > 0 ? ['All Items', ...rawCategories] : ['All Items'];

          const isOnline = match.status !== 'CLOSED' && Boolean(match.is_accepting_orders);

          foundStall = {
            id: String(match.id || match._id || ''),
            name: match.name || 'Stall',
            stall_category: match.stall_category || 'Street Food',
            cluster: c.name || 'Khau Galli',
            clusterId: String(c.id || c._id || ''),
            khauGalliId: String(c.id || c._id || ''),
            khauGalliName: c.name || 'Khau Galli',
            rating: Number(match.rating) || 0,
            open_till: match.open_till || '',
            since: match.since || '1998',
            description: match.description || '',
            image_url: match.image_url || '',
            is_accepting_orders: isOnline,
            status: match.status || 'ACTIVE',
            categories,
            dishes: mappedDishes,
          };
          break;
        }
      }

      if (isMounted && foundStall) {
        setCurrentStall(foundStall);
        setIsLoading(false);
      }
    };

    // 1. Subscribe to SWR live cache updates (instantly syncs UI without page reload)
    const unsubscribe = clusterService.subscribe((clustersData) => {
      if (isMounted && Array.isArray(clustersData) && clustersData.length > 0) {
        parseStallFromClusters(clustersData);
      }
    });

    // 2. Fetch / SWR trigger
    const fetchStall = async () => {
      if (!currentStall && !clusterService.getCachedClusters()) {
        setIsLoading(true);
      }
      try {
        const res = await clusterService.getClusters();
        if (isMounted && res.success && Array.isArray(res.data)) {
          parseStallFromClusters(res.data);
        }
      } catch (err) {
        console.error('Error fetching stall detail:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStall();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [stallId]);

  const handleBack = () => {
    if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  const totalCartPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const filteredDishes = currentStall
    ? currentStall.dishes.filter(
      dish =>
        !activeCategory ||
        activeCategory === 'All Items' ||
        dish.category === activeCategory ||
        currentStall.categories.length <= 1
    )
    : [];

  const categoryCounts = (currentStall?.categories || []).reduce((acc, cat) => {
    if (cat === 'All Items') {
      acc[cat] = currentStall?.dishes.length || 0;
    } else {
      acc[cat] = currentStall?.dishes.filter(d => d.category === cat).length || 0;
    }
    return acc;
  }, {} as Record<string, number>);

  const getDishQuantity = (dishId: string) => {
    if (!currentStall) return 0;
    const item = cartItems.find(i => i.id === dishId && i.vendorId === currentStall.id);
    return item ? item.quantity : 0;
  };

  if (isLoading && !currentStall) {
    return <StallDetailSkeleton />;
  }

  if (!currentStall) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-5 border border-stone-200">
          🏪
        </div>
        <h2 className="text-2xl font-black text-[#1C1917] mb-2">Stall Not Found</h2>
        <p className="text-sm text-stone-500 mb-8 leading-relaxed">
          The requested stall is not available or has not been listed yet.
        </p>
        <button
          onClick={() => navigate('/home')}
          className="bg-[#D94A38] text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-[#C43D2E] transition-all shadow-sm cursor-pointer"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* ─── DESKTOP VIEW ─── */}
      <div className="hidden md:block">
        {/* Breadcrumbs & Back Button */}
        <div className="flex items-center gap-3 mb-5 pt-4">
          <button
            type="button"
            onClick={handleBack}
            className="w-8 h-8 rounded-full bg-white border border-[#EAE4DA] flex items-center justify-center text-[#1C1917] hover:bg-[#F2EDE5] transition-colors cursor-pointer shadow-3xs active:scale-95"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-xs text-[#8E8B85]">
            <button onClick={() => navigate('/home')} className="hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium">Home</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <button onClick={() => navigate('/all-khaugallis')} className="hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium">{currentStall.cluster || 'Khau Gallis'}</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1C1917] font-semibold">{currentStall.name}</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs mb-8 grid grid-cols-3 gap-6 relative overflow-hidden">
          <div className="col-span-2 flex flex-col justify-between z-10">
            <div>
              {/* Top Tags */}
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-[#1C1917] text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md">
                  {currentStall.stall_category}
                </span>
                {currentStall.is_accepting_orders ? (
                  <span className="bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                    Open Now
                  </span>
                ) : (
                  <span className="bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                    Closed
                  </span>
                )}
                {currentStall.since && (
                  <span className="text-xs text-[#8E8B85] font-medium">
                    Since {currentStall.since}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-[#D94A38] font-bold">
                  <Star className="w-3.5 h-3.5 fill-[#D94A38] stroke-[0]" />
                  {currentStall.rating ?? 0.0}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold text-[#1C1917] mb-3">
                {currentStall.name}
              </h1>

              {/* Description */}
              <p className="text-sm text-[#5C5954] max-w-xl leading-relaxed mb-6">
                {currentStall.description}
              </p>
            </div>

            {/* Quick Specs */}
            <div className="flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-[#1C1917] pt-4 border-t border-[#F5F0E8]">
              <div>
                <span className="text-[10px] text-[#8E8B85] block font-bold mb-1">KHAU GALLI</span>
                <span className="text-sm font-bold">{currentStall.cluster}</span>
              </div>
              {currentStall.open_till && (
                <div>
                  <span className="text-[10px] text-[#8E8B85] block font-bold mb-1">OPEN TILL</span>
                  <span className="text-sm font-bold text-[#D94A38]">{currentStall.open_till}</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden h-64 border border-[#EAE4DA] group">
            {currentStall.image_url ? (
              <img src={currentStall.image_url} alt={currentStall.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full bg-stone-100 flex items-center justify-center text-4xl">🏪</div>
            )}
            {/* Heart Button */}
            <button
              onClick={(e) => toggleFavorite(currentStall.id, e)}
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-white/50 flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-pointer"
              title="Add to Favorites"
            >
              <Heart className={`w-4 h-4 ${isFavorite(currentStall.id) ? 'fill-[#D94A38] text-[#D94A38]' : 'text-[#4B5563]'}`} />
            </button>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
              <span className="text-white text-xs font-bold uppercase tracking-wider bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                {currentStall.cluster}
              </span>
            </div>
          </div>
        </div>

        {/* Content Layout: 3-column split (Categories on left 3 cols, Dishes in middle 6 cols, Cart on right 3 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-16 items-start">

          {/* 1. LEFT COLUMN: Categories Sidebar & Strict Isolation Notice */}
          <div className="lg:col-span-3 space-y-4 sticky top-24">
            {/* Categories Card */}
            <div className="bg-white rounded-3xl border border-[#EAE4DA] p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-[#8E8B85] uppercase tracking-wider block px-2 mb-2">
                CATEGORIES
              </span>

              <div className="space-y-1.5">
                {currentStall.categories.map((category) => {
                  const isActive = activeCategory === category;
                  const count = categoryCounts[category] || 0;
                  const formattedCount = String(count).padStart(2, '0');

                  return (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isActive
                        ? 'bg-[#1C1917] text-white shadow-xs'
                        : 'text-[#5C5954] hover:text-[#1C1917] hover:bg-[#FAF7F2]'
                        }`}
                    >
                      <span className="truncate pr-2">{category}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg shrink-0 ${isActive
                          ? 'bg-stone-800 text-stone-300'
                          : 'bg-stone-100 text-[#8E8B85]'
                          }`}
                      >
                        {formattedCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strict menu isolation Notice Box */}
            <div className="bg-[#EBF7EE] border border-[#C5E8CE] rounded-2xl p-3.5 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-[#14532D]">Strict menu isolation</p>
                <p className="text-[11px] text-[#166534] mt-0.5 leading-relaxed">
                  Every dish is scoped to{' '}
                  <span className="bg-[#D8F0DF] text-[#14532D] font-mono px-1 py-0.5 rounded text-[10px] font-semibold">
                    {currentStall.name}
                  </span>{' '}
                  — no menu leakage from neighbouring stalls.
                </p>
              </div>
            </div>
          </div>

          {/* 2. MIDDLE COLUMN: Category Header & Dishes Grid */}
          <div className="lg:col-span-6">
            {!currentStall.is_accepting_orders ? (
              <div className="bg-white rounded-3xl p-12 border border-[#EAE4DA] text-center shadow-xs">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 border border-amber-200">
                  <UtensilsCrossed className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Stall is Currently Closed</h2>
                <p className="text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
                  This stall is currently not accepting orders. Please check back later or explore other open stalls in {currentStall.cluster || 'this area'}.
                </p>
              </div>
            ) : (
              <>
                {/* Category Header with item count */}
                <div className="flex items-baseline justify-between mb-5">
                  <h2 className="text-2xl font-bold text-[#1C1917] tracking-tight">
                    {activeCategory} · <span className="text-stone-500 font-semibold text-lg">{filteredDishes.length} items</span>
                  </h2>
                </div>

                {/* Dish Cards Grid */}
                {filteredDishes.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 border border-[#EAE4DA] text-center text-stone-500">
                    <p className="text-base font-bold text-stone-700">No dishes in this category</p>
                    <p className="text-xs text-stone-400 mt-1">Dishes will appear here once added by the vendor.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDishes.map((dish) => {
                      const qty = getDishQuantity(dish.id);

                      return (
                        <div
                          key={dish.id}
                          className="bg-white rounded-3xl border border-[#EAE4DA] p-3.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            {/* Dish Image */}
                            <div className="w-full h-40 rounded-2xl overflow-hidden bg-stone-100 relative mb-3 border border-stone-200/60 flex items-center justify-center">
                              {dish.image_url ? (
                                <img
                                  src={dish.image_url}
                                  alt={dish.name}
                                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${!dish.is_available ? 'grayscale opacity-60' : ''
                                    }`}
                                />
                              ) : (
                                <UtensilsCrossed className="w-8 h-8 text-stone-400" />
                              )}

                              {!dish.is_available ? (
                                <div className="absolute top-2.5 right-2.5 bg-stone-900/90 backdrop-blur-xs text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs tracking-wider">
                                  Not Available
                                </div>
                              ) : null}
                            </div>

                            {/* Dish Info */}
                            <div className="flex items-start justify-between gap-2">
                              <h3 className={`font-bold text-sm leading-snug line-clamp-1 ${dish.is_available ? 'text-[#1C1917]' : 'text-stone-400'}`}>
                                {dish.name}
                              </h3>
                              <span className={`font-black text-sm shrink-0 ${dish.is_available ? 'text-[#1C1917]' : 'text-stone-400'}`}>
                                ₹{dish.price}
                              </span>
                            </div>

                            {dish.description && (
                              <p className="text-[11px] text-[#8E8B85] line-clamp-2 mt-1 leading-relaxed">
                                {dish.description}
                              </p>
                            )}
                          </div>

                          {/* Add / Quantity Button */}
                          <div className="mt-4 pt-2 flex justify-end">
                            {!dish.is_available ? (
                              <span className="bg-stone-100 text-stone-400 border border-stone-200 text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-not-allowed select-none">
                                Sold Out
                              </span>
                            ) : qty > 0 ? (
                              <div className="flex items-center gap-2 bg-[#D94A38] text-white rounded-xl px-3 py-1 text-xs font-bold shadow-xs">
                                <button
                                  onClick={() => removeFromCart(dish.id, currentStall.id)}
                                  className="hover:opacity-80 transition-opacity cursor-pointer font-bold bg-transparent border-0 p-0 text-white"
                                >
                                  -
                                </button>
                                <span className="w-4 text-center">{qty}</span>
                                <button
                                  onClick={() => addToCart({
                                    id: dish.id,
                                    name: dish.name,
                                    price: dish.price,
                                    vendorId: currentStall.id,
                                    vendorName: currentStall.name,
                                    stallName: currentStall.name,
                                    image: dish.image_url,
                                    khauGalliId: currentStall.khauGalliId || currentStall.clusterId || '',
                                    khauGalliName: currentStall.khauGalliName || currentStall.cluster || 'Khau Galli',
                                  })}
                                  className="hover:opacity-80 transition-opacity cursor-pointer font-bold bg-transparent border-0 p-0 text-white"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart({
                                  id: dish.id,
                                  name: dish.name,
                                  price: dish.price,
                                  vendorId: currentStall.id,
                                  vendorName: currentStall.name,
                                  stallName: currentStall.name,
                                  image: dish.image_url,
                                  khauGalliId: currentStall.khauGalliId || currentStall.clusterId || '',
                                  khauGalliName: currentStall.khauGalliName || currentStall.cluster || 'Khau Galli',
                                })}
                                className="bg-[#FAF7F2] hover:bg-[#D94A38] text-[#1C1917] hover:text-white border border-[#EAE4DA] hover:border-[#D94A38] text-xs font-bold px-4 py-1.5 rounded-xl transition-all cursor-pointer shadow-3xs flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 3. RIGHT COLUMN: Order Summary / Cart */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-[#EAE4DA] p-5 shadow-2xs sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-[#F5F0E8] mb-4">
              <h2 className="font-bold text-sm text-[#1C1917]">Your Cart</h2>
              <span className="bg-[#FAF7F2] text-[#4B5563] text-xs font-semibold px-2 py-0.5 rounded-full border border-[#EAE4DA]">
                {cartItems.length} items
              </span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
              {cartItems.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#8E8B85]">
                  <ShoppingBag className="w-10 h-10 stroke-[1.2] mx-auto text-[#DCD6CC] mb-3" />
                  No items in cart yet
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={`${item.vendorId}-${item.id}`} className="flex justify-between items-center gap-2 text-xs">
                    <div className="overflow-hidden">
                      <span className="font-bold text-[#1C1917] block truncate">{item.name}</span>
                      <span className="text-[9px] text-[#8E8B85] uppercase tracking-wide">
                        {(item.vendorName || 'Vendor').split(' ')[0]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center gap-1.5 bg-[#FAF7F2] border border-[#EAE4DA] rounded-md px-1.5 py-0.5">
                        <button
                          onClick={() => removeFromCart(item.id, item.vendorId)}
                          className="text-[#8E8B85] hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-[#1C1917] text-[10px] w-3 text-center">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="text-[#8E8B85] hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold text-[#1C1917] min-w-[32px] text-right">₹{item.price * item.quantity}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations */}
            {cartItems.length > 0 && (
              <div className="pt-3 border-t border-[#F5F0E8] space-y-1.5 text-xs text-[#5C5954]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#1C1917]">₹{totalCartPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes & Fees</span>
                  <span className="font-semibold text-[#1C1917]">₹{Math.round(totalCartPrice * 0.05)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#F5F0E8] mt-2 font-bold text-sm text-[#1C1917]">
                  <span>Total</span>
                  <span>₹{totalCartPrice + Math.round(totalCartPrice * 0.05)}</span>
                </div>

                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full mt-4 bg-[#D94A38] text-white font-bold py-3 rounded-xl hover:bg-[#C43D2E] transition-colors flex items-center justify-between px-4 cursor-pointer shadow-sm"
                >
                  <span>Checkout</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MOBILE VIEW ─── */}
      <div className="md:hidden p-4 pb-32">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-[#EAE4DA] cursor-pointer active:scale-95 transition-transform shrink-0"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-[#1C1917]" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-[#1C1917]">{currentStall.name}</h1>
                {currentStall.is_accepting_orders ? (
                  <span className="bg-[#DCFCE7] text-[#15803D] text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                    Live
                  </span>
                ) : (
                  <span className="bg-stone-100 text-stone-500 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Closed
                  </span>
                )}
              </div>
              {currentStall.cluster && (
                <span className="text-[11px] text-[#8E8B85] font-semibold">{currentStall.cluster}</span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => toggleFavorite(currentStall.id, e)}
            className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-[#EAE4DA] cursor-pointer active:scale-95 transition-transform shrink-0"
            title="Add to Favorites"
          >
            <Heart className={`w-5 h-5 ${isFavorite(currentStall.id) ? 'fill-[#D94A38] text-[#D94A38]' : 'text-[#1C1917]'}`} />
          </button>
        </div>

        {!currentStall.is_accepting_orders ? (
          <div className="p-8 text-center bg-white border border-[#EAE4DA] my-4 rounded-3xl shadow-3xs">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200">
              <UtensilsCrossed className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-[#1C1917] mb-1">Stall is Currently closed</h2>
            <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
              This stall is not accepting orders at the moment. Please explore other active stalls in {currentStall.cluster || 'this area'}.
            </p>
          </div>
        ) : (
          <>
            {currentStall.categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {currentStall.categories.map((cat, idx) => {
                  const count = categoryCounts[cat] || 0;
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${isActive
                        ? 'bg-[#1C1917] text-white shadow-xs'
                        : 'bg-white text-stone-700 border border-[#EAE4DA]'
                        }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-500'}`}>
                        {String(count).padStart(2, '0')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredDishes.length === 0 ? (
                <div className="py-12 text-center text-stone-500 text-sm col-span-full">
                  No dishes listed in this category yet.
                </div>
              ) : (
                filteredDishes.map((dish) => {
                  const qty = getDishQuantity(dish.id);

                  return (
                    <div key={dish.id} className="bg-white p-3.5 rounded-3xl border border-[#EAE4DA] shadow-3xs flex flex-col justify-between">
                      <div>
                        <div className="w-full h-36 rounded-2xl bg-stone-100 overflow-hidden flex items-center justify-center border border-[#EAE4DA] mb-2.5 relative">
                          {dish.image_url ? (
                            <img
                              src={dish.image_url}
                              alt={dish.name}
                              className={`w-full h-full object-cover ${!dish.is_available ? 'grayscale opacity-60' : ''}`}
                            />
                          ) : (
                            <UtensilsCrossed className="w-6 h-6 text-stone-400" />
                          )}
                          {!dish.is_available ? (
                            <div className="absolute top-2 right-2 bg-stone-900/90 backdrop-blur-xs text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
                              Not Available
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-start justify-between gap-1">
                          <h3 className={`font-bold text-sm leading-snug line-clamp-1 ${dish.is_available ? 'text-[#1C1917]' : 'text-stone-400'}`}>
                            {dish.name}
                          </h3>
                          <span className={`font-extrabold text-sm ${dish.is_available ? 'text-[#1C1917]' : 'text-stone-400'}`}>
                            ₹{dish.price}
                          </span>
                        </div>

                        {dish.description && (
                          <p className="text-[11px] text-[#8E8B85] line-clamp-2 mt-0.5">{dish.description}</p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 flex justify-end">
                        {!dish.is_available ? (
                          <span className="bg-stone-100 text-stone-400 border border-stone-200 text-[11px] font-bold px-3 py-1 rounded-xl cursor-not-allowed select-none">
                            Sold Out
                          </span>
                        ) : qty > 0 ? (
                          <div className="flex items-center gap-2 bg-[#D94A38] text-white border border-[#D94A38] rounded-xl px-2.5 py-1 text-xs font-bold shadow-xs">
                            <button onClick={() => removeFromCart(dish.id, currentStall.id)} className="text-white bg-transparent border-0 p-0 cursor-pointer">-</button>
                            <span className="w-4 text-center">{qty}</span>
                            <button onClick={() => addToCart({
                              id: dish.id,
                              name: dish.name,
                              price: dish.price,
                              vendorId: currentStall.id,
                              vendorName: currentStall.name,
                              stallName: currentStall.name,
                              image: dish.image_url,
                              khauGalliId: currentStall.khauGalliId || currentStall.clusterId || '',
                              khauGalliName: currentStall.khauGalliName || currentStall.cluster || 'Khau Galli',
                            })} className="text-white bg-transparent border-0 p-0 cursor-pointer">+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart({
                            id: dish.id,
                            name: dish.name,
                            price: dish.price,
                            vendorId: currentStall.id,
                            vendorName: currentStall.name,
                            stallName: currentStall.name,
                            image: dish.image_url,
                            khauGalliId: currentStall.khauGalliId || currentStall.clusterId || '',
                            khauGalliName: currentStall.khauGalliName || currentStall.cluster || 'Khau Galli',
                          })} className="bg-[#FAF7F2] hover:bg-[#D94A38] text-[#1C1917] hover:text-white border border-[#EAE4DA] text-xs font-bold px-4 py-1.5 rounded-xl shadow-3xs flex items-center gap-1 transition-all cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StallDetail;
