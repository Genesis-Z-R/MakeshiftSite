import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { ShoppingBag, ShoppingCart, Settings, Moon, Sun, Eye, Zap } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { notifications } = useSocket();
  const { darkMode, highContrast, reducedMotion, toggleDarkMode, toggleHighContrast, toggleReducedMotion } = useAccessibility();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 py-3 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center space-x-2" aria-label="CampusMarket Home">
            <ShoppingBag className="h-6 w-6 text-indigo-600" />
            <span className="text-lg font-bold text-slate-900 dark:text-slate-50">CampusMarket</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <Link to="/" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm">Market</Link>
            <Link to="/messages" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm relative flex items-center gap-1" aria-label={`Messages, ${notifications} new`}>
              Messages
              {notifications > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-black h-4 w-4 flex items-center justify-center rounded-full border border-white animate-bounce">
                  {notifications}
                </span>
              )}
            </Link>
            <Link to="/profile" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm">Profile</Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm">Admin</Link>
            )}
            
            <div className="relative" ref={settingsRef}>
              <button 
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                aria-label="Accessibility Settings"
                aria-expanded={showSettings}
              >
                <Settings className="h-6 w-6" />
              </button>
              
              {showSettings && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accessibility</span>
                  </div>
                  <button 
                    type="button"
                    onClick={toggleDarkMode}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    role="switch"
                    aria-checked={darkMode}
                  >
                    <div className="flex items-center gap-2">
                      {darkMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                      <span>Dark Mode</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${darkMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  <button 
                    type="button"
                    onClick={toggleHighContrast}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    role="switch"
                    aria-checked={highContrast}
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      <span>High Contrast</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors ${highContrast ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${highContrast ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  <button 
                    type="button"
                    onClick={toggleReducedMotion}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    role="switch"
                    aria-checked={reducedMotion}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" aria-hidden="true" />
                      <span>Reduced Motion</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors ${reducedMotion ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${reducedMotion ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                </div>
              )}
            </div>

            <Link to="/cart" className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" aria-label={`Cart, ${cart.length} items`}>
              <ShoppingCart className="h-6 w-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm">
                  {cart.length}
                </span>
              )}
            </Link>

            <Link to="/create-listing" className="btn-primary text-sm font-bold">
              Sell Item
            </Link>
            
            {!user ? (
              <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">Login</Link>
            ) : (
              <button onClick={() => setShowLogoutConfirm(true)} className="text-red-600 dark:text-red-400 font-bold text-sm cursor-pointer">
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
