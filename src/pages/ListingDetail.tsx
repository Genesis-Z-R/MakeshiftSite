import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { MessageCircle, User, Tag, Clock, ArrowLeft, Trash2, CheckCircle, ShoppingCart } from 'lucide-react';
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
  created_at: string;
}

const ListingDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { socket } = useSocket();
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
      } catch (error) {
        console.error('Error fetching listing:', error);
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

      alert('Message sent successfully!');
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
      alert('Added to cart!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/listings/${id}`);
      navigate('/');
    } catch (error) {
      console.error('Error deleting listing:', error);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleMarkAsSold = async () => {
    try {
      await api.put(`/listings/${id}`, { ...listing, status: 'sold' });
      setListing(prev => prev ? { ...prev, status: 'sold' } : null);
    } catch (error) {
      console.error('Error updating listing:', error);
    } finally {
      setShowSoldConfirm(false);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center">Loading...</div>;
  if (!listing) return null;

  const isOwner = user?.id === listing.seller_id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-indigo-600 mb-8 font-medium">
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Marketplace
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Section */}
        <div className="rounded-3xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm">
          <img
            src={listing.image_url || `https://picsum.photos/seed/${listing.id}/800/800`}
            alt={listing.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Content Section */}
        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="inline-block bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-bold mb-4 uppercase tracking-wider">
                {listing.category}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{listing.title}</h1>
            </div>
            <div className="text-3xl font-bold text-indigo-600">${listing.price}</div>
          </div>

          <div className="flex items-center gap-6 mb-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-500" />
              <span className="font-semibold text-gray-700">{listing.seller_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{new Date(listing.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Description</h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>

          {isOwner ? (
            <div className="flex gap-4">
              {listing.status === 'available' && (
                <button
                  onClick={() => setShowSoldConfirm(true)}
                  className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                >
                  <CheckCircle className="h-5 w-5" />
                  Mark as Sold
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="h-5 w-5" />
                Delete Listing
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {listing.status === 'available' ? (
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {addingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
              ) : (
                <div className="bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold text-center">
                  This item is no longer available
                </div>
              )}

              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Contact Seller
                </h3>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <textarea
                    required
                    rows={4}
                    className="w-full p-4 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white"
                    placeholder="Hi! Is this item still available?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  ></textarea>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
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
