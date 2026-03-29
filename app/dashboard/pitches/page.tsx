'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Presentation, Plus, Edit, Trash2, Download, Building, MessageSquare, Users, Star } from 'lucide-react';

interface PitchParticipant {
  id: string;
  userId: string;
  userName: string;
}

interface InvestmentPitch {
  id: string;
  title: string;
  company?: string;
  sector: 'macro' | 'equity';
  subcategory?: string;
  pitchDate: string;
  description?: string;
  documentFile?: string;
  published: boolean;
  publishDate?: string;
  createdAt: string;
  participants: PitchParticipant[];
  feedbackCount: number;
  averageScore: number | null;
}

interface PitchFeedback {
  id: string;
  submittedBy: string;
  submittedByName: string;
  thesisClarity: number;
  variantView: number;
  valuation: number;
  catalysts: number;
  risks: number;
  delivery: number;
  strengths?: string | null;
  improvements?: string | null;
  overallComment?: string | null;
  createdAt: string;
}

interface FeedbackPanelData {
  pitchId: string;
  title: string;
  published: boolean;
  participants: PitchParticipant[];
  canViewFeedback: boolean;
  canSubmitFeedback: boolean;
  userFeedback: PitchFeedback | null;
  feedback: PitchFeedback[];
}

const DEFAULT_FEEDBACK_FORM = {
  thesisClarity: 3,
  variantView: 3,
  valuation: 3,
  catalysts: 3,
  risks: 3,
  delivery: 3,
  strengths: '',
  improvements: '',
  overallComment: '',
};

const RUBRIC_FIELDS = [
  { key: 'thesisClarity', label: 'Thesis Clarity' },
  { key: 'variantView', label: 'Variant View' },
  { key: 'valuation', label: 'Valuation' },
  { key: 'catalysts', label: 'Catalysts' },
  { key: 'risks', label: 'Risks' },
  { key: 'delivery', label: 'Delivery' },
] as const;

