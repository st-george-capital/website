'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { Upload, Save, Eye, X, Image as ImageIcon, Copy } from 'lucide-react';

export default function NewArticlePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingContent, setUploadingContent] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    author: session?.user?.name || '',
    division: 'Quant Research',
    tags: '',
    publishDate: new Date().toISOString().split('T')[0],
    featured: false,
    published: false,
  });

  const isAdmin = session?.user?.role === 'admin';

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <p className="text-gray-600">You don't have permission to create articles.</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, coverImage: data.url }));
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const copyImageMarkdown = (url: string) => {
    const markdown = `![Image description](${url})`;
    navigator.clipboard.writeText(markdown);
    alert('Markdown copied! Paste it into your content.');
  };

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
    setSaving(true);

    try {
      const publishedAt = publish 
        ? (formData.publishDate ? new Date(formData.publishDate).toISOString() : new Date().toISOString())
        : null;

      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          published: publish,
          publishedAt,
        }),
      });

      if (res.ok) {
        router.push('/dashboard/articles');
      } else {
        alert('Failed to create article');
      }
    } catch (error) {
      console.error('Error creating article:', error);
      alert('Failed to create article');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Article</h1>
        <p className="text-gray-600">Write and publish research content</p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Article Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={handleTitleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter article title"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium mb-2">URL Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="url-friendly-slug"
              />
              <p className="text-sm text-gray-500 mt-1">
                Will appear in URL: /research/{formData.slug}
              </p>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium mb-2">Excerpt *</label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Brief summary (1-2 sentences)"
              />
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium mb-2">Cover Image</label>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="cover-image"
                    disabled={uploading}
                  />
                  <label htmlFor="cover-image" className="cursor-pointer">
                    <div className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50' : ''}`}>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Cover Image'}
                    </div>
                  </label>
                </div>
                {formData.coverImage && (
                  <div className="relative">
                    <img
                      src={formData.coverImage}
                      alt="Cover"
                      className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, coverImage: '' })}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Author & Division */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Author *</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Division *</label>
                <select
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Quant Trading">Quant Trading</option>
                  <option value="Quant Research">Quant Research</option>
                  <option value="Equity & Macro">Equity & Macro</option>
                  <option value="Technology">Technology</option>
                </select>
              </div>
            </div>

            {/* Publish Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Publish Date</label>
              <input
                type="date"
                value={formData.publishDate}
                onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave blank to use today's date when publishing
              </p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Technology, AI, Machine Learning (comma separated)"
              />
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Content * (Markdown supported)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleContentImageUpload}
                    className="hidden"
                    id="content-image"
                    disabled={uploadingContent}
                  />
                  <label htmlFor="content-image" className="cursor-pointer">
                    <div className={`inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${uploadingContent ? 'opacity-50' : ''}`}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {uploadingContent ? 'Uploading...' : 'Upload Image for Content'}
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Uploaded Images Library */}
              {uploadedImages.length > 0 && (
                <div className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-xs font-medium text-gray-700 mb-2">Uploaded Images (Click to copy markdown):</p>
                  <div className="grid grid-cols-4 gap-2">
                    {uploadedImages.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Uploaded ${idx + 1}`}
                          className="w-full h-20 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75"
                          onClick={() => copyImageMarkdown(url)}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded">
                          <Copy className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">💡 Click any image to copy its Markdown code, then paste in content below</p>
                </div>
              )}

              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
                placeholder="Write your article content here... Use Markdown formatting.&#10;&#10;To add images:&#10;1. Click 'Upload Image for Content' above&#10;2. Click the uploaded image to copy markdown&#10;3. Paste it here where you want the image"
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Featured Article</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="outline"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button
            type="button"
            onClick={(e: any) => handleSubmit(e, true)}
            disabled={saving}
          >
            <Eye className="w-4 h-4 mr-2" />
            {saving ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </form>
    </div>
  );
}

