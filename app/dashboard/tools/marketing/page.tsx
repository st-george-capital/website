'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Megaphone,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import type {
  MarketingCampaignKind,
  MarketingCampaignRecord,
  MarketingCaptionPack,
  MarketingOverrideFields,
  MarketingSourceOption,
  MarketingSourceType,
} from '@/lib/marketing-types';

function defaultCampaignKind(sourceType: MarketingSourceType): MarketingCampaignKind {
  switch (sourceType) {
    case 'job_posting':
      return 'recruiting';
    case 'article':
      return 'article';
    case 'research_report':
      return 'research';
    case 'strategy_document':
      return 'strategy';
    case 'manual':
    default:
      return 'announcement';
  }
}

function sourceTypeLabel(sourceType: MarketingSourceType) {
  switch (sourceType) {
    case 'job_posting':
      return 'Job Posting';
    case 'article':
      return 'Our Take Article';
    case 'research_report':
      return 'Equity Research';
    case 'strategy_document':
      return 'Strategy / Industry';
    case 'manual':
      return 'Manual / Ad Hoc';
    default:
      return sourceType;
  }
}

function campaignKindOptions(sourceType: MarketingSourceType) {
  if (sourceType === 'job_posting') {
    return ['recruiting', 'announcement'] as MarketingCampaignKind[];
  }
  if (sourceType === 'article') {
    return ['article', 'announcement'] as MarketingCampaignKind[];
  }
  if (sourceType === 'research_report') {
    return ['research', 'announcement'] as MarketingCampaignKind[];
  }
  if (sourceType === 'strategy_document') {
    return ['strategy', 'announcement'] as MarketingCampaignKind[];
  }
  return ['announcement', 'charity', 'strategy', 'recruiting'] as MarketingCampaignKind[];
}

