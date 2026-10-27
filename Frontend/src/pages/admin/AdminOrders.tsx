import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Bike,
  Store,
  MapPin,
  User,
  Phone,
  Navigation,
  DollarSign,
  X,
  Home,
} from 'lucide-react';
import TomTomMap from '../../components/map/TomTomMap';
import { type MapMarker, type LngLatTuple } from '../../types/map';
import { AHMEDABAD_CENTER } from '../../config/tomtom';
import { adminService } from '../../services/adminService';
import { QueueItemSkeleton } from '../../components/Skeleton';
import { calculateTomTomRoute } from '../../services/tomtomRoutingService';

interface StallItemInfo {
  stallId?: string;
  name: string;
  category?: string;
  status?: string;
  item: string;
  quantity: number;
}

interface OrderItem {
  id: string;
  _id: string;
  vendor: string;
  clusterName?: string;
  rider: string;
  riderPhone?: string;
  riderEmail?: string;
  customer?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: 'In Transit' | 'Delayed' | 'At Stall' | 'At Door' | 'Pending';
  rawStatus?: string;
  deliveryAddress?: string;
  deliveryOtp?: string;
  time: string;
  issue: string | null;
  position: LngLatTuple;
  pickupCoords: LngLatTuple;
  dropCoords: LngLatTuple;
  stalls?: StallItemInfo[];
  totalAmount?: number;
  paymentMethod?: string;
  collectedCheckpoints?: number[];
}

