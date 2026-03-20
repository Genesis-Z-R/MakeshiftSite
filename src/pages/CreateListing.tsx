import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { 
  Package, DollarSign, List, Image as ImageIcon, 
  AlertCircle, X, Crop, Check, ArrowLeft, Loader2 
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../services/cropImage';

const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const { announce } = useAccessibility();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
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

  const categories = [
    'Electronics', 'Fashion', 'Home & Living', 'Books & Stationery', 
    'Health & Beauty', 'Food & Groceries', 'Services', 
    'Sports & Fitness', 'Vehicles & Transport', 'Other'
  ];

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
        const croppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
        setImageFile(croppedFile);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(URL.createObjectURL(croppedBlob));
        setShowCropper(false);
        announce('Image cropped successfully.');
      }
    } catch (e) {
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

      await api.post('/listings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      announce('Listing created successfully!');
      navigate('/'); 
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-10">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white mb-8 transition-colors font-bold text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">New Listing</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Fill in the details to post your item.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100 dark:border-red-900/30">
              <AlertCircle className="h-5 w-5" /> {error}
            </div>
          )}

          {/* Image Upload - Slim & High Quality */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Item Image</label>
            <div className="relative aspect-video bg-slate-50 dark:bg-slate-950 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden group">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-3 right-3 p-2 bg-slate-900/80 text-white rounded-full backdrop-blur-md hover:bg-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                  <ImageIcon className="h-10 w-10 text-slate-300 mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tap to Upload Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Item Title</label>
              <input
                type="text"
                required
                placeholder="What are you selling?"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white placeholder:text-slate-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Price (GH₵)</label>
              <input
                type="number"
                required
                step="0.01"
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-4 text-sm font-black focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</label>
              <div className="relative">
                <select
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white appearance-none cursor-pointer"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description</label>
              <textarea
                required
                rows={4}
                placeholder="Tell us about the condition, age, or features..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-4 px-4 text-sm font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white resize-none placeholder:text-slate-400"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 h-16 rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : 'Post Listing'}
          </button>
        </form>
      </div>

      {/* Sleek Cropper Modal */}
      {showCropper && rawImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh]">
            <header className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crop className="h-5 w-5 text-slate-900 dark:text-white" />
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Adjust Photo</h2>
              </div>
              <button onClick={() => setShowCropper(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </header>
            
            <div className="relative flex-grow bg-slate-100 dark:bg-slate-950">
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
            
            <footer className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1} max={3} step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-grow h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-white"
                />
              </div>
              <button
                onClick={handleCropConfirm}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl"
              >
                <Check className="h-4 w-4" /> Finalize Crop
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateListing;