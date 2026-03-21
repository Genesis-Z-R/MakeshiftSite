import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { ShoppingCart, Trash2, ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';

const Cart: React.FC = () => {
  const { cart, removeFromCart, checkout, loading } = useCart();
  const { announce } = useAccessibility();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const navigate = useNavigate();

  const total = Array.isArray(cart) 
    ? cart.reduce((sum, item) => sum + Number(item.price || 0), 0) 
    : 0;

  const handleCheckout = async () => {
    setError('');
    try {
      await checkout();
      announce('Purchase completed successfully! Redirecting to your profile.');
      navigate('/profile');
    } catch (err: any) {
      setError(err.message || 'Checkout failed');
      announce(`Checkout failed: ${err.message}`, 'assertive');
    }
  };

  const handleRemoveItem = async (id: number) => {
    if (!Array.isArray(cart)) return;
    
    // Find item for the screen reader announcement
    const item = cart.find(i => (i as any).cart_item_id === id || i.id === id);
    
    try {
      // Await the backend deletion so the UI doesn't close too early
      await removeFromCart(id);
      if (item) {
        announce(`${item.title} removed from cart.`);
      }
    } catch (error) {
      console.error("Failed to delete cart item", error);
    } finally {
      setItemToRemove(null);
    }
  };

  if (!cart || cart.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <ShoppingCart className="h-16 w-16 text-slate-200 dark:text-slate-800 mb-6" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Your cart is empty</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 text-center max-w-xs">
          Looks like you haven't added anything to your cart yet.
        </p>
        <Link
          to="/"
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 pb-40">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-900">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-900 dark:text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Cart</h1>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {cart.length} Items
        </span>
      </div>

      <div className="max-w-3xl mx-auto md:px-4 md:py-8">
        {error && (
          <div className="m-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 md:rounded-2xl border-y md:border border-slate-100 dark:border-slate-800/50 divide-y divide-slate-100 dark:divide-slate-800/50">
          {cart.map((item, idx) => (
            <div key={`cart-item-${item.id}-${idx}`} className="flex gap-4 p-4">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                <img
                  src={item.image_url || '/placeholder.png'}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col flex-1 py-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white line-clamp-2">
                    {item.title}
                  </h3>
                  <button
                    // FIX: We now explicitly grab the cart_item_id from the backend join
                    onClick={() => setItemToRemove((item as any).cart_item_id || item.id)}
                    className="p-1.5 -mt-1.5 -mr-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-auto">
                  <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                    GH₵{Number(item.price || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1 flex items-center gap-1">
                    <Package className="h-3 w-3" /> Pickup Available
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Bar offset on mobile */}
      <div className="fixed bottom-[72px] md:bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 p-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-none">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-end mb-4 px-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              GH₵{Number(total).toLocaleString()}
            </span>
          </div>

          {!isCheckingOut ? (
            <button
              onClick={() => setIsCheckingOut(true)}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              Checkout
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsCheckingOut(false)}
                className="w-1/3 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white py-5 rounded-xl font-black text-[10px] uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCheckoutConfirm(true)}
                disabled={loading}
                className="w-2/3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal isOpen={itemToRemove !== null} onClose={() => setItemToRemove(null)} onConfirm={() => itemToRemove && handleRemoveItem(itemToRemove)} title="Remove Item" message="Are you sure you want to remove this item from your cart?" confirmText="Remove" type="danger" />
      <ConfirmationModal isOpen={showCheckoutConfirm} onClose={() => setShowCheckoutConfirm(false)} onConfirm={handleCheckout} title="Complete Purchase" message={`You are about to purchase ${cart?.length} item(s) for a total of GH₵${Number(total).toLocaleString()}. This is a simulated transaction.`} confirmText="Confirm Purchase" />
    </div>
  );
};

export default Cart;