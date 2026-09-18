import React, { useState, useEffect } from 'react';
import { HeroBanner, ClusterCard, ClusterCardSkeleton } from '../../components';
import { ArrowRight, Star, Heart, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useFavorites } from '../../hooks/useFavorites';
import { clusterService } from '../../services/clusterService';
import type { ClusterItem } from '../../types';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [approvedFoodCategories, setApprovedFoodCategories] = useState<any[]>([]);
  const [isLoadingClusters, setIsLoadingClusters] = useState<boolean>(true);

  useEffect(() => {
    const loadClusters = async () => {
      setIsLoadingClusters(true);
      try {
        const res: any = await clusterService.getClusters();
        if (res.success && res.data && res.data.length > 0) {
          const mapped: ClusterItem[] = res.data.map((c: any) => {
            const onlineCount = c.stalls ? c.stalls.filter((s: any) => s.status !== 'CLOSED' && s.is_accepting_orders).length : 0;
            const totalCount = c.stalls ? c.stalls.length : 0;
            return {
              id: c.id,
              name: c.name,
              subtext: c.city || 'Ahmedabad',
              distance: '',
              eta: '',
              imageText: c.name.toUpperCase(),
              badge: onlineCount > 0 ? 'LIVE' : null,
              isLive: c.is_active !== false && onlineCount > 0,
              stallsOpen: onlineCount,
              totalStalls: totalCount,
              categories: [],
              image: c.image_url || '',
            };
          });
          setClusters(mapped);

          const dynamicStalls = res.data.flatMap((c: any) =>
            (c.stalls || []).map((s: any) => ({
              id: s.id,
              name: s.name,
              rating: Number(s.rating ?? 0.0),
              time: '20-25 mins',
              type: s.stall_category || 'Street Food',
              price: '₹150 for two',
              image: s.image_url || 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop',
              menu_items: s.menu_items || [],
            }))
          );
          setStalls(dynamicStalls);
        } else {
          setClusters([]);
          setStalls([]);
        }

        if (res.food_items && Array.isArray(res.food_items)) {
          setApprovedFoodCategories(res.food_items);
        }
      } catch (err) {
        console.error('Failed to load clusters for Home:', err);
      } finally {
        setIsLoadingClusters(false);
      }
    };

    loadClusters();
  }, []);

  // Exclusively show master FoodItem model categories approved by Admin (excluding stall-specific varieties)
  const masterApprovedFoodItems = approvedFoodCategories
    .filter((f: any) => (f.status || '').toLowerCase() === 'approved')
    .map((f: any) => ({
      id: f.id || f._id,
      name: f.name,
      category: f.name,
      image: f.image_url || f.image || '',
      status: 'Approved',
    }));

  // Distinct master food item categories (excluding generic "Street Food")
  const distinctFoodItems = Array.from(
    new Map(
      masterApprovedFoodItems
        .filter(item => item.name && item.name.toLowerCase() !== 'street food')
        .map(item => [item.name.toLowerCase().trim(), item])
    ).values()
  );

  return (
    <div className="bg-[#FAF7F2] min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">

        {/* Hero Section */}
        <HeroBanner />

        {/* What's on your mind? (3D Food Items on Plates - Full Fit) */}
        {distinctFoodItems.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
                What's on your mind?
              </h2>
            </div>
            <div className="flex gap-6 sm:gap-8 overflow-x-auto pb-6 pt-2 px-2 no-scrollbar -mx-2">
              {distinctFoodItems.map((food, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(food.name)}`)}
                  className="flex flex-col items-center gap-2.5 cursor-pointer group shrink-0 select-none"
                >
                  {/* Standalone 3D Food Item Container */}
                  <div className="relative w-22 h-22 sm:w-26 sm:h-26 flex items-center justify-center transform group-hover:scale-108 group-hover:-translate-y-2 transition-all duration-300">
                    {/* Realistic 3D Ambient Bottom Shadow */}
                    <div className="absolute -bottom-1.5 inset-x-2 h-3.5 bg-stone-900/15 rounded-full blur-md transform group-hover:scale-115 group-hover:bg-stone-900/25 group-hover:blur-lg transition-all duration-300 pointer-events-none" />

                    {food.image ? (
                      <img
                        src={food.image}
                        alt={food.name}
                        className="w-full h-full object-cover rounded-full filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.12)] group-hover:drop-shadow-[0_12px_22px_rgba(0,0,0,0.22)] transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                        <UtensilsCrossed className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Food Label */}
                  <span className="text-sm font-semibold text-stone-700 group-hover:text-[#D94A38] group-hover:font-bold transition-all text-center tracking-tight">
                    {food.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top Clusters / Brands */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight truncate">
              Trending Khau Gallis
            </h2>
            <button
              onClick={() => navigate('/all-clusters')}
              className="text-xs sm:text-sm font-bold text-[#D94A38] hover:text-[#C43D2E] flex items-center gap-1 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>See all</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {isLoadingClusters ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="w-[300px] shrink-0 flex flex-col h-full">
                  <ClusterCardSkeleton />
                </div>
              ))
            ) : clusters.length === 0 ? (
              <div className="text-xs text-stone-400 py-4 font-medium font-sans">No active clusters found.</div>
            ) : (
              clusters.map((cluster) => (
                <div key={cluster.id} className="w-[300px] shrink-0 flex flex-col h-full" onClick={() => navigate(`/stalls?clusterId=${cluster.id}`)}>
                  <ClusterCard
                    cluster={cluster}
                    isMobileFeatured={false}
                    onClick={() => navigate(`/stalls?clusterId=${cluster.id}`)}
                  />
                </div>
              ))
            )}
          </div>
        </section>

        {/* Stalls Near You Grid */}
        <section className="pb-12">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              Top stalls to explore
            </h2>
            <button
              onClick={() => navigate('/all-stalls')}
              className="text-xs sm:text-sm font-bold text-[#D94A38] hover:text-[#C43D2E] flex items-center gap-1 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>See all</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {stalls.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-[#EFEBE4] text-center text-stone-500">
              <p className="text-base font-bold text-stone-700">No stalls available yet</p>
              <p className="text-sm text-stone-400 mt-1">Vendors will appear here as soon as stalls are onboarded.</p>
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {stalls.map((stall) => (
                <div key={stall.id} className="w-[280px] sm:w-[300px] shrink-0 bg-white rounded-3xl overflow-hidden shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-[#EFEBE4] group cursor-pointer hover:shadow-lg transition-shadow relative" onClick={() => navigate(`/stall/${stall.id}`)}>

                  {/* Heart Button */}
                  <button
                    onClick={(e) => toggleFavorite(stall.id, e)}
                    className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-white/50 flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite(stall.id) ? 'fill-[#D94A38] text-[#D94A38]' : 'text-[#4B5563]'}`} />
                  </button>

                  <div className="h-40 w-full relative overflow-hidden">
                    <img src={stall.image} alt={stall.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-bold text-stone-900 truncate pr-2">{stall.name}</h3>
                      <div className="flex items-center gap-1 bg-[#D94A38] text-white px-1.5 py-0.5 rounded flex-shrink-0">
                        <span className="text-xs font-bold">{stall.rating}</span>
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                    </div>
                    <div className="text-sm text-stone-500 font-medium truncate mb-2">{stall.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;
