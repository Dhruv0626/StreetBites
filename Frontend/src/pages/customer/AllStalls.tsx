import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, Heart } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useFavorites } from '../../hooks/useFavorites';
import { clusterService } from '../../services/clusterService';

export const AllStalls: React.FC = () => {
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [stalls, setStalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadStalls = async () => {
      setIsLoading(true);
      try {
        const res = await clusterService.getClusters();
        if (res.success && res.data) {
          const dynamicStalls = res.data.flatMap((c: any) =>
            (c.stalls || []).map((s: any) => ({
              id: s.id,
              name: s.name,
              rating: s.rating || 0,
              stall_category: s.stall_category || 'Street Food',
              cluster: c.name || 'Food Cluster',
              open_till: s.open_till || '',
              image_url: s.image_url || '',
              is_accepting_orders: s.status !== 'CLOSED' && Boolean(s.is_accepting_orders),
            }))
          );
          setStalls(dynamicStalls);
        }
      } catch (err) {
        console.error('Failed to load stalls:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStalls();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto md:mt-4 pb-20 no-scrollbar">

      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-4 py-4 px-4 bg-white border-b border-[#EAE4DA] sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center cursor-pointer">
          <ArrowLeft className="w-4 h-4 text-[#1C1917]" />
        </button>
        <span className="font-extrabold text-sm text-[#1C1917] uppercase tracking-wider mx-auto">Top Stalls</span>
        <div className="w-8 h-8 opacity-0" />
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 space-y-8 animate-fadeIn">
        <div className="hidden md:block mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-[#1C1917] mb-2">Top Stalls to Explore</h1>
          <p className="text-lg text-[#5C5954] font-medium">
            Discover the highest-rated street food stalls around you.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-stone-500 font-medium">Loading stalls...</div>
        ) : stalls.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-[#EFEBE4] text-center max-w-md mx-auto">
            <p className="text-lg font-bold text-stone-700">No stalls available yet</p>
            <p className="text-sm text-stone-400 mt-1">Stalls will appear here as soon as vendors add them.</p>
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

                <div className="h-44 w-full relative overflow-hidden bg-stone-100 flex items-center justify-center">
                  {stall.image_url ? (
                    <img src={stall.image_url} alt={stall.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <span className="text-3xl">🏪</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 text-white font-black text-xs tracking-tight uppercase px-2 py-0.5 rounded bg-black/40 backdrop-blur-xs">
                    {stall.is_accepting_orders ? 'OPEN NOW' : 'CLOSED'}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-base font-bold text-[#1C1917] truncate pr-2">{stall.name}</h3>
                    <div className="flex items-center gap-1 bg-[#D94A38] text-white px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {stall.rating ?? 0.0}
                    </div>
                  </div>
                  <div className="text-xs text-[#5C5954] font-medium flex items-center justify-between mt-1">
                    <p className="text-[11px] text-[#8E8B85] truncate">{stall.stall_category}</p>
                    {stall.open_till && (
                      <span className="text-[10px] font-semibold text-stone-500">Till {stall.open_till}</span>
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
