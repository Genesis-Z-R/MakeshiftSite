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
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { announce } = useAccessibility();

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
    const currentOffset = isNewSearch ? 0 : offset;
    if (isNewSearch) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await api.get('/listings', {
        params: {
          search,
          category: category === 'All' ? undefined : category,
          limit: LIMIT,
          offset: currentOffset
        }
      });

      const newItems = Array.isArray(response.data) ? response.data : [];
      setListings(prev => isNewSearch ? newItems : [...prev, ...newItems]);
      setHasMore(newItems.length === LIMIT);
    } catch (error) {
      console.error('Error fetching listings:', error);
      if (isNewSearch) setListings([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, category, offset]);

  useEffect(() => {
    fetchListings(true);
  }, [category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings(true);
  };

  // Infinite Scroll Observer
  const observer = useRef<IntersectionObserver>();
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setOffset(prev => prev + LIMIT);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-72 shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6 px-2">
                  <div className="p-2 bg-indigo-600 rounded-2xl">
                    <Filter className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Categories</h2>
                </div>
                
                <nav className="space-y-1">
                  <button
                    onClick={() => { setCategory('All'); setSearchParams({}); }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 ${
                      category === 'All' 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Store className="h-5 w-5" />
                    <span>All Products</span>
                  </button>

                  {categoryItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => { setCategory(item.name); setSearchParams({ category: item.name }); }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 ${
                        category === item.name 
                          ? 'bg-indigo-600 text-white shadow-lg' 
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <header className="mb-8">
              <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Search campus marketplace..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-20 pl-16 pr-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-none shadow-sm text-lg font-bold text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-100 transition-all"
                />
              </form>
            </header>

            <section>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
                  <p className="text-slate-500 font-bold">Loading deals...</p>
                </div>
              ) : listings.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {listings.map((listing) => (
                      <Link
                        key={listing.id}
                        // FIX: Changed from /listings/ to /listing/ to match App.tsx
                        to={`/listing/${listing.id}`}
                        className="group bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300"
                      >
                        <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4">
                          <img
                            src={listing.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="px-2">
                          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-full uppercase tracking-widest">
                            {listing.category}
                          </span>
                          <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 truncate mt-2 group-hover:text-indigo-600">
                            {listing.title}
                          </h3>
                          <p className="text-sm font-bold text-slate-400">by {listing.seller_name || 'Campus Seller'}</p>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-2xl font-black text-slate-900 dark:text-slate-50">GH₵{Number(listing.price).toFixed(2)}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {/* Infinity scroll trigger */}
                  <div ref={lastElementRef} className="h-20 flex items-center justify-center mt-8">
                    {loadingMore && <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />}
                    {!hasMore && listings.length > 0 && <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">End of the marketplace.</p>}
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-20 text-center border border-slate-100 dark:border-slate-800">
                  <ShoppingBag className="h-20 w-20 text-slate-100 mx-auto mb-6" />
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 mb-2">No listings found</h3>
                  <button onClick={() => setCategory('All')} className="text-indigo-600 font-bold hover:underline">
                    View all products
                  </button>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Home;