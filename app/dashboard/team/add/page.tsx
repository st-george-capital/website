'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import Link from 'next/link';

export default function AddTeamMemberPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    division: 'Quant Trading',
    program: '',
    year: '',
    linkedin: '',
    headshot: '',
    isExecutive: false, // Default to NOT showing on website
    order: 0,
  });

  const isAdmin = session?.user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-8">
        <p>Access denied. Admin only.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Team member added successfully!');
        router.push('/dashboard/team');
      } else {
        const error = await res.json();
        alert(`Failed to add team member: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      alert('Failed to add team member');
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
        <h1 className="text-3xl font-bold mb-2">Add Team Member</h1>
        <p className="text-gray-600">Add a new member to the executive team</p>
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
              <p className="text-sm text-gray-500 mt-1">
                Leave empty if member doesn't have a specific title
              </p>
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
                  <option value="Quant Trading">Quant Trading</option>
                  <option value="Quant Research">Quant Research</option>
                  <option value="Equity & Macro">Equity & Macro</option>
                  <option value="Technology">Technology</option>
                  <option value="Operations">Operations</option>
                  <option value="Charity & Impact">Charity & Impact</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Program</label>
                <input
                  type="text"
                  value={formData.program}
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
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="3rd Year"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
            </div>

            {/* Headshot Path */}
            <div>
              <label className="block text-sm font-medium mb-2">Headshot Path</label>
              <input
                type="text"
                value={formData.headshot}
                onChange={(e) => setFormData({ ...formData, headshot: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="/images/exec-team/Name.jpg"
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload image to <code>/public/images/exec-team/</code> folder first
              </p>
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
                    When checked, this member will appear on the public team page. Uncheck to keep them in the dashboard only (for internal tracking).
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
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
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
            {saving ? 'Adding...' : 'Add Team Member'}
          </Button>
        </div>
      </form>
    </div>
  );
}

