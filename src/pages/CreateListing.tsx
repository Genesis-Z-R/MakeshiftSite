import React, { useState, useCallback } from 'react';
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
  
  // Updated default category and list to match Home.tsx exactly
  const [category, setCategory] = useState('Electronics');
  const categories = [
    'Electronics',
    'Fashion',
    'Home & Living',
    'Books & Stationery',
    'Health & Beauty',
    'Food & Groceries',
    'Services',
    'Sports & Fitness',
    'Vehicles & Transport',
    'Other'
  ];

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

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setRawImage(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async () => {
    try {
      setLoading(true);
      const croppedImage = await getCroppedImg(rawImage!, croppedAreaPixels);
      
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const file = new File([blob], 'listing-image.jpg', { type: 'image/jpeg' });
      
      setImageFile(file);
      setImagePreview(croppedImage);
      setShowCropper(false);
    } catch (e) {
      console.error(e);
      setError('Failed to crop image');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setError('Please upload an image');
      return;
    }

    setLoading(true);
    setError('');
    announce('Creating listing...');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('image', imageFile);

    try {
      await api.post('/listings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      announce('Listing created successfully');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 text-center">
          <div className="inline-flex p-4 bg-indigo-600 rounded-[2rem] shadow-lg shadow-indigo-200 dark:shadow-none mb-6">
            <Package className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight mb-2">Create New Listing</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold">List your item for the campus community</p>
        </header>

        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8 sm:p-12 overflow-hidden">
          {error && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 font-bold animate-shake">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-widest px-1">Item Title</label>
                  <div className="relative group">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      required
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="e.g., iPhone 13 Pro"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-widest px-1">Category</label>
                  <div className="relative group">
                    <List className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-widest px-1">Price (GH₵)</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-widest px-1">Item Image</label>
                  <div className={`relative aspect-square rounded-[2.5rem] overflow-hidden border-4 border-dashed transition-all duration-300 ${
                    imagePreview ? 'border-indigo-600 bg-white' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800'
                  }`}>
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group">
                        <div className="p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                          <ImageIcon className="h-8 w-8 text-indigo-600" />
                        </div>
                        <span className="text-slate-900 dark:text-slate-50 font-black">Tap to upload</span>
                        <span className="text-xs text-slate-400 font-bold mt-1">PNG, JPG up to 5MB</span>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-widest px-1">Description</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                placeholder="Tell buyers about the condition, age, and any flaws..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-indigo-600 text-white rounded-[2rem] text-lg font-black hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-200 dark:shadow-none transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="h-6 w-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check className="h-6 w-6" />
                  Launch Listing
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && rawImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 sm:p-8">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col">
            <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">Crop Listing Image</h2>
              <button onClick={() => setShowCropper(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </header>
            
            <div className="relative flex-grow bg-black h-[400px]">
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
                <Crop className="h-5 w-5 text-slate-400" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-grow h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCropper(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropConfirm}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Apply Crop
                    </>
                  )}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateListing;