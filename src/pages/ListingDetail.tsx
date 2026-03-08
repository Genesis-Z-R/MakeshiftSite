import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { MessageCircle, User, Tag, Clock, ArrowLeft, Trash2, CheckCircle, ShoppingCart, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import { useSocket } from '../context/SocketContext';

interface ListingDetail {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  seller_id: number;
  seller_name: string;
  seller_email: string;
  status: string;
  sold_count: number;
  created_at: string;
}

const ListingDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { socket } = useSocket();
  const { announce } = useAccessibility();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSoldConfirm, setShowSoldConfirm] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await api.get(`/listings/${id}`);
        setListing(response.data);
        announce(`Viewing details for ${response.data.title}`);
      } catch (error) {
        console.error('Error fetching listing:', error);
        announce('Error loading listing details.', 'assertive');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id, navigate]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setSending(true);
    try {
      await api.post('/messages', {
        receiver_id: listing?.seller_id,
        listing_id: listing?.id,
        content: message
      });
      
      // Emit socket event for real-time notification
      if (socket) {
        socket.emit('send_message', {
          receiver_id: listing?.seller_id,
          sender_id: user.id,
          sender_name: user.name,
          content: message,
          listing_id: listing?.id,
          listing_title: listing?.title
        });
      }

      announce('Message sent successfully!');
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      announce('Failed to send message.', 'assertive');
    } finally {
      setSending(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) return navigate('/login');
    if (!listing) return;
    setAddingToCart(true);
    try {
      await addToCart(listing.id);
      announce('Item added to your cart!');
    } catch (error: any) {
      announce(error.message, 'assertive');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/listings/${id}`);
      announce('Listing deleted successfully.');
      navigate('/');
    } catch (error) {
      console.error('Error deleting listing:', error);
      announce('Failed to delete listing.', 'assertive');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleMarkAsSold = async () => {
    try {
      await api.put(`/listings/${id}`, { ...listing, status: 'sold' });
      setListing(prev => prev ? { ...prev, status: 'sold' } : null);
      announce('Item marked as sold.');
    } catch (error) {
      console.error('Error updating listing:', error);
      announce('Failed to update listing.', 'assertive');
    } finally {
      setShowSoldConfirm(false);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-900 dark:text-slate-50" role="status">Loading...</div>;
  if (!listing) return null;

  const isOwner = user?.id === listing.seller_id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 font-medium transition-colors"
        aria-label="Back to Marketplace"
      >
        <ArrowLeft className="h-5 w-5 mr-2" aria-hidden="true" />
        Back to Marketplace
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Section */}
        <div className="rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 shadow-sm">
          <img
            src={listing.image_url || `https://picsum.photos/seed/${listing.id}/800/800`}
            alt={`Image of ${listing.title}`}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Content Section */}
        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Link 
                to={`/?category=${listing.category}`}
                className="inline-block bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-sm font-bold mb-4 uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-colors"
              >
                {listing.category}
              </Link>
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">{listing.title}</h1>
            </div>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">${listing.price}</div>
          </div>

          <div className="flex items-center gap-6 mb-8 text-sm text-slate-500 dark:text-slate-400">
            <Link 
              to={`/seller/${listing.seller_id}`}
              className="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
            >
              <User className="h-4 w-4 text-indigo-500 group-hover:text-indigo-600" aria-hidden="true" />
              <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 underline underline-offset-4 decoration-slate-200 dark:decoration-slate-700 group-hover:decoration-indigo-500 transition-all">
                {listing.seller_name}
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>{new Date(listing.created_at).toLocaleDateString()}</span>
            </div>
            {listing.sold_count > 0 && (
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                <span>{listing.sold_count} sold</span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Description</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>

          {isOwner ? (
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                {listing.status === 'available' && (
                  <button
                    onClick={() => setShowSoldConfirm(true)}
                    className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 dark:shadow-none"
                  >
                    <CheckCircle className="h-5 w-5" aria-hidden="true" />
                    Mark as Sold
                  </button>
                )}
                <Link
                  to={`/edit-listing/${listing.id}`}
                  className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 py-4 rounded-2xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all flex items-center justify-center gap-2"
                >
                  <Edit className="h-5 w-5" aria-hidden="true" />
                  Edit Listing
                </Link>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-4 rounded-2xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
                Delete Listing
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {listing.status === 'available' ? (
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="btn-primary w-full py-4 shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  {addingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
              ) : (
                <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-4 rounded-2xl font-bold text-center" role="status">
                  This item is no longer available
                </div>
              )}

              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Contact Seller
                </h3>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <label htmlFor="message-input" className="sr-only">Message to seller</label>
                  <textarea
                    id="message-input"
                    required
                    rows={4}
                    className="input-field p-4 resize-none"
                    placeholder="Hi! Is this item still available?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  ></textarea>
                  <button
                    type="submit"
                    disabled={sending}
                    className="btn-primary w-full py-3 shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showSoldConfirm}
        onClose={() => setShowSoldConfirm(false)}
        onConfirm={handleMarkAsSold}
        title="Mark as Sold"
        message="Are you sure you want to mark this item as sold? It will no longer be available for purchase."
        confirmText="Mark as Sold"
      />
    </div>
  );
};

export default ListingDetail;
