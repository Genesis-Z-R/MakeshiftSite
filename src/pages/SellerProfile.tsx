import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { User, Package, Clock, ArrowLeft, ShoppingBag, Loader2 } from 'lucide-react';

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
  sold_count?: number;
}

interface SellerInfo {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

const SellerProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { announce } = useAccessibility();
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        setLoading(true);
        // Using Promise.all to fetch both seller info and their listings at once
        const [sellerRes, listingsRes] = await Promise.all([
          api.get(`/users/${id}`),
          // FIXED: backend already supports filtering by seller_id in server.ts
          api.get('/listings', { params: { seller_id: id } })
        ]);
        
        setSeller(sellerRes.data);
        setListings(listingsRes.data);
        announce(`Viewing profile of ${sellerRes.data.name}`);
      } catch (error) {
        console.error('Error fetching seller data:', error);
        announce('Error loading seller profile.', 'assertive');
        // If the user doesn't exist, redirecting home is safer
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchSellerData();
  }, [id, announce, navigate]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
      <p className="font-bold text-slate-500">Loading profile...</p>
    </div>
  );

  if (!seller) return <div className="max-w-7xl mx-auto px-4 py-20 text-center font-bold">Seller not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 mb-8 font-black transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </button>

      {/* Seller Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 p-10 mb-12 transition-all">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="h-28 w-28 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-indigo-200 dark:shadow-none">
            {seller.name.charAt(0)}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight mb-2">{seller.name}</h1>
            <div className="flex items-center justify-center md:justify-start gap-4 text-slate-500 font-bold">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Joined {new Date(seller.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <span className="text-indigo-600 dark:text-indigo-400 font-black text-2xl">{listings.length}</span>
                <span className="text-slate-500 dark:text-slate-400 font-bold text-sm ml-2 uppercase tracking-widest">Active Listings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 mb-8 flex items-center gap-3">
        <Package className="h-7 w-7 text-indigo-600" />
        Storefront
      </h2>

      {listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              to={`/listing/${listing.id}`}
              className="group bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-square overflow-hidden rounded-[2rem] bg-slate-100 dark:bg-slate-800 mb-4">
                <img
                  src={listing.image_url || `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80`}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="px-2">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-full uppercase tracking-widest">
                  {listing.category}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 truncate mt-2 group-hover:text-indigo-600 transition-colors">
                  {listing.title}
                </h3>
                <div className="mt-4 flex items-center justify-between">
                  {/* FIXED: Changed $ to GH₵ */}
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-50">GH₵{Number(listing.price).toFixed(2)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
          <ShoppingBag className="h-20 w-20 text-slate-100 dark:text-slate-800 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 mb-2">Empty Storefront</h3>
          <p className="text-slate-500 font-bold">This user hasn't posted anything for sale yet.</p>
        </div>
      )}
    </div>
  );
};

export default SellerProfile;