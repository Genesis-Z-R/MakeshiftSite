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
        params: {
          search,
          category,
          limit: LIMIT,
          offset: currentOffset
        }
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
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8">
      {/* SIDEBAR: Categories */}
      <aside className="w-full md:w-72 shrink-0">
        <div className="sticky top-24 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 hidden md:block">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 mb-6 tracking-tight">Categories</h2>
          <nav className="space-y-2">
            <button
              onClick={() => handleCategorySelect('All')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all ${
                category === 'All'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="h-5 w-5" />
              All Items
            </button>
            {categoryItems.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategorySelect(cat.name)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all ${
                  category === cat.name
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cat.icon}
                {cat.name}
              </button>
            ))}
          </nav>
        </div>

        {/* MOBILE Categories Horizontal Scroll */}
        <div className="md:hidden overflow-x-auto no-scrollbar py-2 -mx-4 px-4">
          <div className="flex gap-2">
            <button
              onClick={() => handleCategorySelect('All')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${
                category === 'All'
                  ? 'bg-indigo-600 text-white shadow-md'
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
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${
                  category === cat.name
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800'
                }`}
              >
                {cat.icon}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0">
        {/* Search Bar */}
        <div className="mb-8 md:mb-10">
          <div className="relative max-w-2xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
            <input
              type="text"
              placeholder="Search for textbooks, electronics, furniture..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-20 pl-16 pr-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all text-lg font-medium shadow-sm"
            />
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map((listing, index) => {
                const isLastElement = index === listings.length - 1;
                return (
                  <div 
                    key={listing.id} 
                    ref={isLastElement ? lastElementRef : null}
                    className="group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"
                  >
                    <Link to={`/listing/${listing.id}`} className="block relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {listing.image_url ? (
                        <img 
                          src={listing.image_url} 
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <ShoppingBag className="h-16 w-16 opacity-20" />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 px-4 py-2 rounded-2xl font-black text-indigo-600 dark:text-indigo-400 shadow-sm">
                        GH₵{Number(listing.price).toFixed(2)}
                      </div>
                    </Link>
                    
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                          {listing.category}
                        </span>
                      </div>
                      <Link to={`/listing/${listing.id}`}>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-2">
                          {listing.title}
                        </h3>
                      </Link>
                      <Link 
                        to={`/seller/${listing.seller_id}`}
                        className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center gap-2"
                      >
                        <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-400">
                          {listing.seller_name.charAt(0).toUpperCase()}
                        </div>
                        {listing.seller_name}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {loadingMore && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            )}
            
            {!hasMore && listings.length > 0 && (
              <div className="text-center py-12 text-slate-400 font-bold">
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