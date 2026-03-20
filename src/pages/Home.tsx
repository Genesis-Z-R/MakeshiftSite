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
    { name: 'Electronics', icon: <Smartphone className="h-4 w-4" /> },
    { name: 'Fashion', icon: <Shirt className="h-4 w-4" /> },
    { name: 'Home', icon: <HomeIcon className="h-4 w-4" /> },
    { name: 'Books', icon: <BookOpen className="h-4 w-4" /> },
    { name: 'Health', icon: <HeartPulse className="h-4 w-4" /> },
    { name: 'Food', icon: <Utensils className="h-4 w-4" /> },
    { name: 'Services', icon: <SettingsIcon className="h-4 w-4" /> },
    { name: 'Sports', icon: <Trophy className="h-4 w-4" /> },
    { name: 'Vehicles', icon: <Car className="h-4 w-4" /> },
    { name: 'Other', icon: <MoreHorizontal className="h-4 w-4" /> },
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
      if (reset) setListings(newListings);
      else setListings(prev => [...prev, ...newListings]);
      setHasMore(newListings.length === LIMIT);
      if (!reset) setOffset(prev => prev + LIMIT);
    } catch (error) {
      console.error('Error fetching listings:', error);
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
      if (entries[0].isIntersecting && hasMore) fetchListings(false);
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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      
      {/* Search Header - Sticky on Mobile */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="relative max-w-7xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search campus marketplace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
          />
        </div>
      </div>

      {/* Horizontal Categories - Amazon Style */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar py-2 px-4">
        <div className="flex gap-2 max-w-7xl mx-auto">
          <button
            onClick={() => handleCategorySelect('All')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              category === 'All'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
          >
            All Items
          </button>
          {categoryItems.map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategorySelect(cat.name)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                category === cat.name
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-2 md:px-8 py-4">
        {loading && offset === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6">
            {listings.map((listing, index) => {
              const isLastElement = index === listings.length - 1;
              return (
                <Link 
                  to={`/listing/${listing.id}`}
                  key={listing.id} 
                  ref={isLastElement ? lastElementRef : null}
                  className="flex flex-col bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800"
                >
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                    <img 
                      src={listing.image_url || '/placeholder.png'} 
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border border-slate-100 dark:border-slate-800">
                      {listing.category}
                    </div>
                  </div>
                  <div className="p-2 md:p-4 flex flex-col flex-1">
                    <h3 className="font-medium text-[11px] md:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                      {listing.title}
                    </h3>
                    <p className="text-[9px] text-slate-400 mt-0.5">{listing.seller_name}</p>
                    <div className="mt-auto pt-2">
                      <span className="text-sm md:text-lg font-black text-slate-900 dark:text-white">
                        GH₵{Number(listing.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        
        {!hasMore && listings.length > 0 && (
          <div className="text-center py-10 pb-24 text-[10px] font-black uppercase tracking-widest text-slate-400">
            End of Results
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;