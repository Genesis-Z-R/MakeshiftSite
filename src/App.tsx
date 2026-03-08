import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/" />;
};

export default function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <SocketProvider>
          <CartProvider>
            <Router>
              <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-200">
                <a href="#main-content" className="skip-to-content">
                  Skip to main content
                </a>
                <Navbar />
                <main id="main-content" tabIndex={-1}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/listing/:id" element={<ListingDetail />} />
                    <Route path="/seller/:id" element={<SellerProfile />} />
                    <Route path="/cart" element={
                      <PrivateRoute>
                        <Cart />
                      </PrivateRoute>
                    } />
                    <Route path="/create-listing" element={
                      <PrivateRoute>
                        <CreateListing />
                      </PrivateRoute>
                    } />
                    <Route path="/edit-listing/:id" element={
                      <PrivateRoute>
                        <EditListing />
                      </PrivateRoute>
                    } />
                    <Route path="/messages" element={
                      <PrivateRoute>
                        <Messages />
                      </PrivateRoute>
                    } />
                    <Route path="/profile" element={
                      <PrivateRoute>
                        <Profile />
                      </PrivateRoute>
                    } />
                    <Route path="/admin" element={
                      <AdminRoute>
                        <Admin />
                      </AdminRoute>
                    } />
                  </Routes>
                </main>
                <FloatingCart />
            
            <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-12 mt-20 transition-colors duration-200">
              <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-slate-400 dark:text-slate-500 text-sm">
                  © 2026 CampusMarket. Built for students, by students.
                </p>
              </div>
            </footer>
          </div>
        </Router>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  </AccessibilityProvider>
  );
}
