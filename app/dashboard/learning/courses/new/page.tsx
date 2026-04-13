'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { ArrowLeft } from 'lucide-react';

export default function NewCoursePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    summary: '',
    tags: '',
    published: false,
    order: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = session?.user?.role === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.summary.trim()) {
      setError('Title and summary are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/learning/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const course = await res.json();
        router.push(`/dashboard/learning/courses/${course.id}`);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to create course');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-gray-500">Only admins can create courses.</div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={() => router.push('/dashboard/learning/courses')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">New Course</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="e.g. Options Foundations"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary *</label>
          <textarea
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            rows={3}
            placeholder="Brief description shown on the Learning hub..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="options, derivatives, beginner"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display order</label>
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Publish immediately</span>
            </label>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/learning/courses')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Course'}
          </Button>
        </div>
      </form>
    </div>
  );
}
