import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Info,
  ChevronRight,
  CheckCircle2,
  Store,
  Utensils,
  ShieldCheck,
  Zap,
  CreditCard,
  Banknote,
  Clock,
  Sparkles,
  Navigation,
  Lock,
  Flame
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface CheckoutProps {
  clusterName?: string;
  onNavigate?: (tab: string) => void;
  onConfirmOrder?: (placedItems: any[], paymentMethod: string) => void;
}

const MOCK_ADDRESSES = [
  {
    id: '1',
    title: 'Home',
    detail: '123, B Block, Navrangpura, Ahmedabad, Gujarat 380009',
    isPrimary: true,
    distance: '3.42 km',
    eta: '22–28 min'
  },
  {
    id: '2',
    title: 'Office',
    detail: '45, SG Highway, Prahlad Nagar, Ahmedabad, Gujarat 380015',
    isPrimary: false,
    distance: '8.1 km',
    eta: '35–45 min'
  },
];

// Helper to provide attractive fallback street food photos if dish image is empty
const getFoodFallbackImage = (name: string, stallName: string = ''): string => {
  const q = `${name} ${stallName}`.toLowerCase();
  if (q.includes('pav bhaji') || q.includes('bhaji')) {
    return 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop';
  }
  if (q.includes('sandwich') || q.includes('toast') || q.includes('grill')) {
    return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop';
  }
  if (q.includes('dosa') || q.includes('uttapam') || q.includes('south')) {
    return 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop';
  }
  if (q.includes('chaat') || q.includes('puri') || q.includes('bhel') || q.includes('sev')) {
    return 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop';
  }
  if (q.includes('pizza')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop';
  }
  if (q.includes('shake') || q.includes('kulfi') || q.includes('falooda') || q.includes('ice cream') || q.includes('lassi')) {
    return 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop';
  }
  if (q.includes('burger') || q.includes('fries')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop';
  }
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop';
};

