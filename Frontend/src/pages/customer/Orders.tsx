import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Check,
  HelpCircle,
  XCircle,
  RotateCcw,
  FileText,
  ChevronDown,
  Download,
  AlertTriangle
} from 'lucide-react';
import type { CartItem } from '../../types';
import { GlobalSkeleton } from '../../components';
import buttonLoader from '../../assets/Loader/button_loading.gif';
import TomTomMap from '../../components/map/TomTomMap';


interface OrdersProps {
  activeOrder: {
    items: CartItem[];
    paymentMethod: string;
    timestamp: string;
  } | null;
  onNavigate: (tab: string) => void;
}

export const Orders: React.FC<OrdersProps> = ({ activeOrder, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(3); // Step 3: Kitchens preparing
  const [s4Status, setS4Status] = useState<'preparing' | 'ready' | 'collected'>('preparing');
  const [s1Status, setS1Status] = useState<'ready' | 'collected'>('ready');
  const [s3Status, setS3Status] = useState<'ready' | 'collected'>('ready');
  const [riderPosition, setRiderPosition] = useState<{ x: number; y: number }>({ x: 50, y: 30 }); // S1 coordinates
  const [riderStatusText, setRiderStatusText] = useState<string>('Kitchens are cooking, rider is on the way.');
  const [etaMinutes, setEtaMinutes] = useState<number>(18);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Scroll to top when Orders page is mounted
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const items = activeOrder?.items || [
    { id: 'kutchi-dabeli', name: 'Kutchi Dabeli', price: 40, quantity: 2, vendorId: 'v_s1_bhavesh', vendorName: 'Bhavesh Dabeli', emoji: '🌮' },
    { id: 'cheese-dabeli', name: 'Cheese Dabeli', price: 70, quantity: 1, vendorId: 'v_s1_bhavesh', vendorName: 'Bhavesh Dabeli', emoji: '🫓' },
    { id: 'malai-kulfi', name: 'Malai Kulfi (2pc)', price: 120, quantity: 1, vendorId: 'v_s3_asharfi', vendorName: 'Asharfi Kulfi', emoji: '🍨' },
    { id: 'butter-pav-bhaji', name: 'Butter Pav Bhaji', price: 90, quantity: 1, vendorId: 'v_s4_bhajipav', vendorName: 'Bhajipav Bhandar', emoji: '🍛' }
  ];

  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const itemsSubtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalAmount = itemsSubtotal + 49 + 5;

  // Mock live order tracking lifecycle updates
  useEffect(() => {
    const t1 = setTimeout(() => {
      setS4Status('ready');
      setS1Status('collected');
      setS3Status('collected');
      setRiderPosition({ x: 70, y: 40 });
      setEtaMinutes(14);
    }, 7000);

    const t2 = setTimeout(() => {
      setS4Status('collected');
      setActiveStep(4);
      setRiderStatusText('Rider has collected all sub-orders. Heading your way.');
      setRiderPosition({ x: 40, y: 65 });
      setEtaMinutes(10);
    }, 14000);

    const t3 = setTimeout(() => {
      setActiveStep(5);
      setRiderPosition({ x: 25, y: 75 });
      setEtaMinutes(5);
    }, 21000);

    const t4 = setTimeout(() => {
      setActiveStep(6);
      setRiderPosition({ x: 20, y: 80 });
      setEtaMinutes(0);
      setRiderStatusText('Your food from StreetBites has been delivered. Enjoy!');
    }, 28000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const handleReorder = (orderId: string) => {
    setReorderingId(orderId);
    setTimeout(() => {
      setReorderingId(null);
    }, 2000);
  };

  const renderPastOrders = () => (
    <div className="space-y-4 max-w-4xl animate-fadeIn">
      {[
        { id: 'MO-77190', date: 'Oct 12, 2026, 8:15 PM', total: 340, cluster: 'Manek Chowk', stalls: ['Bhavesh Dabeli', 'Asharfi Kulfi'], items: 4, status: 'Delivered', payment: 'UPI' },
        { id: 'MO-77145', date: 'Oct 05, 2026, 7:30 PM', total: 180, cluster: 'Urban Chowk', stalls: ['Gwalia Sweets'], items: 2, status: 'Delivered', payment: 'Card' },
        { id: 'MO-76892', date: 'Sep 28, 2026, 9:00 PM', total: 450, cluster: 'Manek Chowk', stalls: ['Bhajipav Bhandar', 'Manek Pizza'], items: 5, status: 'Delivered', payment: 'UPI' },
        { id: 'MO-75412', date: 'Sep 15, 2026, 1:15 PM', total: 220, cluster: 'Law Garden', stalls: ['Happy Sandwich', 'Swati Snacks'], items: 3, status: 'Delivered', payment: 'Cash' },
      ].map(order => {
        const isExpanded = expandedOrderId === order.id;

        return (
          <div
            key={order.id}
            className={`bg-white rounded-3xl border ${isExpanded ? 'border-[#D94A38]' : 'border-[#EAE4DA]'} shadow-2xs overflow-hidden transition-all duration-300`}
          >
            {/* Clickable Header */}
            <div
              className="p-5 cursor-pointer hover:bg-[#FAF7F2] transition-colors flex flex-col md:flex-row justify-between gap-4 select-none"
              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-[#E6F4EA] text-[#137333] border border-[#A7E1BA] text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">{order.status}</span>
                  <span className="text-xs text-[#8E8B85] font-semibold">{order.date}</span>
                </div>
                <h3 className="text-sm font-bold text-[#1C1917] mb-1">{order.cluster} Order <span className="text-[#8E8B85] font-mono font-medium ml-1">#{order.id}</span></h3>
                <p className="text-xs text-[#4B5563]">{order.stalls.join(' · ')}</p>
                <p className="text-xs font-black text-[#1C1917] mt-2">₹{order.total} <span className="text-[#8E8B85] font-medium mx-1">•</span> <span className="font-medium text-[#4B5563]">{order.items} items</span></p>
              </div>
              <div className="flex items-center justify-end">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'bg-[#FCE8E6] text-[#D94A38] rotate-180' : 'bg-[#F5F0E8] text-[#8E8B85]'}`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-5 pb-5 pt-2 border-t border-[#F5F0E8] animate-fadeIn bg-[#FAF8F5]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left: Order Items */}
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#8E8B85] mb-3">Order Summary</h4>
                    <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#EAE4DA]">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#4B5563]">1x Masala Dosa</span>
                        <span className="font-bold text-[#1C1917]">₹120</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#4B5563]">2x Vada Pav</span>
                        <span className="font-bold text-[#1C1917]">₹60</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#4B5563]">1x Cold Coffee</span>
                        <span className="font-bold text-[#1C1917]">₹80</span>
                      </div>
                      <div className="pt-3 mt-2 border-t border-[#F5F0E8] flex justify-between items-center text-xs text-[#8E8B85]">
                        <span>Delivery Fee</span>
                        <span>₹49</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-[#8E8B85]">
                        <span>Taxes (5% GST)</span>
                        <span>₹13</span>
                      </div>
                      <div className="pt-3 mt-2 border-t border-[#F5F0E8] flex justify-between items-center text-sm font-black text-[#D94A38]">
                        <span>Total</span>
                        <span>₹{order.total}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions & Info */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#8E8B85] mb-3">Details & Actions</h4>
                    <div className="bg-white p-4 rounded-2xl border border-[#EAE4DA] text-xs flex flex-col gap-2">
                      <div className="flex justify-between text-[#4B5563]">
                        <span>Payment Method:</span>
                        <span className="font-bold text-[#1C1917]">{order.payment}</span>
                      </div>
                      <div className="flex justify-between text-[#4B5563]">
                        <span>Delivered to:</span>
                        <span className="font-bold text-[#1C1917]">Home</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReorder(order.id); }}
                        disabled={reorderingId === order.id}
                        className="w-full bg-[#D94A38] hover:bg-[#C43D2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-80 disabled:cursor-not-allowed"
                      >
                        {reorderingId === order.id ? (
                          <img src={buttonLoader} alt="Loading..." className="h-4 w-auto" />
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4" />
                            <span>Reorder</span>
                          </>
                        )}
                      </button>
                      <div className="flex gap-2">
                        <button className="flex-1 bg-white hover:bg-[#FAF7F2] text-[#4B5563] text-xs font-bold px-4 py-2.5 border border-[#EAE4DA] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs">
                          <Download className="w-3.5 h-3.5" />
                          <span>Invoice</span>
                        </button>
                        <button className="flex-1 bg-white hover:bg-red-50 text-red-600 text-xs font-bold px-4 py-2.5 border border-red-200 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Report Issue</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (isLoading) {
    return (
      <div className="w-full min-h-[75vh] flex items-center justify-center bg-white font-sans">
        <GlobalSkeleton message="Preparing your Khau Galli" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      {/* ─── DESKTOP VIEW ─── */}
      <div className="hidden md:block">
        {/* Header bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-xs text-[#8E8B85]">
            <button onClick={() => onNavigate('discover')} className="hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0">Orders</button>
            <span className="mx-1">›</span>
            <span className="text-[#1C1917] font-semibold">{activeTab === 'live' ? 'MO-77213 · Live' : 'History'}</span>
          </div>

          <div className="bg-[#F5F0E8] p-1.5 rounded-full flex gap-1 shadow-inner border border-[#EAE4DA]">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-5 py-1.5 rounded-full text-xs font-black tracking-wide transition-all cursor-pointer ${activeTab === 'live' ? 'bg-white shadow-sm text-[#D94A38]' : 'text-[#8E8B85] hover:text-[#1C1917]'}`}
            >
              Live Order
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-5 py-1.5 rounded-full text-xs font-black tracking-wide transition-all cursor-pointer ${activeTab === 'past' ? 'bg-white shadow-sm text-[#D94A38]' : 'text-[#8E8B85] hover:text-[#1C1917]'}`}
            >
              Order History
            </button>
          </div>

          {activeTab === 'live' && (
            <span className="bg-[#E6F4EA] text-[#137333] border border-[#A7E1BA] text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-3xs select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#137333] animate-pulse" />
              {etaMinutes > 0 ? `Rider arriving in ~${etaMinutes} min` : 'Delivered'}
            </span>
          )}
          {activeTab === 'past' && <div className="w-[150px]"></div> /* Spacer */}
        </div>

        {activeTab === 'live' && (
          <div className="animate-fadeIn">
            {/* Action Buttons Header */}
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-3xl font-semibold text-[#1C1917]">
                {activeStep === 6 ? 'Order Delivered!' : riderStatusText}
              </h1>
              <div className="flex gap-2 shrink-0">
                <button className="bg-white hover:bg-[#FAF7F2] text-[#4B5563] text-xs font-bold px-4 py-2 border border-[#EAE4DA] rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-3xs">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Support</span>
                </button>
                {activeStep < 4 && (
                  <button className="bg-white hover:bg-red-50 text-red-600 text-xs font-bold px-4 py-2 border border-red-200 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-3xs">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel order</span>
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Lower Grid */}
            <div className="grid grid-cols-12 gap-8 items-start">
              {/* Left Column: Timeline & Sub-orders list */}
              <div className="col-span-8 space-y-6">
                {/* Timeline Progress */}
                <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs">
                  <div className="flex justify-between items-center pb-4 border-b border-[#F5F0E8] mb-5">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917]">Timeline</h3>
                    <span className="bg-[#FAF7F2] border border-[#EAE4DA] text-[#4B5563] text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                      STATE: {activeStep === 6 ? 'COMPLETED' : activeStep === 5 ? 'DELIVERING' : 'PREPARING'}
                    </span>
                  </div>

                  {/* Vertical Steps */}
                  <div className="relative border-l border-[#FAF7F2] pl-8 space-y-6 ml-3.5">
                    {[
                      { step: 1, label: 'Order placed', time: '20:14', desc: 'MainOrder MO-77213 forked into 3 sub-orders.' },
                      { step: 2, label: 'All stalls accepted', time: '20:15', desc: 'Bhavesh · Asharfi · Bhajipav confirmed.' },
                      { step: 3, label: 'Kitchens preparing', time: '20:16', desc: s4Status === 'ready' ? 'All 3 stalls preparation complete.' : '2 of 3 stalls prep complete.' },
                      { step: 4, label: 'Rider collecting', time: activeStep >= 4 ? '20:21' : '--:--', desc: 'Aditya V. picking up in cluster order.' },
                      { step: 5, label: 'Out for delivery', time: activeStep >= 5 ? '20:25' : '--:--', desc: 'Single trip · 3 pickups · 1 drop.' },
                      { step: 6, label: 'Delivered', time: activeStep === 6 ? '20:29' : '--:--', desc: 'Rate each stall individually after arrival.' }
                    ].map((s) => (
                      <div key={s.step} className="relative">
                        <div className={`absolute -left-12 top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${activeStep >= s.step
                          ? 'border-[#D94A38] bg-[#FAF7F2] text-[#D94A38] shadow-3xs'
                          : 'border-[#EAE4DA] bg-white text-[#8E8B85]'
                          }`}>
                          {activeStep >= s.step ? <Check className="w-4 h-4 stroke-[3]" /> : s.step}
                        </div>
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className={`text-xs font-bold font-sans ${activeStep >= s.step ? 'text-[#1C1917]' : 'text-[#8E8B85]'}`}>
                              {s.label}
                            </h4>
                            <p className="text-[11px] text-[#8E8B85] leading-relaxed mt-0.5">{s.desc}</p>
                          </div>
                          <span className="text-[10px] text-[#8E8B85] font-semibold">{s.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-orders Fork Card */}
                <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917] pb-4 border-b border-[#F5F0E8] mb-4">
                    Sub-orders
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'S1', name: 'Bhavesh Dabeli', code: 'SO-s1', status: s1Status === 'ready' ? 'Ready for pickup' : 'Collected', type: s1Status === 'ready' ? 'ready' : 'collected' },
                      { id: 'S3', name: 'Asharfi Kulfi', code: 'SO-s3', status: s3Status === 'ready' ? 'Ready for pickup' : 'Collected', type: s3Status === 'ready' ? 'ready' : 'collected' },
                      { id: 'S4', name: 'Bhajipav Bhandar', code: 'SO-s4', status: s4Status === 'preparing' ? 'Preparing · 4 min' : s4Status === 'ready' ? 'Ready for pickup' : 'Collected', type: s4Status },
                    ].map((so) => (
                      <div key={so.id} className="flex justify-between items-center p-3.5 bg-[#FAF7F2] border border-[#EAE4DA] rounded-2xl">
                        <div className="flex gap-3 items-center">
                          <span className="w-7 h-7 rounded-full bg-[#1C1917] text-white text-[10px] font-black flex items-center justify-center select-none">
                            {so.id}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-[#1C1917] block">{so.name}</span>
                            <span className="text-[9px] text-[#8E8B85] font-mono block">{so.code}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${so.type === 'collected'
                          ? 'bg-[#E6F4EA] text-[#137333] border-[#A7E1BA]'
                          : so.type === 'ready'
                            ? 'bg-[#FAF7F2] text-[#4B5563] border-[#EAE4DA]'
                            : 'bg-[#FFF8F0] text-[#B76E00] border-[#FFE1C2] animate-pulse'
                          }`}>
                          {so.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Simulated map panel & Rider info */}
              <div className="col-span-4 space-y-6">
                <div className="bg-white rounded-3xl border border-[#EAE4DA] p-4 shadow-2xs space-y-3">
                  <div className="flex justify-between items-baseline px-1">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917]">Live Delivery Map</h3>
                    <span className="text-[9px] text-[#8E8B85] font-bold">TomTom Maps SDK</span>
                  </div>
                  <div className="h-64 rounded-2xl overflow-hidden relative">
                    <TomTomMap
                      center={[72.5714, 23.0225]}
                      zoom={13}
                      className="w-full h-full rounded-2xl overflow-hidden relative"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-[#EAE4DA] p-4 shadow-2xs flex justify-between items-center">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] border border-[#EAE4DA] text-xs font-black text-[#4B5563] flex items-center justify-center select-none">
                      AV
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1C1917]">Aditya Vaghela</h4>
                      <p className="text-[10px] text-[#8E8B85] mt-0.5 leading-normal">
                        Rider · R-2118 · GJ-01 EE 4472<br />
                        ★ 4.9 · 312 trips
                      </p>
                    </div>
                  </div>
                  <button className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#EAE4DA] hover:bg-[#F2EDE5] text-[#1C1917] flex items-center justify-center transition-all cursor-pointer">
                    <Phone className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-[#FAF7F2] border border-[#EAE4DA] p-4 rounded-3xl space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[#8E8B85]">
                    <span>Method: {activeOrder?.paymentMethod || 'PAID VIA UPI'}</span>
                    <span>{totalItemCount} items</span>
                  </div>
                  <div className="flex justify-between items-baseline font-bold text-[#1C1917] pt-1 border-t border-[#EAE4DA]">
                    <span>Total amount</span>
                    <span className="text-sm">₹{totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'past' && (
          <div className="mt-6">
            <h1 className="text-2xl font-bold text-[#1C1917] mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#D94A38]" /> Order History
            </h1>
            {renderPastOrders()}
          </div>
        )}
      </div>

      {/* ─── MOBILE VIEW ─── */}
      <div className="md:hidden block bg-[#FAF7F2] min-h-screen pb-32">
        {/* Header bar */}
        <div className="flex items-center justify-between py-4 px-4 bg-white border-b border-[#EAE4DA] sticky top-0 z-30 shadow-sm">
          <button onClick={() => onNavigate('discover')} className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center cursor-pointer">
            <ArrowLeft className="w-4 h-4 text-[#1C1917]" />
          </button>

          <div className="bg-[#F5F0E8] p-1 rounded-full flex gap-1 shadow-inner border border-[#EAE4DA]">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${activeTab === 'live' ? 'bg-white shadow-sm text-[#D94A38]' : 'text-[#8E8B85]'}`}
            >
              Live
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${activeTab === 'past' ? 'bg-white shadow-sm text-[#D94A38]' : 'text-[#8E8B85]'}`}
            >
              History
            </button>
          </div>
        </div>

        {activeTab === 'live' && (
          <div className="p-4 space-y-5 animate-fadeIn">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-[#1C1917]">
                  {activeStep === 6 ? 'Delivered!' : `Arriving in ${etaMinutes} min`}
                </h1>
                <p className="text-xs text-[#8E8B85] font-semibold mt-0.5">Rider stitching your 3-stall route</p>
              </div>
              <span className="bg-[#E6F4EA] text-[#137333] text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider select-none shrink-0 border border-[#A7E1BA]">
                Live
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-[#EAE4DA] p-4 shadow-3xs flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#EAE4DA] text-[10px] font-black text-[#4B5563] flex items-center justify-center">
                  NP
                </div>
                <div>
                  <span className="text-xs font-bold text-[#1C1917] block">Nikhil Prajapati</span>
                  <span className="text-[9px] text-[#8E8B85]">GJ-01 EX 8291 · ★ 4.9</span>
                </div>
              </div>
              <button className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#EAE4DA] text-[#1C1917] flex items-center justify-center">
                <Phone className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8B85]">Order fork</h3>
                <span className="text-[10px] text-[#8E8B85] font-semibold">3 SubOrders</span>
              </div>
              <div className="bg-white rounded-2xl border border-[#EAE4DA] p-4 shadow-3xs space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#FAF7F2]">
                  <div>
                    <strong className="text-xs font-bold text-[#1C1917] block">Main order · #SB-8291</strong>
                    <span className="text-[9px] text-[#8E8B85] font-mono block">clusterId: manek_chowk_01</span>
                  </div>
                  <strong className="text-xs font-black text-[#1C1917]">₹{totalAmount}</strong>
                </div>

                <div className="flex justify-between items-start gap-4 text-[11px] pt-1">
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className="w-5 h-5 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] text-[#4B5563] font-bold text-[9px] flex items-center justify-center shrink-0">S1</span>
                      <strong className="text-[#1C1917]">Bhavesh Dabeli</strong>
                    </div>
                    <p className="text-[10px] text-[#8E8B85] pl-7 mt-0.5">2x Kutchi Dabeli · 1x Cheese</p>
                    <p className="text-[9px] text-[#8E8B85] pl-7 mt-0.5 font-mono">Picked at 8:42 PM</p>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border select-none ${s1Status === 'collected' ? 'bg-[#E6F4EA] text-[#137333] border-[#A7E1BA]' : 'bg-[#FAF7F2] text-[#4B5563] border-[#EAE4DA]'}`}>
                    {s1Status === 'collected' ? 'COLLECTED' : 'READY'}
                  </span>
                </div>

                <div className="flex justify-between items-start gap-4 text-[11px] pt-1">
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className="w-5 h-5 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] text-[#4B5563] font-bold text-[9px] flex items-center justify-center shrink-0">S3</span>
                      <strong className="text-[#1C1917]">Asharfi Kulfi</strong>
                    </div>
                    <p className="text-[10px] text-[#8E8B85] pl-7 mt-0.5">1x Malai Kulfi (2pc)</p>
                    <p className="text-[9px] text-[#8E8B85] pl-7 mt-0.5 font-mono">Ready at 8:44 PM</p>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border select-none ${s3Status === 'collected' ? 'bg-[#E6F4EA] text-[#137333] border-[#A7E1BA]' : 'bg-[#FFF8F0] text-[#B76E00] border-[#FFE1C2]'}`}>
                    {s3Status === 'collected' ? 'COLLECTED' : 'READY · en route'}
                  </span>
                </div>

                <div className="flex justify-between items-start gap-4 text-[11px] pt-1">
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className="w-5 h-5 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] text-[#4B5563] font-bold text-[9px] flex items-center justify-center shrink-0">S4</span>
                      <strong className="text-[#1C1917]">Bhajipav Bhandar</strong>
                    </div>
                    <p className="text-[10px] text-[#8E8B85] pl-7 mt-0.5">1x Butter Pav Bhaji</p>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border select-none ${s4Status === 'collected' ? 'bg-[#E6F4EA] text-[#137333] border-[#A7E1BA]' : s4Status === 'ready' ? 'bg-[#FAF7F2] text-[#4B5563] border-[#EAE4DA]' : 'bg-stone-100 text-stone-500 border-[#EAE4DA] animate-pulse'}`}>
                    {s4Status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8B85]">Timeline</h3>
                <span className="bg-[#FAF7F2] border border-[#EAE4DA] text-[#4B5563] text-[9px] font-bold px-2 py-0.5 rounded-md">
                  {activeStep === 6 ? 'COMPLETED' : activeStep === 5 ? 'DELIVERING' : 'PREPARING'}
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-[#EAE4DA] p-5 shadow-3xs">
                <div className="relative border-l border-[#FAF7F2] pl-8 space-y-6 ml-3.5">
                  {[
                    { step: 1, label: 'Order placed', time: '20:14', desc: 'MainOrder MO-77213 forked into 3 sub-orders.' },
                    { step: 2, label: 'All stalls accepted', time: '20:15', desc: 'Bhavesh · Asharfi · Bhajipav confirmed.' },
                    { step: 3, label: 'Kitchens preparing', time: '20:16', desc: s4Status === 'ready' ? 'All 3 stalls preparation complete.' : '2 of 3 stalls prep complete.' },
                    { step: 4, label: 'Rider collecting', time: activeStep >= 4 ? '20:21' : '--:--', desc: 'Aditya V. picking up in cluster order.' },
                    { step: 5, label: 'Out for delivery', time: activeStep >= 5 ? '20:25' : '--:--', desc: 'Single trip · 3 pickups · 1 drop.' },
                    { step: 6, label: 'Delivered', time: activeStep === 6 ? '20:29' : '--:--', desc: 'Rate each stall individually after arrival.' }
                  ].map((s) => (
                    <div key={s.step} className="relative">
                      <div className={`absolute -left-12 top-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${activeStep >= s.step
                        ? 'border-[#D94A38] bg-[#FAF7F2] text-[#D94A38] shadow-3xs'
                        : 'border-[#EAE4DA] bg-white text-[#8E8B85]'
                        }`}>
                        {activeStep >= s.step ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                      </div>
                      <div className="flex justify-between items-start gap-4 pt-0.5">
                        <div>
                          <h4 className={`text-xs font-bold font-sans ${activeStep >= s.step ? 'text-[#1C1917]' : 'text-[#8E8B85]'}`}>
                            {s.label}
                          </h4>
                          <p className="text-[10px] text-[#8E8B85] leading-relaxed mt-0.5">{s.desc}</p>
                        </div>
                        <span className="text-[9px] text-[#8E8B85] font-semibold mt-0.5">{s.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'past' && (
          <div className="p-4">
            <h1 className="text-xl font-bold text-[#1C1917] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D94A38]" /> Past Orders
            </h1>
            {renderPastOrders()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
