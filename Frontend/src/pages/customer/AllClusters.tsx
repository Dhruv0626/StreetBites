import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, LayoutGrid, Map as MapIcon, Sparkles, Search, X, Store, RotateCcw, Compass, Layers } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ClusterCard, ClusterCardSkeleton } from '../../components';
import { TomTomMap } from '../../components/map/TomTomMap';
import { clusterService, type ClusterData } from '../../services/clusterService';
import type { ClusterItem } from '../../types';
import type { MapMarker, LngLatTuple } from '../../types/map';

export const AllClusters: React.FC = () => {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [rawClusters, setRawClusters] = useState<ClusterData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map view positioning state
  const [mapCenter, setMapCenter] = useState<LngLatTuple>([72.5650, 23.0300]);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  const handleBack = () => {
    if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  const handleResetMap = () => {
    setMapCenter([72.5650, 23.0300]);
    setMapZoom(12);
    setSelectedClusterId(null);
  };

  const handleFocusCluster = (c: ClusterData) => {
    const cLng = c.coordinates?.coordinates?.[0] ?? 72.5714;
    const cLat = c.coordinates?.coordinates?.[1] ?? 23.0225;
    setMapCenter([cLng, cLat]);
    setMapZoom(16.5);
    setSelectedClusterId(c.id);
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

  // Filter clusters by cluster name, city, or any stall in the cluster matching the search term
  const { filteredClusters, matchingStalls } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return { filteredClusters: clusters, matchingStalls: [] };
    }

    const matchedStallsList: { stall: any; clusterName: string; clusterId: string }[] = [];

    // Collect matched stalls across all clusters
    rawClusters.forEach(rc => {
      const cId = rc.id || (rc as any)._id || '';
      if (rc.stalls && Array.isArray(rc.stalls)) {
        rc.stalls.forEach(s => {
          const stallMatches =
            s.name.toLowerCase().includes(q) ||
            (s.stall_category && s.stall_category.toLowerCase().includes(q)) ||
            (s.description && s.description.toLowerCase().includes(q)) ||
            (s.menu_items && s.menu_items.some((m: any) => m.name && m.name.toLowerCase().includes(q)));
          if (stallMatches) {
            matchedStallsList.push({ stall: s, clusterName: rc.name, clusterId: cId });
          }
        });
      }
    });

    const filtered = clusters.filter(c => {
      // Direct cluster name/city match
      if (c.name.toLowerCase().includes(q) || c.subtext.toLowerCase().includes(q)) {
        return true;
      }
      // Or contains a matching stall
      return matchedStallsList.some(ms => ms.clusterId === c.id);
    });

    return { filteredClusters: filtered, matchingStalls: matchedStallsList };
  }, [clusters, rawClusters, searchQuery]);

  // Pin Markers: Strictly locked to their exact geographic coordinates across all zoom levels (5X, 10X, etc.)
  const mapMarkers: MapMarker[] = useMemo(() => {
    const activeClusters = rawClusters.filter(c => filteredClusters.some(fc => fc.id === c.id));
    const markers: MapMarker[] = [];

    activeClusters.forEach(c => {
      const cLng = c.coordinates?.coordinates?.[0] ?? 72.5714;
      const cLat = c.coordinates?.coordinates?.[1] ?? 23.0225;

      // Khau Galli Hub Pin - Position remains strictly identical regardless of 5X, 10X, or any zoom level
      markers.push({
        id: `cluster_${c.id}`,
        position: [cLng, cLat],
        title: c.name,
        description: `${c.city || 'Ahmedabad'} • ${c.stalls?.length || 4} Stalls (${c.stalls?.filter(s => s.status !== 'CLOSED' && s.is_accepting_orders).length || 4} Open Now) • Click to view`,
        type: 'cluster',
        onClick: () => {
          handleFocusCluster(c);
        },
      });
    });

    return markers;
  }, [rawClusters, filteredClusters]);

  return (
    <div className="w-full max-w-7xl mx-auto md:mt-4 pb-20 no-scrollbar">

      {/* Mobile Header with Search Bar - ONLY rendered on mobile screen */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-[#EAE4DA] shadow-xs">
        <div className="flex items-center justify-between py-3.5 px-4">
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
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-[#D94A38] text-white shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${viewMode === 'map' ? 'bg-[#D94A38] text-white shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
              title="Map View"
            >
              <MapIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar - Search any stall or cluster */}
        <div className="px-4 pb-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#8E8B85] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stall or Khau Galli..."
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

          {/* Matched Stalls Quick Strip */}
          {searchQuery.trim() && matchingStalls.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-[#F5F0E8]">
              <div className="flex justify-between items-center mb-1.5 px-0.5">
                <span className="text-[10px] font-extrabold text-[#8E8B85] uppercase tracking-wider">
                  Matching Stalls ({matchingStalls.length})
                </span>
                <span className="text-[9px] text-[#D94A38] font-bold">Direct Access</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {matchingStalls.map(({ stall, clusterName }) => (
                  <button
                    key={stall.id || stall._id}
                    onClick={() => navigate(`/stall/${stall.id || stall._id}`)}
                    className="shrink-0 bg-[#FAF7F2] hover:bg-[#F2EDE5] border border-[#EAE4DA] active:border-[#D94A38] p-2 rounded-xl text-left cursor-pointer transition-colors flex items-center gap-2 max-w-[210px]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white border border-[#EAE4DA] flex items-center justify-center shrink-0">
                      <Store className="w-3.5 h-3.5 text-[#D94A38]" />
                    </div>
                    <div className="min-w-0 pr-1">
                      <span className="text-xs font-bold text-[#1C1917] truncate block leading-tight">{stall.name}</span>
                      <span className="text-[9px] text-[#8E8B85] truncate block mt-0.5">{clusterName}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
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
              Explore Ahmedabad's authentic Khau Gallis with live interactive stall navigation.
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
        ) : filteredClusters.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center mx-auto text-[#8E8B85]">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1C1917]">No results found</h3>
            <p className="text-xs text-[#8E8B85] max-w-xs mx-auto">
              {searchQuery.trim()
                ? `We couldn't find any stalls or Khau Gallis matching "${searchQuery}". Try a different keyword.`
                : 'No Khau Gallis found in database.'}
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
        ) : viewMode === 'map' ? (
          /* Live Interactive Map View with Level of Detail (LOD) */
          <div className="space-y-4 animate-fadeIn">
            {/* Quick Hub Quick-Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-xs font-bold text-stone-500 shrink-0 flex items-center gap-1.5 pl-1">
                <Compass className="w-3.5 h-3.5 text-[#D94A38]" /> Quick Jump:
              </span>
              {rawClusters.map((c) => {
                const isSelected = selectedClusterId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleFocusCluster(c)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${isSelected
                      ? 'bg-[#D94A38] text-white border-[#D94A38] shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400 hover:bg-stone-50'
                      }`}
                  >
                    <span>{c.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>
                      {c.stalls?.length || 0}
                    </span>
                  </button>
                );
              })}
              {selectedClusterId && (
                <button
                  onClick={handleResetMap}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold text-[#D94A38] bg-[#FCE8E6] hover:bg-[#fadbd8] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset View
                </button>
              )}
            </div>

            {/* Map Canvas Container */}
            <div className="bg-white rounded-3xl border border-[#EFEBE4] overflow-hidden shadow-sm relative h-[600px]">
              <TomTomMap
                center={mapCenter}
                zoom={mapZoom}
                className="w-full h-full rounded-3xl overflow-hidden"
                markers={mapMarkers}
              />

              {/* Dynamic Map HUD Status Overlay */}
              <div className="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-stone-200/80 z-20 flex items-center justify-between gap-3 pointer-events-auto">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${selectedClusterId ? 'bg-[#D94A38] text-white shadow-2xs' : 'bg-[#FCE8E6] text-[#D94A38]'}`}>
                    {selectedClusterId ? <Store className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-stone-900 truncate">
                      {selectedClusterId
                        ? rawClusters.find(c => c.id === selectedClusterId)?.name || 'Khau Galli Hub'
                        : '🗺️ Iconic Khau Gallis'}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate">
                      {selectedClusterId
                        ? 'Pin strictly locked to coordinates across all zoom levels'
                        : `${filteredClusters.length} street food hubs across Ahmedabad`}
                    </div>
                  </div>
                </div>

                {selectedClusterId && (
                  <button
                    onClick={handleResetMap}
                    className="shrink-0 text-xs font-bold bg-[#1C1917] hover:bg-stone-800 text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                  >
                    <RotateCcw className="w-3 h-3 text-[#D94A38]" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>

              {/* Bottom Hint Strip */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-stone-200/80 pointer-events-none flex items-center gap-2.5 z-20">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D94A38] animate-ping" />
                <span className="text-xs font-bold text-stone-800">
                  Pins remain locked at exact location across all zoom levels
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch animate-fadeIn">
            {filteredClusters.map((cluster) => (
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
