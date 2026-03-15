// frontend/src/pages/Home.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { 
  Search, Filter, ShoppingBag, Loader2, BookOpen, Settings as SettingsIcon, 
  MoreHorizontal, Store, Smartphone, Home as HomeIcon,
  HeartPulse, Utensils, Car, Shirt, Trophy
} from 'lucide-react';

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  seller_id: string;
  seller_name: string;
  created_at: string;
}

const LIMIT = 12;

const Home: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { announce } = useAccessibility();

  // FIXED: Standardized Categories to match the Create Listing page
  const categoryItems = [
    { name: 'Electronics', icon: <Smartphone className="h-5 w-5" /> },
    { name: 'Fashion', icon: <Shirt className="h-5 w-5" /> },
    { name: 'Home & Living', icon: <HomeIcon className="h-5 w-5" /> },
    { name: 'Books & Stationery', icon: <BookOpen className="h-5 w-5" /> },
    { name: 'Health & Beauty', icon: <HeartPulse className="h-5 w-5" /> },
    { name: 'Food & Groceries', icon: <Utensils className="h-5 w-5" /> },
    { name: 'Services', icon: <SettingsIcon className="h-5 w-5" /> },
    { name: 'Sports & Fitness', icon: <Trophy className="h-5 w-5" /> },
    { name: 'Vehicles & Transport', icon: <Car className="h-5 w-5" /> },
    { name: 'Other', icon: <MoreHorizontal className="h-5 w-5" /> },
  ];

  const fetchListings = useCallback(async (isNewSearch = false) => {
    if (isNewSearch) {
      setLoading(true);
      setOffset(0);
    }

    try {
      const response = await api.get('/listings', {
        params: {
          search,
          category: category === 'All' ? undefined : category,
          limit: LIMIT,
          offset: isNewSearch ? 0 : offset
        }
      });

      // FALLBACK: Ensure data is an array
      const newItems = Array.isArray(response.data) ? response.data : [];
      setListings(prev => isNewSearch ? newItems : [...prev, ...newItems]);
      setHasMore(newItems.length === LIMIT);
    } catch (error) {
      console.error('Error fetching listings:', error);
      if (isNewSearch) setListings([]);
    } finally {
      setLoading(false);
    }
  }, [search, category, offset]);

  useEffect(() => {
    fetchListings(true);
  }, [category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-72">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Filter className="h-5 w-5 text-indigo-600" /> Categories
              </h2>
              <nav className="space-y-1">
                <button
                  onClick={() => { setCategory('All'); setSearchParams({}); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${category === 'All' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Store className="h-5 w-5" /> <span>All Products</span>
                </button>
                {categoryItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => { setCategory(item.name); setSearchParams({ category: item.name }); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${category === item.name ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {item.icon} <span>{item.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1">
            <form onSubmit={handleSearch} className="mb-8 relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search campus marketplace..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-16 pl-14 pr-6 rounded-3xl bg-white dark:bg-slate-900 border-none shadow-sm font-bold"
              />
            </form>

            {loading ? (
               <div className="text-center py-20"><Loader2 className="animate-spin mx-auto h-10 w-10 text-indigo-600" /></div>
            ) : listings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {listings.map(l => (
                  <Link key={l.id} to={`/listings/${l.id}`} className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                    <img src={l.image_url} alt={l.title} className="aspect-square w-full object-cover rounded-2xl mb-4" />
                    <h3 className="font-bold text-lg truncate">{l.title}</h3>
                    <p className="text-indigo-600 font-black text-xl">GH₵{l.price}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2rem]">
                <ShoppingBag className="mx-auto h-16 w-16 text-slate-200 mb-4" />
                <p className="text-slate-500 font-bold">No items found in this category.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Home;