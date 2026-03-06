import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

interface CartItem {
  id: number;
  listing_id: number;
  title: string;
  price: number;
  image_url: string;
  status: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (listingId: number) => Promise<void>;
  removeFromCart: (cartItemId: number) => Promise<void>;
  clearCart: () => void;
  checkout: () => Promise<void>;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchCart = async () => {
    if (!user) {
      setCart([]);
      return;
    }
    try {
      const response = await api.get('/cart');
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (listingId: number) => {
    try {
      await api.post('/cart', { listing_id: listingId });
      await fetchCart();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add to cart');
    }
  };

  const removeFromCart = async (cartItemId: number) => {
    try {
      await api.delete(`/cart/${cartItemId}`);
      await fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const clearCart = () => setCart([]);

  const checkout = async () => {
    setLoading(true);
    try {
      await api.post('/checkout');
      setCart([]);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, checkout, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
