'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import { Button } from '@/components/button';

export default function NewNewsletterEdition() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!title.trim() || !rawContent.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSaving(true);
    setError('');

    const res = await fetch('/api/newsletter/editions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, rawContent }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/dashboard/newsletter/${data.id}`);
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to save.');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/newsletter">
          <Button variant="outline" size="sm" className="text-gray-700">
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Edition</h1>
          <p className="text-sm text-gray-500 mt-0.5">Paste your market snapshot content below</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Edition Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Hormuz Shutdown: Global Stagflation Scare"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-2">This becomes the email subject and archive title.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
          <p className="text-xs text-gray-400 mb-3">
            Paste your raw snapshot text. Numbered sections (e.g. <code className="bg-gray-100 px-1 rounded">1. Executive Summary</code>),
            bullet points (<code className="bg-gray-100 px-1 rounded">•</code> or <code className="bg-gray-100 px-1 rounded">-</code>),
            sub-headings like <code className="bg-gray-100 px-1 rounded">Equities:</code>, and <strong>**bold**</strong> text are all auto-formatted.
            Inline reference artifacts are automatically stripped.
          </p>
          <textarea
            value={rawContent}
            onChange={e => setRawContent(e.target.value)}
            placeholder="Paste your newsletter content here..."
            rows={28}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/newsletter">
            <Button variant="outline" className="text-gray-700">Cancel</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            <Save size={15} /> {saving ? 'Saving…' : 'Save & Preview'}
          </Button>
        </div>
      </div>
    </div>
  );
}
