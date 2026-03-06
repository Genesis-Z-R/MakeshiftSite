import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, Filter, Clock, Tag, User, ShoppingBag } from 'lucide-react';

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  seller_name: string;
  created_at: string;
}

const Home: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Textbooks', 'Electronics', 'Furniture', 'Clothing', 'Sports', 'Books', 'Services', 'Other'];

  const fetchListings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/listings', {
        params: { search, category, sort }
      });
      setListings(response.data);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, category, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl tracking-tight mb-4">
          Campus Marketplace
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
          The easiest way to buy and sell items with your fellow students.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/login" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            Get Started
          </Link>
          <Link to="/register" className="bg-white text-indigo-600 border border-indigo-100 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all">
            Join Community
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for items..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              className="border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <select
            className="border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-100 animate-pulse rounded-2xl aspect-[3/4]"></div>
          ))}
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              to={`/listing/${listing.id}`}
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="aspect-square overflow-hidden bg-gray-100 relative">
                <img
                  src={listing.image_url || `https://picsum.photos/seed/${listing.id}/400/400`}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-semibold text-indigo-600 shadow-sm">
                  {listing.category}
                </div>
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {listing.title}
                  </h3>
                  <span className="text-lg font-bold text-indigo-600">${listing.price}</span>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="flex items-center text-xs text-gray-500 gap-1">
                    <User className="h-3 w-3" />
                    <span>{listing.seller_name}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-400 gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <ShoppingBag className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900">No listings found</h3>
          <p className="text-gray-500">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};

export default Home;