export default function InvestmentPitchesDashboardPage() {
  const { data: session } = useSession();
  const [pitches, setPitches] = useState<InvestmentPitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [activeFeedbackPitchId, setActiveFeedbackPitchId] = useState<string | null>(null);
  const [feedbackPanel, setFeedbackPanel] = useState<FeedbackPanelData | null>(null);
  const [feedbackForm, setFeedbackForm] = useState(DEFAULT_FEEDBACK_FORM);
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
  const [filterPublished, setFilterPublished] = useState<string>('all');

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    fetchPitches();
  }, [filterSector, filterSubcategory, filterPublished]);

  const fetchPitches = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSector !== 'all') params.append('sector', filterSector);
      if (filterSubcategory !== 'all') params.append('subcategory', filterSubcategory);
      if (filterPublished !== 'all') params.append('published', filterPublished);

      const response = await fetch(`/api/pitches?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPitches(data);
      }
    } catch (error) {
      console.error('Error fetching investment pitches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbackPanel = async (pitchId: string) => {
    setFeedbackLoading(true);
    try {
      const response = await fetch(`/api/pitches/${pitchId}/feedback`);
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to load feedback');
        return;
      }

      const data: FeedbackPanelData = await response.json();
      setActiveFeedbackPitchId(pitchId);
      setFeedbackPanel(data);
      setFeedbackForm(
        data.userFeedback
          ? {
              thesisClarity: data.userFeedback.thesisClarity,
              variantView: data.userFeedback.variantView,
              valuation: data.userFeedback.valuation,
              catalysts: data.userFeedback.catalysts,
              risks: data.userFeedback.risks,
              delivery: data.userFeedback.delivery,
              strengths: data.userFeedback.strengths || '',
              improvements: data.userFeedback.improvements || '',
              overallComment: data.userFeedback.overallComment || '',
            }
          : DEFAULT_FEEDBACK_FORM
      );
    } catch (error) {
      console.error('Error loading feedback:', error);
      alert('Failed to load feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const deletePitch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment pitch?')) return;

    try {
      const response = await fetch(`/api/pitches/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPitches(pitches.filter((pitch) => pitch.id !== id));
      } else {
        alert('Failed to delete investment pitch');
      }
    } catch (error) {
      console.error('Error deleting investment pitch:', error);
      alert('Failed to delete investment pitch');
    }
  };

  const submitFeedback = async (pitchId: string) => {
    setFeedbackSaving(true);
    try {
      const response = await fetch(`/api/pitches/${pitchId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackForm),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to save feedback');
        return;
      }

      await fetchPitches();
      await fetchFeedbackPanel(pitchId);
    } catch (error) {
      console.error('Error saving feedback:', error);
      alert('Failed to save feedback');
    } finally {
      setFeedbackSaving(false);
    }
  };

  const getSubcategories = (sector: string) => {
    if (sector === 'macro') {
      return ['financials', 'consumer', 'energy', 'healthcare', 'macro_technology'];
    }
    if (sector === 'equity') {
      return ['financials', 'consumer', 'energy', 'healthcare', 'technology'];
    }
    return [];
  };

  const getUniqueSubcategories = (): string[] => {
    const subcategories = pitches
      .map((pitch) => pitch.subcategory)
      .filter((sub): sub is string => sub !== null && sub !== undefined);
    return [...new Set(subcategories)].sort();
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Investment Pitches</h1>
          <p className="text-muted-foreground">
            Manage investment pitch documents, participants, and feedback scorecards
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/pitches/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Pitch
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Sector</label>
              <select
                value={filterSector}
                onChange={(e) => {
                  setFilterSector(e.target.value);
                  setFilterSubcategory('all');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
              >
                <option value="all">All Sectors</option>
                <option value="macro">Macro</option>
                <option value="equity">Equity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subcategory</label>
              <select
                value={filterSubcategory}
                onChange={(e) => setFilterSubcategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
              >
                <option value="all">All Subcategories</option>
                {(filterSector !== 'all' ? getSubcategories(filterSector) : getUniqueSubcategories()).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={filterPublished}
                onChange={(e) => setFilterPublished(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investment Pitches ({pitches.length})</CardTitle>
          <CardDescription>
            {filterSector === 'all' ? 'All sectors' : `${filterSector.charAt(0).toUpperCase() + filterSector.slice(1)} sector`}
            {filterSubcategory !== 'all' && ` • ${filterSubcategory.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pitches.length === 0 ? (
            <div className="text-center py-8">
              <Presentation className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No investment pitches found</h3>
              <p className="text-muted-foreground">
                {filterSector !== 'all' || filterSubcategory !== 'all' || filterPublished !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Get started by creating your first investment pitch.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pitches.map((pitch) => (
                <div key={pitch.id} className="rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between gap-4 p-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-medium">{pitch.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded ${
                            pitch.sector === 'macro'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {pitch.sector}
                          </span>
                          {pitch.subcategory && (
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                              {pitch.subcategory.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded ${
                            pitch.published
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {pitch.published ? 'Published' : 'Draft'}
                          </span>
                          {pitch.averageScore !== null && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-amber-50 text-amber-700">
                              <Star className="w-3 h-3" />
                              {pitch.averageScore.toFixed(1)}/5 avg
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {pitch.company && `${pitch.company} • `}
                          {new Date(pitch.pitchDate).toLocaleDateString()}
                          {pitch.publishDate && ` • Published ${new Date(pitch.publishDate).toLocaleDateString()}`}
                        </p>

                        {pitch.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {pitch.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {pitch.participants.length} associated member{pitch.participants.length === 1 ? '' : 's'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {pitch.feedbackCount} feedback submission{pitch.feedbackCount === 1 ? '' : 's'}
                          </span>
                        </div>

                        {pitch.participants.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {pitch.participants.map((participant) => (
                              <span
                                key={participant.id}
                                className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700"
                              >
                                {participant.userName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {pitch.documentFile && (
                        <a
                          href={pitch.documentFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Document
                        </a>
                      )}
                      {pitch.published && (
                        <button
                          onClick={() => {
                            if (activeFeedbackPitchId === pitch.id) {
                              setActiveFeedbackPitchId(null);
                              setFeedbackPanel(null);
                              return;
                            }
                            fetchFeedbackPanel(pitch.id);
                          }}
                          className="inline-flex items-center px-3 py-2 text-sm border border-primary/20 rounded-md text-primary hover:bg-primary/5 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {activeFeedbackPitchId === pitch.id ? 'Hide Feedback' : 'Give Feedback'}
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <Link
                            href={`/dashboard/pitches/${pitch.id}/edit`}
                            className="inline-flex items-center px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                          <button
                            onClick={() => deletePitch(pitch.id)}
                            className="inline-flex items-center px-3 py-2 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {activeFeedbackPitchId === pitch.id && (
                    <div className="border-t border-gray-200 bg-slate-50/60 p-4">
                      {feedbackLoading || !feedbackPanel ? (
                        <p className="text-sm text-muted-foreground">Loading feedback workspace...</p>
                      ) : (
                        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold">Feedback Scorecard</h4>
                              <p className="text-sm text-muted-foreground">
                                Standardized private feedback for the tagged pitch team.
                              </p>
                            </div>

                            {!feedbackPanel.canSubmitFeedback ? (
                              <p className="text-sm text-muted-foreground">
                                Feedback can only be submitted after a pitch is published.
                              </p>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {RUBRIC_FIELDS.map((field) => (
                                    <label key={field.key} className="block">
                                      <span className="block text-sm font-medium mb-2">{field.label}</span>
                                      <select
                                        value={feedbackForm[field.key]}
                                        onChange={(e) =>
                                          setFeedbackForm((prev) => ({
                                            ...prev,
                                            [field.key]: Number(e.target.value),
                                          }))
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                                      >
                                        {[1, 2, 3, 4, 5].map((score) => (
                                          <option key={score} value={score}>
                                            {score} / 5
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  ))}
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">What Worked Well</label>
                                  <textarea
                                    value={feedbackForm.strengths}
                                    onChange={(e) => setFeedbackForm((prev) => ({ ...prev, strengths: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                                    placeholder="Highlight the strongest parts of the pitch."
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">What To Improve</label>
                                  <textarea
                                    value={feedbackForm.improvements}
                                    onChange={(e) => setFeedbackForm((prev) => ({ ...prev, improvements: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                                    placeholder="Capture the highest-leverage changes for the team."
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">Overall Comment</label>
                                  <textarea
                                    value={feedbackForm.overallComment}
                                    onChange={(e) => setFeedbackForm((prev) => ({ ...prev, overallComment: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                                    placeholder="Summarize your impression of the pitch."
                                  />
                                </div>

                                <div className="flex justify-end">
                                  <button
                                    onClick={() => submitFeedback(pitch.id)}
                                    disabled={feedbackSaving}
                                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-60"
                                  >
                                    {feedbackSaving ? 'Saving...' : feedbackPanel.userFeedback ? 'Update Feedback' : 'Submit Feedback'}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                              <h4 className="font-semibold mb-2">Visible To</h4>
                              {feedbackPanel.participants.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No associated members have been tagged yet.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {feedbackPanel.participants.map((participant) => (
                                    <span
                                      key={participant.id}
                                      className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700"
                                    >
                                      {participant.userName}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                              <h4 className="font-semibold mb-2">Private Feedback Bank</h4>
                              {!feedbackPanel.canViewFeedback ? (
                                <p className="text-sm text-muted-foreground">
                                  Feedback is private to the tagged pitch members and admins.
                                </p>
                              ) : feedbackPanel.feedback.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No feedback has been submitted yet.
                                </p>
                              ) : (
                                <div className="space-y-4">
                                  {feedbackPanel.feedback.map((entry) => (
                                    <div key={entry.id} className="rounded-lg border border-gray-200 p-3">
                                      <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="font-medium text-sm">{entry.submittedByName}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {new Date(entry.createdAt).toLocaleDateString()}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                        {RUBRIC_FIELDS.map((field) => (
                                          <div key={field.key} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                                            <span>{field.label}</span>
                                            <span className="font-semibold">{entry[field.key]}/5</span>
                                          </div>
                                        ))}
                                      </div>
                                      {entry.strengths && (
                                        <p className="text-sm mb-2">
                                          <span className="font-medium">Worked well:</span> {entry.strengths}
                                        </p>
                                      )}
                                      {entry.improvements && (
                                        <p className="text-sm mb-2">
                                          <span className="font-medium">Improve:</span> {entry.improvements}
                                        </p>
                                      )}
                                      {entry.overallComment && (
                                        <p className="text-sm">
                                          <span className="font-medium">Comment:</span> {entry.overallComment}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
