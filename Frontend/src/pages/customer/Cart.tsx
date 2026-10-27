import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Minus,
  ChevronRight,
  Info,
  ShoppingBag,
  Store
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useCart } from '../../context/CartContext';
import { clusterService } from '../../services/clusterService';
import type { CartItem } from '../../types';

export const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, addToCart, removeFromCart, clearCart, activeKhauGalli } = useCart();
  const [stallImages, setStallImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    clusterService.getClusters().then((res) => {
      if (isMounted && res.success && res.data) {
        const map: Record<string, string> = {};
        res.data.forEach((cluster) => {
          (cluster.stalls || []).forEach((stall: any) => {
            const sid = String(stall.id || stall._id || '');
            if (stall.image_url) {
              if (sid) map[sid] = stall.image_url;
              if (stall.name) {
                map[stall.name.toLowerCase().trim()] = stall.image_url;
              }
            }
          });
        });
        setStallImages(map);
      }
    }).catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  const currentKhauGalliName = activeKhauGalli?.name || cartItems[0]?.khauGalliName || 'Khau Galli';
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Group items by vendorId
  const vendorGroups = cartItems.reduce<Record<string, { vendorName: string; items: CartItem[] }>>((acc, item) => {
    if (!acc[item.vendorId]) {
      acc[item.vendorId] = {
        vendorName: item.vendorName,
        items: []
      };
    }
    acc[item.vendorId].items.push(item);
    return acc;
  }, {});

  const vendorIds = Object.keys(vendorGroups);
  const gstAmount = Math.round(totalCartPrice * 0.05 * 10) / 10;
  const toPayTotal = Math.round((totalCartPrice + gstAmount) * 10) / 10;

  // Calculate savings vs. normal aggregators: (number of vendors - 1) * 45
  const aggregatorSavings = vendorIds.length > 1 ? (vendorIds.length - 1) * 45 : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      {/* ─── DESKTOP VIEW ─── */}
      <div className="hidden md:block">
        {/* Header Breadcrumbs & Details */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-xs text-[#8E8B85]">
            <button onClick={() => navigate('/home')} className="hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0">Discover</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <button onClick={() => navigate('/stalls')} className="hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0">{currentKhauGalliName}</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1C1917] font-semibold">Consolidated cart</span>
          </div>

          <div className="flex items-center gap-3">
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1 rounded-full transition-colors cursor-pointer"
              >
                Clear Cart
              </button>
            )}
            <div className="text-label text-[10px] text-[#8E8B85] bg-white border border-[#EAE4DA] px-3.5 py-1 rounded-full font-bold tracking-wider uppercase">
              <b>{totalItemsCount}</b> ITEMS · <b>{vendorIds.length}</b> STALLS · 1 DELIVERY
            </div>
          </div>
        </div>

        {/* Empty Cart State */}
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EAE4DA] p-12 text-center shadow-3xs max-w-xl mx-auto my-8">
            <ShoppingBag className="w-16 h-16 stroke-[1.2] text-[#DCD6CC] mx-auto mb-4" />
            <h2 className=" text-2xl font-bold text-[#1C1917] mb-2">Your cart is empty</h2>
            <p className="text-sm text-[#8E8B85] mb-6 leading-relaxed">
              Add delicious food from different stalls in this Khau Galli and pay only one consolidated delivery fee!
            </p>
            <button
              onClick={() => navigate('/stalls')}
              className="bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer border-0"
            >
              Go to Stalls near me
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8 items-start">
            {/* Left Column: Suborders list */}
            <div className="col-span-8 space-y-6">
              {/* Header Headline */}
              <h1 className="text-4xl font-semibold text-[#1C1917] tracking-tight">
                Your cart, <span className="text-[#D94A38] font-semibold">forked cleanly.</span>
              </h1>

              {/* List of Suborders */}
              <div className="space-y-6">
                {vendorIds.map((vendorId, groupIdx) => {
                  const group = vendorGroups[vendorId];
                  const stallImageUrl = stallImages[vendorId] || stallImages[group.vendorName.toLowerCase().trim()] || group.items.find(it => it.stallImage)?.stallImage || '';

                  return (
                    <div key={vendorId} className="bg-white rounded-3xl border border-[#EAE4DA] p-5 shadow-3xs space-y-4">
                      {/* Vendor Header */}
                      <div className="flex justify-between items-center p-3 border-b border-[#FAF7F2] bg-[#faf7f2]">
                        <div className="flex items-center gap-3">
                          {stallImageUrl ? (
                            <img
                              src={stallImageUrl}
                              alt={group.vendorName}
                              className="w-10 h-10 rounded-2xl object-cover border border-[#EAE4DA] shadow-3xs shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center shrink-0 shadow-3xs text-[#D94A38]">
                              <Store className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-sm text-[#1C1917]">{group.vendorName}</h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-[#8E8B85] uppercase tracking-wider bg-[#FAF7F2] border border-[#EAE4DA] px-2.5 py-1 rounded-md select-none">
                            SUB-ORDER · {groupIdx + 1}
                          </span>
                        </div>
                      </div>

                      {/* Vendor Items */}
                      <div className="divide-y divide-[#F5F0E8]">
                        {group.items.map((item) => {
                          const itemImg = item.image && item.image.trim() !== '' ? item.image : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop';
                          return (
                            <div key={item.id} className="py-3 flex justify-between items-center gap-3">
                              <div className="flex items-center gap-3 text-xs flex-1 min-w-0">
                                <img
                                  src={itemImg}
                                  alt={item.name}
                                  className="w-11 h-11 rounded-xl object-cover border border-[#EAE4DA] shadow-3xs shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="font-bold text-[#1C1917] block truncate">{item.name}</span>
                                  <span className="text-[10px] text-[#8E8B85]">₹{item.price} each</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 bg-[#FAF7F2] border border-[#EAE4DA] rounded-md px-1.5 py-0.5">
                                  <button
                                    onClick={() => removeFromCart(item.id, item.vendorId)}
                                    className="text-[#8E8B85] hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="font-bold text-[#1C1917] text-xs w-4 text-center">{item.quantity}</span>
                                  <button
                                    onClick={() => addToCart(item)}
                                    className="text-[#8E8B85] hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="font-bold text-xs text-[#1C1917] min-w-[45px] text-right">
                                  ₹{item.price * item.quantity}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add more button */}
              <button
                onClick={() => navigate('/stalls')}
                className="w-full bg-transparent hover:bg-[#FAF7F2] border border-dashed border-[#8E8B85]/60 hover:border-[#D94A38] text-[#4B5563] hover:text-[#D94A38] font-bold text-xs py-3.5 rounded-2xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>+ Add more items from {currentKhauGalliName}</span>
              </button>
            </div>

            {/* Right Column: Checkout Billing & Fork Preview */}
            <div className="col-span-4 space-y-6">
              {/* Billing Info */}
              <div className="bg-white rounded-3xl border border-[#EAE4DA] p-5 shadow-3xs space-y-4">
                <h3 className="font-semibold text-lg text-[#1C1917] pb-3 border-b border-[#F5F0E8]">
                  Bill
                </h3>
                <div className="space-y-2 text-xs text-[#5C5954]">
                  <div className="flex justify-between">
                    <span>Item subtotal ({vendorIds.length} {vendorIds.length === 1 ? 'stall' : 'stalls'})</span>
                    <span className="font-semibold text-[#1C1917]">₹{totalCartPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes (5% GST)</span>
                    <span className="font-semibold text-[#1C1917]">₹{gstAmount}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-[#8E8B85]">Delivery fee</span>
                    <span className="text-[#D94A38] font-bold bg-[#FAF0ED] px-2 py-0.5 rounded-md border border-[#FCE8E6]">
                      Calculated at checkout
                    </span>
                  </div>

                  <div className="flex justify-between pt-3 border-t border-[#F5F0E8] text-[#1C1917] font-bold text-sm">
                    <span>Total (excl. delivery)</span>
                    <span className="text-lg">₹{toPayTotal}</span>
                  </div>
                </div>

                {/* Savings box */}
                {aggregatorSavings > 0 && (
                  <div className="bg-[#FAF0ED] border border-[#FCE8E6] rounded-xl p-3 text-[10px] text-[#C43D2E] leading-normal flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-[#D94A38] shrink-0 mt-0.5" />
                    <span>
                      <strong>Saving ₹{aggregatorSavings}</strong> vs aggregators charging separate delivery per stall.
                    </span>
                  </div>
                )}

                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold text-xs py-3.5 rounded-xl flex items-center justify-between px-5 shadow-xs hover:shadow-md transition-all cursor-pointer border-0"
                >
                  <span>Proceed to checkout</span>
                  <span className="text-sm font-black">₹{toPayTotal}</span>
                </button>
              </div>

              {/* Fork Preview Drawer */}
              <div className="bg-[#FAF8F5] border border-[#EAE4DA] rounded-3xl p-5 shadow-3xs space-y-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#8E8B85]">
                    Fork preview
                  </h3>
                  <span className="text-[10px] text-[#8E8B85] font-semibold">on checkout</span>
                </div>

                <div className="space-y-4 text-[11px] font-mono text-[#5C5954]">
                  <div>
                    <span className="text-label text-[9px] text-[#8E8B85] block font-bold mb-1">MainOrder</span>
                    <span className="bg-[#FAF7F2] border border-[#EFEAE1] px-2.5 py-1 rounded-md block">
                      MO-77213
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-label text-[9px] text-[#8E8B85] block font-bold mb-1">SubOrders</span>
                    {vendorIds.map((vendorId, idx) => {
                      const group = vendorGroups[vendorId];
                      return (
                        <div key={vendorId} className="flex justify-between items-center bg-[#FAF7F2] border border-[#EFEAE1] p-2 rounded-md">
                          <span>SubOrder-0{idx + 1} → {group.vendorName}</span>
                          <span className="text-[10px] text-[#8E8B85] font-bold">
                            {group.items.length} item(s)
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-[#8E8B85] leading-normal pt-2 border-t border-[#EFEAE1]">
                    On payment success, the backend groups line-items by vendorId and emits Socket.io events to each vendor room.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MOBILE VIEW ─── */}
      <div className="md:hidden block bg-[#FAF7F2] min-h-screen pb-24">
        {/* Header */}
        <div className="bg-white border-b border-[#EAE4DA] p-4 sticky top-0 z-30 flex items-center justify-between">
          <button onClick={() => navigate('/stalls')} className="w-10 h-10 rounded-full bg-[#FAF7F2] flex items-center justify-center border border-[#EAE4DA] cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-[#1C1917]" />
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-[#8E8B85]">Consolidated Cart</span>
        </div>

        {/* Empty State */}
        {cartItems.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShoppingBag className="w-12 h-12 stroke-[1.2] text-[#DCD6CC] mx-auto mb-3" />
            <h2 className="text-xl font-bold text-[#1C1917] mb-1">Your cart is empty</h2>
            <p className="text-xs text-[#8E8B85] mb-5 leading-relaxed">
              Add tasty street food to experience multi-stall order splitting!
            </p>
            <button
              onClick={() => navigate('/stalls')}
              className="bg-[#D94A38] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-xs cursor-pointer border-0"
            >
              Browse Stalls near me
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Header Title */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-[#1C1917] tracking-tight">Your cart</h1>
                <p className="text-xs text-[#8E8B85] font-semibold mt-0.5">
                  {totalItemsCount} items · {vendorIds.length} stalls · 1 delivery
                </p>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1 rounded-full transition-colors cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* List of Suborders */}
            <div className="space-y-4">
              {vendorIds.map((vendorId, groupIdx) => {
                const group = vendorGroups[vendorId];
                const stallImageUrl = stallImages[vendorId] || stallImages[group.vendorName.toLowerCase().trim()] || group.items.find(it => it.stallImage)?.stallImage || '';
                const subTotal = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

                return (
                  <div key={vendorId} className="bg-white border border-[#EAE4DA] rounded-2xl p-4 shadow-3xs space-y-3.5">
                    {/* Header */}
                    <div className="flex justify-between items-center p-2 border-b border-[#FAF7F2] bg-[#faf7f2]">
                      <div className="flex items-center gap-2.5">
                        {stallImageUrl ? (
                          <img
                            src={stallImageUrl}
                            alt={group.vendorName}
                            className="w-10 h-10 rounded-xl object-cover border border-[#EAE4DA] shadow-3xs shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center shrink-0 shadow-3xs text-[#D94A38]">
                            <Store className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-xs text-[#1C1917]">{group.vendorName}</h4>
                        </div>
                      </div>

                      <span className="text-[8px] font-bold text-[#8E8B85] uppercase tracking-wide bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#EAE4DA]">
                        Sub-order {groupIdx + 1}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                      {group.items.map((item) => {
                        const itemImg = item.image && item.image.trim() !== '' ? item.image : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop';
                        return (
                          <div key={item.id} className="flex justify-between items-center text-xs gap-2">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <img
                                src={itemImg}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover border border-[#EAE4DA] shrink-0"
                              />
                              <div className="min-w-0">
                                <span className="font-bold text-[#1C1917] block truncate">{item.name}</span>
                                <span className="text-[10px] text-[#8E8B85]">₹{item.price}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center gap-1.5 bg-[#FAF7F2] border border-[#EAE4DA] rounded-md px-1.5 py-0.5">
                                <button
                                  onClick={() => removeFromCart(item.id, item.vendorId)}
                                  className="text-[#8E8B85] hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-bold text-[#1C1917] text-[10px] w-3 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => addToCart(item)}
                                  className="text-[#8E8B85] hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="font-bold text-xs text-[#1C1917] min-w-[32px] text-right">
                                ₹{item.price * item.quantity}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer subtotal */}
                    <div className="pt-3 border-t border-[#FAF7F2] flex justify-between items-center text-[10px]">
                      <span className="text-[#8E8B85]">
                        Sub-total → forks to <strong className="text-[#1C1917] font-semibold">{group.vendorName}</strong>
                      </span>
                      <span className="font-bold text-[#D94A38]">₹{subTotal}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calculations List (Mobile) */}
            <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-[#8E8B85]">
                <span>Item Subtotal ({vendorIds.length} {vendorIds.length === 1 ? 'stall' : 'stalls'})</span>
                <span className="font-semibold text-[#1C1917]">₹{totalCartPrice}</span>
              </div>
              <div className="flex justify-between text-[#8E8B85]">
                <span>Taxes (5% GST)</span>
                <span className="font-semibold text-[#1C1917]">₹{gstAmount}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="text-[#8E8B85]">Delivery Fee</span>
                <span className="text-[#D94A38] font-bold bg-[#FAF0ED] px-2 py-0.5 rounded-md border border-[#FCE8E6]">
                  Calculated at checkout
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#FAF7F2] text-[#1C1917] font-bold text-sm">
                <span>Total (excl. delivery)</span>
                <span className="text-base">₹{toPayTotal}</span>
              </div>

              {aggregatorSavings > 0 && (
                <div className="pt-2 border-t border-[#FAF7F2] text-[10px] text-[#C43D2E] leading-normal flex items-start gap-1.5">
                  <Info className="w-3 h-3 text-[#D94A38] shrink-0 mt-0.5" />
                  <span>
                    Saving <strong>₹{aggregatorSavings}</strong> vs separate deliveries.
                  </span>
                </div>
              )}
            </div>

            {/* Sticky Mobile Checkout Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EAE4DA] p-4 z-40">
              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-[#D94A38] hover:bg-[#C43D2E] text-white py-3.5 px-6 rounded-2xl flex items-center justify-between shadow-lg font-bold text-sm cursor-pointer border-0"
              >
                <span>Proceed to checkout</span>
                <span className="text-[#FAF7F2] font-black">₹{toPayTotal}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
