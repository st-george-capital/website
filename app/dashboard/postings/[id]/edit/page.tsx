'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ArrowLeft, Upload } from 'lucide-react';

export default function EditJobPostingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    team: 'quant_trading',
    endDate: '',
    published: false,
    documentFile: '',
  });

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (params.id) {
      fetchPosting();
    }
  }, [params.id]);

  const fetchPosting = async () => {
    try {
      const response = await fetch(`/api/job-postings/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          title: data.title || '',
          description: data.description || '',
          team: data.team || 'quant_trading',
          endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
          published: data.published || false,
          documentFile: data.documentFile || '',
        });
      } else {
        alert('Failed to fetch job posting');
        router.push('/dashboard/postings');
      }
    } catch (error) {
      console.error('Error fetching job posting:', error);
      alert('Failed to fetch job posting');
      router.push('/dashboard/postings');
    } finally {
      setFetching(false);
    }
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        return;
      }
      handleFileUpload(file);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to edit job postings.</p>
        </div>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading job posting...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/job-postings/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          endDate: new Date(formData.endDate),
        }),
      });

      if (response.ok) {
        router.push('/dashboard/postings');
      } else {
        const error = await response.json();
        alert(`Failed to update job posting: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating job posting:', error);
      alert('Failed to update job posting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/postings" className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Job Posting</h1>
          <p className="text-muted-foreground">
            Update the job posting details
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Posting Details</CardTitle>
          <CardDescription>
            Update the details for this job posting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Job Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                  required
                  placeholder="e.g., Quantitative Researcher"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Team *</label>
                <select
                  value={formData.team}
                  onChange={(e) => setFormData(prev => ({ ...prev, team: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                  required
                >
                  <option value="quant_trading">Quant Trading</option>
                  <option value="quant_research">Quant Research</option>
                  <option value="macro">Macro</option>
                  <option value="equity">Equity</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Application Deadline *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Job Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                required
                placeholder="Describe the role, responsibilities, requirements, and what makes this position exciting..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Job Posting PDF (Optional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <label className="cursor-pointer">
                      <span className="text-sm text-gray-600">
                        {uploading ? 'Uploading...' : 'Click to upload job posting PDF'}
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
                      <div className="space-y-1">
                        <p className="text-sm text-green-600">File uploaded</p>
                        <a 
                          href={formData.documentFile} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View current file
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Upload a detailed job description PDF (max 10MB)
              </p>
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
                  Published
                </label>
              </div>

              {!formData.published && (
                <p className="text-sm text-muted-foreground">
                  Uncheck to save as draft. Published postings will appear on the careers page.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/postings" className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
