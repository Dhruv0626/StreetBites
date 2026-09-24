import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Store,
  ShieldCheck,
  Zap,
  Banknote,
  Clock,
  Sparkles,
  Navigation,
  Lock,
  Flame,
  Plus,
  Home,
  Briefcase,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { getCustomerAddresses, subscribeAddresses } from '../../services/addressService';
import { razorpayService } from '../../services/razorpayService';
import { AddressModal } from '../../components/customer/AddressModal';
import { calculateDistanceKm, calculateDeliveryFee, calculateETA } from '../../utils/distance';
import type { AddressItem } from '../../types';

interface CheckoutProps {
  clusterName?: string;
  onNavigate?: (tab: string) => void;
  onConfirmOrder?: (placedItems: any[], paymentMethod: string) => void;
}

const DEFAULT_COORDINATES: Record<string, [number, number]> = {
  'manek chowk': [72.5873, 23.0248],
  'law garden': [72.5574, 23.0272],
  'vastrapur': [72.5284, 23.036],
  'prahlad nagar': [72.5085, 23.0076],
  'chandkheda': [72.5815, 23.1118],
};

const getKhauGalliCoordinates = (
  khauGalli: { coordinates?: [number, number]; name?: string } | null,
  clusterNameFallback: string
): [number, number] => {
  if (khauGalli?.coordinates && khauGalli.coordinates.length === 2) {
    return khauGalli.coordinates;
  }
  const name = (khauGalli?.name || clusterNameFallback).toLowerCase();
  for (const [key, coords] of Object.entries(DEFAULT_COORDINATES)) {
    if (name.includes(key) || key.includes(name)) {
      return coords;
    }
  }
  return [72.5873, 23.0248]; // default Manek Chowk coordinates
};

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
  const navigate = useNavigate();
  const { cartItems, activeKhauGalli, clearCart } = useCart();
  const { user } = useAuth();
  const rawKhauGalliName = activeKhauGalli?.name || cartItems[0]?.khauGalliName || clusterName;
  const displayKhauGalliName = rawKhauGalliName.replace(/_/g, ' ');

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Customer addresses state (fetched exclusively from database based on user_id)
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isChangingAddress, setIsChangingAddress] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isCalculatingFee, setIsCalculatingFee] = useState<boolean>(false);

  // Fetch real saved customer addresses from MongoDB on mount or when user changes
  useEffect(() => {
    let isMounted = true;

    // 1. Subscribe to live address SWR updates
    const unsubscribe = subscribeAddresses((saved) => {
      if (isMounted && Array.isArray(saved) && saved.length > 0) {
        setAddresses(saved);
        if (!selectedAddressId) {
          const primary = saved.find((a) => a.is_primary) || saved[0];
          setSelectedAddressId(primary.id || primary._id || '');
        }
      }
    });

    const loadAddresses = async () => {
      try {
        const saved = await getCustomerAddresses();
        if (isMounted) {
          if (saved && Array.isArray(saved) && saved.length > 0) {
            setAddresses(saved);
            const primary = saved.find((a) => a.is_primary) || saved[0];
            setSelectedAddressId(primary.id || primary._id || '');
          } else {
            setAddresses([]);
            setSelectedAddressId('');
          }
        }
      } catch (err) {
        console.warn('Error fetching saved addresses from database:', err);
        if (isMounted) {
          setAddresses([]);
        }
      }
    };
    loadAddresses();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

  // Selected address object (null if customer has not saved any address yet or none selected)
  const selectedAddress: AddressItem | null = useMemo(() => {
    if (!addresses || addresses.length === 0) return null;
    return (
      addresses.find((a) => (a.id && a.id === selectedAddressId) || (a._id && a._id === selectedAddressId)) ||
      addresses.find((a) => a.is_primary) ||
      addresses[0] ||
      null
    );
  }, [addresses, selectedAddressId]);

  // Active Khau Galli origin coordinates
  const khauGalliCoords = useMemo(() => {
    return getKhauGalliCoordinates(activeKhauGalli, displayKhauGalliName);
  }, [activeKhauGalli, displayKhauGalliName]);

  // Real-time geodesic distance in km between Khau Galli and selected delivery address
  const currentDistanceKm = useMemo(() => {
    if (!selectedAddress || !selectedAddress.coordinates) return 0;
    return calculateDistanceKm(khauGalliCoords, selectedAddress.coordinates);
  }, [khauGalliCoords, selectedAddress]);

  // Dynamic delivery fee based on calculated distance
  const deliveryFee: number | null = useMemo(() => {
    if (cartItems.length === 0 || !selectedAddress) return null;
    return calculateDeliveryFee(currentDistanceKm, true);
  }, [currentDistanceKm, cartItems.length, selectedAddress]);

  // Dynamic ETA based on calculated distance
  const currentETA = useMemo(() => {
    if (!selectedAddress) return '20–25 min';
    return calculateETA(currentDistanceKm);
  }, [currentDistanceKm, selectedAddress]);

  // Trigger brief fee calculation loader for smooth UX feedback when address is picked
  useEffect(() => {
    if (selectedAddress) {
      setIsCalculatingFee(true);
      const timer = setTimeout(() => {
        setIsCalculatingFee(false);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setIsCalculatingFee(false);
    }
  }, [selectedAddress?.id, selectedAddress?._id]);

  // Recipient contact info fetched via customer reference
  const recipientName = (selectedAddress as any)?.receiver_name || user?.name || 'Customer';
  const recipientPhone = (selectedAddress as any)?.phone_number || user?.phone_number || '';

  const itemSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const uniqueVendorsCount = new Set(cartItems.map((i) => i.vendorId)).size;
  const gstAmount = Math.round(itemSubtotal * 0.05 * 10) / 10;
  const totalPayable = deliveryFee !== null
    ? Math.round((itemSubtotal + deliveryFee + gstAmount) * 10) / 10
    : Math.round((itemSubtotal + gstAmount) * 10) / 10;

  // Estimated savings vs separate aggregator deliveries
  const estimatedSavings = uniqueVendorsCount > 1 ? (uniqueVendorsCount - 1) * 35 : 0;

  const handlePay = async () => {
    if (!selectedAddress) {
      setIsAddressModalOpen(true);
      return;
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    setIsPlacingOrder(true);
    setOrderError(null);

    const fullAddress = [
      (selectedAddress as any).flat_plot || selectedAddress.house_no || selectedAddress.detail,
      selectedAddress.landmark,
      selectedAddress.area,
      selectedAddress.city,
    ]
      .filter(Boolean)
      .join(', ');

    const payload = {
      cluster_id: activeKhauGalli?.id || (cartItems[0] as any)?.clusterId || '678000000000000000000001',
      items: cartItems.map((item) => ({
        stall_id: item.vendorId,
        stallId: item.vendorId,
        item_id: item.id,
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      delivery_fee: deliveryFee || 0,
      delivery_address: fullAddress,
      delivery_notes: deliveryNotes,
    };

    if (paymentMethod === 'cod') {
      try {
        const res = await razorpayService.createCodOrder(payload);
        if (res.success) {
          clearCart();
          onConfirmOrder(cartItems, 'COD');
          navigate('/orders');
        } else {
          setOrderError(res.message || 'Failed to place COD order.');
        }
      } catch (err: any) {
        setOrderError(err.message || 'Error placing COD order.');
      } finally {
        setIsPlacingOrder(false);
      }
    } else {
      // ONLINE Payment via Razorpay
      try {
        const orderRes = await razorpayService.createCheckoutOrder(payload);
        if (!orderRes.success || !orderRes.data) {
          setOrderError(orderRes.message || 'Failed to initiate payment.');
          setIsPlacingOrder(false);
          return;
        }

        const rzpData = orderRes.data;

        await razorpayService.openCheckout({
          key: rzpData.keyId,
          amount: rzpData.amount,
          currency: rzpData.currency,
          order_id: rzpData.orderId,
          customerName: recipientName,
          customerEmail: user?.email,
          customerPhone: recipientPhone,
          onSuccess: async (rzpResponse) => {
            try {
              const verifyRes = await razorpayService.verifyPayment({
                razorpay_order_id: rzpResponse.razorpay_order_id,
                razorpay_payment_id: rzpResponse.razorpay_payment_id,
                razorpay_signature: rzpResponse.razorpay_signature,
                cluster_id: payload.cluster_id,
                items: payload.items,
                delivery_fee: payload.delivery_fee,
                delivery_address: payload.delivery_address,
                delivery_notes: payload.delivery_notes,
              });

              if (verifyRes.success) {
                clearCart();
                onConfirmOrder(
                  cartItems,
                  'ONLINE (RAZORPAY)'
                );
                navigate('/orders');
              } else {
                setOrderError(verifyRes.message || 'Payment verification failed.');
              }
            } catch (vErr: any) {
              setOrderError(vErr.message || 'Error verifying payment.');
            } finally {
              setIsPlacingOrder(false);
            }
          },
          onDismiss: () => {
            setIsPlacingOrder(false);
          },
        });
      } catch (err: any) {
        setOrderError(err.message || 'Error processing online payment.');
        setIsPlacingOrder(false);
      }
    }
  };

  const handleAddressCreated = (newAddr: AddressItem) => {
    setAddresses((prev) => [newAddr, ...prev.filter((a) => a.id !== newAddr.id && a._id !== newAddr._id)]);
    setSelectedAddressId(newAddr.id || newAddr._id || '');
    setIsChangingAddress(false);
  };

  const renderAddressSelection = () => (
    <div className="space-y-3 mt-4 animate-fadeIn">
      {addresses.length === 0 ? (
        <div className="text-center py-6 bg-[#FAF7F2] rounded-2xl border border-[#EAE4DA] p-4">
          <p className="text-xs text-[#8E8B85] mb-2 font-medium">No delivery addresses saved yet in your account.</p>
          <button
            type="button"
            onClick={() => setIsAddressModalOpen(true)}
            className="py-2.5 px-4 bg-[#D94A38] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 mx-auto cursor-pointer border-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Delivery Address</span>
          </button>
        </div>
      ) : (
        addresses.map((addr) => {
          const addrDist = calculateDistanceKm(khauGalliCoords, addr.coordinates);
          const addrETA = calculateETA(addrDist);
          const addrFee = calculateDeliveryFee(addrDist, true);
          const isSelected = selectedAddressId === addr.id || selectedAddressId === addr._id;

          return (
            <label
              key={addr.id || addr._id}
              className={`flex gap-3 items-start p-3.5 rounded-2xl border cursor-pointer transition-all ${isSelected
                ? 'border-[#D94A38] bg-[#FAF0ED]/40 shadow-xs'
                : 'border-[#EAE4DA] bg-white hover:border-[#DCD6CC]'
                }`}
              onClick={() => {
                setSelectedAddressId(addr.id || addr._id || '');
                setIsChangingAddress(false);
              }}
            >
              <div
                className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-[#D94A38] bg-[#D94A38]' : 'border-[#DCD6CC]'
                  }`}
              >
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-[#1C1917]">
                    {addr.label === 'Home' && <Home className="w-3.5 h-3.5 text-[#D94A38]" />}
                    {addr.label === 'Office' && <Briefcase className="w-3.5 h-3.5 text-[#D94A38]" />}
                    {addr.label !== 'Home' && addr.label !== 'Office' && <MapPin className="w-3.5 h-3.5 text-[#D94A38]" />}
                    <span>{addr.label}</span>
                  </div>
                  {addr.is_primary && (
                    <span className="bg-[#FAF0ED] text-[#D94A38] text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#FCE8E6]">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Primary
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8E8B85] leading-snug">{addr.detail}</p>

                {addr.landmark && (
                  <p className="text-[11px] text-[#5C5954] mt-0.5 flex items-center gap-1">
                    <span className="text-[#8E8B85]">Landmark:</span>
                    <span className="font-semibold">{addr.landmark}</span>
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-bold text-[#5C5954]">
                  <span className="bg-[#FAF7F2] border border-[#EAE4DA] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Navigation className="w-2.5 h-2.5 text-[#D94A38]" />
                    {addrDist} km away
                  </span>
                  <span className="bg-[#FAF7F2] border border-[#EAE4DA] px-2 py-0.5 rounded-md text-[#2E7D32] flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    ETA {addrETA}
                  </span>
                  <span className="bg-[#FAF0ED] text-[#D94A38] border border-[#FCE8E6] px-2 py-0.5 rounded-md">
                    Delivery ₹{addrFee}
                  </span>
                </div>
              </div>
            </label>
          );
        })
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setIsAddressModalOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-[#FAF0ED] text-[#D94A38] hover:bg-[#FCE8E6] text-xs font-extrabold flex items-center gap-1.5 transition-colors border border-[#FCE8E6] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Address</span>
        </button>

        <button
          type="button"
          onClick={() => setIsChangingAddress(false)}
          className="text-xs font-bold text-[#8E8B85] hover:text-[#1C1917] underline bg-transparent border-0 cursor-pointer"
        >
          Cancel
        </button>
      </div>
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
              ) : !selectedAddress ? (
                <div className="flex flex-col items-center justify-center p-8 bg-[#FAF7F2]/80 border border-dashed border-[#DCD6CC] rounded-2xl text-center space-y-3 animate-fadeIn">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF0ED] border border-[#FCE8E6] flex items-center justify-center text-[#D94A38] shadow-3xs">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#1C1917]">No Delivery Address Added</h4>
                    <p className="text-xs text-[#8E8B85] max-w-sm mt-0.5">
                      Please add your delivery address to compute real-time distance from {displayKhauGalliName} and display live delivery charges.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="py-2.5 px-5 bg-[#D94A38] hover:bg-[#C43D2E] text-white text-xs font-extrabold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer border-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Delivery Address</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-4 items-start bg-[#FAF7F2]/60 border border-[#EAE4DA]/70 rounded-2xl p-4 animate-fadeIn">
                  <div className="w-11 h-11 rounded-2xl bg-[#FAF0ED] text-[#D94A38] border border-[#FCE8E6] flex items-center justify-center  shrink-0 shadow-3xs">
                    {selectedAddress.label === 'Home' && <Home className="w-5 h-5" />}
                    {selectedAddress.label === 'Office' && <Briefcase className="w-5 h-5" />}
                    {selectedAddress.label !== 'Home' && selectedAddress.label !== 'Office' && <MapPin className="w-5 h-5" />}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#1C1917]">{selectedAddress.label}</h4>
                      {selectedAddress.is_primary && (
                        <span className="bg-[#FAF0ED] text-[#D94A38] text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#FCE8E6]">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Primary
                        </span>
                      )}
                      {(recipientName || recipientPhone) && (
                        <span className="text-[10px] text-[#5C5954] font-medium bg-white px-2 py-0.5 rounded-md border border-[#EAE4DA] flex items-center gap-1">
                          <UserCheck className="w-2.5 h-2.5 text-[#2E7D32]" />
                          <span>{recipientName}{recipientPhone ? ` · ${recipientPhone}` : ''}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8E8B85] leading-relaxed">{selectedAddress.detail}</p>
                    {selectedAddress.landmark && (
                      <p className="text-[11px] text-[#5C5954] flex items-center gap-1">
                        <span className="text-[#8E8B85]">Landmark:</span>
                        <span className="font-semibold">{selectedAddress.landmark}</span>
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <span className="bg-white border border-[#EAE4DA] text-[#4B5563] text-[10px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <Navigation className="w-2.5 h-2.5 text-[#D94A38]" />
                        {currentDistanceKm} km from {displayKhauGalliName}
                      </span>
                      <span className="bg-[#FAF0ED] text-[#D94A38] border border-[#D94A38]   text-[10px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        ETA {currentETA}
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
              </div>

              {/* Two Payment Method Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
                {/* Option 1: Online Payment */}
                <div
                  onClick={() => setPaymentMethod('online')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${paymentMethod === 'online'
                      ? 'border-[#D94A38] bg-[#FAF0ED]/40 shadow-xs ring-1 ring-[#D94A38]'
                      : 'border-[#EAE4DA] bg-white hover:border-[#DCD6CC]'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FAF0ED] text-[#D94A38] flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#1C1917]">Online Payment</span>
                        </div>
                        <span className="text-[10px] text-[#8E8B85] block mt-0.5">
                          UPI, Cards, NetBanking
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${paymentMethod === 'online'
                          ? 'border-[#D94A38] bg-[#D94A38] text-white'
                          : 'border-[#DCD6CC]'
                        }`}
                    >
                      {paymentMethod === 'online' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2.5 border-t border-[#F5F0E8]">
                    <span className="text-[9px] font-bold text-[#8E8B85] uppercase">Supports:</span>
                    <span className="text-[9px] font-semibold text-[#5A5751] bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#EAE4DA]">GPay</span>
                    <span className="text-[9px] font-semibold text-[#5A5751] bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#EAE4DA]">PhonePe</span>
                    <span className="text-[9px] font-semibold text-[#5A5751] bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#EAE4DA]">Paytm</span>
                    <span className="text-[9px] font-semibold text-[#5A5751] bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#EAE4DA]">Cards</span>
                  </div>
                </div>

                {/* Option 2: Cash on Delivery */}
                <div
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${paymentMethod === 'cod'
                      ? 'border-[#D94A38] bg-[#FAF0ED]/40 shadow-xs ring-1 ring-[#D94A38]'
                      : 'border-[#EAE4DA] bg-white hover:border-[#DCD6CC]'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FAF0ED] text-[#D94A38]  flex items-center justify-center shrink-0">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#1C1917]">Cash on Delivery</span>
                          
                        </div>
                        <span className="text-[10px] text-[#8E8B85] block mt-0.5">
                          Pay cash to rider upon arrival
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${paymentMethod === 'cod'
                          ? 'border-[#D94A38] bg-[#D94A38] text-white'
                          : 'border-[#DCD6CC]'
                        }`}
                    >
                      {paymentMethod === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2.5 border-t border-[#F5F0E8]">
                    <span className="text-[9px] font-bold text-[#8E8B85] uppercase">Pay at door:</span>
                    <span className="text-[9px] font-bold text-[#1C1917]">₹{totalPayable} cash</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Information Notice */}
              {paymentMethod === 'online' ? (
                <div className="bg-white border border-[#D94A38]  rounded-2xl p-3.5 flex gap-3 items-center animate-fadeIn">
                  <ShieldCheck className="w-5 h-5 text-[#D94A38]  shrink-0" />
                  <p className="text-[11px] text-black leading-relaxed">
                    Razorpay secured checkout. On clicking Pay, your order is atomically saved and splits across <strong>{uniqueVendorsCount} stall sub-orders</strong>.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-[#D94A38]  rounded-2xl p-3.5 flex gap-3 items-center animate-fadeIn">
                  <Banknote className="w-5 h-5 text-[#D94A38]  shrink-0" />
                  <p className="text-[11px] text-black leading-relaxed">
                    Please keep exact cash of <strong>₹{totalPayable}</strong> ready. You will share your 4-digit Delivery OTP with the rider upon delivery.
                  </p>
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
                  <span>Item Total ({uniqueVendorsCount} {uniqueVendorsCount === 1 ? 'stall' : 'stalls'})</span>
                  <span className="font-semibold text-[#1C1917]">₹{itemSubtotal}</span>
                </div>
                <div className="flex justify-between items-center min-h-[24px]">
                  <div className="flex items-center gap-1">
                    <span>Delivery Fee</span>
                    
                  </div>
                  {isCalculatingFee ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#D94A38] font-bold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Calculating...</span>
                    </div>
                  ) : !selectedAddress ? (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 animate-pulse">
                      Select an address first
                    </span>
                  ) : (
                    <span className="font-bold text-[#1C1917]">₹{deliveryFee}</span>
                  )}
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
                  {isCalculatingFee ? (
                    <div className="flex items-center gap-1.5 text-lg font-black text-[#D94A38]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>₹{totalPayable}...</span>
                    </div>
                  ) : !selectedAddress ? (
                    <div className="text-right">
                      <span className="text-xl font-black text-[#D94A38]">₹{totalPayable}</span>
                      <span className="text-[10px] font-semibold text-[#8E8B85] block">+ delivery fee</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-black text-[#D94A38]">₹{totalPayable}</span>
                  )}
                </div>

                {orderError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl mb-3 animate-fadeIn">
                    {orderError}
                  </div>
                )}

                <button
                  onClick={handlePay}
                  disabled={isCalculatingFee || isPlacingOrder}
                  className="w-full bg-gradient-to-r from-[#D94A38] to-[#C43D2E] hover:from-[#C43D2E] hover:to-[#B33527] text-white font-extrabold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer border-0 active:scale-[0.99] disabled:opacity-75"
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing order...</span>
                    </>
                  ) : isCalculatingFee ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Computing delivery fee...</span>
                    </>
                  ) : !selectedAddress ? (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>Select Delivery Address to Pay</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>{paymentMethod === 'cod' ? `Place Cash on Delivery Order (₹${totalPayable})` : `Pay ₹${totalPayable} via Online Payment`}</span>
                    </>
                  )}
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
            <span className="text-[10px] font-extrabold text-[#D94A38] uppercase tracking-widest bg-[#FAF0ED] py-0.5 rounded-sm border border-[#FCE8E6]">
              CONFIRM ORDER
            </span>
            <p className="text-xs text-[#8E8B85] font-semibold mt-0.5">
              {totalItemsCount} items · {uniqueVendorsCount} stalls · ETA {currentETA}
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
            ) : !selectedAddress ? (
              <div className="flex flex-col items-center justify-center p-5 bg-[#FAF7F2]/80 border border-dashed border-[#DCD6CC] rounded-xl text-center space-y-2.5 animate-fadeIn">
                <MapPin className="w-6 h-6 text-[#D94A38]" />
                <div>
                  <h4 className="text-xs font-bold text-[#1C1917]">No Delivery Address</h4>
                  <p className="text-[10px] text-[#8E8B85]">Add address to compute route & live delivery fee</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(true)}
                  className="py-2 px-4 bg-[#D94A38] text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer border-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Delivery Address</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-3 items-start animate-fadeIn">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0ED] border border-[#FCE8E6] flex items-center justify-center text-[#D94A38] shrink-0">
                  {selectedAddress.label === 'Home' && <Home className="w-4 h-4" />}
                  {selectedAddress.label === 'Office' && <Briefcase className="w-4 h-4" />}
                  {selectedAddress.label !== 'Home' && selectedAddress.label !== 'Office' && <MapPin className="w-4 h-4" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-[#1C1917]">{selectedAddress.label}</h4>
                    {selectedAddress.is_primary && (
                      <span className="bg-[#FAF0ED] text-[#D94A38] text-[8px] font-black uppercase px-1.5 py-0.2 rounded-sm border border-[#FCE8E6]">
                        Primary
                      </span>
                    )}
                    {(recipientName || recipientPhone) && (
                      <span className="text-[9px] text-[#5C5954] font-medium bg-[#FAF7F2] px-1.5 py-0.2 rounded border border-[#EAE4DA] flex items-center gap-1">
                        <UserCheck className="w-2.5 h-2.5 text-[#2E7D32]" />
                        <span>{recipientName}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#8E8B85] leading-normal">{selectedAddress.detail}</p>
                  {selectedAddress.landmark && (
                    <p className="text-[10px] text-[#5C5954] flex items-center gap-1">
                      <span className="text-[#8E8B85]">Landmark:</span>
                      <span className="font-semibold">{selectedAddress.landmark}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="bg-[#FAF7F2] text-[#4B5563] text-[9px] font-bold px-2 py-0.5 rounded border border-[#EAE4DA] flex items-center gap-1">
                      <Navigation className="w-2.5 h-2.5 text-[#D94A38]" />
                      {currentDistanceKm} km
                    </span>
                    <span className="bg-[#FAF0ED] text-[#D94A38] text-[9px] font-bold px-2 py-0.5 rounded border border-[#D94A38] flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      ETA {currentETA}
                    </span>
                  </div>
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
              <span>Item Total ({uniqueVendorsCount} {uniqueVendorsCount === 1 ? 'stall' : 'stalls'})</span>
              <span className="font-semibold text-[#1C1917]">₹{itemSubtotal}</span>
            </div>
            <div className="flex justify-between items-center text-[#8E8B85] min-h-[22px]">
              <span>Delivery Fee</span>
              {isCalculatingFee ? (
                <div className="flex items-center gap-1.5 text-[11px] text-[#D94A38] font-bold">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Calculating...</span>
                </div>
              ) : !selectedAddress ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 animate-pulse">
                  Select an address first
                </span>
              ) : (
                <span className="font-bold text-[#1C1917]">₹{deliveryFee}</span>
              )}
            </div>
            <div className="flex justify-between text-[#8E8B85]">
              <span>Taxes (5% GST)</span>
              <span className="font-semibold text-[#1C1917]">₹{gstAmount}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#F5F0E8] text-[#1C1917] font-bold">
              <span>Total Payable</span>
              {isCalculatingFee ? (
                <div className="flex items-center gap-1 text-sm font-black text-[#D94A38]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>₹{totalPayable}...</span>
                </div>
              ) : !selectedAddress ? (
                <span className="text-sm font-black text-[#D94A38]">
                  ₹{totalPayable} <span className="text-[9px] font-normal text-[#8E8B85]">+ delivery fee</span>
                </span>
              ) : (
                <span className="text-sm font-black text-[#D94A38]">₹{totalPayable}</span>
              )}
            </div>
          </div>

          {/* Payment Method Selector (Mobile) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8B85]">
              Payment method
            </h3>
            <div
              className={`p-3.5 rounded-2xl border bg-white flex flex-col gap-2.5 transition-all cursor-pointer ${paymentMethod === 'online' ? 'border-[#D94A38] shadow-3xs' : 'border-[#EAE4DA]'
                }`}
              onClick={() => setPaymentMethod('online')}
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${paymentMethod === 'online'
                    ? 'border-[#D94A38] bg-[#D94A38] text-white'
                    : 'border-[#DCD6CC]'
                    }`}
                >
                  {paymentMethod === 'online' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#1C1917]">Online Payment</span>
                    <span className="bg-[#FAF0ED] text-[#D94A38] text-[8px] font-extrabold tracking-wide uppercase px-1.5 py-0.2 rounded">
                      Popular
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8E8B85] block mt-0.5">
                    UPI (GPay, PhonePe, Paytm) · Cards · NetBanking
                  </span>
                </div>
              </label>
            </div>

            <div
              className={`p-3.5 rounded-2xl border bg-white flex flex-col gap-2.5 transition-all cursor-pointer ${paymentMethod === 'cod' ? 'border-[#D94A38] shadow-3xs' : 'border-[#EAE4DA]'
                }`}
              onClick={() => setPaymentMethod('cod')}
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${paymentMethod === 'cod'
                    ? 'border-[#D94A38] bg-[#D94A38] text-white'
                    : 'border-[#DCD6CC]'
                    }`}
                >
                  {paymentMethod === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#1C1917]">Cash on delivery</span>
                    <span className="bg-[#FAF0ED] text-[#D94A38] text-[8px] font-extrabold tracking-wide uppercase px-1.5 py-0.2 rounded">
                      Cash
                    </span>
                  </div>
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
            disabled={isCalculatingFee || isPlacingOrder}
            className="flex-1 py-3.5 bg-gradient-to-r from-[#D94A38] to-[#C43D2E] text-white text-xs font-black rounded-2xl flex items-center justify-center gap-1.5 shadow-sm border-0 cursor-pointer disabled:opacity-75"
          >
            {isPlacingOrder ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : isCalculatingFee ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Calculating...</span>
              </>
            ) : !selectedAddress ? (
              <>
                <MapPin className="w-3.5 h-3.5" />
                <span>Select Address to Pay</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>{paymentMethod === 'cod' ? `Place COD Order (₹${totalPayable})` : `Pay ₹${totalPayable} Online`}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onAddressCreated={handleAddressCreated}
        userName={user?.name}
        userPhone={user?.phone_number}
      />
    </div>
  );
};

export default Checkout;