export const Checkout: React.FC<CheckoutProps> = ({
  clusterName = 'Manek Chowk',
  onNavigate = () => { },
  onConfirmOrder = () => { },
}) => {
  const { cartItems, activeKhauGalli } = useCart();
  const rawKhauGalliName = activeKhauGalli?.name || cartItems[0]?.khauGalliName || clusterName;
  const displayKhauGalliName = rawKhauGalliName.replace(/_/g, ' ');

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cod'>('upi');
  const [selectedUpiProvider, setSelectedUpiProvider] = useState<string>('gpay');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    MOCK_ADDRESSES.find((a) => a.isPrimary)?.id || '1'
  );
  const [isChangingAddress, setIsChangingAddress] = useState(false);
  const selectedAddress =
    MOCK_ADDRESSES.find((a) => a.id === selectedAddressId) || MOCK_ADDRESSES[0];

  const itemSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const uniqueVendorsCount = new Set(cartItems.map((i) => i.vendorId)).size;
  const deliveryFee = cartItems.length > 0 ? 30 : 0;
  const gstAmount = Math.round(itemSubtotal * 0.05 * 10) / 10;
  const totalPayable = Math.round((itemSubtotal + deliveryFee + gstAmount) * 10) / 10;

  // Estimated savings vs separate aggregator deliveries
  const estimatedSavings = uniqueVendorsCount > 1 ? (uniqueVendorsCount - 1) * 35 : 0;

  const handlePay = () => {
    onConfirmOrder(
      cartItems,
      paymentMethod === 'upi' ? `UPI (${selectedUpiProvider.toUpperCase()})` : paymentMethod.toUpperCase()
    );
  };

  const renderAddressSelection = () => (
    <div className="space-y-3 mt-4 animate-fadeIn">
      {MOCK_ADDRESSES.map((addr) => (
        <label
          key={addr.id}
          className={`flex gap-3 items-start p-3.5 rounded-2xl border cursor-pointer transition-all ${
            selectedAddressId === addr.id
              ? 'border-[#D94A38] bg-[#FAF0ED]/40 shadow-xs'
              : 'border-[#EAE4DA] bg-white hover:border-[#DCD6CC]'
          }`}
          onClick={() => {
            setSelectedAddressId(addr.id);
            setIsChangingAddress(false);
          }}
        >
          <div
            className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
              selectedAddressId === addr.id
                ? 'border-[#D94A38] bg-[#D94A38]'
                : 'border-[#DCD6CC]'
            }`}
          >
            {selectedAddressId === addr.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-sm text-[#1C1917]">{addr.title}</span>
              {addr.isPrimary && (
                <span className="bg-[#FAF0ED] text-[#D94A38] text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#FCE8E6]">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Primary
                </span>
              )}
            </div>
            <p className="text-xs text-[#8E8B85] leading-snug">{addr.detail}</p>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-[#5C5954]">
              <span className="bg-[#FAF7F2] border border-[#EAE4DA] px-2 py-0.5 rounded-md">
                {addr.distance}
              </span>
              <span className="bg-[#FAF7F2] border border-[#EAE4DA] px-2 py-0.5 rounded-md text-[#2E7D32]">
                ETA {addr.eta}
              </span>
            </div>
          </div>
        </label>
      ))}
      <button
        onClick={() => setIsChangingAddress(false)}
        className="text-xs font-bold text-[#8E8B85] hover:text-[#1C1917] underline mt-2 bg-transparent border-0 cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-16">
      {/* ─── DESKTOP VIEW ─── */}
      <div className="hidden md:block">
        {/* Header Breadcrumbs & Khau Galli Tag */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-xs text-[#8E8B85]">
            <button
              onClick={() => onNavigate('cart')}
              className="hover:text-[#D94A38] font-medium transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Cart
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#DCD6CC]" />
            <span className="text-[#1C1917] font-bold">Checkout</span>
          </div>

          <div className="flex items-center gap-2 bg-gradient-to-r from-[#FAF0ED] to-[#FAF7F2] border border-[#FCE8E6] px-3.5 py-1.5 rounded-full shadow-3xs">
            <span className="w-2 h-2 rounded-full bg-[#D94A38] animate-pulse" />
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#D94A38]">
              KHAU GALLI · {displayKhauGalliName}
            </span>
          </div>
        </div>

        {/* Headline Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold tracking-widest text-[#D94A38] uppercase bg-[#FAF0ED] border border-[#FCE8E6] px-2.5 py-0.5 rounded-md">
              STEP 3 OF 3 · CONFIRM & PAY
            </span>
            <span className="text-xs text-[#8E8B85] font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#D94A38]" /> Multi-stall order splitting
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            One receipt. <span className="text-[#D94A38]">Split {uniqueVendorsCount > 1 ? `${uniqueVendorsCount} ways.` : 'cleanly.'}</span>
          </h1>
          <p className="text-xs text-[#8E8B85] mt-1 font-medium">
            {totalItemsCount} items from {uniqueVendorsCount} stalls inside {displayKhauGalliName} · Single rider delivery
          </p>
        </div>

        {/* Main Grid: Left Steps + Right Order Summary */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Delivery + Payment */}
          <div className="col-span-7 lg:col-span-8 space-y-6">
            {/* Delivery address Card */}
            <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D94A38]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917]">
                    Delivery Address
                  </h3>
                </div>
                {!isChangingAddress && (
                  <button
                    onClick={() => setIsChangingAddress(true)}
                    className="text-xs text-[#D94A38] font-bold hover:underline bg-transparent border-0 cursor-pointer p-0 flex items-center gap-1"
                  >
                    <span>Change address</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isChangingAddress ? (
                renderAddressSelection()
              ) : (
                <div className="flex gap-4 items-start bg-[#FAF7F2]/60 border border-[#EAE4DA]/70 rounded-2xl p-4 animate-fadeIn">
                  <div className="w-11 h-11 rounded-2xl bg-[#FAF0ED] border border-[#FCE8E6] flex items-center justify-center text-[#D94A38] shrink-0 shadow-3xs">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#1C1917]">{selectedAddress.title}</h4>
                      {selectedAddress.isPrimary && (
                        <span className="bg-[#FAF0ED] text-[#D94A38] text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#FCE8E6]">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8E8B85] leading-relaxed">{selectedAddress.detail}</p>
                    <div className="flex gap-2 pt-1.5">
                      <span className="bg-white border border-[#EAE4DA] text-[#4B5563] text-[10px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <Navigation className="w-2.5 h-2.5 text-[#D94A38]" />
                        {selectedAddress.distance}
                      </span>
                      <span className="bg-[#E6F4EA] border border-[#A7E1BA] text-[#137333] text-[10px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        ETA {selectedAddress.eta}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rider Note Input */}
              <div className="mt-5 pt-4 border-t border-[#F5F0E8]">
                <label className="text-[10px] font-bold text-[#8E8B85] uppercase tracking-wider block mb-1.5">
                  Delivery instructions for rider
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. 2nd floor, ring the bell, gate colour..."
                    className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl pl-4 pr-10 py-3 text-xs text-[#1C1917] placeholder-[#A09B90] focus:outline-none focus:ring-1 focus:ring-[#D94A38] transition-all"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E8B85]">
                    💬
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D94A38]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917]">
                    Select Payment Method
                  </h3>
                </div>
                <span className="text-sm font-black text-[#1C1917] bg-[#FAF7F2] border border-[#EAE4DA] px-3 py-1 rounded-full">
                  ₹{totalPayable}
                </span>
              </div>

              {/* Method Switcher Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#FAF7F2] border border-[#EAE4DA] rounded-2xl mb-6">
                <button
                  onClick={() => setPaymentMethod('upi')}
                  className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
                    paymentMethod === 'upi'
                      ? 'bg-white text-[#1C1917] shadow-xs font-black'
                      : 'text-[#8E8B85] hover:text-[#1C1917] bg-transparent'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-[#D94A38]" />
                  <span>UPI · Instant</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
                    paymentMethod === 'card'
                      ? 'bg-white text-[#1C1917] shadow-xs font-black'
                      : 'text-[#8E8B85] hover:text-[#1C1917] bg-transparent'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#8E8B85]" />
                  <span>Card</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
                    paymentMethod === 'cod'
                      ? 'bg-white text-[#1C1917] shadow-xs font-black'
                      : 'text-[#8E8B85] hover:text-[#1C1917] bg-transparent'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>Cash</span>
                </button>
              </div>

              {/* UPI Tab Body */}
              {paymentMethod === 'upi' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'gpay', name: 'Google Pay', handle: 'Instant UPI', badge: 'Popular' },
                      { id: 'phonepe', name: 'PhonePe', handle: 'Instant UPI', badge: 'Fast' },
                      { id: 'paytm', name: 'Paytm UPI', handle: 'Wallet & UPI', badge: null },
                      { id: 'bhim', name: 'BHIM UPI', handle: 'Govt. NPCI', badge: null },
                    ].map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedUpiProvider(provider.id)}
                        className={`p-3.5 rounded-2xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                          selectedUpiProvider === provider.id
                            ? 'border-[#D94A38] bg-[#FAF0ED]/30 shadow-xs ring-1 ring-[#D94A38]'
                            : 'border-[#EAE4DA] bg-white hover:border-[#DCD6CC]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#1C1917] block">
                              {provider.name}
                            </span>
                            {provider.badge && (
                              <span className="bg-[#FAF0ED] text-[#D94A38] text-[8px] font-black uppercase px-1.5 py-0.2 rounded">
                                {provider.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#8E8B85]">{provider.handle}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            selectedUpiProvider === provider.id
                              ? 'border-[#D94A38] bg-[#D94A38] text-white'
                              : 'border-[#DCD6CC]'
                          }`}
                        >
                          {selectedUpiProvider === provider.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#F4F9FF] border border-[#D0E2FF] rounded-2xl p-3.5 flex gap-3 items-center">
                    <ShieldCheck className="w-5 h-5 text-[#0043CE] shrink-0" />
                    <p className="text-[11px] text-[#0043CE] leading-relaxed">
                      Sandbox payment simulation active. On clicking Pay, your order is atomically saved and splits across <strong>{uniqueVendorsCount} stall sub-orders</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Card Tab Body */}
              {paymentMethod === 'card' && (
                <div className="space-y-3 py-2 animate-fadeIn">
                  <input
                    type="text"
                    placeholder="Card Number"
                    className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-4 py-3 text-xs text-[#1C1917] focus:outline-none"
                    disabled
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-4 py-3 text-xs text-[#1C1917] focus:outline-none"
                      disabled
                    />
                    <input
                      type="password"
                      placeholder="CVV"
                      className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-4 py-3 text-xs text-[#1C1917] focus:outline-none"
                      disabled
                    />
                  </div>
                  <span className="text-[10px] text-[#8E8B85] block">
                    Card payments disabled in sandbox demo. Please select UPI or Cash on Delivery.
                  </span>
                </div>
              )}

              {/* COD Tab Body */}
              {paymentMethod === 'cod' && (
                <div className="bg-[#FFF8F0] border border-[#FFE1C2] rounded-2xl p-4 flex gap-3 items-center animate-fadeIn">
                  <Banknote className="w-5 h-5 text-[#B76E00] shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-[#B76E00] uppercase tracking-wide">
                      Cash on Delivery
                    </h4>
                    <p className="text-[11px] text-[#B76E00] leading-relaxed mt-0.5">
                      Please hand exact cash of <strong>₹{totalPayable}</strong> to the rider upon delivery.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): ATTRACTIVE ORDER SUMMARY WITH ITEM IMAGES */}
          <div className="col-span-5 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs">
              {/* Order Summary Header */}
              <div className="flex justify-between items-center pb-4 border-b border-[#F5F0E8] mb-4">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#1C1917]">
                    Order Summary
                  </h3>
                  <span className="text-[10px] text-[#8E8B85] font-semibold">
                    {totalItemsCount} items · {uniqueVendorsCount} stalls
                  </span>
                </div>
                <span className="bg-[#FAF0ED] text-[#D94A38] text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-[#FCE8E6]">
                  1 Consolidated Order
                </span>
              </div>

              {/* Savings Highlight Badge */}
              {estimatedSavings > 0 && (
                <div className="bg-gradient-to-r from-[#FAF0ED] to-[#FFF8F0] border border-[#FCE8E6] rounded-2xl p-3 mb-4 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#D94A38] text-white flex items-center justify-center shrink-0 shadow-3xs">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] text-[#1C1917] leading-tight">
                    <span className="font-extrabold text-[#D94A38]">Saving ₹{estimatedSavings}</span> on delivery fee!
                    <span className="block text-[10px] text-[#8E8B85] mt-0.5">
                      Single rider delivers from all {uniqueVendorsCount} stalls.
                    </span>
                  </div>
                </div>
              )}

              {/* Rich Food Items List with Images */}
              <div className="space-y-3.5 mb-5 max-h-[290px] overflow-y-auto pr-1">
                {cartItems.map((item) => {
                  const fallback = getFoodFallbackImage(item.name, item.stallName || item.vendorName);
                  const displayImg = item.image && item.image.trim() !== '' ? item.image : fallback;

                  return (
                    <div
                      key={`${item.vendorId}-${item.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] border border-[#EAE4DA]/80 transition-colors"
                    >
                      {/* Food Item Image with Veg Badge & Quantity */}
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#EAE4DA] bg-white shadow-3xs">
                        <img
                          src={displayImg}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = fallback;
                          }}
                        />
                        {/* Veg Green Dot Badge */}
                        <div className="absolute top-1 left-1 w-3 h-3 rounded bg-white/90 backdrop-blur-xs flex items-center justify-center border border-[#137333]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#137333]" />
                        </div>
                        {/* Quantity Pill Badge */}
                        <div className="absolute bottom-1 right-1 bg-[#1C1917]/80 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">
                          x{item.quantity}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-[#1C1917] truncate leading-snug">
                          {item.name}
                        </h4>

                        {/* Stall Name Tag */}
                        <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold text-[#8E8B85] truncate">
                          <Store className="w-2.5 h-2.5 text-[#D94A38] shrink-0" />
                          <span className="truncate uppercase tracking-wide">
                            {item.stallName || item.vendorName}
                          </span>
                        </div>

                        {/* Quantity × Unit Price Calculation */}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-[#8E8B85]">
                            ₹{item.price} × {item.quantity}
                          </span>
                          <span className="font-black text-xs text-[#1C1917]">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bill Details */}
              <div className="space-y-2 text-xs text-[#5C5954] pt-3 border-t border-[#F5F0E8] mb-4">
                <div className="flex justify-between">
                  <span>Item Total ({uniqueVendorsCount} stalls)</span>
                  <span className="font-semibold text-[#1C1917]">₹{itemSubtotal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span>Delivery Fee</span>
                    <span className="text-[9px] font-extrabold text-[#2E7D32] bg-[#E6F4EA] px-1.5 py-0.2 rounded border border-[#A7E1BA]">
                      Consolidated
                    </span>
                  </div>
                  <span className="font-semibold text-[#1C1917]">₹{deliveryFee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (5% GST)</span>
                  <span className="font-semibold text-[#1C1917]">₹{gstAmount}</span>
                </div>
              </div>

              {/* Grand Total & Action */}
              <div className="pt-3 border-t border-[#F5F0E8] space-y-4">
                <div className="flex justify-between items-baseline font-bold text-[#1C1917]">
                  <span className="text-xs uppercase tracking-wider text-[#8E8B85]">To Pay</span>
                  <span className="text-2xl font-black text-[#D94A38]">₹{totalPayable}</span>
                </div>

                <button
                  onClick={handlePay}
                  className="w-full bg-gradient-to-r from-[#D94A38] to-[#C43D2E] hover:from-[#C43D2E] hover:to-[#B33527] text-white font-extrabold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer border-0 active:scale-[0.99]"
                >
                  <Lock className="w-4 h-4" />
                  <span>Pay ₹{totalPayable} via {paymentMethod.toUpperCase()}</span>
                </button>

                <div className="flex items-center justify-center gap-2 text-[10px] text-[#8E8B85] font-semibold text-center pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>100% Secure Checkout · Live Rider Dispatch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MOBILE VIEW ─── */}
      <div className="md:hidden block bg-[#FAF7F2] min-h-screen pb-36">
        {/* Mobile Header */}
        <div className="flex items-center gap-4 py-3.5 px-4 bg-white border-b border-[#EAE4DA] sticky top-0 z-30 shadow-3xs">
          <button
            onClick={() => onNavigate('cart')}
            className="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#1C1917]" />
          </button>
          <div className="text-center flex-1">
            <span className="font-extrabold text-xs text-[#1C1917] uppercase tracking-wider block">
              Checkout
            </span>
            <span className="text-[10px] font-bold text-[#D94A38]">
              {displayKhauGalliName}
            </span>
          </div>
          <div className="w-9 h-9 opacity-0" />
        </div>

        <div className="p-4 space-y-4">
          {/* Mobile Headline */}
          <div>
            <span className="text-[9px] font-extrabold text-[#D94A38] uppercase tracking-widest bg-[#FAF0ED] px-2 py-0.5 rounded-sm border border-[#FCE8E6]">
              CONFIRM ORDER
            </span>
            <h1 className="text-2xl font-extrabold text-[#1C1917] mt-1">
              Almost there!
            </h1>
            <p className="text-xs text-[#8E8B85] font-semibold mt-0.5">
              {totalItemsCount} items · {uniqueVendorsCount} stalls · ETA {selectedAddress.eta}
            </p>
          </div>

          {/* Delivery Address Card (Mobile) */}
          <div className="bg-white rounded-2xl border border-[#EAE4DA] p-4 shadow-3xs flex flex-col gap-3">
            {!isChangingAddress && (
              <div className="flex justify-between items-baseline">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                  Delivery Address
                </h3>
                <button
                  onClick={() => setIsChangingAddress(true)}
                  className="text-[10px] text-[#D94A38] font-bold bg-transparent border-0 p-0 cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}

            {isChangingAddress ? (
              renderAddressSelection()
            ) : (
              <div className="flex gap-3 items-start animate-fadeIn">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0ED] border border-[#FCE8E6] flex items-center justify-center text-[#D94A38] shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h4 className="text-xs font-bold text-[#1C1917]">{selectedAddress.title}</h4>
                    {selectedAddress.isPrimary && (
                      <span className="bg-[#FAF0ED] text-[#D94A38] text-[8px] font-black uppercase px-1.5 py-0.2 rounded-sm border border-[#FCE8E6]">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#8E8B85] leading-normal">{selectedAddress.detail}</p>
                </div>
              </div>
            )}
          </div>

          {/* Attractive Mobile Order Summary Items */}
          <div className="bg-white rounded-2xl border border-[#EAE4DA] p-4 shadow-3xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#F5F0E8]">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917]">
                Items In Cart ({totalItemsCount})
              </h3>
              <span className="text-[9px] font-bold text-[#D94A38] bg-[#FAF0ED] px-2 py-0.5 rounded-full">
                {uniqueVendorsCount} Stalls
              </span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
              {cartItems.map((item) => {
                const fallback = getFoodFallbackImage(item.name, item.stallName || item.vendorName);
                const displayImg = item.image && item.image.trim() !== '' ? item.image : fallback;

                return (
                  <div
                    key={`${item.vendorId}-${item.id}`}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FAF7F2] border border-[#EAE4DA]"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-[#EAE4DA] relative bg-white">
                      <img src={displayImg} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[8px] font-black px-1 rounded">
                        x{item.quantity}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#1C1917] truncate">{item.name}</h4>
                      <span className="text-[9px] text-[#8E8B85] uppercase tracking-wide block truncate">
                        {item.stallName || item.vendorName}
                      </span>
                    </div>

                    <span className="font-extrabold text-xs text-[#1C1917]">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bill Summary (Mobile) */}
          <div className="bg-white rounded-2xl border border-[#EAE4DA] p-4 text-xs space-y-2 shadow-3xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1917] pb-2 border-b border-[#F5F0E8]">
              Bill Summary
            </h3>
            <div className="flex justify-between text-[#8E8B85]">
              <span>Item Total ({uniqueVendorsCount} stalls)</span>
              <span className="font-semibold text-[#1C1917]">₹{itemSubtotal}</span>
            </div>
            <div className="flex justify-between text-[#8E8B85]">
              <span>Delivery Fee</span>
              <span className="font-semibold text-[#1C1917]">₹{deliveryFee}</span>
            </div>
            <div className="flex justify-between text-[#8E8B85]">
              <span>Taxes (5% GST)</span>
              <span className="font-semibold text-[#1C1917]">₹{gstAmount}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#F5F0E8] text-[#1C1917] font-bold">
              <span>Total Payable</span>
              <span className="text-sm font-black text-[#D94A38]">₹{totalPayable}</span>
            </div>
          </div>

          {/* Payment Method Selector (Mobile) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8B85]">
              Payment method
            </h3>
            <div
              className={`p-3.5 rounded-2xl border bg-white flex flex-col gap-2.5 transition-all ${
                paymentMethod === 'upi' ? 'border-[#D94A38] shadow-3xs' : 'border-[#EAE4DA]'
              }`}
            >
              <label
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setPaymentMethod('upi')}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    paymentMethod === 'upi'
                      ? 'border-[#D94A38] bg-[#D94A38] text-white'
                      : 'border-[#DCD6CC]'
                  }`}
                >
                  {paymentMethod === 'upi' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#1C1917]">UPI · Instant</span>
                    <span className="bg-[#FAF0ED] text-[#D94A38] text-[8px] font-extrabold tracking-wide uppercase px-1.5 py-0.2 rounded">
                      Recommended
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8E8B85] block mt-0.5">
                    GPay · PhonePe · Paytm · BHIM
                  </span>
                </div>
              </label>
            </div>

            <div
              className={`p-3.5 rounded-2xl border bg-white flex flex-col gap-2.5 transition-all ${
                paymentMethod === 'cod' ? 'border-[#D94A38] shadow-3xs' : 'border-[#EAE4DA]'
              }`}
            >
              <label
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setPaymentMethod('cod')}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    paymentMethod === 'cod'
                      ? 'border-[#D94A38] bg-[#D94A38] text-white'
                      : 'border-[#DCD6CC]'
                  }`}
                >
                  {paymentMethod === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#1C1917] block">Cash on delivery</span>
                  <span className="text-[10px] text-[#8E8B85] block mt-0.5">
                    Pay ₹{totalPayable} in cash to rider
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Fixed Mobile Bottom Checkout Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EAE4DA] p-4 z-40 shadow-xl flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8E8B85] uppercase tracking-wider font-bold">
              Total to pay
            </span>
            <span className="text-xl font-black text-[#D94A38]">₹{totalPayable}</span>
          </div>
          <button
            onClick={handlePay}
            className="flex-1 py-3.5 bg-gradient-to-r from-[#D94A38] to-[#C43D2E] text-white text-xs font-black rounded-2xl flex items-center justify-center gap-1.5 shadow-sm border-0 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Pay via {paymentMethod === 'upi' ? 'UPI' : 'Cash'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
