import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { MessageCircle, User, Clock, ArrowLeft, Trash2, CheckCircle, ShoppingCart, Edit, Loader2, Share2 } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { useSocket } from '../context/SocketContext';

const ListingDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { socket } = useSocket();
  const { announce } = useAccessibility();
  
  const [listing, setListing] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSoldConfirm, setShowSoldConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchListing = async () => {
      try {
        const response = await api.get(`/listings/${id}`);
        if (mounted) setListing(response.data);
      } catch (error) {
        if (mounted) navigate('/');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchListing();
    return () => { mounted = false; };
  }, [id, navigate]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post('/messages', { receiver_id: listing.seller_id, listing_id: listing.id, content: message });
      if (socket) {
        socket.emit('send_message', {
          receiver_id: listing.seller_id,
          sender_id: user.id,
          sender_name: user.name,
          content: message,
          listing_id: listing.id,
          listing_title: listing.title
        });
      }
      announce('Message sent!');
      setMessage('');
    } catch (error) {
      announce('Failed to send', 'assertive');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="font-black text-[10px] uppercase tracking-widest">Loading Item...</p>
    </div>
  );
  
  if (!listing) return null;
  const isOwner = user?.id === listing.seller_id;

  return (
    <div className="w-full max-w-7xl mx-auto md:px-8 md:py-8 bg-white dark:bg-slate-950 min-h-screen">
      {/* Navigation Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-900 md:relative md:bg-transparent md:border-none md:px-0 md:mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-900 dark:text-white">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex gap-2">
          <button className="p-2 text-slate-400"><Share2 className="h-5 w-5" /></button>
          {isOwner && (
            <Link to={`/edit-listing/${listing.id}`} className="p-2 text-slate-900 dark:text-white"><Edit className="h-5 w-5" /></Link>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-0 md:gap-12">
        {/* IMAGE SECTION - Edge to edge on mobile */}
        <div className="w-full lg:w-1/2 aspect-square bg-slate-50 dark:bg-slate-900 overflow-hidden md:rounded-2xl">
          <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
        </div>

        {/* CONTENT SECTION */}
        <div className="flex-1 px-4 py-6 md:px-0 md:py-0">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                {listing.category}
              </span>
              {listing.status === 'sold' && (
                <span className="text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 px-2 py-1 rounded">Sold</span>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight mb-2">{listing.title}</h1>
            <p className="text-3xl font-black text-slate-900 dark:text-white">GH₵{Number(listing.price).toLocaleString()}</p>
          </div>

          <Link to={`/seller/${listing.seller_id}`} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl mb-8 border border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-sm font-black text-slate-600 dark:text-slate-400">
              {listing.seller_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Seller</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white underline">{listing.seller_name}</p>
            </div>
          </Link>

          <div className="mb-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Product Description</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
              {listing.description}
            </p>
          </div>

          {/* Action Section */}
          <div className="space-y-4 pb-24">
            {isOwner ? (
              <div className="grid grid-cols-2 gap-3">
                {listing.status === 'available' && (
                  <button onClick={() => setShowSoldConfirm(true)} className="bg-green-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest">Mark Sold</button>
                )}
                <button onClick={() => setShowDeleteConfirm(true)} className="bg-red-50 dark:bg-red-900/20 text-red-600 py-4 rounded-xl font-black text-sm uppercase tracking-widest">Delete</button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => addToCart(listing.id)}
                  disabled={listing.status !== 'available'}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-xl disabled:opacity-50"
                >
                  {listing.status === 'available' ? 'Add to Cart' : 'Unavailable'}
                </button>

                <div className="mt-8 border-t border-slate-100 dark:border-slate-900 pt-8">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" /> Message Seller
                  </h3>
                  <form onSubmit={handleSendMessage} className="relative">
                    <textarea
                      required
                      rows={3}
                      className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all dark:text-white"
                      placeholder="Ask about availability or price..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button type="submit" disabled={sending || !message.trim()} className="absolute bottom-3 right-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest disabled:opacity-50">
                      Send
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={async () => { await api.delete(`/listings/${id}`); navigate('/'); }} title="Delete Listing" message="This cannot be undone." confirmText="Delete" type="danger" />
      <ConfirmationModal isOpen={showSoldConfirm} onClose={() => setShowSoldConfirm(false)} onConfirm={async () => { await api.put(`/listings/${id}`, { ...listing, status: 'sold' }); setListing({...listing, status: 'sold'}); }} title="Mark as Sold" message="Item will be removed from marketplace." confirmText="Mark as Sold" />
    </div>
  );
};

export default ListingDetail;