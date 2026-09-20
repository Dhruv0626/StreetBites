import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, SlidersHorizontal, Heart } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useFavorites } from '../../hooks/useFavorites';
import { clusterService } from '../../services/clusterService';
import { StallCardSkeleton } from '../../components';

export const CategoryDetail: React.FC = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [stalls, setStalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const title = categoryName || 'Category';

  useEffect(() => {
    let isMounted = true;

    const processCategoryStalls = (clustersData: any[]) => {
      if (!isMounted || !Array.isArray(clustersData)) return;
      const lowerCat = title.toLowerCase();
      const matchedStalls = clustersData.flatMap((c: any) =>
        (c.stalls || [])
          .filter(
            (s: any) =>
              (s.stall_category || '').toLowerCase().includes(lowerCat) ||
              (s.menu_items || []).some((m: any) => (m.name || '').toLowerCase().includes(lowerCat))
          )
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            rating: s.rating || 0.0,
            time: '20-25 mins',
            type: s.stall_category || 'Street Food',
            price: '₹150 for two',
            image:
              s.image_url ||
              'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
          }))
      );
      setStalls(matchedStalls);
      setIsLoading(false);
    };

    const unsubscribe = clusterService.subscribe((data) => {
      processCategoryStalls(data);
    });

    const fetchCategoryStalls = async () => {
      if (!clusterService.getCachedClusters()) {
        setIsLoading(true);
      }
      try {
        const res = await clusterService.getClusters();
        if (isMounted && res.success && res.data) {
          processCategoryStalls(res.data);
        }
      } catch (err) {
        console.error('Failed to load category stalls:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCategoryStalls();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [categoryName, title]);

  return (
    <div className="w-full max-w-7xl mx-auto md:mt-4 pb-20">

      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-4 py-4 px-4 bg-white border-b border-[#EAE4DA] sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center cursor-pointer">
          <ArrowLeft className="w-4 h-4 text-[#1C1917]" />
        </button>
        <span className="font-extrabold text-sm text-[#1C1917] uppercase tracking-wider mx-auto">{title}</span>
        <div className="w-8 h-8 opacity-0" />
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 space-y-8 animate-fadeIn">

        {/* Header Title & Subtitle */}
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-[#1C1917] mb-2">{title}</h1>
          <p className="text-lg text-[#5C5954] font-medium">
            Explore authentic street food options for {title.toLowerCase()}.
          </p>
        </div>

        {/* Filters Row */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#EAE4DA] bg-white text-sm font-bold text-[#4B5563] shadow-3xs whitespace-nowrap cursor-pointer hover:bg-stone-50 transition-colors">
            Filter <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Results Title */}
        <h2 className="text-2xl font-black text-[#1C1917] tracking-tight mt-6">
          {isLoading ? (
            <span className="skeleton inline-block w-48 h-7 rounded-md" />
          ) : (
            `${stalls.length} Stall${stalls.length === 1 ? '' : 's'} to explore`
          )}
        </h2>

        {/* Stalls Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <StallCardSkeleton key={i} />
            ))}
          </div>
        ) : stalls.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-[#EFEBE4] text-center max-w-md mx-auto">
            <p className="text-base font-bold text-stone-700">No stalls found for {title}</p>
            <p className="text-xs text-stone-400 mt-1">Stalls serving {title} will appear here when added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stalls.map((stall) => (
              <div key={stall.id} className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-[#EFEBE4] group cursor-pointer hover:shadow-lg transition-shadow relative" onClick={() => navigate(`/stall/${stall.id}`)}>
                {/* Heart Button */}
                <button
                  onClick={(e) => toggleFavorite(stall.id, e)}
                  className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-white/50 flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-pointer"
                >
                  <Heart className={`w-4 h-4 ${isFavorite(stall.id) ? 'fill-[#D94A38] text-[#D94A38]' : 'text-[#4B5563]'}`} />
                </button>

                <div className="h-48 w-full relative overflow-hidden">
                  <img src={stall.image} alt={stall.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-bold text-[#1C1917] truncate pr-2">{stall.name}</h3>
                    <div className="flex items-center gap-1 bg-[#D94A38] text-white px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {stall.rating}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8E8B85] truncate">{stall.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default CategoryDetail;
