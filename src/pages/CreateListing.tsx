import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { Package, DollarSign, List, Image as ImageIcon, AlertCircle, X, Crop, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../services/cropImage';

const CreateListing: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  
  // FIX 1: Updated Categories to match Home.tsx sidebar exactly
  const categories = [
    'Electronics', 'Fashion', 'Home & Living', 'Books & Stationery', 
    'Health & Beauty', 'Food & Groceries', 'Services', 
    'Sports & Fitness', 'Vehicles & Transport', 'Other'
  ];
  const [category, setCategory] = useState('Electronics');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);

  const { announce } = useAccessibility();
  const navigate = useNavigate();

  // FIX 2: Cleanup Object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

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
        announce('Image selected. Please crop your image.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async () => {
    if (!rawImage || !croppedAreaPixels) return;
    
    try {
      setLoading(true);
      const croppedBlob = await getCroppedImg(rawImage, croppedAreaPixels);
      if (croppedBlob) {
        // Create the file for upload
        const croppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
        setImageFile(croppedFile);
        
        // FIX 3: Robust preview URL generation
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        const previewUrl = URL.createObjectURL(croppedBlob);
        setImagePreview(previewUrl);
        
        setShowCropper(false);
        announce('Image cropped successfully.');
      }
    } catch (e) {
      console.error(e);
      setError('Failed to crop image.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setError('Please upload and crop an image first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', category);
      formData.append('image', imageFile);

      // We use /listings because your api service likely adds /api prefix
      const response = await api.post('/listings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      announce('Listing created successfully!');
      navigate('/'); // Go back home to see the new listing
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create listing.';
      setError(msg);
      announce(msg, 'assertive');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300">
        <header className="bg-indigo-600 px-8 py-10 text-white">
          <h1 className="text-4xl font-black mb-2 tracking-tight">Create Listing</h1>
          <p className="text-indigo-100 font-bold">List your item for the campus community</p>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-2 border border-red-100 dark:border-red-900/30" role="alert">
              <AlertCircle className="h-5 w-5" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Item Title</label>
              <div className="relative group">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="text"
                  required
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. iPhone 13 Pro"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Price (GH₵)</label>
              <div className="relative group">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="number"
                  required
                  step="0.01"
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Category</label>
              <div className="relative group">
                <List className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <select
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Item Image</label>
              <div className="relative group aspect-video rounded-[2rem] border-4 border-dashed border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all overflow-hidden bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                {imagePreview ? (
                  <div className="relative w-full h-full">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-xl hover:bg-red-600 transition-all"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-3 cursor-pointer">
                    <div className="p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                      <ImageIcon className="h-8 w-8 text-indigo-600" />
                    </div>
                    <span className="text-slate-900 dark:text-slate-50 font-black">Tap to upload image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Description</label>
              <textarea
                required
                rows={4}
                className="w-full p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                placeholder="Tell us about your item..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 h-16 rounded-[2rem] font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-16 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <div className="h-6 w-6 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : 'Post Listing'}
            </button>
          </div>
        </form>
      </div>

      {/* Cropper Modal */}
      {showCropper && rawImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl">
            <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-black">Crop Your Image</h2>
              <button onClick={() => setShowCropper(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="h-6 w-6" />
              </button>
            </header>
            
            <div className="relative h-[400px] bg-black">
              <Cropper
                image={rawImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <footer className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black uppercase text-slate-400">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-grow h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
              <button
                onClick={handleCropConfirm}
                className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all"
              >
                Apply Crop
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateListing;