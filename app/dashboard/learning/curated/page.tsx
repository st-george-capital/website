'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardContent } from '@/components/card';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Book,
  Rss,
  Youtube,
  ExternalLink,
  Eye,
  EyeOff,
  Headphones,
} from 'lucide-react';

type Kind = 'book' | 'newsletter' | 'youtube' | 'podcast' | 'external_course';

interface CuratedItem {
  id: string;
  kind: Kind;
  title: string;
  url: string;
  description: string | null;
  author: string | null;
  imageUrl: string | null;
  order: number;
  published: boolean;
}

const KIND_LABELS: Record<Kind, string> = {
  book: 'Book',
  newsletter: 'Newsletter',
  youtube: 'YouTube Channel',
  podcast: 'Podcast',
  external_course: 'Research / Course',
};

const KIND_ICONS: Record<Kind, React.ElementType> = {
  book: Book,
  newsletter: Rss,
  youtube: Youtube,
  podcast: Headphones,
  external_course: ExternalLink,
};

const KINDS: Kind[] = ['book', 'newsletter', 'youtube', 'podcast', 'external_course'];

const EMPTY_FORM = {
  kind: 'book' as Kind,
  title: '',
  url: '',
  description: '',
  author: '',
  imageUrl: '',
  order: 0,
  published: false,
};

export default function CuratedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<CuratedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKind, setActiveKind] = useState<Kind | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/learning/curated');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item: CuratedItem) => {
    setEditingId(item.id);
    setForm({
      kind: item.kind,
      title: item.title,
      url: item.url,
      description: item.description ?? '',
      author: item.author ?? '',
      imageUrl: item.imageUrl ?? '',
      order: item.order,
      published: item.published,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        description: form.description || null,
        author: form.author || null,
        imageUrl: form.imageUrl || null,
      };
      const res = editingId
        ? await fetch(`/api/learning/curated/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/learning/curated', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        setShowForm(false);
        fetchItems();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await fetch(`/api/learning/curated/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const togglePublish = async (item: CuratedItem) => {
    await fetch(`/api/learning/curated/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, published: !item.published }),
    });
    fetchItems();
  };

  const filtered =
    activeKind === 'all' ? items : items.filter((i) => i.kind === activeKind);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={() => router.push('/dashboard/learning')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Curated Resources</h1>
          <p className="text-sm text-gray-500">Books, newsletters, YouTube channels, external courses</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Add Resource
          </Button>
        )}
      </div>

      {/* Kind filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', ...KINDS] as const).map((k) => (
          <button
            key={k}
            onClick={() => setActiveKind(k)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeKind === k
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {k === 'all' ? 'All' : KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 my-8">
            <h2 className="text-lg font-bold">{editingId ? 'Edit Resource' : 'Add Resource'}</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>{KIND_LABELS[k]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. The Intelligent Investor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author / Channel</label>
              <input
                type="text"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Benjamin Graham"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={3}
                placeholder="Short description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
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
                  <span className="text-sm font-medium text-gray-700">Published</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title || !form.url}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No resources yet</p>
          {isAdmin && (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Add your first resource
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const Icon = KIND_ICONS[item.kind];
            return (
              <Card key={item.id} className={`relative ${!item.published ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-primary uppercase tracking-wide">
                          {KIND_LABELS[item.kind]}
                        </span>
                        {!item.published && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            Draft
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{item.title}</h3>
                      {item.author && (
                        <p className="text-xs text-gray-500 mb-1">{item.author}</p>
                      )}
                      {item.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block truncate max-w-full"
                      >
                        {item.url}
                      </a>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => togglePublish(item)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                          title={item.published ? 'Unpublish' : 'Publish'}
                        >
                          {item.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
