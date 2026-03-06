import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { ShoppingBag, ShoppingCart, MessageSquare } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { notifications } = useSocket();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center space-x-2">
            <ShoppingBag className="h-6 w-6 text-indigo-600" />
            <span className="text-lg font-bold text-gray-900">CampusMarket</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <Link to="/" className="text-gray-600 hover:text-indigo-600 font-bold text-sm">Market</Link>
            <Link to="/messages" className="text-gray-600 hover:text-indigo-600 font-bold text-sm relative flex items-center gap-1">
              Messages
              {notifications > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-black h-4 w-4 flex items-center justify-center rounded-full border border-white animate-bounce">
                  {notifications}
                </span>
              )}
            </Link>
            <Link to="/profile" className="text-gray-600 hover:text-indigo-600 font-bold text-sm">Profile</Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-gray-600 hover:text-indigo-600 font-bold text-sm">Admin</Link>
            )}
            
            <Link to="/cart" className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors">
              <ShoppingCart className="h-6 w-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {cart.length}
                </span>
              )}
            </Link>

            <Link to="/create-listing" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-sm font-bold">
              Sell Item
            </Link>
            
            {!user ? (
              <Link to="/login" className="text-indigo-600 font-bold text-sm">Login</Link>
            ) : (
              <button onClick={() => setShowLogoutConfirm(true)} className="text-red-600 font-bold text-sm cursor-pointer">
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Logout"
        message="Are you sure you want to logout? You will need to login again to access your account."
        confirmText="Logout"
        type="danger"
      />
    </nav>
  );
};

export default Navbar;
