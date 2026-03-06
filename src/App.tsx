import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
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
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
              <Navbar />
              <main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/listing/:id" element={<ListingDetail />} />
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
            
            <footer className="bg-white border-t border-gray-100 py-12 mt-20">
              <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-gray-400 text-sm">
                  © 2026 CampusMarket. Built for students, by students.
                </p>
              </div>
            </footer>
          </div>
        </Router>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
