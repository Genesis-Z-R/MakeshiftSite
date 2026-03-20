import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { ShoppingBag, Settings, Moon, Sun, PlusCircle, User, MessageSquare, ShieldAlert, LogIn, UserPlus } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user } = useAuth();
  const { notifications } = useSocket();
  const { darkMode, toggleDarkMode } = useAccessibility();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

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

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 py-3 shadow-sm' 
          : 'bg-slate-50 dark:bg-black py-4 md:py-5'
      }`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-indigo-600 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-indigo-200 dark:shadow-none">
                <ShoppingBag className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <span className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 dark:text-slate-50">
                Campus<span className="text-indigo-600">Market</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Marketplace</Link>
              {user ? (
                <>
                  <Link to="/messages" className="relative text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">
                    Messages
                    {notifications > 0 && (
                      <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center animate-pulse shadow-md">
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

            <div className="relative" ref={settingsRef}>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2.5 md:p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-all"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              
              {showSettings && (
                <div className="absolute right-0 mt-4 w-64 md:w-72 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-2xl p-6 z-50 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aesthetic Settings</p>
                  <div className="space-y-4">
                    <button onClick={toggleDarkMode} className="w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</div>
                        <span>Dark Mode</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full transition-colors relative ${darkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 pb-safe pt-2 px-6 z-50">
        {user ? (
          <div className="flex justify-between items-center pb-2">
            <Link to="/" className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>
              <ShoppingBag className={`h-6 w-6 ${isActive('/') ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-wider">Home</span>
            </Link>

            <Link to="/messages" className={`relative flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/messages') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>
              <MessageSquare className={`h-6 w-6 ${isActive('/messages') ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-wider">Inbox</span>
              {notifications > 0 && (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                  {notifications}
                </span>
              )}
            </Link>

            <Link to="/create-listing" className="relative -top-5 flex flex-col items-center group">
              <div className="bg-indigo-600 text-white p-4 rounded-full shadow-lg shadow-indigo-200 dark:shadow-none group-active:scale-95 transition-transform">
                <PlusCircle className="h-7 w-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-50 mt-1">Sell</span>
            </Link>

            {user.role === 'admin' ? (
              <Link to="/admin" className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/admin') ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>
                <ShieldAlert className={`h-6 w-6 ${isActive('/admin') ? 'fill-amber-100 dark:fill-amber-900/30' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-wider">Admin</span>
              </Link>
            ) : (
              <div className="w-10"></div> 
            )}

            <Link to="/profile" className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/profile') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>
              <User className={`h-6 w-6 ${isActive('/profile') ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-wider">Profile</span>
            </Link>
          </div>
        ) : (
          <div className="flex justify-around items-center pb-2 px-4">
            <Link to="/" className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>
              <ShoppingBag className={`h-6 w-6 ${isActive('/') ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-wider">Home</span>
            </Link>

            <Link to="/login" className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/login') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>
              <LogIn className={`h-6 w-6 ${isActive('/login') ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-wider">Login</span>
            </Link>

            <Link to="/register" className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/register') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>
              <UserPlus className={`h-6 w-6 ${isActive('/register') ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-wider">Join</span>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;