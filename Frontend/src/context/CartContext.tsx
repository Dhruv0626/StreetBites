import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { CartItem } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string, vendorId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCartItems(prev => {
      const existingItem = prev.find(i => i.id === item.id && i.vendorId === item.vendorId);
      if (existingItem) {
        return prev.map(i => i.id === item.id && i.vendorId === item.vendorId 
          ? { ...i, quantity: i.quantity + 1 } 
          : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string, vendorId: string) => {
    setCartItems(prev => {
      const existingItem = prev.find(i => i.id === id && i.vendorId === vendorId);
      if (existingItem?.quantity === 1) {
        return prev.filter(i => !(i.id === id && i.vendorId === vendorId));
      }
      return prev.map(i => i.id === id && i.vendorId === vendorId 
        ? { ...i, quantity: i.quantity - 1 } 
        : i);
    });
  };

  const clearCart = () => setCartItems([]);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart }}>
      {children}
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
