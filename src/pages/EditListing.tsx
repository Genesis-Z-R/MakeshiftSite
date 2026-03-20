import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { 
  Package, DollarSign, List, Image as ImageIcon, 
  AlertCircle, X, Crop, Check, ArrowLeft, Loader2, Trash2 
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../services/cropImage';

const EditListing: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { announce } = useAccessibility();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Textbooks');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);

  const categories = ['Electronics', 'Fashion', 'Home', 'Books', 'Health', 'Food', 'Services', 'Sports', 'Vehicles', 'Other'];

  useEffect(() => {
    let mounted = true;
    const fetchListing = async () => {
      try {
        const response = await api.get(`/listings/${id}`);
        if (mounted) {
          const data = response.data;
          setTitle(data.title);
          setDescription(data.description);
          setPrice(data.price.toString());
          setCategory(data.category);
          setImagePreview(data.image_url);
        }
      } catch (err) {
        if (mounted) {
          setError('Listing not found or has been removed.');
          setTimeout(() => navigate('/profile'), 2000);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchListing();
    return () => { mounted = false; };
  }, [id, navigate]);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImage(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async () => {
    if (!rawImage || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(rawImage, croppedAreaPixels);
      if (croppedBlob) {
        const croppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
        setImageFile(croppedFile);
        setImagePreview(URL.createObjectURL(croppedBlob));
        setShowCropper(false);
        announce('Image updated');
      }
    } catch (e) {
      setError('Failed to crop image.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing permanently?')) return;
    try {
      await api.delete(`/listings/${id}`);
      announce('Listing deleted');
      navigate('/profile');
    } catch (err) {
      setError('Failed to delete listing');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', category);
      if (imageFile) formData.append('image', imageFile);

      await api.put(`/listings/${id}`, formData);
      announce('Updated successfully');
      navigate(`/listing/${id}`);
    } catch (err) {
      setError('Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="font-bold text-xs uppercase tracking-widest">Loading details...</p>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors font-bold text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button 
          onClick={handleDelete}
          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
          title="Delete Listing"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Edit Listing</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Update your item's information and photos.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100 dark:border-red-900/30">
              <AlertCircle className="h-5 w-5" /> {error}
            </div>
          )}

          {/* Image Upload Area */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Product Image</label>
            <div className="relative aspect-[4/3] bg-slate-50 dark:bg-slate-950 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden group">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white text-xs font-bold bg-slate-900/80 px-4 py-2 rounded-full backdrop-blur-md">Change Photo</p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Tap to Upload</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={handleImageChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Item Title</label>
              <input
                type="text"
                required
                placeholder="e.g. iPhone 11 Pro - 256GB"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Price (GH₵)</label>
              <input
                type="number"
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-4 text-sm font-black focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white appearance-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description</label>
              <textarea
                required
                rows={5}
                placeholder="Details about condition, features, etc."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 py-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Modern Cropper Modal */}
      {showCropper && rawImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[70vh]">
            <header className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crop className="h-5 w-5 text-slate-900 dark:text-white" />
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Adjust Photo</h2>
              </div>
              <button onClick={() => setShowCropper(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="h-5 w-5" /></button>
            </header>
            
            <div className="relative flex-grow bg-slate-100 dark:bg-slate-950">
              <Cropper
                image={rawImage}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <footer className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
              <input
                type="range"
                value={zoom}
                min={1} max={3} step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-white"
              />
              <button
                onClick={handleCropConfirm}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl"
              >
                <Check className="h-4 w-4" /> Apply Changes
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditListing;