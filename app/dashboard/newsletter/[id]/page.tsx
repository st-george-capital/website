'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Save, Eye, EyeOff, CheckCircle, Loader2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/button';
import { buildNewsletterEmail, MarketRow } from '@/lib/newsletter-email';

interface Edition {
  id: string;
  title: string;
  issueNumber: number;
  rawContent: string;
  status: string;
  sentAt: string | null;
  recipientCount: number;
  createdAt: string;
}

function formatPrice(row: MarketRow): string {
  if (row.price === null) return '—';
  if (row.category === 'fx') return row.price.toFixed(4);
  if (row.price >= 1000) return row.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return row.price.toFixed(2);
}

function MarketTable({ rows, loading, onRefresh }: { rows: MarketRow[]; loading: boolean; onRefresh: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Market Snapshot</span>
          <span className="text-xs text-gray-400">— embedded in sent email</span>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          disabled={loading}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="py-6 text-center text-gray-400 text-sm">
          <Loader2 size={18} className="animate-spin inline mr-2" />Fetching market data…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Instrument</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Change</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pr-5">24h %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, i) => {
                const isUp = (row.changePercent ?? 0) >= 0;
                const colorClass = row.changePercent === null ? 'text-gray-400' : isUp ? 'text-green-600' : 'text-red-600';
                const bgClass = i % 2 === 0 ? '' : 'bg-gray-50/50';
                return (
                  <tr key={row.ticker} className={bgClass}>
                    <td className="px-5 py-2.5 font-medium text-gray-900">{row.name}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-gray-700">
                      {row.price === null ? <span className="text-gray-300">—</span> : formatPrice(row)}
                    </td>
                    <td className={`px-5 py-2.5 text-right font-mono ${colorClass}`}>
                      {row.change === null ? '—' : (
                        <span>{isUp ? '+' : ''}{row.change.toFixed(row.category === 'fx' ? 4 : 2)}</span>
                      )}
                    </td>
                    <td className={`px-5 py-2.5 text-right font-semibold pr-5 ${colorClass}`}>
                      {row.changePercent === null ? '—' : (
                        <span className="inline-flex items-center gap-1">
                          {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {isUp ? '+' : ''}{row.changePercent.toFixed(2)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function NewsletterEditionPage() {
  const { id } = useParams<{ id: string }>();

  const [edition, setEdition] = useState<Edition | null>(null);
  const [title, setTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent?: number; failed?: number; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [marketData, setMarketData] = useState<MarketRow[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);

  const loadMarket = useCallback(async () => {
    setMarketLoading(true);
    try {
      const res = await fetch('/api/newsletter/market-snapshot');
      const data = await res.json();
      setMarketData(Array.isArray(data) ? data : []);
    } catch {
      setMarketData([]);
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/newsletter/editions/${id}`).then(r => r.json()),
      fetch('/api/newsletter/subscribers').then(r => r.json()),
    ]).then(([ed, subs]) => {
      setEdition(ed);
      setTitle(ed.title || '');
      setRawContent(ed.rawContent || '');
      const activeCount = Array.isArray(subs) ? subs.filter((s: any) => s.active).length : 0;
      setSubscriberCount(activeCount);
      setLoading(false);
    });
    loadMarket();
  }, [id, loadMarket]);

  const previewHtml = buildNewsletterEmail({
    title: title || 'Preview',
    issueNumber: edition?.issueNumber ?? 1,
    date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    rawContent: rawContent,
    unsubscribeUrl: '#',
    marketData: marketData,
  });

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/newsletter/editions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, rawContent }),
    });
    setSaving(false);
    setDirty(false);
  }

  async function handleSend() {
    if (!confirm(`Send Issue #${edition?.issueNumber} to ${subscriberCount} subscriber${subscriberCount !== 1 ? 's' : ''}? This will fetch live market data at send time.`)) return;
    setSending(true);
    setSendResult(null);

    const res = await fetch(`/api/newsletter/editions/${id}/send`, { method: 'POST' });
    const data = await res.json();
    setSending(false);

    if (res.ok) {
      setSendResult({ sent: data.sent, failed: data.failed });
      setEdition(prev => prev ? { ...prev, status: 'sent', sentAt: new Date().toISOString(), recipientCount: data.sent } : prev);
    } else {
      setSendResult({ error: data.error });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-3" /> Loading…
      </div>
    );
  }

  if (!edition) return <div className="text-center py-16 text-gray-500">Edition not found.</div>;

  const isSent = edition.status === 'sent';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/newsletter">
            <Button variant="outline" size="sm" className="text-gray-700">
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Issue #{edition.issueNumber}</h1>
              {isSent ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                  <CheckCircle size={11} /> Sent · {edition.recipientCount} recipients
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                  Draft
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Created {new Date(edition.createdAt).toLocaleDateString()}
              {isSent && edition.sentAt && ` · Sent ${new Date(edition.sentAt).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg transition-colors"
          >
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>

          {!isSent && (
            <>
              <Button variant="outline" onClick={handleSave} disabled={saving || !dirty} className="text-gray-700 flex items-center gap-2">
                <Save size={15} /> {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sending ? 'Sending…' : `Send to ${subscriberCount} subscribers`}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Send result banner */}
      {sendResult && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
          sendResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {sendResult.error ? (
            <span>Error: {sendResult.error}</span>
          ) : (
            <span>
              <CheckCircle size={15} className="inline mr-1" />
              Successfully sent to <strong>{sendResult.sent}</strong> subscribers.
              {sendResult.failed ? ` (${sendResult.failed} failed)` : ''}
            </span>
          )}
        </div>
      )}

      {/* Live market table — always full-width above the editor/preview */}
      <MarketTable rows={marketData} loading={marketLoading} onRefresh={loadMarket} />

      {/* Main layout: editor + preview */}
      <div className={`grid gap-6 ${showPreview ? 'grid-cols-2' : 'grid-cols-1 max-w-3xl'}`}>
        {/* Editor */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setDirty(true); }}
              disabled={isSent}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Raw Content</label>
            <textarea
              value={rawContent}
              onChange={e => { setRawContent(e.target.value); setDirty(true); }}
              disabled={isSent}
              rows={32}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {!isSent && dirty && (
            <p className="text-xs text-amber-600 flex items-center gap-1">● Unsaved changes</p>
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Eye size={14} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Preview</span>
              <span className="ml-auto text-xs text-gray-400">Live · includes market data</span>
            </div>
            <div className="overflow-y-auto" style={{ height: 'calc(100vh - 300px)' }}>
              <iframe
                srcDoc={previewHtml}
                title="Newsletter Preview"
                className="w-full border-0"
                style={{ height: '2400px' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
