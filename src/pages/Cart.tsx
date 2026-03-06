import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Trash2, CreditCard, ArrowRight, Package, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';

const Cart: React.FC = () => {
  const { cart, removeFromCart, checkout, loading } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const navigate = useNavigate();

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = async () => {
    setError('');
    try {
      await checkout();
      navigate('/profile');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-gray-100">
          <ShoppingCart className="h-20 w-20 text-gray-200 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Looks like you haven't added anything to your cart yet. Explore the marketplace to find great deals!
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            Start Shopping
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-10 flex items-center gap-4">
        <ShoppingCart className="h-10 w-10 text-indigo-600" />
        Shopping Cart
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3">
          <AlertCircle className="h-6 w-6" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item) => (
            <div
              key={item.id}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-6 group hover:shadow-md transition-all"
            >
              <div className="h-32 w-32 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                <img
                  src={item.image_url || 'https://picsum.photos/seed/item/400/400'}
                  alt={item.title}
                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-grow flex flex-col justify-between py-1">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{item.title}</h3>
                    <button
                      onClick={() => setItemToRemove(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Remove from cart"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-indigo-600 font-bold text-lg">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Package className="h-4 w-4" />
                  <span>Available for pickup</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 sticky top-24">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Service Fee</span>
                <span>$0.00</span>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-extrabold text-indigo-600">${total.toFixed(2)}</span>
              </div>
            </div>

            {!isCheckingOut ? (
              <button
                onClick={() => setIsCheckingOut(true)}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Simulated Payment
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    This is a demo. No real money will be charged.
                  </p>
                  <button
                    onClick={() => setShowCheckoutConfirm(true)}
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Processing...' : 'Complete Purchase'}
                  </button>
                  <button
                    onClick={() => setIsCheckingOut(false)}
                    className="w-full mt-2 text-gray-500 text-sm font-medium hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-6">
              Secure checkout powered by CampusMarket
            </p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={itemToRemove !== null}
        onClose={() => setItemToRemove(null)}
        onConfirm={() => itemToRemove && removeFromCart(itemToRemove)}
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
        message={`You are about to purchase ${cart.length} item(s) for a total of $${total.toFixed(2)}. This is a simulated transaction.`}
        confirmText="Confirm Purchase"
      />
    </div>
  );
};

export default Cart;
