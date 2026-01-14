'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ArrowLeft, Upload, FileText } from 'lucide-react';

export default function NewInvestmentPitchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    sector: 'macro',
    subcategory: '',
    pitchDate: '',
    description: '',
    documentFile: '',
    published: false,
    publishDate: '',
  });

  const isAdmin = session?.user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to create investment pitches.</p>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, documentFile: data.url }));
      } else {
        alert('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/pitches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          pitchDate: formData.pitchDate,
          publishDate: formData.publishDate ? formData.publishDate : null,
        }),
      });

      if (response.ok) {
        router.push('/dashboard/pitches');
      } else {
        const error = await response.json();
        alert(`Failed to create investment pitch: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating investment pitch:', error);
      alert('Failed to create investment pitch');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const getSubcategories = (sector: string) => {
    if (sector === 'macro') {
      return ['financials', 'consumer', 'energy', 'healthcare', 'macro_technology'];
    } else if (sector === 'equity') {
      return ['financials', 'consumer', 'energy', 'healthcare', 'technology'];
    }
    return [];
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/pitches" className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Investment Pitch</h1>
          <p className="text-muted-foreground">
            Create new investment pitch document
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Pitch Details</CardTitle>
          <CardDescription>
            Fill in the details for the new investment pitch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                  placeholder="Optional company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Sector *</label>
                <select
                  value={formData.sector}
                  onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value, subcategory: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                  required
                >
                  <option value="macro">Macro</option>
                  <option value="equity">Equity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subcategory</label>
                <select
                  value={formData.subcategory}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                >
                  <option value="">Select subcategory</option>
                  {getSubcategories(formData.sector).map(sub => (
                    <option key={sub} value={sub}>{sub.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pitch Date *</label>
              <input
                type="date"
                value={formData.pitchDate}
                onChange={(e) => setFormData(prev => ({ ...prev, pitchDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                placeholder="Optional description..."
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">PDF Document</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <label className="cursor-pointer">
                      <span className="text-sm text-gray-600">
                        {uploading ? 'Uploading...' : 'Click to upload PDF'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    {formData.documentFile && (
                      <p className="text-sm text-green-600">File uploaded successfully</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Publish Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.published}
                  onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="published" className="text-sm font-medium">
                  Publish immediately
                </label>
              </div>

              {!formData.published && (
                <div>
                  <label className="block text-sm font-medium mb-2">Publish Date</label>
                  <input
                    type="datetime-local"
                    value={formData.publishDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, publishDate: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/pitches" className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Investment Pitch'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
