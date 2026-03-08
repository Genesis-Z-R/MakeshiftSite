import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { 
  Search, Filter, Clock, User, ShoppingBag, Loader2, Book, Laptop, Sofa, Shirt, 
  Trophy, BookOpen, Settings as SettingsIcon, MoreHorizontal, ChevronRight, 
  Heart, Store, RotateCcw, ShoppingCart, Smartphone, GraduationCap, Home as HomeIcon,
  HeartPulse, Utensils, Car
} from 'lucide-react';

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  seller_id: number;
  seller_name: string;
  created_at: string;
  condition?: string;
  type?: string;
}

const LIMIT = 12;

const Home: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { announce } = useAccessibility();

  // Update local category state when URL changes
  useEffect(() => {
    const cat = searchParams.get('category') || 'All';
    setCategory(cat);
  }, [searchParams]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setOffset(prevOffset => prevOffset + LIMIT);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const categories = [
    { name: 'Electronics', icon: <Smartphone className="h-4 w-4" /> },
    { name: 'Fashion', icon: <Shirt className="h-4 w-4" /> },
    { name: 'Home & Living', icon: <HomeIcon className="h-4 w-4" /> },
    { name: 'Books & Stationery', icon: <BookOpen className="h-4 w-4" /> },
    { name: 'Health & Beauty', icon: <HeartPulse className="h-4 w-4" /> },
    { name: 'Food & Groceries', icon: <Utensils className="h-4 w-4" /> },
    { name: 'Services', icon: <SettingsIcon className="h-4 w-4" /> },
    { name: 'Sports & Fitness', icon: <Trophy className="h-4 w-4" /> },
    { name: 'Vehicles & Transport', icon: <Car className="h-4 w-4" /> },
    { name: 'Other', icon: <MoreHorizontal className="h-4 w-4" /> }
  ];

  const handleCategoryClick = (catName: string) => {
    if (catName === 'All') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catName);
    }
    setSearchParams(searchParams);
  };

  const handleReset = () => {
    setSearch('');
    setSearchParams({});
    setSort('newest');
  };

  const fetchListings = async (isInitial: boolean = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = isInitial ? 0 : offset;
      const response = await api.get('/listings', {
        params: { search, category, sort, limit: LIMIT, offset: currentOffset }
      });
      
      const newListings = response.data;
      if (Array.isArray(newListings)) {
        if (isInitial) {
          setListings(newListings);
          if (newListings.length === 0) {
            announce('No listings found for your search.');
          } else {
            announce(`Found ${newListings.length} listings.`);
          }
        } else {
          setListings(prev => [...prev, ...newListings]);
          announce(`Loaded ${newListings.length} more items.`);
        }
        setHasMore(newListings.length === LIMIT);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      setHasMore(false);
      announce('Error loading listings. Please try again.', 'assertive');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Reset and fetch when filters change
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    const timer = setTimeout(() => {
      fetchListings(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, category, sort]);

  // Fetch more when offset changes (and it's not the initial load)
  useEffect(() => {
    if (offset > 0) {
      fetchListings(false);
    }
  }, [offset]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 shrink-0 space-y-6 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto no-scrollbar">
            {/* Categories Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
                <Filter className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">Categories</h2>
              </div>
              <div className="p-2">
                <button
                  onClick={() => handleCategoryClick('All')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                    category === 'All'
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  All Products
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryClick(cat.name)}
                    className={`w-full flex items-center px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                      category === cat.name
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {cat.icon}
                      {cat.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SettingsIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">Filters</h2>
                </div>
                <button 
                  onClick={handleReset}
                  className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-50 mb-2">Condition</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500">
                    <option>Any Condition</option>
                    <option>New</option>
                    <option>Like New</option>
                    <option>Used</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-grow space-y-8">
            {/* Search & Sort Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search for items..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-4 w-full md:w-auto">
                <select
                  className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-auto"
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
            <section aria-label="Marketplace Listings">
              {loading && offset === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
                      <div className="bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2rem] aspect-square"></div>
                      <div className="h-6 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg w-3/4"></div>
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : listings.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {listings.map((listing, index) => (
                      <div
                        key={`${listing.id}-${index}`}
                        className="group bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all duration-500 flex flex-col"
                      >
                        <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-slate-50 dark:bg-slate-800 mb-5">
                          <Link to={`/listing/${listing.id}`} className="block w-full h-full">
                            <img
                              src={listing.image_url || `https://picsum.photos/seed/${listing.id}/600/600`}
                              alt={listing.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              referrerPolicy="no-referrer"
                            />
                          </Link>
                        </div>

                        <div className="px-2 space-y-3 flex-grow flex flex-col">
                          <div className="flex flex-wrap gap-2">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              {listing.category}
                            </span>
                          </div>

                          <Link to={`/listing/${listing.id}`}>
                            <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                              {listing.title}
                            </h3>
                          </Link>

                          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                            <span>No reviews yet</span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                            <Store className="h-4 w-4" />
                            <Link 
                              to={`/seller/${listing.seller_id}`}
                              className="text-xs font-bold hover:text-indigo-600 transition-colors"
                            >
                              {listing.seller_name}
                            </Link>
                          </div>

                          <div className="pt-2 mt-auto flex items-center justify-between">
                            <span className="text-2xl font-black text-slate-900 dark:text-slate-50">GH₵{listing.price.toFixed(2)}</span>
                            {listing.sold_count > 0 && (
                              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">
                                {listing.sold_count} sold
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Infinite Scroll Trigger */}
                  <div ref={lastElementRef} className="h-20 flex items-center justify-center mt-8">
                    {loadingMore && (
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium" role="status">
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        <span>Loading more items...</span>
                      </div>
                    )}
                    {!hasMore && listings.length > 0 && (
                      <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">You've reached the end of the marketplace.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-20 text-center border border-slate-100 dark:border-slate-800">
                  <ShoppingBag className="h-20 w-20 text-slate-100 dark:text-slate-800 mx-auto mb-6" />
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 mb-2">No listings found</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Try adjusting your search or filters.</p>
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
