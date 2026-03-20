import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { 
  Search, Loader2, BookOpen, Settings as SettingsIcon, 
  MoreHorizontal, Smartphone, Home as HomeIcon,
  HeartPulse, Utensils, Car, Shirt, Trophy, ShoppingBag
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

  const observer = useRef<IntersectionObserver | null>(null);

  const categoryItems = [
    { name: 'Electronics', icon: <Smartphone className="h-4 w-4 md:h-5 md:w-5" /> },
    { name: 'Fashion', icon: <Shirt className="h-4 w-4 md:h-5 md:w-5" /> },
    { name: 'Home & Living', icon: <HomeIcon className="h-4 w-4 md:h-5 md:w-5" /> },
    { name: 'Books', icon: <BookOpen className="h-4 w-4 md:h-5 md:w-5" /> },
    { name: 'Health', icon: <HeartPulse className="h-4 w-4 md:h-5 md:w-5" /> },
    { name: 'Food', icon: <Utensils className="h-4 w-4 md:h-5 md:w-5" /> },
    { name: 'Services', icon: <SettingsIcon className="h-4 w-4 md:h-5 md:w-5" /> },
    { name: 'Sports', icon: <Trophy className="h-4 w-4 md:h-5 md:w-5" /> },
    { name: 'Vehicles', icon: <Car className="h-4 w-4 md:h-5 md:w-5" /> },
    { name: 'Other', icon: <MoreHorizontal className="h-4 w-4 md:h-5 md:w-5" /> },
  ];

  const fetchListings = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;
      const response = await api.get('/listings', {
        params: { search, category, limit: LIMIT, offset: currentOffset }
      });

      const newListings = response.data;
      
      if (reset) {
        setListings(newListings);
      } else {
        setListings(prev => [...prev, ...newListings]);
      }

      setHasMore(newListings.length === LIMIT);
      if (!reset) setOffset(prev => prev + LIMIT);

      if (reset && newListings.length > 0) {
        announce(`Found ${newListings.length} results`);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      announce('Failed to load listings', 'assertive');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchListings(true);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, category]);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchListings(false);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const handleCategorySelect = (catName: string) => {
    const newCategory = category === catName ? 'All' : catName;
    setCategory(newCategory);
    setSearchParams(newCategory === 'All' ? {} : { category: newCategory });
    setSearch('');
  };

  // Helper to format price with commas (e.g., 2,300)
  const formatPrice = (price: number) => {
    return Number(price).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4 md:py-8 flex flex-col md:flex-row gap-6 md:gap-10">
      
      {/* MOBILE: Amazon-Style Horizontal Categories */}
      <div className="md:hidden -mx-4 px-4 overflow-x-auto no-scrollbar pb-1">
        <div className="flex gap-2.5">
          <button
            onClick={() => handleCategorySelect('All')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all text-sm border ${
              category === 'All'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
            }`}
          >
            All
          </button>
          {categoryItems.map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategorySelect(cat.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all text-sm border ${
                category === cat.name
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                  : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* DESKTOP: Clean Vertical Sidebar */}
      <aside className="hidden md:block w-60 shrink-0">
        <div className="sticky top-24">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 mb-6 tracking-tight">Categories</h2>
          <nav className="space-y-1">
            <button
              onClick={() => handleCategorySelect('All')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                category === 'All'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="h-5 w-5 opacity-70" />
              All Items
            </button>
            {categoryItems.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategorySelect(cat.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  category === cat.name
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="opacity-70">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 flex flex-col gap-6 md:gap-8">
        
        {/* Sleek Search Bar */}
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search campus marketplace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-sm md:text-base font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Product Grid */}
        {loading && offset === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin text-slate-400 mb-4" />
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 mb-2 tracking-tight">No results found</h3>
            <p className="text-slate-500 font-medium">Try checking your spelling or adjusting filters.</p>
            <button 
              onClick={() => { setSearch(''); handleCategorySelect('All'); }}
              className="mt-6 font-bold text-slate-900 dark:text-white underline hover:no-underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* MATCHING SCREENSHOT: 2 columns on mobile, crisp white cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {listings.map((listing, index) => {
                const isLastElement = index === listings.length - 1;
                return (
                  <Link 
                    to={`/listing/${listing.id}`}
                    key={listing.id} 
                    ref={isLastElement ? lastElementRef : null}
                    className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow duration-300"
                  >
                    {/* Image Area with Overlay Badge */}
                    <div className="relative aspect-square bg-slate-50 dark:bg-slate-800 overflow-hidden">
                      {listing.image_url ? (
                        <img 
                          src={listing.image_url} 
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ShoppingBag className="h-12 w-12 opacity-20" />
                        </div>
                      )}
                      
                      {/* Exact match to screenshot: Badge overlaid on top left of image */}
                      <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-white/95 backdrop-blur-md dark:bg-slate-900/95 px-2.5 py-1 rounded-md font-black text-slate-900 dark:text-white shadow-sm text-[10px] uppercase tracking-widest">
                        {listing.category}
                      </div>
                    </div>
                    
                    {/* Content Area */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-slate-50 line-clamp-2 leading-snug">
                        {listing.title}
                      </h3>
                      
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1 truncate">
                        {listing.seller_name}
                      </p>
                      
                      <div className="mt-auto pt-3">
                        <span className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                          GH₵{formatPrice(listing.price)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {loadingMore && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            )}
            
            {!hasMore && listings.length > 0 && (
              <div className="text-right py-8 px-4 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
                End of Results
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Home;