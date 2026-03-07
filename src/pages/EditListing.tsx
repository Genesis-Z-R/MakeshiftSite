import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { Package, DollarSign, List, Image as ImageIcon, AlertCircle, X, Crop, Check, ArrowLeft } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../services/cropImage';

const EditListing: React.FC = () => {
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Textbooks');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Cropper state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);

  const { announce } = useAccessibility();
  const navigate = useNavigate();

  const categories = ['Textbooks', 'Electronics', 'Furniture', 'Clothing', 'Sports', 'Books', 'Services', 'Other'];

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await api.get(`/listings/${id}`);
        const data = response.data;
        setTitle(data.title);
        setDescription(data.description);
        setPrice(data.price.toString());
        setCategory(data.category);
        setImagePreview(data.image_url);
        announce(`Editing listing: ${data.title}`);
      } catch (err) {
        console.error(err);
        setError('Failed to load listing data.');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id, announce]);

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
      setSaving(true);
      const croppedBlob = await getCroppedImg(rawImage, croppedAreaPixels);
      if (croppedBlob) {
        const croppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
        setImageFile(croppedFile);
        
        const previewUrl = URL.createObjectURL(croppedBlob);
        setImagePreview(previewUrl);
        setShowCropper(false);
        announce('Image cropped successfully.');
      }
    } catch (e) {
      console.error(e);
      setError('Failed to crop image.');
    } finally {
      setSaving(false);
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
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await api.put(`/listings/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      announce('Listing updated successfully!');
      navigate(`/listing/${id}`);
    } catch (err: any) {
      const msg = 'Failed to update listing. Please try again.';
      setError(msg);
      announce(msg, 'assertive');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-20 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 font-medium transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
        <header className="bg-indigo-600 px-8 py-10 text-white">
          <h1 className="text-3xl font-bold mb-2">Edit Listing</h1>
          <p className="text-indigo-100">Update your item's details.</p>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div id="form-error" className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-2" role="alert">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Item Title</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                <input
                  id="title"
                  type="text"
                  required
                  className="input-field pl-10"
                  placeholder="e.g. Calculus 101 Textbook"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Price ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                <input
                  id="price"
                  type="number"
                  required
                  step="0.01"
                  className="input-field pl-10"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Category</label>
              <div className="relative">
                <List className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                <select
                  id="category"
                  className="input-field pl-10 appearance-none bg-white dark:bg-slate-900"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="image-upload" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Item Image</label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer relative group">
                {imagePreview ? (
                  <div className="relative w-full max-h-64 rounded-xl overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); announce('Image removed.'); }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-all"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 text-slate-400 mx-auto mb-4 group-hover:text-indigo-500 transition-all" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Click to upload or drag and drop</p>
                  </div>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
              <textarea
                id="description"
                required
                rows={5}
                className="input-field p-4 resize-none"
                placeholder="Describe your item..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary flex-1 py-4 border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 py-4 shadow-lg shadow-indigo-100 dark:shadow-none"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Cropper Modal */}
      {showCropper && rawImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
            <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crop className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Crop Image</h2>
              </div>
              <button 
                onClick={() => setShowCropper(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
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
            
            <footer className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zoom</span>
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
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  {saving ? (
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

export default EditListing;
