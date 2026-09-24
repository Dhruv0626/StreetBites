import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, RefreshCw } from 'lucide-react';
import TomTomMap from '../../components/map/TomTomMap';
import { type MapMarker, type LngLatTuple } from '../../types/map';
import { AHMEDABAD_CENTER } from '../../config/tomtom';
import { adminService } from '../../services/adminService';
import { QueueItemSkeleton } from '../../components/Skeleton';

interface OrderItem {
  id: string;
  _id?: string;
  vendor: string;
  rider: string;
  status: 'In Transit' | 'Delayed' | 'At Stall';
  time: string;
  issue: string | null;
  position: LngLatTuple;
}

export const AdminOrders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<LngLatTuple>(AHMEDABAD_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [activeOrders, setActiveOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrders = async () => {
    setIsLoading(true);
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
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = activeOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.vendor.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      alert(`Refund processed for ${id}`);
    }
  };

  const handleSelectOrder = (order: OrderItem) => {
    setSelectedOrderId(order.id);
    setMapCenter(order.position);
    setMapZoom(15);
  };

  // Convert active global orders to TomTom Map Markers
  const orderMarkers: MapMarker[] = activeOrders.map((order) => {
    const badgeColor =
      order.status === 'Delayed'
        ? '#D97706'
        : order.status === 'In Transit'
          ? '#2563EB'
          : '#059669';

    return {
      id: order.id,
      position: order.position,
      title: `${order.id} - ${order.vendor}`,
      description: `Rider: ${order.rider} • Status: ${order.status}`,
      type: order.status === 'Delayed' ? 'rider' : 'stall',
      onClick: () => handleSelectOrder(order),
      popupHtml: `
        <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; padding: 4px; max-width: 220px;">
          <div style="display: inline-block; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 999px; margin-bottom: 4px; background: ${badgeColor}; color: #ffffff;">
            ${order.status.toUpperCase()}
          </div>
          <div style="font-weight: 800; font-size: 13px; color: #1c1917; margin-bottom: 2px;">
            ${order.id} (${order.vendor})
          </div>
          <div style="font-size: 11px; color: #6b7280;">
            Rider: <strong>${order.rider}</strong>
          </div>
          ${order.issue
          ? `<div style="font-size: 10px; font-weight: 700; color: #b45309; margin-top: 4px;">⚠️ ${order.issue}</div>`
          : ''
        }
        </div>
      `,
    };
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8 flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Global Live Orders</h1>
          <p className="text-sm text-stone-500 mt-1">Monitor live delivery routes on TomTom Map and intervene if necessary.</p>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="bg-white border border-[#EFEBE4] hover:bg-stone-50 text-stone-700 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#D94A38]' : ''}`} /> Refresh
          </button>
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search Order ID or Vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#EFEBE4] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#D94A38] transition-colors shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Live Orders List */}
        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm flex flex-col h-full overflow-hidden">
          <h2 className="text-lg font-bold text-stone-900 mb-4 shrink-0 flex items-center justify-between">
            Active Deliveries
            <span className="bg-[#FCE8E6] text-[#D94A38] text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {activeOrders.length} Live
            </span>
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar pr-2">
            {isLoading ? (
              <QueueItemSkeleton count={4} />
            ) : filteredOrders.length === 0 ? (
              <div className="text-center text-stone-500 py-10 text-xs font-medium">No live orders in queue.</div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = order.id === selectedOrderId;
                return (
                  <div
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${isSelected
                        ? 'border-[#D94A38] bg-[#FCE8E6]/20 shadow-xs'
                        : order.issue
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-[#EFEBE4] hover:border-stone-300 bg-white'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded">
                        {order.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${order.status === 'Delayed'
                            ? 'bg-amber-200 text-amber-800'
                            : order.status === 'In Transit'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="text-sm text-stone-800 font-medium">{order.vendor}</div>
                    <div className="text-xs text-stone-500 mb-3 flex justify-between">
                      <span>Rider: {order.rider}</span>
                      <span>{order.time}</span>
                    </div>

                    {order.issue && (
                      <div className="mt-2 mb-3 text-xs font-bold text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> {order.issue}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReassign(order.id);
                        }}
                        className="flex-1 bg-stone-900 text-white hover:bg-black text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        Reassign
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefund(order.id);
                        }}
                        className="flex-1 bg-white border border-stone-200 hover:bg-stone-50 text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg transition-colors cursor-pointer text-red-600 hover:text-red-700 hover:border-red-200"
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

        {/* Live TomTom Map Container */}
        <div className="tour-live-map lg:col-span-2 bg-white rounded-3xl border border-[#EFEBE4] overflow-hidden shadow-sm relative h-full min-h-[400px]">
          <TomTomMap
            center={mapCenter}
            zoom={mapZoom}
            markers={orderMarkers}
            className="w-full h-full rounded-3xl overflow-hidden relative"
          />
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
