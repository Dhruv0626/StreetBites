import React, { useState, useEffect } from 'react';
import {
  MapPin, Plus, Search, Edit2, Trash2, ChevronDown, ChevronUp,
  Store, Clock, X, Image as ImageIcon, Navigation, Crosshair, Loader2, AlertCircle, CheckCircle2, Upload, Map
} from 'lucide-react';
import { TomTomMap } from '../../components/map/TomTomMap';
import { clusterService, type ClusterData } from '../../services/clusterService';
import { Skeleton } from '../../components/Skeleton';
import { useAlert } from '../../context/AlertContext';

// Safe helper to extract [lat, lng] from various GeoJSON / object formats
const getClusterCoords = (cluster: any): { lat: number; lng: number } => {
  if (!cluster || !cluster.coordinates) return { lat: 23.0225, lng: 72.5714 };
  if (Array.isArray(cluster.coordinates.coordinates) && cluster.coordinates.coordinates.length >= 2) {
    return {
      lng: Number(cluster.coordinates.coordinates[0]) || 72.5714,
      lat: Number(cluster.coordinates.coordinates[1]) || 23.0225,
    };
  }
  if (cluster.coordinates.lat !== undefined && cluster.coordinates.lng !== undefined) {
    return {
      lat: Number(cluster.coordinates.lat) || 23.0225,
      lng: Number(cluster.coordinates.lng) || 72.5714,
    };
  }
  if (cluster.coordinates.latitude !== undefined && cluster.coordinates.longitude !== undefined) {
    return {
      lat: Number(cluster.coordinates.latitude) || 23.0225,
      lng: Number(cluster.coordinates.longitude) || 72.5714,
    };
  }
  return { lat: 23.0225, lng: 72.5714 };
};

const isOnlineStall = (s: any): boolean => Boolean(s?.is_accepting_orders ?? s?.isOnline);

