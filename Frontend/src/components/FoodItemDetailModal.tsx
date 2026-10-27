import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  Star,
  Clock,
  ShieldCheck,
  Store,
  MapPin,
  UtensilsCrossed,
  Sparkles,
  Flame,
  Award
} from 'lucide-react';
import type { Dish } from '../data/mockData';

export interface FoodItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dish: Dish | null;
  stall: {
    id: string;
    name: string;
    stall_category?: string;
    rating?: number;
    cluster?: string;
    khauGalliId?: string;
    khauGalliName?: string;
    open_till?: string;
    since?: string;
    is_accepting_orders?: boolean;
  } | null;
  currentQuantity?: number;
  onAddToCart: (dish: Dish) => void;
  onRemoveFromCart: (dishId: string) => void;
}

export const FoodItemDetailModal: React.FC<FoodItemDetailModalProps> = ({
  isOpen,
  onClose,
  dish,
  stall,
  currentQuantity = 0,
  onAddToCart,
  onRemoveFromCart,
}) => {
  // Local quantity for adding if not yet in cart
  const [selectedQty, setSelectedQty] = useState<number>(1);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset local quantity whenever dish changes
  useEffect(() => {
    if (currentQuantity > 0) {
      setSelectedQty(currentQuantity);
    } else {
      setSelectedQty(1);
    }
  }, [dish, currentQuantity]);

  if (!isOpen || !dish) return null;

  const isAvailable = dish.is_available !== false;
  const isStallOpen = stall?.is_accepting_orders !== false;

  const handleIncrement = () => {
    if (currentQuantity > 0) {
      onAddToCart(dish);
    } else {
      setSelectedQty((prev) => Math.min(prev + 1, 15));
    }
  };

  const handleDecrement = () => {
    if (currentQuantity > 0) {
      onRemoveFromCart(dish.id);
    } else {
      setSelectedQty((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleAdd = () => {
    onAddToCart(dish);
  };

  const effectiveQty = currentQuantity > 0 ? currentQuantity : selectedQty;
  const totalPrice = dish.price * effectiveQty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#EAE4DA] z-10 flex flex-col my-auto animate-scaleUp">
        
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-stone-700 hover:text-[#D94A38] shadow-md border border-stone-200/80 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Image Container */}
        <div className="relative w-full h-64 sm:h-72 bg-stone-100 overflow-hidden shrink-0">
          {dish.image_url ? (
            <img
              src={dish.image_url}
              alt={dish.name}
              className={`w-full h-full object-cover ${
                !isAvailable ? 'grayscale opacity-60' : ''
              }`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-2">
              <UtensilsCrossed className="w-12 h-12" />
              <span className="text-xs font-bold uppercase tracking-wider">Street Delicacy</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-black/20" />

          {/* Badges Overlay on Top-Left */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 items-center">
            {/* Pure Veg Pill */}
            <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-xl shadow-xs flex items-center gap-1.5 border border-stone-200/80">
              <div className="w-3.5 h-3.5 border-2 border-emerald-600 rounded-sm flex items-center justify-center p-0.5">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
              </div>
              <span className="text-[11px] font-black text-emerald-800 tracking-wide uppercase">
                100% Pure Veg
              </span>
            </div>

            {/* Category Pill */}
            {dish.category && (
              <div className="bg-stone-900/85 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-xl shadow-xs border border-white/10 uppercase tracking-wider">
                {dish.category}
              </div>
            )}
          </div>

          {/* Status Overlay on Bottom */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
                Authentic Khau Galli Recipe
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                {dish.name}
              </h2>
            </div>
            <div className="bg-[#D94A38] text-white px-3.5 py-1.5 rounded-2xl font-black text-xl shadow-md border border-white/20 shrink-0">
              ₹{dish.price}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-6">

          {/* Stall & Khau Galli Attribution */}
          {stall && (
            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#EAE4DA] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white border border-[#EAE4DA] flex items-center justify-center shrink-0 shadow-3xs text-[#D94A38]">
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-[#1C1917] text-sm truncate">
                      {stall.name}
                    </h4>
                    {stall.rating ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {stall.rating}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[#8E8B85] truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#D94A38] shrink-0" />
                    <span>{stall.khauGalliName || stall.cluster || 'Khau Galli'}</span>
                    {stall.since && <span>• Est. {stall.since}</span>}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span
                  className={`inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    isStallOpen
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-stone-100 text-stone-500 border border-stone-200'
                  }`}
                >
                  {isStallOpen ? 'Accepting Orders' : 'Stall Closed'}
                </span>
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#1C1917] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D94A38]" />
              Dish Overview & Ingredients
            </h3>
            <p className="text-sm text-[#5C5954] leading-relaxed">
              {dish.description && dish.description.trim().length > 0
                ? dish.description
                : `Authentic street-style ${dish.name} prepared fresh on the tava with premium quality spices, pure butter, and fresh seasonal vegetables from the legendary stalls of Ahmedabad.`}
            </p>
          </div>

          {/* Quality & Taste Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EAE4DA] text-center">
              <Clock className="w-4 h-4 text-[#D94A38] mx-auto mb-1" />
              <span className="text-[10px] font-black text-[#1C1917] uppercase block">10-15 Min</span>
              <span className="text-[9px] text-[#8E8B85]">Prep Time</span>
            </div>
            <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EAE4DA] text-center">
              <Award className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <span className="text-[10px] font-black text-[#1C1917] uppercase block">FSSAI</span>
              <span className="text-[9px] text-[#8E8B85]">Quality Assured</span>
            </div>
            <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EAE4DA] text-center">
              <Flame className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <span className="text-[10px] font-black text-[#1C1917] uppercase block">Tava Fresh</span>
              <span className="text-[9px] text-[#8E8B85]">Cooked to Order</span>
            </div>
            <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EAE4DA] text-center">
              <ShieldCheck className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <span className="text-[10px] font-black text-[#1C1917] uppercase block">Thermal</span>
              <span className="text-[9px] text-[#8E8B85]">Hot Packaging</span>
            </div>
          </div>

          {/* Dietary & Customization Notes */}
          <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/70 text-xs text-[#5C5954] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#1C1917]">
              <span>💡 Customer Note:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#8E8B85]">
              You can combine this dish with items from other stalls in {stall?.khauGalliName || 'this Khau Galli'} in a single synchronized order. Custom spice requirements can be added at checkout.
            </p>
          </div>

        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="sticky bottom-0 bg-white border-t border-[#EAE4DA] p-4 sm:p-5 flex items-center justify-between gap-4 mt-auto">
          {/* Total & Price Info */}
          <div>
            <span className="text-[10px] font-bold text-[#8E8B85] uppercase tracking-wider block">
              Item Price ({effectiveQty} {effectiveQty === 1 ? 'item' : 'items'})
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#1C1917]">
              ₹{totalPrice}
            </div>
          </div>

          {/* Action Buttons */}
          {!isAvailable ? (
            <div className="bg-stone-100 text-stone-400 border border-stone-200 font-bold text-sm px-6 py-3 rounded-2xl select-none">
              Currently Sold Out
            </div>
          ) : !isStallOpen ? (
            <div className="bg-stone-100 text-stone-400 border border-stone-200 font-bold text-sm px-6 py-3 rounded-2xl select-none">
              Stall Closed Now
            </div>
          ) : currentQuantity > 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-[#D94A38] text-white px-4 py-2 rounded-2xl font-black text-sm shadow-sm">
                <button
                  onClick={handleDecrement}
                  className="hover:opacity-80 transition-opacity cursor-pointer text-white font-bold text-base px-1"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-5 text-center text-base">{currentQuantity}</span>
                <button
                  onClick={handleIncrement}
                  className="hover:opacity-80 transition-opacity cursor-pointer text-white font-bold text-base px-1"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-2xl">
                In Cart
              </span>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="px-6 py-3 rounded-2xl bg-[#D94A38] hover:bg-[#B33525] text-white font-black text-sm transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add to Cart • ₹{dish.price}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default FoodItemDetailModal;
