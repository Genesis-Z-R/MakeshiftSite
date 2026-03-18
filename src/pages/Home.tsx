import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { 
  Search, Filter, ShoppingBag, Loader2, BookOpen, Settings as SettingsIcon, 
  MoreHorizontal, Store, Smartphone, Home as HomeIcon,
  HeartPulse, Utensils, Car, Shirt, Trophy, ChevronRight
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

const LIMIT = 20; // Higher limit for higher density

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
    { name: 'Electronics', icon: <Smartphone className="h-4 w-4" /> },
    { name: 'Fashion', icon: <Shirt className="h-4 w-4" /> },
    { name: 'Home & Living', icon: <HomeIcon className="h-4 w-4" /> },
    { name: 'Books & Stationery', icon: <BookOpen className="h-4 w-4" /> },
    { name: 'Health & Beauty', icon: <HeartPulse className="h-4 w-4" /> },
    { name: 'Food & Groceries', icon: <Utensils className="h-4 w-4" /> },
    { name: 'Services', icon: <SettingsIcon className="h-4 w-4" /> },
    { name: 'Sports & Fitness', icon: <Trophy className="h-4 w-4" /> },
    { name: 'Vehicles & Transport', icon: <Car className="h-4 w-4" /> },
    { name: 'Other', icon: <MoreHorizontal className="h-4 w-4" /> },
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
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* COMPACT SIDEBAR */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center gap-2">
                <Filter className="h-4 w-4 text-indigo-600" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</h2>
              </div>
              
              <nav className="p-2 space-y-0.5">
                <button
                  onClick={() => { setCategory('All'); setSearchParams({}); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                    category === 'All' 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4" />
                    <span>All Products</span>
                  </div>
                  {category === 'All' && <ChevronRight className="h-3 w-3" />}
                </button>

                {categoryItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => { setCategory(item.name); setSearchParams({ category: item.name }); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                      category === item.name 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.name}</span>
                    </div>
                    {category === item.name && <ChevronRight className="h-3 w-3" />}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {/* COMPACT SEARCH */}
            <header className="mb-6">
              <form onSubmit={handleSearch} className="relative group max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600" />
                <input
                  type="text"
                  placeholder="Search campus marketplace..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </form>
            </header>

            <section>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : listings.length > 0 ? (
                <>
                  {/* DENSE GRID: 2 cols on mobile, 6 on large screens */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
                    {listings.map((listing) => (
                      <Link
                        key={listing.id}
                        to={`/listing/${listing.id}`}
                        className="group bg-white dark:bg-slate-900 rounded-xl p-2 md:p-3 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all relative flex flex-col"
                      >
                        {/* Aspect 4/5 for a more professional retail height */}
                        <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
                          <img
                            src={listing.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80'}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 left-2">
                            <span className="px-1.5 py-0.5 bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 text-[8px] font-black rounded uppercase tracking-tighter">
                              {listing.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col flex-grow px-1">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-50 line-clamp-2 leading-snug min-h-[2rem] group-hover:text-indigo-600 transition-colors">
                            {listing.title}
                          </h3>
                          
                          <div className="relative z-20 mt-0.5">
                            <Link 
                              to={`/seller/${listing.seller_id}`}
                              onClick={(e) => e.stopPropagation()} 
                              className="text-[10px] font-medium text-slate-400 hover:text-indigo-600 truncate block"
                            >
                              {listing.seller_name || 'Campus Seller'}
                            </Link>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-black text-slate-900 dark:text-slate-50">
                               GH₵{Number(listing.price).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  <div ref={lastElementRef} className="h-20 flex items-center justify-center mt-8">
                    {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />}
                    {!hasMore && listings.length > 0 && <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">End of results</p>}
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-20 text-center border border-slate-100 dark:border-slate-800">
                  <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">No listings found</h3>
                  <button onClick={() => setCategory('All')} className="text-indigo-600 text-sm font-bold hover:underline">
                    Clear all filters
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