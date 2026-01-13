'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Save, Eye, X, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/button';

export default function NewStrategyDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'investment_strategy';

  const [formData, setFormData] = useState({
    type: type,
    title: '',
    year: new Date().getFullYear().toString(),
    content: '',
    executiveSummary: '',
    industries: '',
    sectors: '',
    coverImage: '',
    documentFile: '',
    published: false,
    publishDate: '',
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const uploadFile = async (file: File, field: 'coverImage' | 'documentFile') => {
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setFormData(prev => ({ ...prev, [field]: data.url }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'coverImage' | 'documentFile') => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file, field);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/dashboard/strategy');
      } else {
        alert('Failed to create document');
      }
    } catch (error) {
      console.error('Failed to create document:', error);
      alert('Failed to create document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/strategy">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Strategy
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            New {type === 'investment_strategy' ? 'Investment Strategy' : 'Industry Report'}
          </h1>
          <p className="text-muted-foreground">
            Create a comprehensive {type === 'investment_strategy' ? 'investment strategy document' : 'industry deep-dive report'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Document Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md"
              required
            >
              <option value="investment_strategy">Investment Strategy</option>
              <option value="industry_report">Industry Report</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <input
              type="text"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="2024"
              required
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded-md"
            placeholder={type === 'investment_strategy' ? '2024 Investment Strategy' : 'Cybersecurity Industry Deep Dive'}
            required
          />
        </div>

        {/* Executive Summary */}
        <div>
          <label className="block text-sm font-medium mb-2">Executive Summary</label>
          <textarea
            name="executiveSummary"
            value={formData.executiveSummary}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-md"
            placeholder="Brief summary of the document for display purposes..."
          />
        </div>

        {/* Industries & Sectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Industries Covered</label>
            <input
              type="text"
              name="industries"
              value={formData.industries}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Healthcare, Technology, Consumer Staples"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sectors Covered</label>
            <input
              type="text"
              name="sectors"
              value={formData.sectors}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Equity, Fixed Income, Commodities"
            />
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium mb-2">Full Content (Markdown)</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={20}
            className="w-full px-3 py-2 border border-border rounded-md font-mono text-sm"
            placeholder={type === 'investment_strategy'
              ? `# Executive Summary\n\n## Industry Focus\n\n## Asset Class Focus\n\n## Risk Management\n\n## Conclusion`
              : `# Executive Summary\n\n## Industry Overview\n\n## Major Players\n\n## Trends\n\n## Challenges\n\n## Opportunities\n\n## SWOT Analysis\n\n## Conclusion`
            }
            required
          />
        </div>

        {/* File Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium mb-2">Cover Image</label>
            <div className="space-y-2">
              {formData.coverImage ? (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <span className="text-sm truncate flex-1">{formData.coverImage}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'coverImage')}
                    className="hidden"
                    id="cover-image"
                  />
                  <label htmlFor="cover-image">
                    <Button type="button" variant="outline" disabled={uploading} asChild>
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload Cover Image'}
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Document File */}
          <div>
            <label className="block text-sm font-medium mb-2">PDF Document (Optional)</label>
            <div className="space-y-2">
              {formData.documentFile ? (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <span className="text-sm truncate flex-1">{formData.documentFile}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, documentFile: '' }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e, 'documentFile')}
                    className="hidden"
                    id="document-file"
                  />
                  <label htmlFor="document-file">
                    <Button type="button" variant="outline" disabled={uploading} asChild>
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload PDF'}
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Publish Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Publish Date</label>
            <input
              type="date"
              name="publishDate"
              value={formData.publishDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md"
            />
          </div>

          <div className="flex items-center space-x-2 pt-8">
            <input
              type="checkbox"
              id="published"
              name="published"
              checked={formData.published}
              onChange={handleCheckboxChange}
              className="rounded"
            />
            <label htmlFor="published" className="text-sm font-medium">
              Publish immediately
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-6">
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Creating...' : 'Create Document'}
          </Button>

          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/strategy">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
