'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import Link from 'next/link';

interface TeamMember {
  id: string;
  name: string;
  title: string;
  role: string;
  division: string;
  program: string | null;
  year: string | null;
  bio: string | null;
  headshot: string | null;
  linkedin: string | null;
  isExecutive: boolean;
  order: number;
}

export default function EditTeamMemberPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<Partial<TeamMember>>({
    name: '',
    title: '',
    division: 'Quant Trading',
    program: '',
    year: '',
    linkedin: '',
    headshot: '',
    bio: '',
    isExecutive: false,
    order: 0,
  });

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (params.id) {
      fetchTeamMember();
    }
  }, [params.id]);

  const fetchTeamMember = async () => {
    try {
      const response = await fetch('/api/team');
      if (response.ok) {
        const members = await response.json();
        const member = members.find((m: TeamMember) => m.id === params.id);
        if (member) {
          setFormData({
            name: member.name,
            title: member.title || '',
            division: member.division,
            program: member.program || '',
            year: member.year || '',
            linkedin: member.linkedin || '',
            headshot: member.headshot || '',
            bio: member.bio || '',
            isExecutive: member.isExecutive,
            order: member.order,
          });
        } else {
          alert('Team member not found');
          router.push('/dashboard/team');
        }
      }
    } catch (error) {
      console.error('Error fetching team member:', error);
      alert('Failed to fetch team member');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <p>Access denied. Admin only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading team member...</p>
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
        setFormData(prev => ({ ...prev, headshot: data.url }));
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      handleFileUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/team-members/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Team member updated successfully!');
        router.push('/dashboard/team');
      } else {
        const error = await res.json();
        alert(`Failed to update team member: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      alert('Failed to update team member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/team">
        <Button variant="ghost" className="mb-6 inline-flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Team
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Edit Team Member</h1>
        <p className="text-gray-600">Update member information</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Member Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="John Doe"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Co-President: Quant Trading Head"
              />
            </div>

            {/* Division & Program */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Division *</label>
                <select
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Quantitative Trading">Quantitative Trading</option>
                  <option value="Quantitative Research">Quantitative Research</option>
                  <option value="Equity & Macro Research">Equity & Macro Research</option>
                  <option value="Technology">Technology</option>
                  <option value="Operations">Operations</option>
                  <option value="Charity & Impact">Charity & Impact</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Program</label>
                <input
                  type="text"
                  value={formData.program || ''}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Engineering Science"
                />
              </div>
            </div>

            {/* Year & LinkedIn */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <input
                  type="text"
                  value={formData.year || ''}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="3rd Year"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedin || ''}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Brief bio or description..."
              />
            </div>

            {/* Headshot Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Headshot Photo</label>
              
              {/* Preview */}
              {formData.headshot && (
                <div className="mb-4 flex items-center space-x-4">
                  <img
                    src={formData.headshot}
                    alt="Preview"
                    className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, headshot: '' })}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <label className="cursor-pointer">
                      <span className="text-sm text-primary font-medium hover:underline">
                        {uploading ? 'Uploading...' : 'Click to upload image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Or use URL */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">Or enter image URL</label>
                <input
                  type="url"
                  value={formData.headshot || ''}
                  onChange={(e) => setFormData({ ...formData, headshot: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Show on Website */}
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="isExecutive"
                  checked={formData.isExecutive}
                  onChange={(e) => setFormData({ ...formData, isExecutive: e.target.checked })}
                  className="w-5 h-5 mt-0.5"
                />
                <div>
                  <label htmlFor="isExecutive" className="text-sm font-semibold block mb-1">
                    Show on Public Website
                  </label>
                  <p className="text-sm text-gray-600">
                    When checked, this member will appear on the public team page.
                  </p>
                </div>
              </div>
            </div>

            {/* Display Order (only if showing on website) */}
            {formData.isExecutive && (
              <div>
                <label className="block text-sm font-medium mb-2">Display Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Lower numbers appear first on the website (1, 2, 3, etc.)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-4 mt-6">
          <Link href="/dashboard/team">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