function statusTone(status: string) {
  return status === 'generated'
    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    : 'bg-slate-100 text-slate-700 border border-slate-200';
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type ManualInputState = {
  title: string;
  kicker: string;
  subtitle: string;
  body: string;
  cta: string;
  dateLabel: string;
  imageUrl: string;
};

const emptyManual: ManualInputState = {
  title: '',
  kicker: '',
  subtitle: '',
  body: '',
  cta: '',
  dateLabel: '',
  imageUrl: '',
};

const emptyOverrides: MarketingOverrideFields = {
  eyebrow: '',
  subtitle: '',
  cta: '',
  dateLabel: '',
  customNote: '',
  imageUrl: '',
};

export default function MarketingStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [sourceType, setSourceType] = useState<MarketingSourceType>('job_posting');
  const [campaignKind, setCampaignKind] = useState<MarketingCampaignKind>('recruiting');
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceOptions, setSourceOptions] = useState<MarketingSourceOption[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaignRecord[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<MarketingCampaignRecord | null>(null);
  const [manualInput, setManualInput] = useState<ManualInputState>(emptyManual);
  const [overrides, setOverrides] = useState<MarketingOverrideFields>(emptyOverrides);
  const [captions, setCaptions] = useState<MarketingCaptionPack>({ instagram: '', linkedin: '' });
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const assets = activeCampaign?.assets || [];
  const imageAssets = assets.filter((asset) => asset.assetKind === 'feed');
  const pdfAsset = assets.find((asset) => asset.platform === 'pdf' && asset.assetKind === 'flyer');
  const captionAssets = assets.filter((asset) => asset.assetKind === 'caption');

  const selectedSource = useMemo(
    () => sourceOptions.find((option) => option.id === selectedSourceId) || null,
    [selectedSourceId, sourceOptions]
  );

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [router, status]);

  useEffect(() => {
    const deepLinkSourceType = searchParams.get('sourceType') as MarketingSourceType | null;
    const deepLinkSourceId = searchParams.get('sourceId');

    if (deepLinkSourceType) {
      setSourceType(deepLinkSourceType);
      setCampaignKind(defaultCampaignKind(deepLinkSourceType));
    }

    if (deepLinkSourceId) {
      setSelectedSourceId(deepLinkSourceId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (sourceType !== 'manual') {
      setCampaignKind((current) => {
        const available = campaignKindOptions(sourceType);
        return available.includes(current) ? current : defaultCampaignKind(sourceType);
      });
    }
  }, [sourceType]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'visitor') {
      void loadCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role]);

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role === 'visitor' || sourceType === 'manual') {
      setSourceOptions([]);
      return;
    }

    void loadSourceOptions(sourceType, sourceSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role, sourceType, sourceSearch]);

  async function loadCampaigns() {
    setLoadingCampaigns(true);
    try {
      const response = await fetch('/api/dashboard/marketing/campaigns');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load campaigns');
      }
      setCampaigns(data);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load campaigns');
    } finally {
      setLoadingCampaigns(false);
    }
  }

  async function loadSourceOptions(nextSourceType: MarketingSourceType, search: string) {
    if (nextSourceType === 'manual') return;

    setLoadingSources(true);
    try {
      const params = new URLSearchParams({ type: nextSourceType });
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await fetch(`/api/dashboard/marketing/sources?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load source options');
      }

      setSourceOptions(data.options || []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load source options');
    } finally {
      setLoadingSources(false);
    }
  }

  function hydrateFromCampaign(campaign: MarketingCampaignRecord) {
    setActiveCampaign(campaign);
    setSourceType(campaign.sourceType);
    setCampaignKind(campaign.campaignKind);
    setSelectedSourceId(campaign.sourceSnapshot.sourceId || '');
    const snap = campaign.sourceSnapshot;
    const ov = campaign.overrideFields;
    setOverrides({
      eyebrow: (ov?.eyebrow && ov.eyebrow.trim()) ? ov.eyebrow : snap.eyebrow || '',
      subtitle: (ov?.subtitle && ov.subtitle.trim()) ? ov.subtitle : snap.subtitle || '',
      cta: (ov?.cta && ov.cta.trim()) ? ov.cta : snap.cta || '',
      dateLabel: (ov?.dateLabel && ov.dateLabel.trim()) ? ov.dateLabel : snap.dateLabel || '',
      customNote: ov?.customNote || '',
      imageUrl: (ov?.imageUrl && ov.imageUrl.trim()) ? ov.imageUrl : snap.imageUrl || '',
    });
    setCaptions({
      instagram: campaign.generatedCaptions?.instagram || '',
      linkedin: campaign.generatedCaptions?.linkedin || '',
    });

    if (campaign.sourceType === 'manual') {
      const snapshot = campaign.sourceSnapshot;
      setManualInput({
        title: snapshot.title,
        kicker: snapshot.eyebrow,
        subtitle: snapshot.subtitle,
        body: snapshot.fields.body || snapshot.summary || '',
        cta: snapshot.cta,
        dateLabel: snapshot.dateLabel || '',
        imageUrl: snapshot.imageUrl || '',
      });
    } else {
      setManualInput(emptyManual);
    }
  }

  async function loadCampaign(id: string) {
    try {
      const response = await fetch(`/api/dashboard/marketing/campaigns/${id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load campaign');
      }
      hydrateFromCampaign(data);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load campaign');
    }
  }

  function buildPayload() {
    return {
      campaignId: activeCampaign?.id || null,
      sourceType,
      sourceId: sourceType === 'manual' ? null : selectedSourceId || null,
      campaignKind,
      manualInput: sourceType === 'manual' ? manualInput : null,
      overrideFields: overrides,
      generatedCaptions: captions.instagram || captions.linkedin ? captions : null,
      status: activeCampaign?.status || 'draft',
    };
  }

  async function saveDraft() {
    if (sourceType !== 'manual' && !selectedSourceId) {
      setPageError('Choose a source item before saving.');
      return;
    }
    if (sourceType === 'manual' && !manualInput.title.trim()) {
      setPageError('Manual campaigns need a title.');
      return;
    }

    setSavingDraft(true);
    setPageError(null);
    try {
      const response = await fetch('/api/dashboard/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save draft');
      }
      hydrateFromCampaign(data);
      await loadCampaigns();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  }

  async function generatePack() {
    if (sourceType !== 'manual' && !selectedSourceId) {
      setPageError('Choose a source item before generating.');
      return;
    }
    if (sourceType === 'manual' && !manualInput.title.trim()) {
      setPageError('Manual campaigns need a title.');
      return;
    }

    setGenerating(true);
    setPageError(null);
    try {
      const response = await fetch('/api/dashboard/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate marketing pack');
      }
      hydrateFromCampaign(data);
      await loadCampaigns();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to generate marketing pack');
    } finally {
      setGenerating(false);
    }
  }

  async function regeneratePack() {
    if (!activeCampaign?.id) return;
    setRegenerating(true);
    setPageError(null);
    try {
      const response = await fetch('/api/dashboard/marketing/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: activeCampaign.id,
          overrideFields: overrides,
          generatedCaptions: captions.instagram || captions.linkedin ? captions : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate marketing pack');
      }
      hydrateFromCampaign(data);
      await loadCampaigns();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to regenerate marketing pack');
    } finally {
      setRegenerating(false);
    }
  }

  async function deleteCampaign(id: string) {
    try {
      const response = await fetch(`/api/dashboard/marketing/campaigns/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete campaign');
      }
      if (activeCampaign?.id === id) {
        setActiveCampaign(null);
        setOverrides(emptyOverrides);
        setCaptions({ instagram: '', linkedin: '' });
      }
      await loadCampaigns();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to delete campaign');
    }
  }

  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkRange, setBulkRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [bulkSourceType, setBulkSourceType] = useState<MarketingSourceType>('job_posting');
  const [bulkResults, setBulkResults] = useState<{ total: number; generated: number; errors: number } | null>(null);

  async function bulkGenerate() {
    setBulkGenerating(true);
    setBulkResults(null);
    setPageError(null);
    try {
      const response = await fetch('/api/dashboard/marketing/generate-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: bulkSourceType, range: bulkRange }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Bulk generation failed (server returned ${response.status})`);
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Bulk generation failed');
      }
      setBulkResults({ total: data.total, generated: data.generated, errors: data.errors });
      await loadCampaigns();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Bulk generation failed');
    } finally {
      setBulkGenerating(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-sm text-slate-500">Loading marketing studio...</div>
      </div>
    );
  }

  if (session?.user?.role === 'visitor') {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to tools
        </Link>
        <Card hover={false}>
          <CardHeader>
            <CardTitle>Marketing Studio</CardTitle>
            <CardDescription>Visitor accounts cannot generate saved marketing assets.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to tools
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Marketing Studio</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Generate institutional SGC platform packs for Instagram, LinkedIn, and recruiting flyers using fixed branded templates.
          </p>
        </div>
      </div>

      <Card hover={false} className="overflow-hidden border-slate-200 bg-[linear-gradient(135deg,#030116_0%,#081a31_48%,#11294b_100%)] text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl text-white">Platform Pack Generator</CardTitle>
              <CardDescription className="text-slate-300">
                Fixed navy-and-white editorial templates for recruiting, research, articles, and announcements.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {[
            'Instagram feed post · 1080×1350',
            'LinkedIn post · 1200×627',
            'Editable caption pack',
            'Job posting flyer PDF when applicable',
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      {pageError ? (
        <Card hover={false} className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-700">{pageError}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card hover={false}>
            <CardHeader>
              <CardTitle>Campaign Setup</CardTitle>
              <CardDescription>Choose a source or build an ad hoc announcement, then tune the small override layer before generating.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {(['job_posting', 'article', 'research_report', 'strategy_document', 'manual'] as MarketingSourceType[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSourceType(option);
                      setSelectedSourceId('');
                      setSourceSearch('');
                      setOverrides(emptyOverrides);
                      setCaptions({ instagram: '', linkedin: '' });
                      setActiveCampaign(null);
                      if (option === 'manual') {
                        setManualInput(emptyManual);
                      }
                    }}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      sourceType === option
                        ? 'border-[#0b1f3a] bg-[#0b1f3a] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {sourceTypeLabel(option)}
                    </div>
                    <div className={`mt-2 text-sm ${sourceType === option ? 'text-slate-200' : 'text-slate-500'}`}>
                      {option === 'manual' ? 'Charity, events, recruiting pushes, and ad hoc announcements.' : 'Deep-link from existing dashboard content or pick a source here.'}
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Campaign type</label>
                  <select
                    value={campaignKind}
                    onChange={(event) => setCampaignKind(event.target.value as MarketingCampaignKind)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    {campaignKindOptions(sourceType).map((option) => (
                      <option key={option} value={option}>
                        {option.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                {sourceType !== 'manual' ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Search source</label>
                    <input
                      value={sourceSearch}
                      onChange={(event) => setSourceSearch(event.target.value)}
                      placeholder="Filter source list"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                ) : null}
              </div>

              {sourceType !== 'manual' ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Source item</label>
                  <select
                    value={selectedSourceId}
                    onChange={(event) => {
                      setSelectedSourceId(event.target.value);
                      setOverrides(emptyOverrides);
                      setCaptions({ instagram: '', linkedin: '' });
                      setActiveCampaign(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="">Select a source item</option>
                    {sourceOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {loadingSources
                      ? 'Loading source options…'
                      : selectedSource
                        ? selectedSource.subtitle
                        : 'You can also deep-link here from a posting, article, report, or strategy document.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
                    <input
                      value={manualInput.title}
                      onChange={(event) => setManualInput((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Spring charity initiative"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Kicker</label>
                    <input
                      value={manualInput.kicker}
                      onChange={(event) => setManualInput((current) => ({ ...current, kicker: event.target.value }))}
                      placeholder="ST. GEORGE CAPITAL"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Date / line</label>
                    <input
                      value={manualInput.dateLabel}
                      onChange={(event) => setManualInput((current) => ({ ...current, dateLabel: event.target.value }))}
                      placeholder="April 2026"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Subtitle</label>
                    <input
                      value={manualInput.subtitle}
                      onChange={(event) => setManualInput((current) => ({ ...current, subtitle: event.target.value }))}
                      placeholder="A clean one-line positioning statement"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Body snippet</label>
                    <textarea
                      value={manualInput.body}
                      onChange={(event) => setManualInput((current) => ({ ...current, body: event.target.value }))}
                      rows={4}
                      placeholder="Short supporting copy for the campaign."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">CTA</label>
                    <input
                      value={manualInput.cta}
                      onChange={(event) => setManualInput((current) => ({ ...current, cta: event.target.value }))}
                      placeholder="Learn more via SGC"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Image URL</label>
                    <input
                      value={manualInput.imageUrl}
                      onChange={(event) => setManualInput((current) => ({ ...current, imageUrl: event.target.value }))}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-sm font-semibold text-slate-900">Edit fields</div>
                <p className="mt-1 text-xs text-slate-500">
                  These fields auto-populate from the source. Edit any field and regenerate to update the graphics.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {[
                    ['eyebrow', 'Eyebrow / kicker'],
                    ['subtitle', 'Subtitle'],
                    ['cta', 'CTA line'],
                    ['dateLabel', 'Date / deadline line'],
                    ['imageUrl', 'Override image URL'],
                    ['customNote', 'Short custom note'],
                  ].map(([field, label]) => (
                    <div key={field} className={field === 'customNote' ? 'md:col-span-2' : ''}>
                      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
                      {field === 'customNote' ? (
                        <textarea
                          value={(overrides as any)[field] || ''}
                          onChange={(event) => setOverrides((current) => ({ ...current, [field]: event.target.value }))}
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        />
                      ) : (
                        <input
                          value={(overrides as any)[field] || ''}
                          onChange={(event) => setOverrides((current) => ({ ...current, [field]: event.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={saveDraft} disabled={savingDraft || generating} className="bg-slate-900 text-white hover:bg-slate-800">
                  <Save className="mr-2 h-4 w-4" />
                  {savingDraft ? 'Saving…' : 'Save Campaign'}
                </Button>
                <Button onClick={generatePack} disabled={savingDraft || generating} className="bg-[#0b1f3a] text-white hover:bg-[#08162a]">
                  <Wand2 className="mr-2 h-4 w-4" />
                  {generating ? 'Generating…' : 'Generate Marketing'}
                </Button>
                {activeCampaign?.id ? (
                  <Button onClick={regeneratePack} disabled={regenerating || generating} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {regenerating ? 'Regenerating…' : 'Regenerate Saved Pack'}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card hover={false}>
            <CardHeader>
              <CardTitle>Bulk Generate</CardTitle>
              <CardDescription>Generate marketing packs for all items of a source type within a time range.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Source type</label>
                  <select
                    value={bulkSourceType}
                    onChange={(e) => setBulkSourceType(e.target.value as MarketingSourceType)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    {(['job_posting', 'article', 'research_report', 'strategy_document'] as MarketingSourceType[]).map((t) => (
                      <option key={t} value={t}>{sourceTypeLabel(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Time range</label>
                  <select
                    value={bulkRange}
                    onChange={(e) => setBulkRange(e.target.value as 'week' | 'month' | 'year' | 'all')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={bulkGenerate}
                    disabled={bulkGenerating || generating}
                    className="w-full bg-[#0b1f3a] text-white hover:bg-[#08162a]"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {bulkGenerating ? 'Generating…' : 'Bulk Generate'}
                  </Button>
                </div>
              </div>
              {bulkResults ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Generated {bulkResults.generated} of {bulkResults.total} items.
                  {bulkResults.errors > 0 ? ` ${bulkResults.errors} failed.` : ''}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card hover={false}>
            <CardHeader>
              <CardTitle>Captions</CardTitle>
              <CardDescription>Deterministic captions from source data, with optional editorial cleanup before you save or regenerate.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Instagram</label>
                <textarea
                  value={captions.instagram}
                  onChange={(event) => setCaptions((current) => ({ ...current, instagram: event.target.value }))}
                  rows={9}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">LinkedIn</label>
                <textarea
                  value={captions.linkedin}
                  onChange={(event) => setCaptions((current) => ({ ...current, linkedin: event.target.value }))}
                  rows={9}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card hover={false}>
            <CardHeader>
              <CardTitle>Campaign History</CardTitle>
              <CardDescription>Saved frozen-source campaigns you can reopen and regenerate without mutating the original content record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingCampaigns ? (
                <div className="text-sm text-slate-500">Loading campaigns…</div>
              ) : campaigns.length ? (
                campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`relative rounded-2xl border p-4 transition ${
                      activeCampaign?.id === campaign.id
                        ? 'border-[#0b1f3a] bg-[#0b1f3a] text-white'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void loadCampaign(campaign.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                            {sourceTypeLabel(campaign.sourceType)}
                          </div>
                          <div className="mt-2 font-semibold">{campaign.title}</div>
                          <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(campaign.status)}`}>
                            {campaign.status}
                          </div>
                        </div>
                        <div className={`text-xs ${activeCampaign?.id === campaign.id ? 'text-slate-200' : 'text-slate-500'}`}>
                          {formatDateTime(campaign.updatedAt)}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this campaign and all its assets?')) {
                          void deleteCampaign(campaign.id);
                        }
                      }}
                      className={`absolute right-3 top-3 rounded-lg p-1.5 transition ${
                        activeCampaign?.id === campaign.id
                          ? 'text-white/50 hover:bg-white/10 hover:text-white'
                          : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                      }`}
                      title="Delete campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No saved campaigns yet. Generate a platform pack and it will appear here.
                </div>
              )}
            </CardContent>
          </Card>

          <Card hover={false}>
            <CardHeader>
              <CardTitle>Platform Pack Preview</CardTitle>
              <CardDescription>Generated assets appear here with direct downloads for social and flyer distribution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeCampaign ? (
                <>
                  <div className="grid gap-4">
                    {imageAssets.length ? imageAssets.map((asset) => (
                      <div key={`${asset.platform}-${asset.ordering}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                          <div className="text-sm font-semibold text-slate-900">{asset.platform === 'instagram' ? 'Instagram Feed' : 'LinkedIn Post'}</div>
                          <a
                            href={asset.blobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </div>
                        <img src={asset.blobUrl} alt={`${asset.platform} preview`} className="block h-auto w-full bg-slate-100" />
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                        Generate a platform pack to preview the rendered social assets.
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {pdfAsset ? (
                      <a
                        href={pdfAsset.blobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-900 hover:border-slate-300"
                      >
                        <span>Recruiting Flyer PDF</span>
                        <ExternalLink className="h-4 w-4 text-slate-500" />
                      </a>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                        PDF flyer only generates for job postings.
                      </div>
                    )}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                      <div className="font-semibold text-slate-900">Current source</div>
                      <div className="mt-1">{sourceTypeLabel(activeCampaign.sourceType)} · {activeCampaign.campaignKind}</div>
                    </div>
                  </div>

                  {captionAssets.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {captionAssets.map((asset) => (
                        <a
                          key={`${asset.platform}-${asset.assetKind}-${asset.ordering}`}
                          href={asset.blobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-900 hover:border-slate-300"
                        >
                          <span>{asset.platform === 'instagram' ? 'Instagram' : 'LinkedIn'} Caption File</span>
                          <ExternalLink className="h-4 w-4 text-slate-500" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                  Choose a source and generate a campaign to see the full preview pack here.
                </div>
              )}
            </CardContent>
          </Card>

          <Card hover={false} className="border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#f1f5fb_100%)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b1f3a] text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Template System</CardTitle>
                  <CardDescription>
                    One shared SGC brand system across recruiting, research, editorial, and manual announcement campaigns.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                'Dark navy backgrounds with restrained institutional hierarchy',
                'Serif-forward headlines with clean sans metadata',
                'Frozen snapshots so old campaigns do not drift when source content changes',
                'Caption files saved alongside the visual assets',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
