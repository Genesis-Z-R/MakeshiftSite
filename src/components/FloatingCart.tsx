import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const FloatingCart: React.FC = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const location = useLocation();

  // Don't show on login/register pages or if not logged in
  if (!user || ['/login', '/register', '/cart'].includes(location.pathname)) {
    return null;
  }

  return (
    <Link 
      to="/cart"
      // FIXED: bottom-24 on mobile clears the navbar, md:bottom-8 keeps desktop looking perfect
      className="fixed bottom-28 right-4 md:bottom-8 md:right-8 bg-white dark:bg-slate-900 p-4 md:p-5 rounded-full shadow-2xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:scale-110 hover:shadow-indigo-500/20 transition-all z-[60] group"
      aria-label={`View Cart with ${cart.length} items`}
    >
      <ShoppingCart className="h-6 w-6 md:h-7 md:w-7 group-hover:text-indigo-600 transition-colors" />
      {cart.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-black h-5 w-5 md:h-6 md:w-6 rounded-full flex items-center justify-center border-[3px] md:border-4 border-slate-50 dark:border-slate-950 animate-in zoom-in duration-300">
          {cart.length}
        </span>
      )}
    </Link>
  );
};

export default FloatingCart;