import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  Heart,
  MoreHorizontal,
  ChevronRight,
  Star,
  UtensilsCrossed,
  MapPin,
  Store,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../hooks/useFavorites';
import { clusterService } from '../../services/clusterService';
import { StallDetailSkeleton } from '../../components';
import type { Stall, Dish } from '../../data/mockData';

interface StallsNearMeProps {
  clusterName?: string;
}

export const StallsNearMe: React.FC<StallsNearMeProps> = () => {
  const { cartItems, addToCart, removeFromCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { stallId } = useParams<{ stallId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [clusters, setClusters] = useState<any[]>([]);
  const [activeClusterId, setActiveClusterId] = useState<string>('');
  const [stallsList, setStallsList] = useState<Stall[]>([]);
  const [activeStallId, setActiveStallId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All Items');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Scroll to top when loading the stalls page or switching active stall
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [stallId, activeClusterId]);

  // Helper to map backend stalls to frontend Stall structure
  const mapClusterStalls = (cluster: any): Stall[] => {
    if (!cluster || !Array.isArray(cluster.stalls)) return [];
    return cluster.stalls.map((s: any) => {
      const mappedDishes: Dish[] = (s.menu_items || []).map((m: any, mIdx: number) => ({
        id: String(m._id || `dish_${mIdx}`),
        name: m.name || 'Dish',
        price: Number(m.price ?? m.base_price ?? 0),
        description: m.description || '',
        image_url: m.image_url || '',
        category: m.category || m.food_item_id?.name || s.stall_category || 'Specialties',
        is_available: m.is_available !== false,
        status: m.status || 'Approved',
      }));

      const rawCategories = Array.from(new Set(mappedDishes.map(d => d.category))).filter(Boolean);
      const categories = rawCategories.length > 0 ? ['All Items', ...rawCategories] : ['All Items'];

      const isOnline = s.status !== 'CLOSED' && Boolean(s.is_accepting_orders);

      return {
        id: String(s.id || s._id || ''),
        name: s.name || 'Stall',
        stall_category: s.stall_category || 'Street Food',
        cluster: cluster.name,
        rating: Number(s.rating) || 0.0,
        open_till: s.open_till || '',
        since: s.since || '1998',
        description: s.description || '',
        image_url: s.image_url || '',
        is_accepting_orders: isOnline,
        status: s.status || 'ACTIVE',
        categories,
        dishes: mappedDishes,
      };
    });
  };

  useEffect(() => {
    let isMounted = true;
    const fetchClustersAndStalls = async () => {
      // Only show full loading on initial mount when no data is cached
      if (clusters.length === 0) {
        setIsLoading(true);
      }
      try {
        const res = await clusterService.getClusters();
        if (!isMounted) return;

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const rawClusters = res.data;
          setClusters(rawClusters);

          const clusterParam = searchParams.get('khauGalliId') || searchParams.get('khauGalli') || searchParams.get('clusterId') || searchParams.get('cluster');

          // 1. Resolve which cluster to select
          let targetCluster = rawClusters[0];

          if (clusterParam) {
            const foundByParam = rawClusters.find(
              c => String(c.id) === String(clusterParam) || c.name.toLowerCase() === clusterParam.toLowerCase()
            );
            if (foundByParam) targetCluster = foundByParam;
          } else if (stallId) {
            // Find which cluster contains this stallId
            const foundByStall = rawClusters.find(c =>
              (c.stalls || []).some((s: any) => String(s.id) === String(stallId) || String(s._id) === String(stallId))
            );
            if (foundByStall) targetCluster = foundByStall;
          }

          setActiveClusterId(targetCluster.id);

          // 2. Extract ONLY the stalls for this target cluster
          const targetStalls = mapClusterStalls(targetCluster);
          setStallsList(targetStalls);

          // 3. Select active stall within this cluster
          if (targetStalls.length > 0) {
            const matchedStall = (stallId && targetStalls.find(s => s.id === stallId)) || targetStalls[0];
            setActiveStallId(matchedStall.id);
            setActiveCategory(matchedStall.categories[0] || 'All Items');
          } else {
            setActiveStallId('');
            setActiveCategory('All Items');
          }
        } else {
          setClusters([]);
          setStallsList([]);
        }
      } catch (err) {
        console.error('Error fetching cluster-wise stalls in StallsNearMe:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchClustersAndStalls();
    return () => {
      isMounted = false;
    };
  }, [stallId, searchParams]);

  const activeCluster = clusters.find(c => String(c.id) === String(activeClusterId)) || clusters[0];
  const currentStall = stallsList.find(s => s.id === activeStallId) || stallsList[0];

  const handleClusterSelect = (clusterId: string) => {
    setActiveClusterId(clusterId);
    setSearchParams({ khauGalliId: clusterId });
    const selected = clusters.find(c => String(c.id) === String(clusterId));
    if (selected) {
      const clusterStalls = mapClusterStalls(selected);
      setStallsList(clusterStalls);
      if (clusterStalls.length > 0) {
        setActiveStallId(clusterStalls[0].id);
        setActiveCategory(clusterStalls[0].categories[0] || 'All Items');
      } else {
        setActiveStallId('');
        setActiveCategory('All Items');
      }
    }
  };

  const handleStallChange = (newStallId: string) => {
    setActiveStallId(newStallId);
    const newStall = stallsList.find(s => s.id === newStallId);
    if (newStall && newStall.categories.length > 0) {
      setActiveCategory(newStall.categories[0]);
    }
  };

  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const filteredDishes = currentStall
    ? activeCategory === 'All Items'
      ? currentStall.dishes
      : currentStall.dishes.filter(dish => dish.category === activeCategory)
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

  const handleBack = () => {
    if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/all-khaugallis');
    }
  };

  if (isLoading && stallsList.length === 0) {
    return <StallDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-20 font-sans">
      {/* ─── BREADCRUMBS & TOP NAV ─── */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={handleBack}
          className="w-8 h-8 rounded-full bg-white border border-[#EAE4DA] flex items-center justify-center text-[#1C1917] hover:bg-[#F2EDE5] transition-colors cursor-pointer shadow-3xs active:scale-95 shrink-0"
          title="Go Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-xs text-[#8E8B85] truncate">
          <button onClick={() => navigate('/home')} className="hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium shrink-0">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <button onClick={() => navigate('/all-khaugallis')} className="hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium shrink-0">
            {activeCluster?.name || 'Khau Galli'}
          </button>
          {currentStall && (
            <>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[#1C1917] font-semibold truncate">{currentStall.name}</span>
            </>
          )}
        </div>
      </div>

      {/* ─── CLUSTER SWITCHER PILLS ─── */}
      <div className="mb-6 bg-white p-3 rounded-2xl border border-[#EAE4DA] shadow-3xs">
        <div className="flex items-center gap-2 mb-2 px-1 text-xs font-bold text-stone-500 uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5 text-[#D94A38]" />
          <span>Select Khau Galli :</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {clusters.map((c) => {
            const isSelected = String(c.id) === String(activeClusterId);
            const stallCount = Array.isArray(c.stalls) ? c.stalls.length : 0;
            return (
              <button
                key={c.id}
                onClick={() => handleClusterSelect(c.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${isSelected
                  ? 'bg-[#1C1917] text-white shadow-sm'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/60'
                  }`}
              >
                <span>{c.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
                  }`}>
                  {stallCount} {stallCount === 1 ? 'stall' : 'stalls'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── STALL VIEW ─── */}
      {isLoading ? (
        <StallDetailSkeleton />
      ) : stallsList.length === 0 || !currentStall ? (
        <div className="w-full max-w-lg mx-auto px-4 py-16 text-center bg-white rounded-3xl border border-[#EAE4DA] shadow-sm my-6">
          <div className="w-16 h-16 bg-[#FCE8E6] text-[#D94A38] rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#1C1917] mb-2">No Stalls in {activeCluster?.name || 'This Khau Galli'}</h2>
          <p className="text-xs text-stone-500 mb-6 leading-relaxed max-w-sm mx-auto">
            No vendor stalls are currently onboarded in this specific Khau Galli. Switch Khau Gallis above to explore active street food stalls in other areas.
          </p>
          <button
            onClick={() => {
              const firstWithStalls = clusters.find(c => c.stalls && c.stalls.length > 0);
              if (firstWithStalls) handleClusterSelect(firstWithStalls.id);
            }}
            className="bg-[#D94A38] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-[#C43D2E] transition-all shadow-sm cursor-pointer"
          >
            Explore Active Stalls
          </button>
        </div>
      ) : (
        <>
          {/* ─── DESKTOP VIEW ─── */}
          <div className="hidden md:block">
            {/* Stall Header Selector */}
            <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-2xl border border-[#EAE4DA] shadow-3xs overflow-x-auto no-scrollbar">
              <span className="text-xs font-bold text-[#8E8B85] uppercase tracking-wider px-3 border-r border-[#EAE4DA] shrink-0">
                Stalls :
              </span>
              {stallsList.map((stall, index) => (
                <button
                  key={stall.id}
                  onClick={() => handleStallChange(stall.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${activeStallId === stall.id
                    ? 'bg-[#FCE8E6] text-[#D94A38] border border-[#F5C7C3]'
                    : 'bg-transparent text-[#4B5563] border border-transparent hover:bg-[#F2EDE5]'
                    }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeStallId === stall.id ? 'bg-[#D94A38] text-white' : 'bg-[#EFEBE4] text-[#4B5563]'
                    }`}>
                    {index + 1}
                  </span>
                  {stall.name}
                </button>
              ))}
            </div>

            {/* Hero Banner Card */}
            <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs mb-8 grid grid-cols-3 gap-6 relative overflow-hidden">
              <div className="col-span-2 flex flex-col justify-between z-10">
                <div>
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

                  <h1 className="text-3xl font-extrabold text-[#1C1917] mb-3">
                    {currentStall.name}
                  </h1>

                  <p className="text-sm text-[#5C5954] max-w-xl leading-relaxed mb-6">
                    {currentStall.description}
                  </p>
                </div>

                <div className="flex items-center gap-6 border-t border-[#F5F0E8] pt-4">
                  <div>
                    <span className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold">Category</span>
                    <span className="text-xs font-bold text-[#1C1917]">{currentStall.stall_category}</span>
                  </div>
                  {currentStall.open_till && (
                    <>
                      <div className="h-6 w-px bg-[#EAE4DA]" />
                      <div>
                        <span className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold">Open Till</span>
                        <span className="text-xs font-bold text-[#1C1917]">{currentStall.open_till}</span>
                      </div>
                    </>
                  )}
                  <div className="h-6 w-px bg-[#EAE4DA]" />
                  <div>
                    <span className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold">Khau Galli Location</span>
                    <span className="text-xs font-bold text-[#D94A38]">{currentStall.cluster}</span>
                  </div>
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
                  <span className="text-white text-xs font-bold uppercase tracking-wider bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                    {currentStall.cluster}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop 3-Column Workspace (Categories Sidebar on left, Dishes grid in center, Cart on right) */}
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
                      <Store className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Stall is Currently closed</h2>
                    <p className="text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
                      This stall is currently not accepting orders. Please check back later or explore other open stalls in {activeCluster?.name || 'this Khau Galli'}.
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

                    {/* Dishes Grid */}
                    {filteredDishes.length === 0 ? (
                      <div className="bg-white rounded-3xl p-10 border border-[#EAE4DA] text-center text-stone-500 mb-12">
                        <p className="text-base font-bold text-stone-700">No dishes listed in this category</p>
                        <p className="text-xs text-stone-400 mt-1">Dishes for this stall will appear here once added by the vendor.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                        {filteredDishes.map((dish, idx) => {
                          const qty = getDishQuantity(dish.id);
                          const isBestseller = idx === 0 || dish.price >= 100;

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
                                  ) : isBestseller ? (
                                    <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-xs text-[#D94A38] text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs border border-red-100 tracking-wider">
                                      BESTSELLER
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
                                        khauGalliId: activeClusterId || (activeCluster?.id ? String(activeCluster.id) : ''),
                                        khauGalliName: activeCluster?.name || currentStall.cluster || 'Khau Galli',
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
                                      khauGalliId: activeClusterId || (activeCluster?.id ? String(activeCluster.id) : ''),
                                      khauGalliName: activeCluster?.name || currentStall.cluster || 'Khau Galli',
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
          <div className="md:hidden">
            {/* Mobile Header Banner */}
            <div className="relative h-60 -mx-4 -mt-4 bg-stone-900 p-4 flex flex-col justify-between text-white">
              {currentStall.image_url && (
                <img src={currentStall.image_url} alt={currentStall.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

              <div className="flex justify-between items-center z-10">
                <button
                  onClick={handleBack}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md cursor-pointer border border-[#E5DFD5]"
                >
                  <ArrowLeft className="w-5 h-5 text-[#1C1917]" />
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => toggleFavorite(currentStall.id, e)}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md cursor-pointer border border-[#E5DFD5] active:scale-95 transition-transform"
                    title="Add to Favorites"
                  >
                    <Heart className={`w-5 h-5 ${isFavorite(currentStall.id) ? 'fill-[#D94A38] text-[#D94A38]' : 'text-[#1C1917]'}`} />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md cursor-pointer border border-[#E5DFD5]">
                    <MoreHorizontal className="w-5 h-5 text-[#1C1917]" />
                  </button>
                </div>
              </div>

              <div className="z-10 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#FAF7F2] border border-[#E5DFD5] text-[#1C1917] text-[10px] font-bold px-3 py-0.5 rounded-full shadow-3xs uppercase">
                    {currentStall.stall_category}
                  </span>
                  {currentStall.is_accepting_orders ? (
                    <span className="bg-[#1C1917] text-white text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                      Live
                    </span>
                  ) : (
                    <span className="bg-stone-800 text-stone-300 text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1 border border-stone-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Closed
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{currentStall.name}</h1>
                <p className="text-xs text-stone-300 mt-0.5 font-medium">{currentStall.stall_category} · {currentStall.cluster}</p>
              </div>
            </div>

            {/* Mobile Stalls Selector Slider */}
            <div className="p-4 bg-white border-b border-[#EAE4DA]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8B85]">
                  Stalls in {activeCluster?.name}
                </h3>
              </div>
              <div className="flex gap-4 overflow-x-auto py-2 no-scrollbar">
                {stallsList.map((stall, index) => (
                  <button
                    key={stall.id}
                    onClick={() => handleStallChange(stall.id)}
                    className="flex flex-col items-center gap-1.5 shrink-0 select-none cursor-pointer bg-transparent border-0 p-0"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all relative ${activeStallId === stall.id
                      ? 'border-[#D94A38] bg-[#FCE8E6] text-[#D94A38] scale-105 shadow-3xs'
                      : 'border-[#EAE4DA] bg-[#FAF7F2] text-[#4B5563]'
                      }`}>
                      {index + 1}
                      {activeStallId === stall.id && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#D94A38] text-white text-[9px] rounded-full flex items-center justify-center font-extrabold border border-white">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-[#1C1917] truncate max-w-[80px]">{stall.name}</span>
                    <span className="text-[9px] text-[#8E8B85] font-semibold">★ {stall.rating ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Menu or Closed Notice */}
            {!currentStall.is_accepting_orders ? (
              <div className="p-8 text-center bg-white border border-[#EAE4DA] my-4 rounded-3xl mx-4 shadow-3xs">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200">
                  <Store className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold text-[#1C1917] mb-1">Stall is Currently closed</h2>
                <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                  This stall is not accepting orders at the moment. Please check other stalls in {activeCluster?.name || 'this Khau Galli'}.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Categories Tabs with Pill Counts */}
                {currentStall.categories.length > 1 && (
                  <div className="p-4 flex gap-2 overflow-x-auto bg-white border-b border-[#FAF7F2] no-scrollbar">
                    {currentStall.categories.map((cat, idx) => {
                      const count = categoryCounts[cat] || 0;
                      const isActive = activeCategory === cat;
                      return (
                        <button
                          key={idx}
                          onClick={() => setActiveCategory(cat)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${isActive
                            ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs'
                            : 'bg-white text-[#4B5563] border-[#EAE4DA]'
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

                {/* Mobile Menu Dishes Grid */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-24">
                  {filteredDishes.length === 0 ? (
                    <div className="py-12 text-center text-stone-500 text-sm col-span-full">
                      No items listed in this category yet.
                    </div>
                  ) : (
                    filteredDishes.map((dish, idx) => {
                      const qty = getDishQuantity(dish.id);
                      const isBestseller = idx === 0 || dish.price >= 100;

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
                              ) : isBestseller ? (
                                <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs text-[#D94A38] text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-red-100">
                                  BESTSELLER
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
                                  khauGalliId: activeClusterId || (activeCluster?.id ? String(activeCluster.id) : ''),
                                  khauGalliName: activeCluster?.name || currentStall.cluster || 'Khau Galli',
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
                                khauGalliId: activeClusterId || (activeCluster?.id ? String(activeCluster.id) : ''),
                                khauGalliName: activeCluster?.name || currentStall.cluster || 'Khau Galli',
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

            {/* Mobile Sticky Cart Bar */}
            {totalItemsCount > 0 && (
              <div className="fixed bottom-20 left-4 right-4 z-40">
                <button
                  onClick={() => navigate('/cart')}
                  className="w-full bg-[#1C1917]/95 backdrop-blur-md text-white py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-lg hover:bg-black transition-all cursor-pointer border border-white/10"
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                      {totalItemsCount} item{totalItemsCount > 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-extrabold text-white flex items-center gap-1">
                      View cart <ChevronRight className="w-3.5 h-3.5 text-[#D94A38]" />
                    </span>
                  </div>
                  <span className="text-sm font-black text-[#FAF7F2] bg-[#D94A38] px-3.5 py-1.5 rounded-xl">
                    ₹{totalCartPrice}
                  </span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StallsNearMe;
