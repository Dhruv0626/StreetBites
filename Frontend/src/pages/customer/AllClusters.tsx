import React, { useState, useEffect } from 'react';
import { ArrowLeft, LayoutGrid, Map as MapIcon, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ClusterCard, ClusterCardSkeleton } from '../../components';
import { TomTomMap } from '../../components/map/TomTomMap';
import { clusterService, type ClusterData } from '../../services/clusterService';
import type { ClusterItem } from '../../types';

export const AllClusters: React.FC = () => {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [rawClusters, setRawClusters] = useState<ClusterData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const handleBack = () => {
    if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  useEffect(() => {
    const loadClusters = async () => {
      setIsLoading(true);
      try {
        const res = await clusterService.getClusters();
        if (res.success && res.data && res.data.length > 0) {
          setRawClusters(res.data);
          const mapped: ClusterItem[] = res.data.map(c => {
            const onlineCount = c.stalls ? c.stalls.filter(s => s.status !== 'CLOSED' && s.is_accepting_orders).length : 0;
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
        }
      } catch (err) {
        console.error('Failed to load clusters:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadClusters();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto md:mt-4 pb-20 no-scrollbar">

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between py-4 px-4 bg-white border-b border-[#EAE4DA] sticky top-0 z-30">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-[#FAF7F2] hover:bg-[#F2EDE5] border border-[#EAE4DA] flex items-center justify-center cursor-pointer transition-colors active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#1C1917]" />
        </button>
        <span className="font-extrabold text-sm text-[#1C1917] uppercase tracking-wider">All Khau Gallis</span>

        {/* Mobile View Mode Switcher */}
        <div className="flex bg-[#FAF7F2] p-0.5 rounded-full border border-[#EAE4DA]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-[#D94A38] text-white shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`p-1.5 rounded-full transition-colors ${viewMode === 'map' ? 'bg-[#D94A38] text-white shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
            title="Map View"
          >
            <MapIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 space-y-8 animate-fadeIn">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D94A38] bg-[#FCE8E6] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Iconic Street Food Zones
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#1C1917]">Trending Khau Gallis</h1>
            <p className="text-sm md:text-base text-[#5C5954] font-medium mt-1">
              Explore Ahmedabad's authentic Khau Gallis with live stall ordering.
            </p>
          </div>

          {/* Desktop View Toggle */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-[#EAE4DA] shadow-xs shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === 'grid'
                ? 'bg-[#D94A38] text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Grid Cards</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === 'map'
                ? 'bg-[#D94A38] text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Live Interactive Map</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ClusterCardSkeleton key={i} />
            ))}
          </div>
        ) : clusters.length === 0 ? (
          <div className="text-center py-20 text-stone-400 text-sm font-medium">
            No Khau Gallis found in database.
          </div>
        ) : viewMode === 'map' ? (
          /* Live Interactive Map View */
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-[#EFEBE4] overflow-hidden shadow-sm relative h-[560px]">
              <TomTomMap
                center={[72.5650, 23.0300]}
                zoom={12}
                className="w-full h-full rounded-3xl overflow-hidden"
                markers={rawClusters.map(c => ({
                  id: c.id,
                  position: [c.coordinates?.coordinates[0] ?? 72.5714, c.coordinates?.coordinates[1] ?? 23.0225],
                  title: c.name,
                  description: `${c.city || 'Ahmedabad'} • ${c.stalls?.length || 0} Registered Stalls (${c.stalls?.filter(s => s.status !== 'CLOSED' && s.is_accepting_orders).length || 0} Open Now)`,
                  type: 'cluster',
                  onClick: () => navigate(`/stalls?khauGalliId=${c.id}`),
                }))}
              />
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-stone-200 pointer-events-none flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D94A38] animate-ping"></span>
                <span className="text-xs font-bold text-stone-800">Click any Khau Galli marker to explore its menu & stalls</span>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch animate-fadeIn">
            {clusters.map((cluster) => (
              <div key={cluster.id} onClick={() => navigate(`/stalls?khauGalliId=${cluster.id}`)} className="cursor-pointer h-full flex flex-col">
                <ClusterCard
                  cluster={cluster}
                  isMobileFeatured={false}
                  onClick={() => navigate(`/stalls?khauGalliId=${cluster.id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllClusters;
