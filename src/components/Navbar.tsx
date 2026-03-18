import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { ShoppingBag, Settings, Moon, Sun, Eye, Zap, Menu, X as CloseIcon } from 'lucide-react';
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
    // UPDATED: Standardized bg colors for seamless transitions
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 py-3 shadow-sm' 
        : 'bg-slate-50 dark:bg-black py-5'
    }`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-indigo-600 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-indigo-200 dark:shadow-none">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-slate-50">
              Campus<span className="text-indigo-600">Market</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Marketplace</Link>
            {user ? (
              <>
                <Link to="/messages" className="relative text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">
                  Messages
                  {notifications > 0 && (
                    <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center animate-pulse">
                      {notifications}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Account</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-sm font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors">Admin</Link>
                )}
                <Link to="/create-listing" className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none uppercase tracking-widest">
                  Sell Item
                </Link>

                <div className="relative" ref={settingsRef}>
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-all"
                    aria-label="Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  
                  {showSettings && (
                    <div className="absolute right-0 mt-4 w-72 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-2xl p-6 z-50 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aesthetic Settings</p>
                      <div className="space-y-4">
                        <button onClick={toggleDarkMode} className="w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</div>
                            <span>Dark Mode</span>
                          </div>
                          <div className={`w-10 h-5 rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <div className={`w-3.5 h-3.5 bg-white rounded-full mt-0.75 transition-transform ${darkMode ? 'translate-x-5.5' : 'translate-x-1'}`} />
                          </div>
                        </button>
                        {/* High Contrast / Reduced Motion buttons styled similarly ... */}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => setShowLogoutConfirm(true)} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors px-2">Logout</button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Login</Link>
                <Link to="/register" className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none uppercase tracking-widest">
                  Join
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <CloseIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-6 space-y-4 animate-in slide-in-from-top duration-300">
          <Link to="/" className="block text-sm font-black uppercase p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50 transition-colors">Marketplace</Link>
          {user ? (
            <>
              <Link to="/messages" className="block text-sm font-black uppercase p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50 transition-colors">Messages</Link>
              <Link to="/profile" className="block text-sm font-black uppercase p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50 transition-colors">Account</Link>
              <Link to="/create-listing" className="block text-sm font-black uppercase p-5 bg-indigo-600 text-white rounded-[2rem] text-center shadow-lg shadow-indigo-100 dark:shadow-none">Sell Item</Link>
              
              <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settings</p>
                <button onClick={toggleDarkMode} className="w-full flex items-center justify-between text-sm font-black uppercase text-slate-900 dark:text-slate-50">
                  <div className="flex items-center gap-3">
                    {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    <span>Dark Mode</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full mt-0.75 transition-transform ${darkMode ? 'translate-x-5.5' : 'translate-x-1'}`} />
                  </div>
                </button>
              </div>

              <button onClick={() => setShowLogoutConfirm(true)} className="w-full text-center text-sm font-black uppercase p-4 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">Logout Account</button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Link to="/login" className="text-sm font-black uppercase p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-900 dark:text-slate-50">Login</Link>
              <Link to="/register" className="text-sm font-black uppercase p-4 bg-indigo-600 text-white rounded-2xl text-center">Join</Link>
            </div>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        type="danger"
      />
    </nav>
  );
};

export default Navbar;