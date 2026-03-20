import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { Package, Trash2, ShoppingBag, LogOut, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';

interface UserListing {
  id: number;
  title: string;
  price: number;
  status: string;
  image_url: string;
  category: string;
  created_at: string;
}

interface Transaction {
  id: number;
  title: string;
  amount: number;
  image_url: string;
  created_at: string;
}

interface Warning {
  id: number;
  message: string;
  created_at: string;
  admin_name: string;
  admin_id: string;
}

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const { announce } = useAccessibility();
  const [listings, setListings] = useState<UserListing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'purchases'>('listings');
  const [listingToDelete, setListingToDelete] = useState<number | null>(null);
  const [listingToMarkSold, setListingToMarkSold] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsRes, transactionsRes, warningsRes] = await Promise.all([
          api.get('/listings', { params: { seller_id: user?.id } }),
          api.get('/transactions'),
          api.get('/warnings')
        ]);
        
        const userListings = Array.isArray(listingsRes.data) ? listingsRes.data : [];
        const userTransactions = Array.isArray(transactionsRes.data) ? transactionsRes.data : [];
        const userWarnings = Array.isArray(warningsRes.data) ? warningsRes.data : [];
        
        setListings(userListings);
        setTransactions(userTransactions);
        setWarnings(userWarnings);
        
        announce(`Profile loaded. You have ${userListings.length} listings, ${userTransactions.length} purchases, and ${userWarnings.length} warnings.`);
      } catch (error) {
        console.error('Error fetching profile data:', error);
        announce('Failed to load profile data.', 'assertive');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user, announce]);

  const handleDelete = async () => {
    if (!listingToDelete) return;
    try {
      await api.delete(`/listings/${listingToDelete}`);
      setListings(listings.filter(l => l.id !== listingToDelete));
      announce('Listing deleted successfully.');
    } catch (error) {
      announce('Failed to delete listing.', 'assertive');
    } finally {
      setListingToDelete(null);
    }
  };

  const handleMarkAsSold = async () => {
    if (!listingToMarkSold) return;
    try {
      const listing = listings.find(l => l.id === listingToMarkSold);
      if (!listing) return;
      await api.put(`/listings/${listingToMarkSold}`, { ...listing, status: 'sold' });
      setListings(listings.map(l => l.id === listingToMarkSold ? { ...l, status: 'sold' } : l));
      announce('Listing marked as sold.');
    } catch (error) {
      announce('Failed to update listing.', 'assertive');
    } finally {
      setListingToMarkSold(null);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pt-12 pb-6 px-4 text-center">
        <div className="h-20 w-20 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-white dark:text-slate-900 text-3xl font-black">
          {user!.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{user!.name}</h1>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">{user!.email}</p>
        
        <button onClick={logout} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/50 p-4">
          <div className="max-w-7xl mx-auto flex flex-col gap-3">
            <h3 className="text-sm font-black text-red-700 dark:text-red-400 flex items-center gap-2 uppercase tracking-widest">
              <AlertTriangle className="h-4 w-4" />
              Account Warnings
            </h3>
            {warnings.map((warning, idx) => (
              <div key={idx} className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                <p className="text-sm text-red-900 dark:text-red-200">{warning.message}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">From: {warning.admin_name}</span>
                  <span className="text-[10px] font-bold text-red-400">{new Date(warning.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-center">
        <button 
          onClick={() => setActiveTab('listings')}
          className={`flex-1 max-w-[200px] py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'listings' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-400'}`}
        >
          My Listings
        </button>
        <button 
          onClick={() => setActiveTab('purchases')}
          className={`flex-1 max-w-[200px] py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'purchases' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-400'}`}
        >
          Purchases
        </button>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-2 md:px-8 py-6">
        {activeTab === 'listings' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            {listings.map(listing => (
              <div key={listing.id} className="flex flex-col bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800/50 shadow-sm">
                <Link to={`/listing/${listing.id}`} className="relative aspect-[4/5] bg-slate-100 dark:bg-slate-800">
                  <img src={listing.image_url || '/placeholder.png'} alt={listing.title} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 flex gap-1">
                    <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-widest">
                      {listing.category}
                    </div>
                    {listing.status === 'sold' && (
                      <div className="bg-slate-900 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-widest">
                        Sold
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-2 md:p-3 flex flex-col flex-1">
                  <Link to={`/listing/${listing.id}`}>
                    <h3 className="font-medium text-[11px] md:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                      {listing.title}
                    </h3>
                  </Link>
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <span className="text-sm md:text-base font-black text-slate-900 dark:text-white">GH₵{Number(listing.price).toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => setListingToMarkSold(listing.id)} disabled={listing.status === 'sold'} className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 border-r border-slate-100 dark:border-slate-800">
                    Sold
                  </button>
                  <button onClick={() => setListingToDelete(listing.id)} className="py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-xl md:border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.map(tx => (
              <div key={tx.id} className="flex gap-4 p-4 items-center">
                <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                  <img src={tx.image_url || '/placeholder.png'} alt={tx.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{tx.title}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 dark:text-white">GH₵{Number(tx.amount).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                No purchases yet
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmationModal isOpen={listingToDelete !== null} onClose={() => setListingToDelete(null)} onConfirm={handleDelete} title="Delete Listing" message="Are you sure? This cannot be undone." confirmText="Delete" type="danger" />
      <ConfirmationModal isOpen={listingToMarkSold !== null} onClose={() => setListingToMarkSold(null)} onConfirm={handleMarkAsSold} title="Mark as Sold" message="Item will be marked as sold." confirmText="Confirm" />
    </div>
  );
};

export default Profile;