export const AdminClusters: React.FC = () => {
  const { showAlert, showConfirm, toast } = useAlert();
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMapOverview, setShowMapOverview] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClusterId, setEditingClusterId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    city: 'Ahmedabad',
    imageUrl: '',
    lat: 23.0225,
    lng: 72.5714,
  });

  // Load Clusters from MongoDB
  const loadClusters = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await clusterService.getClusters();
      if (res.success && res.data) {
        setClusters(res.data);
      } else {
        setErrorMessage(res.message || 'Failed to fetch clusters from database.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting to clusters API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClusters();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedClusterId(prev => prev === id ? null : id);
  };

  const openAddModal = () => {
    setEditingClusterId(null);
    setFormData({
      name: '',
      city: 'Ahmedabad',
      imageUrl: '',
      lat: 23.0225,
      lng: 72.5714,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cluster: ClusterData, e: React.MouseEvent) => {
    e.stopPropagation();
    const coords = getClusterCoords(cluster);
    setEditingClusterId(cluster.id || cluster._id || '');
    setFormData({
      name: cluster.name || '',
      city: cluster.city || 'Ahmedabad',
      imageUrl: cluster.image_url || (cluster as any).imageUrl || '',
      lat: coords.lat,
      lng: coords.lng,
    });
    setIsModalOpen(true);
  };

  const handleMapClick = (position: [number, number]) => {
    setFormData(prev => ({
      ...prev,
      lng: parseFloat(position[0].toFixed(6)),
      lat: parseFloat(position[1].toFixed(6)),
    }));
  };

  /**
   * Client-side canvas compression to reduce 5MB image payloads down to ~100KB-180KB,
   * cutting database upload and Cloudinary processing time by >95%.
   */
  const compressImage = (file: File, maxWidth = 1200, maxHeight = 800, quality = 0.82): Promise<string> => {
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file);
      if (compressedDataUrl) {
        setFormData(prev => ({ ...prev, imageUrl: compressedDataUrl }));
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter a cluster name");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (editingClusterId) {
        const res = await clusterService.updateCluster(editingClusterId, {
          name: formData.name,
          city: formData.city,
          imageUrl: formData.imageUrl,
          coordinates: { lat: formData.lat, lng: formData.lng },
        });

        if (res.success && res.data) {
          setSuccessMessage('Cluster updated successfully in MongoDB!');
          const updatedData = res.data;
          setClusters(prev => prev.map(c => c.id === editingClusterId ? { ...c, ...updatedData, stalls: c.stalls } : c));
          setIsModalOpen(false);
          loadClusters();
        } else {
          setErrorMessage(res.message || 'Failed to update cluster.');
        }
      } else {
        const res = await clusterService.createCluster({
          name: formData.name,
          city: formData.city,
          imageUrl: formData.imageUrl,
          coordinates: { lat: formData.lat, lng: formData.lng },
        });

        if (res.success && res.data) {
          setSuccessMessage('Cluster created successfully in MongoDB!');
          const data = res.data;
          const created: ClusterData = {
            ...data,
            id: data.id || (data as any)._id || '',
            stalls: data.stalls || [],
            revenue: data.revenue || '₹0',
          };
          setClusters(prev => [created, ...prev.filter(c => c.id !== created.id)]);
          setIsModalOpen(false);
          loadClusters();
        } else {
          setErrorMessage(res.message || 'Failed to create cluster.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving cluster to database.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleDeleteCluster = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showConfirm({
      title: 'Delete Khau Galli Cluster',
      message: 'Are you sure you want to permanently remove this cluster from the database? All stalls assigned to this cluster will be affected.',
      confirmText: 'Delete Cluster',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await clusterService.deleteCluster(id);
      if (res.success) {
        toast.success('Cluster deleted successfully.');
        await loadClusters();
        if (expandedClusterId === id) setExpandedClusterId(null);
      } else {
        showAlert(res.message || 'Failed to delete cluster.', 'error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error deleting cluster.', 'error');
    }
  };

  const filteredClusters = clusters.filter(c => {
    return (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.id || c._id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalStallsCount = clusters.reduce((acc, c) => acc + (c.stalls?.length || 0), 0);
  const activeStallsCount = clusters.reduce((acc, c) => acc + (c.stalls ? c.stalls.filter(isOnlineStall).length : 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Cluster Management</h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage food clusters (Khau Gallis) and monitor nested stall live operational statuses.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[#D94A38] hover:bg-[#C43D2E] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Cluster
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Total Clusters</span>
          <div className="text-2xl font-black text-stone-900 mt-1">{clusters.length}</div>
        </div>
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Total Registered Stalls</span>
          <div className="text-2xl font-black text-stone-900 mt-1">{totalStallsCount}</div>
        </div>
        <div className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Currently Online Stalls</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{activeStallsCount}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-[#EFEBE4] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clusters "
            className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-[#EFEBE4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D94A38]/20 focus:border-[#D94A38]"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-stone-50 border border-[#EFEBE4] text-xs font-bold text-stone-700 rounded-xl px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <MapPin className="w-3.5 h-3.5 text-[#D94A38]" />
            <span> Ahmedabad</span>
          </div>
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

      {/* Ahmedabad Clusters Interactive Map Overview */}
      {clusters.length > 0 && (
        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#D94A38] to-[#FF6B4A] text-white flex items-center justify-center shadow-md shadow-red-500/20">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  Ahmedabad Khau Galli Food Clusters Map
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {clusters.length} Food Hubs Active
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Live pinpoint locations of Ahmedabad's iconic street food clusters. Click any pin to jump to its stall management.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowMapOverview(!showMapOverview)}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {showMapOverview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showMapOverview ? 'Collapse Map' : 'Expand Map'}
            </button>
          </div>

          {showMapOverview && (
            <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-inner relative h-[340px] animate-fadeIn">
              <TomTomMap
                center={[72.5650, 23.0300]}
                zoom={12}
                className="w-full h-full"
                markers={clusters.map(c => {
                  const coords = getClusterCoords(c);
                  const totalStalls = c.stalls?.length || 0;
                  const onlineStalls = c.stalls ? c.stalls.filter(isOnlineStall).length : 0;
                  return {
                    id: c.id || c._id || '',
                    position: [coords.lng, coords.lat],
                    title: c.name || 'Khau Galli',
                    description: `${c.city || 'Ahmedabad'} • ${totalStalls} Registered Stalls (${onlineStalls} Online Stalls)`,
                    type: 'cluster',
                    onClick: (id: string) => {
                      setExpandedClusterId(id);
                      const cardEl = document.getElementById(`cluster-card-${id}`);
                      if (cardEl) {
                        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }
                  };
                })}
              />
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl text-[11px] font-semibold text-stone-700 shadow-md border border-stone-200 pointer-events-none flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D94A38] animate-ping"></span>
                <span>Click any Khau Galli pin to view nested live food stalls</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#EFEBE4] rounded-3xl p-5 sm:p-6 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="w-1/3 h-5 rounded-md" />
                  <Skeleton className="w-1/2 h-4 rounded-md" />
                </div>
              </div>
              <Skeleton className="w-24 h-8 rounded-xl shrink-0 hidden sm:block" />
            </div>
          ))}
        </div>
      ) : (
        /* Clusters List with Nested Stalls Dropdown */
        <div className="space-y-4">
          {filteredClusters.map((cluster) => {
            const clusterId = cluster.id || cluster._id || '';
            const isExpanded = expandedClusterId === clusterId;
            const onlineStalls = cluster.stalls ? cluster.stalls.filter(isOnlineStall).length : 0;
            const coords = getClusterCoords(cluster);
            const coverImage = cluster.image_url || (cluster as any).imageUrl;

            return (
              <div
                key={clusterId}
                id={`cluster-card-${clusterId}`}
                className="bg-white border border-[#EFEBE4] rounded-3xl shadow-sm overflow-hidden transition-all duration-200 hover:border-stone-300"
              >
                {/* Cluster Main Header / Clickable Card */}
                <div
                  onClick={() => toggleExpand(clusterId)}
                  className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-stone-50/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 relative">
                      {coverImage ? (
                        <img src={coverImage} alt={cluster.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#FCE8E6] text-[#D94A38]">
                          <MapPin className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg font-bold text-stone-900">{cluster.name}</h3>
                        <span className="text-[10px] font-mono font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                          {clusterId}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-medium text-stone-500 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" /> {cluster.city || 'Ahmedabad'}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="flex items-center gap-1 font-mono text-[11px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                          <Navigation className="w-3 h-3 text-[#D94A38]" />
                          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="flex items-center gap-1 font-semibold text-stone-700">
                          <Store className="w-3.5 h-3.5 text-stone-400" /> {cluster.stalls?.length || 0} Total Stalls ({onlineStalls} Online)
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="font-bold text-stone-900">Total Revenue: {(cluster as any).revenue || '₹0'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions & Expand Icon */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => openEditModal(cluster, e)}
                        className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit Cluster"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteCluster(clusterId, e)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Cluster"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-xl transition-colors">
                      <span>{isExpanded ? 'Hide Stalls' : 'View Stalls'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Nested Stalls Accordion Dropdown */}
                {isExpanded && (
                  <div className="border-t border-[#EFEBE4] bg-stone-50/70 p-5 sm:p-6 animate-fadeIn">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#D94A38]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                          Stalls in {cluster.name} ({cluster.stalls?.length || 0})
                        </h4>
                      </div>
                      <span className="text-xs text-stone-500 font-medium">
                        {onlineStalls} open for ordering right now
                      </span>
                    </div>

                    {(!cluster.stalls || cluster.stalls.length === 0) ? (
                      <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-8 text-center text-stone-400 text-sm">
                        No stalls currently registered in this cluster.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cluster.stalls.map((stall) => {
                          const stallId = stall.id || stall._id || '';
                          const isOnline = isOnlineStall(stall);
                          const ownerName = stall.vendor_id?.name || (stall as any).owner || 'Registered Vendor';
                          const categoryName = stall.stall_category || (stall as any).category || 'Street Food';
                          const itemsCount = stall.menu_items?.length ?? (stall as any).itemsCount ?? 0;

                          return (
                            <div
                              key={stallId}
                              className="bg-white border border-[#EFEBE4] rounded-2xl p-4 flex items-start justify-between gap-3 shadow-xs hover:border-stone-300 transition-all"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-bold text-stone-900">{stall.name}</h5>
                                  <span className="text-[10px] font-mono text-stone-400">{stallId}</span>
                                </div>

                                <p className="text-xs text-stone-500">
                                  {categoryName} • Owner: <span className="text-stone-700 font-medium">{ownerName}</span>
                                </p>

                                <div className="flex items-center gap-3 pt-1 text-xs">
                                  <span className="text-amber-500 font-bold">★ {stall.rating ?? 0}</span>
                                  <span className="text-stone-300">•</span>
                                  <span className="text-stone-500">{itemsCount} Dishes</span>
                                </div>
                              </div>

                              {/* Stall Status & Last Open Time */}
                              <div className="text-right shrink-0">
                                {isOnline ? (
                                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Open
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end">
                                    <div className="inline-flex items-center gap-1 bg-stone-100 border border-stone-200 text-stone-500 px-2.5 py-1 rounded-full text-xs font-bold">
                                      <span className="w-2 h-2 rounded-full bg-stone-400" />
                                      Closed
                                    </div>
                                    {stall.last_opened_at && (
                                      <span className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 mt-1.5">
                                        <Clock className="w-3 h-3 text-stone-400" />
                                        Last open: {new Date(stall.last_opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredClusters.length === 0 && (
            <div className="bg-white border border-[#EFEBE4] rounded-3xl p-12 text-center text-stone-500">
              No clusters match your search criteria.
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Cluster Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn border border-[#EFEBE4]">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#EFEBE4] flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  {editingClusterId ? 'Edit Food Cluster' : 'Add New Food Cluster'}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Set the Khau Galli name, city, and pinpoint physical location on the TomTom map.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCluster} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Cluster / Khau Galli Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Prahlad Nagar Food Street"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ahmedabad"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Interactive TomTom Map Location Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-[#D94A38]" />
                    Pinpoint Cluster Location on TomTom Map
                  </label>
                  <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                    Lat: {formData.lat}, Lng: {formData.lng}
                  </span>
                </div>

                {/* Embedded Map Canvas */}
                <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-inner relative">
                  <TomTomMap
                    center={[formData.lng, formData.lat]}
                    zoom={14}
                    className="w-full h-[220px]"
                    onMapClick={handleMapClick}
                    markers={[
                      {
                        id: 'cluster-pin',
                        position: [formData.lng, formData.lat],
                        title: formData.name || 'Selected Khau Galli Hub',
                        description: `${formData.city || 'Ahmedabad'} • Click anywhere on the map to relocate`,
                        type: 'cluster'
                      }
                    ]}
                  />
                  <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-medium text-stone-600 shadow-xs pointer-events-none">
                    💡 Click anywhere on the map to place the cluster pin
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Cluster Cover Image
                </label>

                {formData.imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 group h-36">
                    <img
                      src={formData.imageUrl}
                      alt="Cluster Cover Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label className="cursor-pointer bg-white text-stone-800 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-stone-100 transition-colors shadow-sm flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-[#D94A38]" /> Change Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-200 hover:border-[#D94A38] bg-stone-50/70 hover:bg-[#FFF8F6] rounded-2xl p-6 cursor-pointer transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-[#FCE8E6] text-stone-400 group-hover:text-[#D94A38] flex items-center justify-center transition-colors mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-stone-700 group-hover:text-[#D94A38] transition-colors">
                      Click to upload cluster cover image
                    </span>
                    <span className="text-[11px] text-stone-400 mt-0.5">
                      PNG, JPG, JPEG, WEBP up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[#EFEBE4] flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#D94A38] hover:bg-[#C43D2E] transition-all shadow-sm cursor-pointer disabled:opacity-75 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingClusterId ? 'Update Cluster' : 'Create Cluster'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClusters;