export const AdminOrders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PREPARING' | 'IN_TRANSIT' | 'AT_DOOR'>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<LngLatTuple>(AHMEDABAD_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [activeOrders, setActiveOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRouteCoords, setSelectedRouteCoords] = useState<[number, number][] | undefined>(undefined);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [autoRefresh] = useState<boolean>(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await adminService.getLiveOrders();
      if (res.success && res.data) {
        setActiveOrders(res.data);
      }
    } catch (err) {
      console.error('Error fetching live orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh every 20 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchOrders();
    }, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  const filteredOrders = useMemo(() => {
    return activeOrders.filter((o) => {
      const matchesSearch =
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customer && o.customer.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.rider && o.rider.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'PREPARING') return o.status === 'At Stall' || o.status === 'Pending';
      if (statusFilter === 'IN_TRANSIT') return o.status === 'In Transit';
      if (statusFilter === 'AT_DOOR') return o.status === 'At Door';

      return true;
    });
  }, [activeOrders, searchQuery, statusFilter]);

  const selectedOrder = useMemo(() => {
    return activeOrders.find((o) => o.id === selectedOrderId || o._id === selectedOrderId) || null;
  }, [activeOrders, selectedOrderId]);

  const handleSelectOrder = async (order: OrderItem) => {
    setSelectedOrderId(order.id);

    // Focus map halfway between pickup and drop
    const midLng = (order.pickupCoords[0] + order.dropCoords[0]) / 2;
    const midLat = (order.pickupCoords[1] + order.dropCoords[1]) / 2;
    setMapCenter([midLng, midLat]);
    setMapZoom(13.8);

    // Calculate real road delivery route between pickup point and customer destination
    setIsCalculatingRoute(true);
    try {
      const routeRes = await calculateTomTomRoute([order.pickupCoords, order.dropCoords], {
        travelMode: 'motorcycle',
        traffic: true,
      });
      if (routeRes.success && routeRes.coordinates) {
        setSelectedRouteCoords(routeRes.coordinates);
      } else {
        setSelectedRouteCoords([order.pickupCoords, order.dropCoords]);
      }
    } catch {
      setSelectedRouteCoords([order.pickupCoords, order.dropCoords]);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedOrderId(null);
    setSelectedRouteCoords(undefined);
    setMapCenter(AHMEDABAD_CENTER);
    setMapZoom(12);
  };

  const handleReassign = (id: string) => {
    setActiveOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, status: 'In Transit', issue: null, rider: 'New Rider (Assigned)' }
          : o
      )
    );
    alert(`Rider reassigned successfully for ${id}`);
  };

  const handleRefund = (id: string) => {
    if (window.confirm(`Initiate refund for ${id} and cancel order?`)) {
      setActiveOrders((prev) => prev.filter((o) => o.id !== id));
      if (selectedOrderId === id) {
        handleClearSelection();
      }
      alert(`Refund processed for ${id}`);
    }
  };

  // Convert active deliveries to TomTom Map Markers
  const orderMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = [];

    activeOrders.forEach((order) => {
      // 1. Pickup / Cluster Marker
      markers.push({
        id: `pickup-${order.id}`,
        position: order.pickupCoords,
        title: `Pickup: ${order.id}`,
        description: `${order.vendor} · ${order.status}`,
        type: 'stall',
        onClick: () => handleSelectOrder(order),
        popupHtml: `
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 6px; min-width: 210px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px; background: #FEF3C7; color: #92400E;">
                🏪 PICKUP HUB
              </span>
              <span style="font-size: 10px; font-weight: 800; color: #D94A38;">${order.id}</span>
            </div>
            <div style="font-weight: 800; font-size: 13px; color: #1c1917; margin-bottom: 2px;">
              ${order.vendor}
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
              Rider: <strong>${order.rider}</strong>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #059669;">
              Amount: ₹${order.totalAmount || 0} (${order.paymentMethod || 'ONLINE'})
            </div>
          </div>
        `,
      });

      // 2. Customer Drop Marker
      markers.push({
        id: `drop-${order.id}`,
        position: order.dropCoords,
        title: `Drop: ${order.customer || 'Customer'}`,
        description: order.deliveryAddress || 'Ahmedabad',
        type: 'customer',
        onClick: () => handleSelectOrder(order),
        popupHtml: `
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 6px; min-width: 210px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px; background: #EEF2FF; color: #3730A3;">
                📍 CUSTOMER DROP
              </span>
              <span style="font-size: 10px; font-weight: 800; color: #D94A38;">${order.id}</span>
            </div>
            <div style="font-weight: 800; font-size: 13px; color: #1c1917; margin-bottom: 2px;">
              ${order.customer || 'Customer'}
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
              ${order.deliveryAddress || 'Ahmedabad'}
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #4B5563;">
              Phone: ${order.customerPhone || 'N/A'}
            </div>
          </div>
        `,
      });

      // 3. If in transit or at door, place a prominent Rider marker
      if (order.status === 'In Transit' || order.status === 'At Door') {
        const riderPos: LngLatTuple =
          order.status === 'At Door'
            ? order.dropCoords
            : [
              (order.pickupCoords[0] + order.dropCoords[0]) / 2,
              (order.pickupCoords[1] + order.dropCoords[1]) / 2,
            ];

        markers.push({
          id: `rider-${order.id}`,
          position: riderPos,
          title: `Rider: ${order.rider}`,
          description: `${order.status} for ${order.id}`,
          type: 'rider',
          onClick: () => handleSelectOrder(order),
          popupHtml: `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 6px; min-width: 210px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
                <span style="font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px; background: ${order.status === 'At Door' ? '#D1FAE5' : '#DBEAFE'}; color: ${order.status === 'At Door' ? '#047857' : '#1E40AF'};">
                  🛵 ${order.status.toUpperCase()}
                </span>
                <span style="font-size: 10px; font-weight: 800; color: #D94A38;">${order.id}</span>
              </div>
              <div style="font-weight: 800; font-size: 13px; color: #1c1917; margin-bottom: 2px;">
                ${order.rider}
              </div>
              <div style="font-size: 11px; color: #6b7280;">
                Delivering to: <strong>${order.customer || 'Customer'}</strong>
              </div>
            </div>
          `,
        });
      }
    });

    return markers;
  }, [activeOrders]);

  // Quick stats
  const stats = useMemo(() => {
    const total = activeOrders.length;
    const inTransit = activeOrders.filter((o) => o.status === 'In Transit').length;
    const atDoor = activeOrders.filter((o) => o.status === 'At Door').length;
    const preparing = activeOrders.filter((o) => o.status === 'At Stall' || o.status === 'Pending').length;
    const totalValue = activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return { total, inTransit, atDoor, preparing, totalValue };
  }, [activeOrders]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto w-full animate-fadeIn pb-6 flex flex-col h-[calc(100vh-120px)] font-sans">
      {/* Header & KPI Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#D94A38]/10 text-[#D94A38] text-[10px] font-black uppercase tracking-wider border border-[#D94A38]/20">
              Live Dispatch Stream
            </span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D94A38] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D94A38]"></span>
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Live Deliveries & Dispatch</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Real-time TomTom telemetry mapping of active street food hubs, delivery riders, and customer corridors.
          </p>
        </div>

        {/* KPI Mini Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-2 shrink-0 shadow-2xs">
            <div className="w-2 h-2 rounded-full bg-slate-700" />
            <div className="text-[11px] font-extrabold text-slate-600">
              Active: <span className="text-slate-900 font-black">{stats.total}</span>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-2 shrink-0 shadow-2xs">
            <Bike className="w-3.5 h-3.5 text-slate-700" />
            <div className="text-[11px] font-extrabold text-slate-600">
              In Transit: <span className="text-slate-900 font-black">{stats.inTransit}</span>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-2 shrink-0 shadow-2xs">
            <Home className="w-3.5 h-3.5 text-slate-700" />
            <div className="text-[11px] font-extrabold text-slate-600">
              At Door: <span className="text-slate-900 font-black">{stats.atDoor}</span>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-2 shrink-0 shadow-2xs">
            <Store className="w-3.5 h-3.5 text-slate-700" />
            <div className="text-[11px] font-extrabold text-slate-600">
              Kitchens: <span className="text-slate-900 font-black">{stats.preparing}</span>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-900 text-white rounded-2xl flex items-center gap-1.5 shrink-0 shadow-sm">
            <DollarSign className="w-3.5 h-3.5 text-slate-300" />
            <div className="text-[11px] font-mono font-black">
              ₹{stats.totalValue.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Orders Queue (Left) + Interactive Live Map (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Side: Order Queue and Filter Tabs */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm flex flex-col h-full overflow-hidden">
          {/* Search & Actions Bar */}
          <div className="space-y-2.5 shrink-0 mb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Order, Vendor, Customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#D94A38] transition-colors"
                />
              </div>
              <button
                onClick={() => fetchOrders()}
                title="Refresh Live Deliveries"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#D94A38]' : ''}`} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-[11px] font-bold overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap cursor-pointer ${statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                All ({activeOrders.length})
              </button>
              <button
                onClick={() => setStatusFilter('IN_TRANSIT')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap cursor-pointer ${statusFilter === 'IN_TRANSIT'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                In Transit ({stats.inTransit})
              </button>
              <button
                onClick={() => setStatusFilter('AT_DOOR')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap cursor-pointer ${statusFilter === 'AT_DOOR'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                At Door ({stats.atDoor})
              </button>
              <button
                onClick={() => setStatusFilter('PREPARING')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap cursor-pointer ${statusFilter === 'PREPARING'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Kitchens ({stats.preparing})
              </button>
            </div>
          </div>

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 hide-scrollbar pr-1">
            {isLoading ? (
              <QueueItemSkeleton count={4} />
            ) : filteredOrders.length === 0 ? (
              <div className="text-center text-slate-400 py-12 text-xs font-semibold">
                No matching live deliveries found.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrderId === order.id || selectedOrderId === order._id;

                return (
                  <div
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${isSelected
                        ? 'border-[#D94A38] bg-[#D94A38]/5 shadow-sm ring-1 ring-[#D94A38]'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                  >
                    {/* Header Row: ID + Status Badge */}
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {order.id}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-black uppercase text-[#D94A38] bg-[#D94A38]/10 px-1.5 py-0.5 rounded">
                            Tracked
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${order.status === 'At Door'
                            ? 'bg-emerald-500 animate-pulse'
                            : order.status === 'In Transit'
                              ? 'bg-slate-900'
                              : 'bg-slate-400'
                          }`} />
                        {order.status}
                      </span>
                    </div>

                    {/* Vendor & Customer Info */}
                    <div className="text-xs font-bold text-slate-900 truncate mb-1">
                      {order.vendor}
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5 mb-2.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          {order.customer || 'Customer'}
                        </span>
                        <span className="font-bold text-slate-800">₹{order.totalAmount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <Bike className="w-3 h-3 text-slate-400 shrink-0" />
                          {order.rider}
                        </span>
                        <span>{order.time}</span>
                      </div>
                    </div>

                    {/* Quick Reassign / Refund actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReassign(order.id);
                        }}
                        className="flex-1 bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg transition-colors cursor-pointer text-center"
                      >
                        Reassign
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefund(order.id);
                        }}
                        className="flex-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg transition-colors cursor-pointer text-center"
                      >
                        Refund
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: High-Tech Global TomTom Map & Live Tracking Drawer */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs relative h-full flex flex-col">
          {/* Map View */}
          <div className="relative w-full h-full">
            <TomTomMap
              center={mapCenter}
              zoom={mapZoom}
              markers={orderMarkers}
              routeCoordinates={selectedRouteCoords}
              isRouteLoading={isCalculatingRoute}
              className="w-full h-full rounded-3xl overflow-hidden relative"
            />

            {/* Map Floating Banner / Overlay Controls */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div className="bg-slate-950/90 backdrop-blur-md text-white text-[11px] font-bold px-3 py-2 rounded-2xl shadow-lg border border-slate-800 flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-[#D94A38]" />
                <span>
                  {selectedOrder
                    ? `Live Route Tracking: ${selectedOrder.id}`
                    : `Tracking ${activeOrders.length} Global Orders Across Ahmedabad`}
                </span>
                {isCalculatingRoute && (
                  <span className="text-[10px] text-slate-300 font-normal animate-pulse">
                    (Plotting road route...)
                  </span>
                )}
              </div>

              {selectedOrder && (
                <button
                  onClick={handleClearSelection}
                  className="bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 px-3 py-2 rounded-2xl shadow-md border border-slate-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" /> Reset View
                </button>
              )}
            </div>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-2.5 shadow-lg hidden sm:flex items-center gap-3 text-[10px] font-bold text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-950" />
                <span>Food Stalls / Hub</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D94A38] border border-[#B83827]" />
                <span>Rider en Route</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-500" />
                <span>Customer Door</span>
              </div>
            </div>

            {/* Selected Order Detailed Drawer Card (Floating at Bottom-Right) */}
            {selectedOrder && (
              <div className="absolute bottom-4 right-4 z-20 w-full max-w-sm bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 shadow-2xl animate-fadeIn space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {selectedOrder.id}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedOrder.status === 'At Door'
                            ? 'bg-emerald-500 animate-pulse'
                            : selectedOrder.status === 'In Transit'
                              ? 'bg-slate-900'
                              : 'bg-slate-400'
                          }`} />
                        {selectedOrder.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-700 mt-1">
                      {selectedOrder.vendor}
                    </p>
                  </div>

                  <button
                    onClick={handleClearSelection}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 4-Stage Live Progress Stepper */}
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    Live Delivery Journey
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-bold">
                    <div className="bg-slate-900 text-white py-1 rounded-md">
                      1. Placed
                    </div>
                    <div
                      className={`py-1 rounded-md ${selectedOrder.status === 'At Stall' ||
                          selectedOrder.status === 'In Transit' ||
                          selectedOrder.status === 'At Door'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-200 text-slate-500'
                        }`}
                    >
                      2. Prepared
                    </div>
                    <div
                      className={`py-1 rounded-md ${selectedOrder.status === 'In Transit' || selectedOrder.status === 'At Door'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-200 text-slate-500'
                        }`}
                    >
                      3. Transit
                    </div>
                    <div
                      className={`py-1 rounded-md ${selectedOrder.status === 'At Door'
                          ? 'bg-[#D94A38] text-white'
                          : 'bg-slate-200 text-slate-500'
                        }`}
                    >
                      4. At Door
                    </div>
                  </div>
                </div>

                {/* Customer & Rider Info */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {/* Customer */}
                  <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">
                      Customer
                    </div>
                    <div className="font-bold text-slate-900 truncate">
                      {selectedOrder.customer || 'Customer'}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" />
                      {selectedOrder.customerPhone || 'N/A'}
                    </div>
                  </div>

                  {/* Rider */}
                  <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">
                      Assigned Rider
                    </div>
                    <div className="font-bold text-slate-900 truncate">
                      {selectedOrder.rider}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" />
                      {selectedOrder.riderPhone || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Drop Address & Security OTP */}
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#D94A38] shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-slate-700">
                      {selectedOrder.deliveryAddress || 'Ahmedabad, Gujarat'}
                    </span>
                  </div>
                  {selectedOrder.deliveryOtp && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                      <span className="font-bold text-slate-500">Delivery OTP:</span>
                      <span className="font-mono font-black text-[#D94A38] tracking-widest bg-white px-2 py-0.5 rounded border border-slate-200">
                        {selectedOrder.deliveryOtp}
                      </span>
                    </div>
                  )}
                </div>

                {/* Items & Stalls Breakdown */}
                {selectedOrder.stalls && selectedOrder.stalls.length > 0 && (
                  <div className="text-[11px] space-y-1">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">
                      Kitchen Items ({selectedOrder.stalls.length})
                    </div>
                    <div className="max-h-20 overflow-y-auto space-y-1 hide-scrollbar">
                      {selectedOrder.stalls.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-slate-200/70 text-[10px]"
                        >
                          <span className="font-bold text-slate-800 truncate max-w-[150px]">
                            {s.quantity}x {s.item}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">
                            {s.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleReassign(selectedOrder.id)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold py-2 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Reassign Rider
                  </button>
                  <button
                    onClick={() => handleRefund(selectedOrder.id)}
                    className="flex-1 bg-slate-100 hover:bg-[#D94A38]/10 hover:text-[#D94A38] text-slate-700 border border-slate-200 text-[11px] font-bold py-2 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancel & Refund
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
