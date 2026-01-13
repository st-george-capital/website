'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Upload, Image as ImageIcon, Copy, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewInvestmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingContent, setUploadingContent] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    type: 'thesis',
    title: '',
    company: '',
    ticker: '',
    year: new Date().getFullYear().toString(),
    season: 'Fall',
    content: '',
    thesis: '',
    entryDate: '',
    priceAtEntry: '',
    initialTarget: '',
    currentTarget: '',
    publishDate: '',
    tags: 'Equity',
    coverImage: '',
    published: false,
  });

  const uploadCoverImage = async (file: File) => {
    setUploadingCover(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, coverImage: data.url }));
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to upload cover image');
      }
    } catch (error) {
      console.error('Error uploading cover image:', error);
      alert('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const uploadContentImage = async (file: File) => {
    setUploadingContent(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadedImages([...uploadedImages, data.url]);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingContent(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/dashboard/investments');
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      alert('Failed to create investment');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/investments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Investment</h1>
          <p className="text-muted-foreground">Create a new investment thesis or market outlook</p>
        </div>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Investment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md"
                required
              >
                <option value="thesis">Investment Thesis</option>
                <option value="outlook">Market Outlook</option>
              </select>
            </div>

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="e.g., Long Position - Loblaws"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="e.g., Loblaw Companies Limited"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ticker</label>
                <input
                  type="text"
                  name="ticker"
                  value={formData.ticker}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="e.g., L"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <input
                  type="text"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="e.g., 2024"
                  required
                />
              </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Season</label>
                  <select
                    name="season"
                    value={formData.season}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    <option value="Fall">Fall</option>
                    <option value="Winter">Winter</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Thesis-specific fields */}
            {formData.type === 'thesis' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Investment Thesis</label>
                  <textarea
                    name="thesis"
                    value={formData.thesis}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="Why we should invest..."
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Entry Date</label>
                    <input
                      type="date"
                      name="entryDate"
                      value={formData.entryDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Publish Date</label>
                    <input
                      type="date"
                      name="publishDate"
                      value={formData.publishDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-md"
                      placeholder="Defaults to entry date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Price at Entry ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="priceAtEntry"
                      value={formData.priceAtEntry}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-md"
                      placeholder="129.82"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Initial Target ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="initialTarget"
                      value={formData.initialTarget}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-md"
                      placeholder="150.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Current Target ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="currentTarget"
                    value={formData.currentTarget}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="155.00"
                  />
                </div>
              </>
            )}

            {/* Content Images */}
            <div>
              <label className="block text-sm font-medium mb-2">Content Images</label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    id="content-image"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach(file => uploadContentImage(file));
                    }}
                    className="hidden"
                    disabled={uploadingContent}
                  />
                  <label htmlFor="content-image" className="cursor-pointer">
                    <div className={`inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${uploadingContent ? 'opacity-50' : ''}`}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {uploadingContent ? 'Uploading...' : 'Upload Images for Content'}
                    </div>
                  </label>
                </div>

                {uploadedImages.length > 0 && (
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-sm font-medium mb-2">Uploaded Images (click to copy markdown):</p>
                    <div className="grid grid-cols-4 gap-2">
                      {uploadedImages.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={url}
                            alt={`Uploaded ${idx + 1}`}
                            className="w-full h-20 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75"
                            onClick={() => copyToClipboard(`![Image ${idx + 1}](${url})`)}
                            title="Click to copy markdown"
                          />
                          <button
                            onClick={() => removeUploadedImage(idx)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {formData.type === 'thesis' ? 'Full Analysis' : 'Market Outlook'}
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={12}
                className="w-full px-3 py-2 border border-border rounded-md"
                placeholder={`${formData.type === 'thesis'
                  ? "Detailed analysis, valuation, risks, catalysts..."
                  : "Market outlook, economic analysis, sector views..."
                }\n\nTo add images:\n1. Upload images using the button above\n2. Click an uploaded image to copy markdown\n3. Paste it here where you want the image`}
                required
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <select
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="Equity">Equity</option>
                <option value="Macro">Macro</option>
                <option value="Investment Strategy">Investment Strategy</option>
              </select>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium mb-2">Cover Image</label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    id="cover-image"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCoverImage(file);
                    }}
                    className="hidden"
                    disabled={uploadingCover}
                  />
                  <label htmlFor="cover-image" className="cursor-pointer">
                    <div className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${uploadingCover ? 'opacity-50' : ''}`}>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingCover ? 'Uploading...' : 'Upload Cover Image'}
                    </div>
                  </label>
                </div>

                {formData.coverImage && (
                  <div className="relative inline-block">
                    <img
                      src={formData.coverImage}
                      alt="Cover preview"
                      className="w-32 h-20 object-cover rounded border border-gray-200"
                    />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Or enter image URL:</label>
                  <input
                    type="url"
                    value={formData.coverImage}
                    onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>

            {/* Publish */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="published"
                name="published"
                checked={formData.published}
                onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="published" className="text-sm font-medium">
                Publish immediately
              </label>
            </div>

            {/* Submit */}
            <div className="flex space-x-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Investment'}
              </Button>
              <Link href="/dashboard/investments">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
