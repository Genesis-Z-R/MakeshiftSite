import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { User, Package, Clock, ArrowLeft, ShoppingBag } from 'lucide-react';

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
}

interface SellerInfo {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

const SellerProfile: React.FC = () => {
  const { id } = useParams();
  const { announce } = useAccessibility();
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        const [sellerRes, listingsRes] = await Promise.all([
          api.get(`/users/${id}`),
          api.get('/listings', { params: { seller_id: id } })
        ]);
        setSeller(sellerRes.data);
        // The /api/listings route might need adjustment to filter by seller_id if not already supported
        // Let's assume for now we filter on frontend if backend doesn't support it yet, 
        // but better to check server.ts
        setListings(listingsRes.data.filter((l: any) => l.seller_id === Number(id)));
        announce(`Viewing profile of ${sellerRes.data.name}`);
      } catch (error) {
        console.error('Error fetching seller data:', error);
        announce('Error loading seller profile.', 'assertive');
      } finally {
        setLoading(false);
      }
    };
    fetchSellerData();
  }, [id, announce]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center">Loading...</div>;
  if (!seller) return <div className="max-w-7xl mx-auto px-4 py-20 text-center">Seller not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link 
        to="/" 
        className="flex items-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 font-medium transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Marketplace
      </Link>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 mb-12 transition-colors duration-200">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-24 w-24 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            {seller.name.charAt(0)}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{seller.name}</h1>
            <p className="text-slate-500 dark:text-slate-400">Member since {new Date(seller.created_at).toLocaleDateString()}</p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{listings.length}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm ml-2">Active Listings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-8 flex items-center gap-2">
        <Package className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        Listings by {seller.name}
      </h2>

      {listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {listings.map((listing, idx) => (
            <Link
              key={`seller-listing-${listing.id}-${idx}`}
              to={`/listing/${listing.id}`}
              className="group card overflow-hidden flex flex-col"
            >
              <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                <img
                  src={listing.image_url || `https://picsum.photos/seed/${listing.id}/400/400`}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 shadow-sm">
                  {listing.category}
                </div>
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {listing.title}
                  </h3>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">${listing.price}</span>
                </div>
                <div className="mt-auto flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                  </div>
                  {listing.sold_count > 0 && (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {listing.sold_count} sold
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <ShoppingBag className="h-16 w-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-900 dark:text-slate-50">No active listings</h3>
          <p className="text-slate-500 dark:text-slate-400">This user hasn't posted anything for sale yet.</p>
        </div>
      )}
    </div>
  );
};

export default SellerProfile;
