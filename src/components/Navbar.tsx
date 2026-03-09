import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { ShoppingBag, ShoppingCart, Settings, Moon, Sun, Eye, Zap, Menu, X as CloseIcon } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const { cart } = useCart();
  const { notifications } = useSocket();
  const { darkMode, highContrast, reducedMotion, toggleDarkMode, toggleHighContrast, toggleReducedMotion } = useAccessibility();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
    setShowLogoutConfirm(false);
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 py-3' 
        : 'bg-slate-50 dark:bg-slate-950 py-5'
    }`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-indigo-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-slate-50">
              Campus<span className="text-indigo-600">Market</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">Marketplace</Link>
            {user ? (
              <>
                <Link to="/messages" className="relative text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">
                  Messages
                  {notifications > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] h-4 w-4 rounded-full flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">My Account</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors">Admin Panel</Link>
                )}
                <Link to="/create-listing" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none">
                  Sell Item
                </Link>

                <div className="relative" ref={settingsRef}>
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
                    aria-label="Accessibility Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  
                  {showSettings && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Accessibility</span>
                      </div>
                      <div className="space-y-3">
                        <button onClick={toggleDarkMode} className="w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            <span>Dark Mode</span>
                          </div>
                          <div className={`w-8 h-4 rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${darkMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                          </div>
                        </button>
                        <button onClick={toggleHighContrast} className="w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <span>High Contrast</span>
                          </div>
                          <div className={`w-8 h-4 rounded-full transition-colors ${highContrast ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${highContrast ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                          </div>
                        </button>
                        <button onClick={toggleReducedMotion} className="w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            <span>Reduced Motion</span>
                          </div>
                          <div className={`w-8 h-4 rounded-full transition-colors ${reducedMotion ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${reducedMotion ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => setShowLogoutConfirm(true)} className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors">Logout</button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">Login</Link>
                <Link to="/register" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none">
                  Join Now
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-slate-600 dark:text-slate-400" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <CloseIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 space-y-4 animate-in slide-in-from-top duration-300">
          <Link to="/" className="block text-sm font-bold p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">Marketplace</Link>
          {user ? (
            <>
              <Link to="/messages" className="block text-sm font-bold p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">Messages</Link>
              <Link to="/profile" className="block text-sm font-bold p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">My Account</Link>
              <Link to="/create-listing" className="block text-sm font-bold p-3 bg-indigo-600 text-white rounded-xl text-center">Sell Item</Link>
              
              <div className="p-3 space-y-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessibility</p>
                <div className="space-y-4">
                  <button onClick={toggleDarkMode} className="w-full flex items-center justify-between text-sm font-bold">
                    <div className="flex items-center gap-2">
                      {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      <span>Dark Mode</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${darkMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  <button onClick={toggleHighContrast} className="w-full flex items-center justify-between text-sm font-bold">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>High Contrast</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors ${highContrast ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${highContrast ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  <button onClick={toggleReducedMotion} className="w-full flex items-center justify-between text-sm font-bold">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span>Reduced Motion</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors ${reducedMotion ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${reducedMotion ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                </div>
              </div>

              <button onClick={() => setShowLogoutConfirm(true)} className="w-full text-left text-sm font-bold p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">Logout</button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Link to="/login" className="text-sm font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">Login</Link>
              <Link to="/register" className="text-sm font-bold p-3 bg-indigo-600 text-white rounded-xl text-center">Join Now</Link>
            </div>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Logout"
        message="Are you sure you want to logout? You will need to sign in again to access your account."
        confirmText="Logout"
        type="danger"
      />
    </nav>
  );
};

export default Navbar;
