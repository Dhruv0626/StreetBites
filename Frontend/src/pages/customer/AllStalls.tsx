import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Star, Heart, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useFavorites } from '../../hooks/useFavorites';
import { clusterService } from '../../services/clusterService';
import { StallCardSkeleton } from '../../components';

export const AllStalls: React.FC = () => {
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [stalls, setStalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const processStalls = (clustersData: any[]) => {
      if (!isMounted || !Array.isArray(clustersData)) return;
      const dynamicStalls = clustersData.flatMap((c: any) =>
        (c.stalls || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          rating: s.rating || 0,
          stall_category: s.stall_category || 'Street Food',
          cluster: c.name || 'Khau Galli',
          open_till: s.open_till || '',
          image_url: s.image_url || '',
          is_accepting_orders: s.status !== 'CLOSED' && Boolean(s.is_accepting_orders),
        }))
      );
      setStalls(dynamicStalls);
      setIsLoading(false);
    };

    // 1. Subscribe to live SWR updates
    const unsubscribe = clusterService.subscribe((data) => {
      processStalls(data);
    });

    // 2. Fetch / SWR trigger
    const loadStalls = async () => {
      if (stalls.length === 0 && !clusterService.getCachedClusters()) {
        setIsLoading(true);
      }
      try {
        const res = await clusterService.getClusters();
        if (res.success && res.data) {
          processStalls(res.data);
        }
      } catch (err) {
        console.error('Failed to load stalls:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadStalls();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const filteredStalls = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stalls;
    return stalls.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.stall_category && s.stall_category.toLowerCase().includes(q)) ||
      (s.cluster && s.cluster.toLowerCase().includes(q))
    );
  }, [stalls, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto md:mt-4 pb-20 no-scrollbar">

      {/* Mobile Header with Search Bar - ONLY rendered on mobile screen */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-[#EAE4DA] shadow-xs">
        <div className="flex items-center justify-between py-3.5 px-4">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-[#FAF7F2] hover:bg-[#F2EDE5] border border-[#EAE4DA] flex items-center justify-center cursor-pointer transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-[#1C1917]" />
          </button>
          <span className="font-extrabold text-sm text-[#1C1917] uppercase tracking-wider">Top Stalls</span>
          <div className="w-9 h-9 opacity-0 pointer-events-none" />
        </div>

        {/* Mobile Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#8E8B85] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stalls or food category..."
              className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-2xl pl-10 pr-9 py-2 text-xs text-[#1C1917] placeholder:text-[#8E8B85] focus:outline-none focus:border-[#D94A38] focus:bg-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-[#8E8B85] hover:text-[#1C1917] p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 space-y-8 animate-fadeIn">
        <div className="hidden md:block mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-[#1C1917] mb-2">Top Stalls to Explore</h1>
          <p className="text-lg text-[#5C5954] font-medium">
            Discover the highest-rated street food stalls around you.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <StallCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredStalls.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-[#EFEBE4] text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center mx-auto text-[#8E8B85]">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-stone-800">
              {searchQuery.trim() ? 'No stalls found' : 'No stalls available yet'}
            </p>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              {searchQuery.trim()
                ? `We couldn't find any stalls matching "${searchQuery}". Try searching for another name or category.`
                : 'Stalls will appear here as soon as vendors add them.'}
            </p>
            {searchQuery.trim() && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-bold text-[#D94A38] bg-[#FCE8E6] px-4 py-2 rounded-xl hover:bg-[#fadbd8] transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredStalls.map((stall) => (
              <div key={stall.id} className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-[#EFEBE4] group cursor-pointer hover:shadow-lg transition-shadow relative" onClick={() => navigate(`/stall/${stall.id}`)}>

                {/* Heart Button */}
                <button
                  onClick={(e) => toggleFavorite(stall.id, e)}
                  className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-white/50 flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-pointer"
                >
                  <Heart className={`w-4 h-4 ${isFavorite(stall.id) ? 'fill-[#D94A38] text-[#D94A38]' : 'text-[#4B5563]'}`} />
                </button>

                <div className="h-44 w-full relative overflow-hidden bg-stone-100 flex items-center justify-center">
                  {stall.image_url ? (
                    <img src={stall.image_url} alt={stall.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <span className="text-3xl">🏪</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-3 left-3 flex items-center">
                    {stall.is_accepting_orders ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-600/90 text-white border border-emerald-400/40 backdrop-blur-md shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Open Now
                      </span>
                    ) : ( 
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-[#1C1917]/85 text-stone-300 border border-white/15 backdrop-blur-md shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        Closed
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-base font-bold text-[#1C1917] truncate pr-2">{stall.name}</h3>
                    <div className="flex items-center gap-1 bg-[#D94A38] text-white px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 shadow-2xs">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {stall.rating ?? 0.0}
                    </div>
                  </div>
                  <div className="text-xs text-[#5C5954] font-medium flex items-center justify-between mt-1">
                    <p className="text-[11px] text-[#8E8B85] truncate">{stall.stall_category} · {stall.cluster}</p>
                    {stall.open_till && (
                      <span className="text-[10px] font-semibold text-stone-500 shrink-0 ml-1">Till {stall.open_till}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllStalls;
