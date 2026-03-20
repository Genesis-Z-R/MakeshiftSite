import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
  status: string;
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
        const [sellerRes, listingsRes] = await Promise.all([
          api.get(`/users/${id}`),
          api.get('/listings', { params: { seller_id: id } })
        ]);
        setSeller(sellerRes.data);
        setListings(listingsRes.data);
        announce(`Viewing profile of ${sellerRes.data.name}`);
      } catch (error) {
        console.error('Error fetching seller data:', error);
        announce('Error loading seller profile.', 'assertive');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchSellerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  if (!seller) return null;

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 py-4 flex items-center border-b border-slate-100 dark:border-slate-900">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-900 dark:text-white">
          <ArrowLeft className="h-6 w-6" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pt-8 pb-8 px-4 text-center">
        <div className="h-20 w-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-900 dark:text-white text-3xl font-black">
          {seller.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{seller.name}</h1>
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
            {listings.length} Listings
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
            Joined {new Date(seller.created_at).getFullYear()}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-2 md:px-8 py-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Storefront</h2>
        
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            {listings.map((listing) => (
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
                  <div className="mt-auto pt-2">
                    <span className="text-sm md:text-base font-black text-slate-900 dark:text-white">
                      GH₵{Number(listing.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[10px] font-black uppercase tracking-widest text-slate-400">
            No active listings
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerProfile;