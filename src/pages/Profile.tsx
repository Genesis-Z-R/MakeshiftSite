import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { User, Mail, Calendar, Package, Trash2, ExternalLink, ShoppingBag, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';

interface UserListing {
  id: number;
  title: string;
  price: number;
  status: string;
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
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { announce } = useAccessibility();
  const [listings, setListings] = useState<UserListing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingToDelete, setListingToDelete] = useState<number | null>(null);
  const [listingToMarkSold, setListingToMarkSold] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsRes, transactionsRes, warningsRes] = await Promise.all([
          api.get('/listings'),
          api.get('/transactions'),
          api.get('/warnings')
        ]);
        
        // Filter listings by current user
        const allListings = Array.isArray(listingsRes.data) ? listingsRes.data : [];
        const userListings = allListings.filter((l: any) => l.seller_id === user?.id);
        setListings(userListings);
        setTransactions(Array.isArray(transactionsRes.data) ? transactionsRes.data : []);
        setWarnings(Array.isArray(warningsRes.data) ? warningsRes.data : []);
        announce(`Profile loaded. You have ${userListings.length} listings, ${transactionsRes.data.length} purchases, and ${warningsRes.data.length} warnings.`);
      } catch (error) {
        console.error('Error fetching profile data:', error);
        announce('Failed to load profile data.', 'assertive');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  const handleDelete = async () => {
    if (!listingToDelete) return;
    try {
      await api.delete(`/listings/${listingToDelete}`);
      setListings(listings.filter(l => l.id !== listingToDelete));
      announce('Listing deleted successfully.');
    } catch (error) {
      console.error('Error deleting listing:', error);
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
      console.error('Error marking as sold:', error);
      announce('Failed to update listing.', 'assertive');
    } finally {
      setListingToMarkSold(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info Card */}
        <aside className="lg:col-span-1" aria-label="User Profile Information">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 sticky top-24 transition-colors duration-200">
            <div className="text-center mb-8">
              <div className="h-24 w-24 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold">
                {user!.name.charAt(0)}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{user!.name}</h2>
              <p className="text-indigo-600 dark:text-indigo-400 font-medium capitalize">{user!.role}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
                <span className="text-sm">{user!.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <Calendar className="h-5 w-5 text-slate-400" aria-hidden="true" />
                <span className="text-sm">Joined CampusMarket</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500 dark:text-slate-400 text-sm">Active Listings</span>
                <span className="font-bold text-slate-900 dark:text-slate-50">{listings.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 text-sm">Total Purchases</span>
                <span className="font-bold text-slate-900 dark:text-slate-50">{transactions.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Section */}
        <main className="lg:col-span-2 space-y-12">
          {/* Warnings Section (if any) */}
          {warnings.length > 0 && (
            <section aria-labelledby="warnings-heading" className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-3xl p-6">
                <h3 id="warnings-heading" className="text-xl font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                  Account Warnings
                </h3>
                <div className="space-y-3">
                  {warnings.map((warning) => (
                    <div key={warning.id} className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">From Admin: {warning.admin_name}</span>
                        <span className="text-[10px] text-amber-400 dark:text-amber-600">{new Date(warning.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-amber-900 dark:text-amber-100">{warning.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Listings Section */}
          <section aria-labelledby="listings-heading">
            <h3 id="listings-heading" className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6 flex items-center gap-2">
              <Package className="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              Your Listings
            </h3>

            {loading ? (
              <div className="space-y-4" role="status">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
                ))}
                <span className="sr-only">Loading listings...</span>
              </div>
            ) : listings.length > 0 ? (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <div key={listing.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group transition-colors duration-200">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{listing.title}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">${listing.price}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                          listing.status === 'available' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          {listing.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {listing.status === 'available' && (
                        <button
                          onClick={() => setListingToMarkSold(listing.id)}
                          className="p-2 text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          aria-label={`Mark ${listing.title} as Sold`}
                        >
                          <CheckCircle className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}
                      <Link 
                        to={`/listing/${listing.id}`} 
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        aria-label={`View details for ${listing.title}`}
                      >
                        <ExternalLink className="h-5 w-5" aria-hidden="true" />
                      </Link>
                      <button 
                        onClick={() => setListingToDelete(listing.id)} 
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        aria-label={`Delete listing ${listing.title}`}
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                <Package className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" aria-hidden="true" />
                <h4 className="text-lg font-medium text-slate-900 dark:text-slate-50">You haven't listed anything yet</h4>
                <Link to="/create-listing" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline mt-2 inline-block">
                  Create your first listing
                </Link>
              </div>
            )}
          </section>

          {/* Purchase History Section */}
          <section aria-labelledby="purchases-heading">
            <h3 id="purchases-heading" className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              Purchase History
            </h3>

            {loading ? (
              <div className="space-y-4" role="status">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
                ))}
                <span className="sr-only">Loading purchase history...</span>
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-200">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0">
                      <img src={tx.image_url || 'https://picsum.photos/seed/tx/200/200'} alt={`Image of ${tx.title}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-slate-900 dark:text-slate-50">{tx.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">${tx.amount.toFixed(2)}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Completed
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                <ShoppingBag className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" aria-hidden="true" />
                <h4 className="text-lg font-medium text-slate-900 dark:text-slate-50">No purchases yet</h4>
                <Link to="/" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline mt-2 inline-block">
                  Browse marketplace
                </Link>
              </div>
            )}
          </section>
        </main>
      </div>

      <ConfirmationModal
        isOpen={listingToDelete !== null}
        onClose={() => setListingToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      <ConfirmationModal
        isOpen={listingToMarkSold !== null}
        onClose={() => setListingToMarkSold(null)}
        onConfirm={handleMarkAsSold}
        title="Mark as Sold"
        message="Are you sure you want to mark this item as sold? It will no longer be available for purchase."
        confirmText="Mark as Sold"
      />
    </div>
  );
};

export default Profile;
