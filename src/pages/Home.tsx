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

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8 flex flex-col md:flex-row gap-6 md:gap-8">
      
      {/* MOBILE: Horizontal Categories (Top) */}
      <div className="md:hidden -mx-4 px-4 overflow-x-auto no-scrollbar pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => handleCategorySelect('All')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all text-sm ${
              category === 'All'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            All
          </button>
          {categoryItems.map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategorySelect(cat.name)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all text-sm ${
                category === cat.name
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800'
              }`}
            >
              {cat.icon}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* DESKTOP: Vertical Sidebar (Left) */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="sticky top-24">
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-4">Browse Categories</h2>
          <nav className="space-y-1">
            <button
              onClick={() => handleCategorySelect('All')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${
                category === 'All'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600'
              }`}
            >
              <ShoppingBag className="h-5 w-5" />
              All Items
            </button>
            {categoryItems.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategorySelect(cat.name)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${
                  category === cat.name
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600'
                }`}
              >
                {cat.icon}
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
            placeholder="Search for textbooks, tech, furniture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-sm md:text-base font-medium focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all shadow-sm placeholder:text-slate-400"
          />
        </div>

        {/* Product Grid */}
        {loading && offset === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
            <p className="font-bold">Loading marketplace...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-800 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 mb-2 tracking-tight">No items found</h3>
            <p className="text-slate-500 font-medium">Try adjusting your search or category filters.</p>
            <button 
              onClick={() => { setSearch(''); handleCategorySelect('All'); }}
              className="mt-6 btn-primary"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            {/* FIXED: Switched mobile to 2 columns (grid-cols-2) for that premium native app look */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {listings.map((listing, index) => {
                const isLastElement = index === listings.length - 1;
                return (
                  <Link 
                    to={`/listing/${listing.id}`}
                    key={listing.id} 
                    ref={isLastElement ? lastElementRef : null}
                    className="group flex flex-col bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all duration-300"
                  >
                    <div className="relative aspect-square bg-slate-50 dark:bg-slate-800 overflow-hidden">
                      {listing.image_url ? (
                        <img 
                          src={listing.image_url} 
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <ShoppingBag className="h-10 w-10 md:h-12 md:w-12 opacity-20" />
                        </div>
                      )}
                      
                      {/* Floating Price Tag */}
                      <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 bg-white/95 backdrop-blur-md dark:bg-slate-900/95 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl font-black text-indigo-600 dark:text-indigo-400 shadow-sm text-xs md:text-sm">
                        GH₵{Number(listing.price).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="p-3 md:p-5 flex flex-col flex-1">
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 md:mb-2 truncate">
                        {listing.category}
                      </span>
                      <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-slate-50 line-clamp-2 leading-tight mb-2 md:mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {listing.title}
                      </h3>
                      
                      <div className="mt-auto flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <div className="w-5 h-5 md:w-6 md:h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 shrink-0">
                          {listing.seller_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{listing.seller_name}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {loadingMore && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            )}
            
            {!hasMore && listings.length > 0 && (
              <div className="text-center py-8 text-xs md:text-sm text-slate-400 font-bold">
                You've reached the end of the marketplace!
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Home;