import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Info,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface CheckoutProps {
  clusterName?: string;
  onNavigate?: (tab: string) => void;
  onConfirmOrder?: (placedItems: any[], paymentMethod: string) => void;
}

const MOCK_ADDRESSES = [
  { id: '1', title: 'Home', detail: '123, B Block, Navrangpura, Ahmedabad, Gujarat 380009', isPrimary: true, distance: '3.42 km', eta: '22–28 min' },
  { id: '2', title: 'Office', detail: '45, SG Highway, Prahlad Nagar, Ahmedabad, Gujarat 380015', isPrimary: false, distance: '8.1 km', eta: '35–45 min' },
];

export const Checkout: React.FC<CheckoutProps> = ({
  clusterName = 'Manek Chowk',
  onNavigate = () => { },
  onConfirmOrder = () => { },
}) => {
  const { cartItems } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cod'>('upi');
  const [selectedUpiProvider, setSelectedUpiProvider] = useState<string>('gpay');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');

  const [selectedAddressId, setSelectedAddressId] = useState<string>(MOCK_ADDRESSES.find(a => a.isPrimary)?.id || '1');
  const [isChangingAddress, setIsChangingAddress] = useState(false);
  const selectedAddress = MOCK_ADDRESSES.find(a => a.id === selectedAddressId) || MOCK_ADDRESSES[0];

  const itemSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const uniqueVendorsCount = new Set(cartItems.map(i => i.vendorId)).size;
  const deliveryFee = cartItems.length > 0 ? (25 + (uniqueVendorsCount > 1 ? (uniqueVendorsCount - 1) * 5 : 0)) : 0;
  const gstAmount = Math.round(itemSubtotal * 0.05 * 10) / 10;
  const totalPayable = Math.round((itemSubtotal + deliveryFee + gstAmount) * 10) / 10;

  const handlePay = () => {
    onConfirmOrder(cartItems, paymentMethod === 'upi' ? `UPI (${selectedUpiProvider.toUpperCase()})` : paymentMethod.toUpperCase());
  };

  const renderAddressSelection = () => (
    <div className="space-y-3 mt-4 animate-fadeIn">
      {MOCK_ADDRESSES.map((addr) => (
        <label
          key={addr.id}
          className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer transition-colors ${selectedAddressId === addr.id ? 'border-[#D94A38] bg-[#FAF7F2]' : 'border-[#EAE4DA] bg-white hover:border-[#DCD6CC]'}`}
          onClick={() => {
            setSelectedAddressId(addr.id);
            setIsChangingAddress(false);
          }}
        >
          <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedAddressId === addr.id ? 'border-[#D94A38] bg-[#D94A38]' : 'border-[#DCD6CC]'}`}>
            {selectedAddressId === addr.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-sm text-[#1C1917]">{addr.title}</span>
              {addr.isPrimary && <span className="bg-[#FCE8E6] text-[#D94A38] text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-1"><CheckCircle2 className="w-2 h-2" /> Primary</span>}
            </div>
            <p className="text-xs text-[#8E8B85] leading-snug">{addr.detail}</p>
          </div>
        </label>
      ))}
      <button onClick={() => setIsChangingAddress(false)} className="text-xs font-bold text-[#8E8B85] underline mt-2 bg-transparent border-0 cursor-pointer">Cancel</button>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      {/* ─── DESKTOP VIEW ─── */}
      <div className="hidden md:block">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-xs text-[#8E8B85]">
            <button onClick={() => onNavigate('cart')} className="hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0">Cart</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1C1917] font-semibold">Checkout</span>
          </div>
          <span className="text-[10px] font-bold text-[#8E8B85] tracking-wider uppercase bg-[#FAF7F2] border border-[#EAE4DA] px-3 py-1 rounded-full">
            KHAU GALLI · {clusterName.toUpperCase().replace(' ', '_')}
          </span>
        </div>

        <div className="mb-6">
          <span className="text-[10px] font-extrabold tracking-widest text-[#8E8B85] uppercase block mb-1">
            STEP 3 OF 3 · CONFIRM ORDER
          </span>
          <h1 className="text-4xl font-bold text-[#1C1917]">
            One receipt. <span className="text-[#D94A38] font-semibold">Split six ways.</span>
          </h1>
        </div>

        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-8 space-y-6">
            {/* Delivery address Card */}
            <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#1C1917]">Delivery</h3>
                {!isChangingAddress && (
                  <button onClick={() => setIsChangingAddress(true)} className="text-xs text-[#D94A38] font-bold hover:underline bg-transparent border-0 cursor-pointer p-0">
                    Change address →
                  </button>
                )}
              </div>

              {isChangingAddress ? (
                renderAddressSelection()
              ) : (
                <div className="flex gap-4 items-start animate-fadeIn">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center text-[#D94A38] shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#1C1917]">{selectedAddress.title}</h4>
                      {selectedAddress.isPrimary && <span className="bg-[#FCE8E6] text-[#D94A38] text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-1"><CheckCircle2 className="w-2 h-2" /> Primary</span>}
                    </div>
                    <p className="text-xs text-[#8E8B85] leading-normal">{selectedAddress.detail}</p>
                    <div className="flex gap-2 pt-1">
                      <span className="bg-[#FAF7F2] border border-[#EAE4DA] text-[#4B5563] text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {selectedAddress.distance}
                      </span>
                      <span className="bg-[#FAF7F2] border border-[#EAE4DA] text-[#4B5563] text-[10px] font-bold px-2 py-0.5 rounded-md">
                        ETA {selectedAddress.eta}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-[#F5F0E8]">
                <label className="text-[10px] font-bold text-[#8E8B85] uppercase tracking-wider block mb-1.5">
                  Delivery notes for the rider
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="floor, gate colour..."
                  className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-4 py-3 text-xs text-[#1C1917] placeholder-[#A09B90] focus:outline-none focus:ring-1 focus:ring-[#D94A38] transition-all"
                />
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs">
              <div className="flex justify-between items-baseline mb-5">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#1C1917]">Payment method</h3>
                <span className="text-sm font-black text-[#1C1917]">₹{totalPayable}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-1 bg-[#FAF7F2] border border-[#EAE4DA] rounded-2xl mb-5">
                {(['upi', 'card', 'cod'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${paymentMethod === method
                      ? 'bg-white text-[#1C1917] shadow-3xs font-extrabold'
                      : 'text-[#8E8B85] hover:text-[#1C1917] bg-transparent'
                      }`}
                  >
                    {method === 'upi' ? 'UPI · Instant' : method === 'card' ? 'Card' : 'Cash on Delivery'}
                  </button>
                ))}
              </div>

              {paymentMethod === 'upi' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'gpay', name: 'Google Pay', handle: 'gpay@okicici' },
                      { id: 'phonepe', name: 'PhonePe', handle: 'riya@ybl' },
                      { id: 'paytm', name: 'Paytm', handle: '9098-payments' },
                      { id: 'bhim', name: 'BHIM UPI', handle: 'bhim@upi' },
                    ].map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedUpiProvider(provider.id)}
                        className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all cursor-pointer bg-white ${selectedUpiProvider === provider.id
                          ? 'border-[#D94A38] shadow-3xs'
                          : 'border-[#EAE4DA] hover:border-[#DCD6CC]'
                          }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-[#1C1917] block">{provider.name}</span>
                          <span className="text-[10px] text-[#8E8B85]">{provider.handle}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedUpiProvider === provider.id ? 'border-[#D94A38] bg-[#D94A38] text-white' : 'border-[#DCD6CC]'
                          }`}>
                          {selectedUpiProvider === provider.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#F4F9FF] border border-[#D0E2FF] rounded-2xl p-4 flex gap-3">
                    <Info className="w-4 h-4 text-[#0043CE] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#0043CE] uppercase tracking-wide">Sandbox mode active</h4>
                      <p className="text-[11px] text-[#0043CE] leading-relaxed mt-0.5">
                        UPI runs on the Razorpay/PayU sandbox. No real money moves. On payment success, the backend atomically increments payouts using MongoDB Mongoose <code>$inc</code> operators.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="space-y-3 py-2">
                  <input type="text" placeholder="Card Number" className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-4 py-3 text-xs text-[#1C1917] focus:outline-none" disabled />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="MM/YY" className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-4 py-3 text-xs text-[#1C1917] focus:outline-none" disabled />
                    <input type="password" placeholder="CVV" className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-4 py-3 text-xs text-[#1C1917] focus:outline-none" disabled />
                  </div>
                  <span className="text-[10px] text-[#8E8B85] block">Card payments are disabled in mock demo mode. Please use UPI or Cash on Delivery.</span>
                </div>
              )}

              {paymentMethod === 'cod' && (
                <div className="bg-[#FFF8F0] border border-[#FFE1C2] rounded-2xl p-4 flex gap-3">
                  <Info className="w-4 h-4 text-[#B76E00] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#B76E00] uppercase tracking-wide">Rider collects cash</h4>
                    <p className="text-[11px] text-[#B76E00] leading-relaxed mt-0.5">
                      Please pay the rider the exact amount of <strong>₹{totalPayable}</strong> upon delivery.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#1C1917] pb-4 border-b border-[#F5F0E8] mb-4">Order summary</h3>
              <div className="space-y-4 mb-4 pb-4 border-b border-[#F5F0E8] max-h-[160px] overflow-y-auto no-scrollbar">
                {cartItems.map((item) => (
                  <div key={`${item.vendorId}-${item.id}`} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-[#1C1917] block">{item.name} x {item.quantity}</span>
                      <span className="text-[9px] text-[#8E8B85] uppercase tracking-wide">{item.vendorName}</span>
                    </div>
                    <span className="font-bold text-[#1C1917]">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-xs text-[#5C5954] mb-4">
                <div className="flex justify-between">
                  <span>Item Total ({uniqueVendorsCount} stalls)</span>
                  <span className="font-semibold text-[#1C1917]">₹{itemSubtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-[#1C1917]">₹{deliveryFee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (5% GST)</span>
                  <span className="font-semibold text-[#1C1917]">₹{gstAmount}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-[#F5F0E8] space-y-4">
                <div className="flex justify-between items-baseline font-bold text-[#1C1917]">
                  <span className="text-xs uppercase tracking-wider">Grand total</span>
                  <span className="text-xl">₹{totalPayable}</span>
                </div>
                <button onClick={handlePay} className="w-full bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold text-sm py-4 rounded-2xl flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer border-0">
                  <span>Pay via {paymentMethod.toUpperCase()}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MOBILE VIEW ─── */}
      <div className="md:hidden block bg-[#FAF7F2] min-h-screen pb-32">
        <div className="flex items-center gap-4 py-4 px-4 bg-white border-b border-[#EAE4DA] sticky top-0 z-30">
          <button onClick={() => onNavigate('cart')} className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center cursor-pointer">
            <ArrowLeft className="w-4 h-4 text-[#1C1917]" />
          </button>
          <span className="font-extrabold text-sm text-[#1C1917] uppercase tracking-wider mx-auto">Checkout</span>
          <div className="w-8 h-8 opacity-0" />
        </div>

        <div className="p-4 space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1C1917]">Almost there</h1>
            <p className="text-xs text-[#8E8B85] font-semibold mt-0.5">{clusterName} · {new Set(cartItems.map(i => i.vendorId)).size} stalls · ETA {selectedAddress.eta}</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#EAE4DA] p-4 shadow-3xs flex flex-col gap-3">
            {!isChangingAddress && (
              <div className="flex justify-between items-baseline">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">Delivery</h3>
                <button onClick={() => setIsChangingAddress(true)} className="text-[10px] text-[#D94A38] font-bold bg-transparent border-0 p-0 cursor-pointer">Change</button>
              </div>
            )}

            {isChangingAddress ? (
              renderAddressSelection()
            ) : (
              <div className="flex gap-3 items-start animate-fadeIn">
                <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center text-[#D94A38] shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h4 className="text-xs font-bold text-[#1C1917]">{selectedAddress.title}</h4>
                    {selectedAddress.isPrimary && <span className="bg-[#FCE8E6] text-[#D94A38] text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-1"><CheckCircle2 className="w-2 h-2" /> Primary</span>}
                  </div>
                  <p className="text-[10px] text-[#8E8B85] leading-normal">{selectedAddress.detail}</p>
                </div>
              </div>
            )}
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
              <span className="text-sm">₹{totalPayable}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8B85]">Payment method</h3>
            <div className={`p-4 rounded-2xl border bg-white flex flex-col gap-3 transition-all ${paymentMethod === 'upi' ? 'border-[#D94A38] shadow-3xs' : 'border-[#EAE4DA]'}`}>
              <label className="flex items-center gap-3 cursor-pointer" onClick={() => setPaymentMethod('upi')}>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${paymentMethod === 'upi' ? 'border-[#D94A38] bg-[#D94A38] text-white' : 'border-[#DCD6CC]'}`}>
                  {paymentMethod === 'upi' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#1C1917]">UPI · Instant</span>
                    <span className="bg-[#FCE8E6] text-[#D94A38] text-[8px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded-xs">Recommended</span>
                  </div>
                  <span className="text-[10px] text-[#8E8B85] block mt-0.5">GPay · PhonePe · Paytm · BHIM</span>
                </div>
              </label>
              {paymentMethod === 'upi' && (
                <div className="flex gap-2 pt-2 border-t border-[#F5F0E8] overflow-x-auto no-scrollbar">
                  <button onClick={() => setSelectedUpiProvider('gpay')} className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold shrink-0 cursor-pointer ${selectedUpiProvider === 'gpay' ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-[#FAF7F2] text-[#4B5563] border-[#EAE4DA]'}`}>
                    rahul@okhdfcbank
                  </button>
                  <button onClick={() => setSelectedUpiProvider('new')} className="px-3 py-1.5 rounded-lg border border-[#EAE4DA] bg-white text-[#4B5563] text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer">
                    + New UPI
                  </button>
                </div>
              )}
            </div>

            <div className={`p-4 rounded-2xl border bg-white flex flex-col gap-3 transition-all ${paymentMethod === 'cod' ? 'border-[#D94A38] shadow-3xs' : 'border-[#EAE4DA]'}`}>
              <label className="flex items-center gap-3 cursor-pointer" onClick={() => setPaymentMethod('cod')}>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${paymentMethod === 'cod' ? 'border-[#D94A38] bg-[#D94A38] text-white' : 'border-[#DCD6CC]'}`}>
                  {paymentMethod === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#1C1917]">Cash on delivery</span>
                    <span className="bg-[#FAF7F2] border border-[#EAE4DA] text-[#8E8B85] text-[8px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded-xs">Rider collects</span>
                  </div>
                  <span className="text-[10px] text-[#8E8B85] block mt-0.5">Pay ₹{totalPayable} to rider. Adds to their codDebt.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EAE4DA] p-4 z-40 shadow-xl flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8E8B85] uppercase tracking-wider font-bold">Total price</span>
            <span className="text-lg font-black text-[#1C1917]">₹{totalPayable}</span>
          </div>
          <button onClick={handlePay} className="flex-1 py-3.5 bg-[#D94A38] text-white text-xs font-black rounded-full flex items-center justify-center shadow-xs border-0 cursor-pointer">
            <span>Pay via {paymentMethod === 'upi' ? 'UPI' : 'COD'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
