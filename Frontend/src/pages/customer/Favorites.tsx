import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Search, Star, Store } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useFavorites } from '../../hooks/useFavorites';
import { clusterService } from '../../services/clusterService';
import { StallCardSkeleton } from '../../components';

export const Favorites: React.FC = () => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const [allStalls, setAllStalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadStalls = async () => {
      try {
        const res = await clusterService.getClusters();
        if (res.success && res.data) {
          const dynamicStalls = res.data.flatMap((c: any) =>
            (c.stalls || []).map((s: any) => ({
              id: String(s.id || s._id),
              name: s.name,
              rating: Number(s.rating ?? 0.0),
              stall_category: s.stall_category || 'Street Food',
              cluster: c.name || 'Khau Galli',
              open_till: s.open_till || '',
              image_url: s.image_url || '',
              is_accepting_orders: s.status !== 'CLOSED' && Boolean(s.is_accepting_orders),
            }))
          );
          setAllStalls(dynamicStalls);
        }
      } catch (err) {
        console.error('Failed to load stalls for favorites:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStalls();
  }, []);

  const favoriteStalls = allStalls.filter(stall => favorites.includes(stall.id));

  return (
    <div className="w-full max-w-7xl mx-auto md:mt-4 pb-20">
      <div className="hidden md:flex justify-between items-center mb-6 px-4 sm:px-6 lg:px-8 pt-4">
        <h1 className="text-3xl font-black text-[#1C1917]">Favorites</h1>
      </div>

      <div className="md:hidden flex items-center gap-4 py-4 px-4 bg-white border-b border-[#EAE4DA] sticky top-0 z-30">
        <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center cursor-pointer">
          <ArrowLeft className="w-4 h-4 text-[#1C1917]" />
        </button>
        <span className="font-extrabold text-sm text-[#1C1917] uppercase tracking-wider mx-auto">Favorites</span>
        <div className="w-8 h-8 opacity-0" />
      </div>

      {isLoading ? (
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
            {[1, 2, 3, 4].map((i) => (
              <StallCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : favoriteStalls.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-fadeIn">
          <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center mb-6 shadow-3xs border border-pink-100">
            <Heart className="w-10 h-10 text-pink-400 stroke-[2]" />
          </div>
          <h2 className="text-2xl font-black text-[#1C1917] mb-2 text-center">No favorites yet</h2>
          <p className="text-[#8E8B85] text-sm text-center max-w-sm mb-8 leading-relaxed">
            You haven't saved any stalls to your favorites. Explore Ahmedabad's finest street food and hit the heart icon to save them here!
          </p>
          <button
            onClick={() => navigate('/home')}
            className="bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold px-8 py-3.5 rounded-2xl shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Explore Stalls
          </button>
        </div>
      ) : (
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
            {favoriteStalls.map((stall) => (
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
                    <Store className="w-10 h-10 text-stone-400" />
                  )}
                  {stall.is_accepting_orders && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
                      <div className="absolute bottom-3 left-3 text-white font-extrabold text-xs tracking-wider uppercase bg-emerald-600/90 backdrop-blur-xs px-2.5 py-1 rounded-md flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Open Now
                      </div>
                    </>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-base font-bold text-[#1C1917] truncate pr-2">{stall.name}</h3>
                    <div className="flex items-center gap-1 bg-[#D94A38] text-white px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {stall.rating}
                    </div>
                  </div>
                  <div className="text-xs text-[#5C5954] font-medium flex items-center gap-1.5 mb-1.5">
                    <span className="font-bold text-[#1C1917]">{stall.stall_category}</span>
                  </div>
                  <p className="text-[11px] text-[#8E8B85] truncate">{stall.cluster}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Favorites;
