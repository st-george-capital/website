'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Save, Eye, EyeOff, CheckCircle, Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, X, Mail, Users, Hash } from 'lucide-react';
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

const GROUP_LABELS: Record<string, string> = {
  equities: 'Equities',
  asia: 'Asia',
  fx: 'FX',
  rates: 'Rates',
  commodities: 'Commodities & Volatility',
};

function fmtPrice(row: MarketRow): string {
  if (row.price === null) return '—';
  if (row.category === 'yield') return `${row.price.toFixed(2)}%`;
  if (row.category === 'fx') return row.ticker === 'USDJPY' ? row.price.toFixed(2) : row.price.toFixed(4);
  if (row.price >= 1000) return row.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return row.price.toFixed(2);
}

function fmtChange(row: MarketRow): string {
  if (row.change === null) return '—';
  const sign = row.change >= 0 ? '+' : '';
  if (row.category === 'yield') return `${sign}${(row.change * 100).toFixed(1)} bps`;
  if (row.category === 'fx') return row.ticker === 'USDJPY' ? `${sign}${row.change.toFixed(2)}` : `${sign}${row.change.toFixed(4)}`;
  return `${sign}${row.change.toFixed(2)}`;
}

function fmtPct(row: MarketRow): string {
  if (row.category === 'yield') return '';
  if (row.changePercent === null) return '';
  const sign = row.changePercent >= 0 ? '+' : '';
  return `${sign}${row.changePercent.toFixed(2)}%`;
}

function MarketTable({ rows, loading, onRefresh }: { rows: MarketRow[]; loading: boolean; onRefresh: () => void }) {
  // Group by group field
  const groupOrder: string[] = [];
  const grouped: Record<string, MarketRow[]> = {};
  for (const row of rows) {
    const g = row.group ?? 'equities';
    if (!grouped[g]) { grouped[g] = []; groupOrder.push(g); }
    grouped[g].push(row);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Market Snapshot</span>
          <span className="text-xs text-gray-400">— auto-embedded in sent email</span>
        </div>
        <button onClick={onRefresh} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
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
              <tr className="border-b-2 border-gray-100">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-48">Instrument</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Value</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Change</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">24h %</th>
              </tr>
            </thead>
            <tbody>
              {groupOrder.map(g => (
                <>
                  <tr key={`group-${g}`} className="bg-gray-50/70">
                    <td colSpan={4} className="px-5 py-1.5">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                        {GROUP_LABELS[g] ?? g}
                      </span>
                    </td>
                  </tr>
                  {grouped[g].map((row, i) => {
                    const isUp = (row.changePercent ?? 0) >= 0;
                    const isFlat = row.change === null || Math.abs(row.change ?? 0) < 0.0001;
                    const clr = isFlat ? 'text-gray-400' : isUp ? 'text-green-600' : 'text-red-600';
                    return (
                      <tr key={row.ticker} className={i % 2 === 0 ? '' : 'bg-gray-50/40'}>
                        <td className="px-5 py-2 font-medium text-gray-900 text-xs">{row.name}</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-700 text-xs">
                          {row.price === null ? <span className="text-gray-300">—</span> : fmtPrice(row)}
                        </td>
                        <td className={`px-4 py-2 text-right font-mono text-xs ${clr}`}>
                          {fmtChange(row)}
                        </td>
                        <td className={`px-5 py-2 text-right font-semibold text-xs ${clr}`}>
                          {isFlat ? (
                            <Minus size={11} className="inline text-gray-300" />
                          ) : (
                            <span className="inline-flex items-center justify-end gap-0.5">
                              {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {fmtPct(row)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
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
  const [sendResult, setSendResult] = useState<{ sent?: number; failed?: number; error?: string; errorSample?: string; fromEmail?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [marketData, setMarketData] = useState<MarketRow[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);

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

  async function handleConfirmSend() {
    setShowSendModal(false);
    setSending(true);
    setSendResult(null);

    const res = await fetch(`/api/newsletter/editions/${id}/send`, { method: 'POST' });
    const data = await res.json();
    setSending(false);

    if (res.ok) {
      setSendResult({ sent: data.sent, failed: data.failed, errorSample: data.errorSample, fromEmail: data.fromEmail });
      if (data.sent > 0) {
        setEdition(prev => prev ? { ...prev, status: 'sent', sentAt: new Date().toISOString(), recipientCount: data.sent } : prev);
      }
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
                onClick={() => setShowSendModal(true)}
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
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
          (sendResult.error || (sendResult.sent === 0 && (sendResult.failed ?? 0) > 0))
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {sendResult.error ? (
            <p>Error: {sendResult.error}</p>
          ) : sendResult.sent === 0 && (sendResult.failed ?? 0) > 0 ? (
            <div>
              <p className="font-semibold">⚠ All {sendResult.failed} sends failed — email was NOT delivered.</p>
              {sendResult.errorSample && (
                <p className="mt-1 text-xs font-mono bg-red-100 rounded px-2 py-1 mt-1">{sendResult.errorSample}</p>
              )}
              {sendResult.fromEmail && (
                <p className="mt-1 text-xs">Sending from: <code className="font-mono">{sendResult.fromEmail}</code> — check this domain is verified in your <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline">Resend dashboard</a>.</p>
              )}
            </div>
          ) : (
            <div>
              <p>
                <CheckCircle size={15} className="inline mr-1" />
                Successfully sent to <strong>{sendResult.sent}</strong> subscriber{sendResult.sent !== 1 ? 's' : ''}.
                {(sendResult.failed ?? 0) > 0 && <span className="ml-2 text-amber-600">({sendResult.failed} failed)</span>}
              </p>
              {sendResult.fromEmail && (
                <p className="mt-1 text-xs opacity-70">Sent from: <code className="font-mono">{sendResult.fromEmail}</code></p>
              )}
              {sendResult.errorSample && (
                <p className="mt-1 text-xs font-mono bg-green-100 rounded px-2 py-1">{sendResult.errorSample}</p>
              )}
            </div>
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

      {/* ── Pre-send review modal ── */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/80 backdrop-blur-sm">
          {/* Modal header */}
          <div className="flex-none bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Send size={16} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Review before sending</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Confirm this is exactly what you want subscribers to receive
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSendModal(false)}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Meta strip */}
          <div className="flex-none bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Hash size={13} className="text-gray-400" />
              <span className="font-medium text-gray-800">Issue #{edition.issueNumber}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Mail size={13} className="text-gray-400" />
              <span>Subject: <span className="font-medium text-gray-800">SGC Daily Snapshot | Issue #{edition.issueNumber}: {title}</span></span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <span>From: <code className="font-mono">{process.env.NEXT_PUBLIC_NEWSLETTER_FROM || 'newsletter@stgeorgecapital.ca'}</code></span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 ml-auto">
              <Users size={13} className="text-gray-400" />
              <span>Sending to <span className="font-semibold text-blue-600">{subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''}</span></span>
            </div>
          </div>

          {/* Full email preview */}
          <div className="flex-1 overflow-hidden bg-gray-100">
            <iframe
              srcDoc={previewHtml}
              title="Pre-send Email Preview"
              className="w-full h-full border-0"
              style={{ minHeight: 0 }}
            />
          </div>

          {/* Action footer */}
          <div className="flex-none bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Live market data will be re-fetched at the moment of sending.
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSendModal(false)}
                className="text-gray-700"
              >
                Go back & edit
              </Button>
              <Button
                onClick={handleConfirmSend}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                <Send size={14} />
                Confirm & Send to {subscriberCount} subscribers
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
