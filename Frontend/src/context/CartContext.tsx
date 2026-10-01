import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { CartItem } from '../types';
import { cartService } from '../services/cartService';
import { clusterService } from '../services/clusterService';
import { KhauGalliConflictModal } from '../components/KhauGalliConflictModal';
import { useAuth } from './AuthContext';

export const getCustomerSessionId = (): string => {
  if (typeof window === 'undefined') return 'guest_session_default';
  let cid = localStorage.getItem('streetbites_customer_id');
  if (!cid || cid.length < 12) {
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const randomHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    cid = timestamp + randomHex;
    localStorage.setItem('streetbites_customer_id', cid);
  }
  return cid;
};

interface KhauGalliRef {
  id: string;
  name: string;
  coordinates?: [number, number]; // [longitude, latitude]
}

interface AddToCartResult {
  success: boolean;
  conflict?: boolean;
}

interface CartContextType {
  cartItems: CartItem[];
  activeKhauGalli: KhauGalliRef | null;
  addToCart: (item: Omit<CartItem, 'quantity'>, options?: { replace?: boolean }) => Promise<AddToCartResult>;
  removeFromCart: (id: string, vendorId: string) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  totalPrice: number;
  vendorIds: string[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'streetbites_cart_items';
const KHAU_GALLI_STORAGE_KEY = 'streetbites_cart_khau_galli';

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Sync logged-in user ID to customer session ID
  useEffect(() => {
    if (user?._id || user?.id) {
      const uid = String(user._id || user.id);
      localStorage.setItem('streetbites_customer_id', uid);
    }
  }, [user]);

  // 1. Initialize Cart from localStorage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeKhauGalli, setActiveKhauGalli] = useState<KhauGalliRef | null>(() => {
    try {
      const saved = localStorage.getItem(KHAU_GALLI_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Conflict Modal State
  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    currentKhauGalli: string;
    newKhauGalli: string;
    pendingItem: Omit<CartItem, 'quantity'> | null;
  }>({
    isOpen: false,
    currentKhauGalli: '',
    newKhauGalli: '',
    pendingItem: null,
  });

  // 2. Persist to localStorage whenever cartItems or activeKhauGalli change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
      if (cartItems.length === 0) {
        localStorage.removeItem(KHAU_GALLI_STORAGE_KEY);
        setActiveKhauGalli(null);
      } else if (activeKhauGalli) {
        localStorage.setItem(KHAU_GALLI_STORAGE_KEY, JSON.stringify(activeKhauGalli));
      }
    } catch (e) {
      console.error('Failed to sync cart to localStorage:', e);
    }
  }, [cartItems, activeKhauGalli]);

  // 3. Sync with MongoDB backend on mount and whenever user session initializes
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const cid = (user?._id || user?.id) ? String(user._id || user.id) : getCustomerSessionId();
        const res = await cartService.getCart(cid);
        if (res.success && res.data) {
          if (res.data.items && res.data.items.length > 0) {
            const serverItems: CartItem[] = res.data.items.map((si) => ({
              id: si.id,
              name: si.name,
              price: si.price,
              quantity: si.quantity,
              vendorId: si.vendorId || (si as any).stallId,
              vendorName: si.stallName || si.vendorName,
              stallName: si.stallName || si.vendorName,
              image: si.image,
              khauGalliId: si.khauGalliId,
              khauGalliName: si.khauGalliName,
            }));
            setCartItems(serverItems);
            if (res.data.khauGalli) {
              setActiveKhauGalli({
                id: res.data.khauGalli.id,
                name: res.data.khauGalli.name,
                coordinates: res.data.khauGalli.coordinates,
              });
            }
          } else {
            // If backend has 0 items but local storage has items from current session, push to MongoDB
            const savedLocal = localStorage.getItem(CART_STORAGE_KEY);
            const localList: CartItem[] = savedLocal ? JSON.parse(savedLocal) : [];
            if (localList.length > 0) {
              for (const it of localList) {
                await cartService.addToCart({
                  stallId: it.vendorId,
                  itemId: it.id,
                  name: it.name,
                  price: it.price,
                  image: it.image,
                  stallName: it.stallName || it.vendorName,
                  vendorName: it.vendorName || it.stallName,
                  khauGalliId: it.khauGalliId,
                  khauGalliName: it.khauGalliName,
                  quantity: it.quantity,
                  userId: cid,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('Backend cart sync note:', err);
      }
    };

    syncWithBackend();
  }, [user]);

  /**
   * Add Item to Cart with Strict Khau Galli Restriction
   */
  const addToCart = async (
    item: Omit<CartItem, 'quantity'>,
    options?: { replace?: boolean }
  ): Promise<AddToCartResult> => {
    const incomingKhauGalliId = item.khauGalliId;
    const incomingKhauGalliName = item.khauGalliName || 'Khau Galli';

    // Check if cart already contains items
    if (cartItems.length > 0 && !options?.replace) {
      const existingKhauGalliId =
        cartItems[0].khauGalliId || activeKhauGalli?.id;
      const existingKhauGalliName =
        cartItems[0].khauGalliName || activeKhauGalli?.name || 'Current Khau Galli';

      // If incoming item belongs to a different Khau Galli, trigger conflict modal
      if (
        incomingKhauGalliId &&
        existingKhauGalliId &&
        String(incomingKhauGalliId) !== String(existingKhauGalliId)
      ) {
        setConflictModal({
          isOpen: true,
          currentKhauGalli: existingKhauGalliName,
          newKhauGalli: incomingKhauGalliName,
          pendingItem: item,
        });
        return { success: false, conflict: true };
      }
    }

    // Prepare item with normalized Khau Galli and Stall references
    const normalizedItem: CartItem = {
      ...item,
      quantity: 1,
      stallName: item.stallName || item.vendorName,
      khauGalliId: incomingKhauGalliId,
      khauGalliName: incomingKhauGalliName,
    };

    const incomingCoords =
      (item as any)?.coordinates ||
      (item as any)?.khauGalliCoordinates ||
      clusterService.getCachedClusters()?.find((c: any) => String(c.id) === String(incomingKhauGalliId) || String(c._id) === String(incomingKhauGalliId))?.coordinates;

    if (options?.replace) {
      // Discard previous cart and start fresh with this item
      setCartItems([normalizedItem]);
      if (incomingKhauGalliId) {
        setActiveKhauGalli({
          id: incomingKhauGalliId,
          name: incomingKhauGalliName,
          coordinates: incomingCoords,
        });
      }
    } else {
      // Same Khau Galli (or empty cart) -> Add or increment
      setCartItems((prev) => {
        const existingItem = prev.find(
          (i) => i.id === item.id && i.vendorId === item.vendorId
        );
        if (existingItem) {
          return prev.map((i) =>
            i.id === item.id && i.vendorId === item.vendorId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        }
        return [...prev, normalizedItem];
      });

      if (incomingKhauGalliId && !activeKhauGalli) {
        setActiveKhauGalli({
          id: incomingKhauGalliId,
          name: incomingKhauGalliName,
          coordinates: incomingCoords,
        });
      }
    }

    // Sync to Backend asynchronously
    try {
      const cid = (user?._id || user?.id) ? String(user._id || user.id) : getCustomerSessionId();
      await cartService.addToCart({
        stallId: item.vendorId,
        itemId: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        stallName: item.stallName || item.vendorName,
        vendorName: item.vendorName || item.stallName,
        khauGalliId: incomingKhauGalliId,
        khauGalliName: incomingKhauGalliName,
        quantity: 1,
        replaceCart: Boolean(options?.replace),
        userId: cid,
      });
    } catch (err) {
      console.warn('Backend cart add notice:', err);
    }

    return { success: true };
  };

  /**
   * Remove or Decrement Item
   */
  const removeFromCart = (id: string, vendorId: string) => {
    setCartItems((prev) => {
      const existingItem = prev.find((i) => i.id === id && i.vendorId === vendorId);
      let updated: CartItem[];

      if (existingItem?.quantity === 1) {
        updated = prev.filter((i) => !(i.id === id && i.vendorId === vendorId));
      } else {
        updated = prev.map((i) =>
          i.id === id && i.vendorId === vendorId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }

      if (updated.length === 0) {
        setActiveKhauGalli(null);
      }

      return updated;
    });

    // Backend sync
    try {
      const cid = (user?._id || user?.id) ? String(user._id || user.id) : getCustomerSessionId();
      cartService.removeItem(vendorId, id, false, cid);
    } catch {
      // Ignored
    }
  };

  /**
   * Clear Entire Cart
   */
  const clearCart = () => {
    setCartItems([]);
    setActiveKhauGalli(null);
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(KHAU_GALLI_STORAGE_KEY);

    try {
      const cid = (user?._id || user?.id) ? String(user._id || user.id) : getCustomerSessionId();
      cartService.clearCart(cid);
    } catch {
      // Ignored
    }
  };

  // Conflict Modal Handlers
  const handleConfirmReplace = () => {
    if (conflictModal.pendingItem) {
      addToCart(conflictModal.pendingItem, { replace: true });
    }
    setConflictModal({
      isOpen: false,
      currentKhauGalli: '',
      newKhauGalli: '',
      pendingItem: null,
    });
  };

  const handleCancelConflict = () => {
    setConflictModal({
      isOpen: false,
      currentKhauGalli: '',
      newKhauGalli: '',
      pendingItem: null,
    });
  };

  // Cart Calculations
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 35 : 0; // Flat single delivery fee for all stalls in this Khau Galli
  const taxes = Math.round(subtotal * 0.05);
  const totalPrice = subtotal + deliveryFee + taxes;
  const vendorIds = Array.from(new Set(cartItems.map((i) => i.vendorId)));

  return (
    <CartContext.Provider
      value={{
        cartItems,
        activeKhauGalli,
        addToCart,
        removeFromCart,
        clearCart,
        totalItemsCount,
        subtotal,
        deliveryFee,
        taxes,
        totalPrice,
        vendorIds,
      }}
    >
      {children}

      {/* Global Khau Galli Conflict Modal */}
      <KhauGalliConflictModal
        isOpen={conflictModal.isOpen}
        currentKhauGalli={conflictModal.currentKhauGalli}
        newKhauGalli={conflictModal.newKhauGalli}
        onConfirmReplace={handleConfirmReplace}
        onCancel={handleCancelConflict}
      />
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
