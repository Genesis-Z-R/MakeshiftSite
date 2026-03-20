import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import Navbar from './components/Navbar';
import FloatingCart from './components/FloatingCart';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import SellerProfile from './pages/SellerProfile';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Cart from './pages/Cart';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';

// FIXED: Added a loading spinner so the screen doesn't "freeze" or go blank while logging in
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      <p className="mt-4 text-sm font-bold text-slate-400">Verifying access...</p>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      <p className="mt-4 text-sm font-bold text-slate-400">Verifying admin credentials...</p>
    </div>
  );
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/" />;
};

// FIXED: Created a layout wrapper to hide navigation on auth pages
const AppLayout = () => {
  const location = useLocation();
  
  // Check if the current URL is an auth-related page
  const isAuthPage = ['/login', '/register', '/forgot-password', '/update-password'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-200">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      
      {/* Only show the Navbar if we are NOT on an auth page */}
      {!isAuthPage && <Navbar />}
      
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/seller/:id" element={<SellerProfile />} />
          <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
          <Route path="/create-listing" element={<PrivateRoute><CreateListing /></PrivateRoute>} />
          <Route path="/edit-listing/:id" element={<PrivateRoute><EditListing /></PrivateRoute>} />
          <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        </Routes>
      </main>

      {/* Only show Cart and Footer if we are NOT on an auth page */}
      {!isAuthPage && <FloatingCart />}
      
      {!isAuthPage && (
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-12 mt-auto transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              © 2026 CampusMarket. Built for students, by students.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <SocketProvider>
          <CartProvider>
            {/* The Router must wrap the AppLayout so useLocation works */}
            <Router>
              <AppLayout />
            </Router>
          </CartProvider>
        </SocketProvider>
      </AuthProvider>
    </AccessibilityProvider>
  );
}