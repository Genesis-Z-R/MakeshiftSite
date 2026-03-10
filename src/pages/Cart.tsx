import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { ShoppingCart, Trash2, CreditCard, ArrowRight, Package, AlertCircle } from 'lucide-react';
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

  // FIX 1: Safe reduce calculation to prevent "t.reduce is not a function"
  const total = Array.isArray(cart) ? cart.reduce((sum, item) => sum + item.price, 0) : 0;

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

  const handleRemoveItem = (id: number) => {
    if (!Array.isArray(cart)) return;
    const item = cart.find(i => i.id === id);
    removeFromCart(id);
    setItemToRemove(null);
    if (item) {
      announce(`${item.title} removed from cart.`);
    }
  };

  // FIX 2: Safe check for empty cart
  if (!cart || cart.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 transition-colors duration-200">
          <ShoppingCart className="h-20 w-20 text-slate-200 dark:text-slate-700 mx-auto mb-6" aria-hidden="true" />
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-4">Your cart is empty</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Looks like you haven't added anything to your cart yet. Explore the marketplace to find great deals!
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-indigo-600 dark:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            Start Shopping
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-50 mb-10 flex items-center gap-4">
        <ShoppingCart className="h-10 w-10 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        Shopping Cart
      </h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3" role="alert">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Cart Items */}
        <section className="lg:col-span-2 space-y-6" aria-label="Items in your cart">
          {/* FIX 3: Optional chaining on map */}
          {cart?.map((item, idx) => (
            <div
              key={`cart-item-${item.id}-${idx}`}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-6 group hover:shadow-md transition-all duration-200"
            >
              <div className="h-32 w-32 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0">
                <img
                  src={item.image_url || 'https://picsum.photos/seed/item/400/400'}
                  alt={`Image of ${item.title}`}
                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-grow flex flex-col justify-between py-1">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-1">{item.title}</h3>
                    <button
                      onClick={() => setItemToRemove(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      aria-label={`Remove ${item.title} from cart`}
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                  {/* Currency updated to GH₵ */}
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">GH₵{item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Package className="h-4 w-4" aria-hidden="true" />
                  <span>Available for pickup</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Order Summary */}
        <aside className="lg:col-span-1" aria-label="Order Summary">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 sticky top-24 transition-colors duration-200">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>GH₵{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Service Fee</span>
                <span>GH₵0.00</span>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-50">Total</span>
                <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">GH₵{total.toFixed(2)}</span>
              </div>
            </div>

            {!isCheckingOut ? (
              <button
                onClick={() => setIsCheckingOut(true)}
                className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    Simulated Payment
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    This is a demo. No real money will be charged.
                  </p>
                  <button
                    onClick={() => setShowCheckoutConfirm(true)}
                    disabled={loading}
                    className="w-full bg-green-600 dark:bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-700 dark:hover:bg-green-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Processing...' : 'Complete Purchase'}
                  </button>
                  <button
                    onClick={() => setIsCheckingOut(false)}
                    className="w-full mt-2 text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <ConfirmationModal
        isOpen={itemToRemove !== null}
        onClose={() => setItemToRemove(null)}
        onConfirm={() => itemToRemove && handleRemoveItem(itemToRemove)}
        title="Remove Item"
        message="Are you sure you want to remove this item from your cart?"
        confirmText="Remove"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showCheckoutConfirm}
        onClose={() => setShowCheckoutConfirm(false)}
        onConfirm={handleCheckout}
        title="Complete Purchase"
        message={`You are about to purchase ${cart?.length} item(s) for a total of GH₵${total.toFixed(2)}. This is a simulated transaction.`}
        confirmText="Confirm Purchase"
      />
    </main>
  );
};

export default Cart;