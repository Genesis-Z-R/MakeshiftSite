import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { Search, Filter, Clock, User, ShoppingBag, Loader2 } from 'lucide-react';

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  seller_name: string;
  created_at: string;
}

const LIMIT = 12;

const Home: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { announce } = useAccessibility();

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

  const categories = ['All', 'Textbooks', 'Electronics', 'Furniture', 'Clothing', 'Sports', 'Books', 'Services', 'Other'];

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <section className="mb-12 text-center" aria-labelledby="hero-title">
        <h1 id="hero-title" className="text-4xl font-extrabold text-slate-900 dark:text-slate-50 sm:text-5xl tracking-tight mb-4">
          Campus Marketplace
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-8">
          The easiest way to buy and sell items with your fellow students.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/login" className="btn-primary px-8 py-3 shadow-lg shadow-indigo-100 dark:shadow-none">
            Get Started
          </Link>
          <Link to="/register" className="btn-secondary px-8 py-3 border border-slate-200 dark:border-slate-700">
            Join Community
          </Link>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between" aria-label="Search and Filters">
        <div className="relative w-full md:w-96">
          <label htmlFor="search-input" className="sr-only">Search for items</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
          <input
            id="search-input"
            type="text"
            placeholder="Search for items..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <label htmlFor="category-select" className="sr-only">Filter by category</label>
            <select
              id="category-select"
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <label htmlFor="sort-select" className="sr-only">Sort listings</label>
          <select
            id="sort-select"
            className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>
      </section>

      {/* Listings Grid */}
      <section aria-label="Marketplace Listings">
        {loading && offset === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl aspect-[3/4]"></div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {listings.map((listing, index) => (
                <Link
                  key={`${listing.id}-${index}`}
                  to={`/listing/${listing.id}`}
                  className="group card overflow-hidden flex flex-col"
                  aria-label={`${listing.title}, $${listing.price}, Category: ${listing.category}`}
                >
                  <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                    <img
                      src={listing.image_url || `https://picsum.photos/seed/${listing.id}/400/400`}
                      alt="" // Decorative image, title is in aria-label
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 shadow-sm">
                      {listing.category}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {listing.title}
                      </h3>
                      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">${listing.price}</span>
                    </div>
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-1">
                        <User className="h-3 w-3" aria-hidden="true" />
                        <span>{listing.seller_name}</span>
                      </div>
                      <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
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
                <p className="text-slate-400 dark:text-slate-500 text-sm">You've reached the end of the marketplace.</p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <ShoppingBag className="h-16 w-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-xl font-medium text-slate-900 dark:text-slate-50">No listings found</h3>
            <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filters.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
