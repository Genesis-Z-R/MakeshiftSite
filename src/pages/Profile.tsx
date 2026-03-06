import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { User, Mail, Calendar, Package, Trash2, ExternalLink, ShoppingBag, Clock, CheckCircle } from 'lucide-react';
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

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<UserListing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingToDelete, setListingToDelete] = useState<number | null>(null);
  const [listingToMarkSold, setListingToMarkSold] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsRes, transactionsRes] = await Promise.all([
          api.get('/listings'),
          api.get('/transactions')
        ]);
        
        // Filter listings by current user
        const allListings = Array.isArray(listingsRes.data) ? listingsRes.data : [];
        setListings(allListings.filter((l: any) => l.seller_id === user?.id));
        setTransactions(Array.isArray(transactionsRes.data) ? transactionsRes.data : []);
      } catch (error) {
        console.error('Error fetching profile data:', error);
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
    } catch (error) {
      console.error('Error deleting listing:', error);
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
    } catch (error) {
      console.error('Error marking as sold:', error);
    } finally {
      setListingToMarkSold(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sticky top-24">
            <div className="text-center mb-8">
              <div className="h-24 w-24 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold">
                {user!.name.charAt(0)}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{user!.name}</h2>
              <p className="text-indigo-600 font-medium capitalize">{user!.role}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="h-5 w-5 text-gray-400" />
                <span className="text-sm">{user!.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span className="text-sm">Joined CampusMarket</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 text-sm">Active Listings</span>
                <span className="font-bold text-gray-900">{listings.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Total Purchases</span>
                <span className="font-bold text-gray-900">{transactions.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="lg:col-span-2 space-y-12">
          {/* Listings Section */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Package className="h-6 w-6 text-indigo-600" />
              Your Listings
            </h3>

            {loading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl"></div>
                ))}
              </div>
            ) : listings.length > 0 ? (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <div key={listing.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{listing.title}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-indigo-600 font-bold">${listing.price}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                          listing.status === 'available' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {listing.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {listing.status === 'available' && (
                        <button
                          onClick={() => setListingToMarkSold(listing.id)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Mark as Sold"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                      <Link to={`/listing/${listing.id}`} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                        <ExternalLink className="h-5 w-5" />
                      </Link>
                      <button onClick={() => setListingToDelete(listing.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                <Package className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900">You haven't listed anything yet</h4>
                <Link to="/create-listing" className="text-indigo-600 font-bold hover:underline mt-2 inline-block">
                  Create your first listing
                </Link>
              </div>
            )}
          </div>

          {/* Purchase History Section */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-indigo-600" />
              Purchase History
            </h3>

            {loading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl"></div>
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                      <img src={tx.image_url || 'https://picsum.photos/seed/tx/200/200'} alt={tx.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-gray-900">{tx.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span className="font-bold text-indigo-600">${tx.amount.toFixed(2)}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Completed
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                <ShoppingBag className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900">No purchases yet</h4>
                <Link to="/" className="text-indigo-600 font-bold hover:underline mt-2 inline-block">
                  Browse marketplace
                </Link>
              </div>
            )}
          </div>
        </div>
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
