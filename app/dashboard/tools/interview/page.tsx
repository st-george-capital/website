'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Filter,
  HelpCircle,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DIFFICULTY_OPTIONS,
  FIRM_TYPE_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  ROLE_OPTIONS,
  getRoleLabel,
  getSubcategoryLabel,
  getSubcategoryOptions,
} from '@/lib/interview-tool/taxonomy';

type TabKey = 'guide' | 'test' | 'submit' | 'review';

interface InterviewQuestion {
  id: string;
  question: string;
  answer: string | null;
  notes: string | null;
  role: string;
  subcategory: string | null;
  questionType: string;
  difficulty: string;
  company: string | null;
  firmType: string | null;
  topicTags: string[];
  sourceType: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  attachmentUrl: string | null;
  submitterName: string | null;
  submittedBy: string | null;
  approved: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReviewDraft {
  question: string;
  answer: string;
  notes: string;
  role: string;
  subcategory: string;
  questionType: string;
  difficulty: string;
  company: string;
  firmType: string;
  topicTags: string;
  sourceType: string;
  sourceTitle: string;
  sourceUrl: string;
  attachmentUrl: string;
  submitterName: string;
}

interface SubmitFormState {
  bulkQuestions: string;
  role: string;
  subcategory: string;
  questionType: string;
  difficulty: string;
  company: string;
  firmType: string;
  topicTags: string;
  answer: string;
  notes: string;
  sourceTitle: string;
  sourceUrl: string;
  attachmentUrl: string;
}

const INITIAL_SUBMIT_FORM: SubmitFormState = {
  bulkQuestions: '',
  role: 'sales_trading',
  subcategory: '',
  questionType: 'technical',
  difficulty: 'medium',
  company: '',
  firmType: '',
  topicTags: '',
  answer: '',
  notes: '',
  sourceTitle: '',
  sourceUrl: '',
  attachmentUrl: '',
};

function questionCardTone(question: InterviewQuestion) {
  return question.approved
    ? 'border-emerald-200 bg-white'
    : 'border-amber-200 bg-amber-50/60';
}

function buildReviewDraft(question: InterviewQuestion): ReviewDraft {
  return {
    question: question.question,
    answer: question.answer || '',
    notes: question.notes || '',
    role: question.role,
    subcategory: question.subcategory || '',
    questionType: question.questionType,
    difficulty: question.difficulty,
    company: question.company || '',
    firmType: question.firmType || '',
    topicTags: question.topicTags.join(', '),
    sourceType: question.sourceType || '',
    sourceTitle: question.sourceTitle || '',
    sourceUrl: question.sourceUrl || '',
    attachmentUrl: question.attachmentUrl || '',
    submitterName: question.submitterName || '',
  };
}

function shuffleQuestions(items: InterviewQuestion[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export default function InterviewToolPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<TabKey>('guide');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedQuestionType, setSelectedQuestionType] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [showCommunity, setShowCommunity] = useState(true);

  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  const [quizLength, setQuizLength] = useState('10');
  const [quizQuestions, setQuizQuestions] = useState<InterviewQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizReveal, setQuizReveal] = useState(false);

  const [submitForm, setSubmitForm] = useState<SubmitFormState>(INITIAL_SUBMIT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [importingSeeds, setImportingSeeds] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [router, status]);

  useEffect(() => {
    if (status === 'authenticated') {
      void fetchQuestions();
    }
  }, [status]);

  useEffect(() => {
    setSelectedSubcategory('');
  }, [selectedRole]);

  useEffect(() => {
    setReviewDrafts((current) => {
      const next = { ...current };
      for (const question of questions) {
        if (!next[question.id]) {
          next[question.id] = buildReviewDraft(question);
        }
      }
      return next;
    });
  }, [questions]);

  async function fetchQuestions(showRefresh = false) {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);
      const response = await fetch('/api/interview-questions');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch interview bank');
      }

      setQuestions(data);
    } catch (fetchError: any) {
      setError(fetchError.message || 'Failed to fetch interview bank');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function setField<K extends keyof SubmitFormState>(key: K, value: SubmitFormState[K]) {
    setSubmitForm((current) => ({ ...current, [key]: value }));
  }

  function updateReviewDraft(id: string, field: keyof ReviewDraft, value: string) {
    setReviewDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }));
  }

  async function handleAttachmentUpload(file: File) {
    try {
      setUploadingAttachment(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload attachment');
      }

      setField('attachmentUrl', data.url);
      setNotice('Attachment uploaded successfully.');
    } catch (uploadError: any) {
      setError(uploadError.message || 'Failed to upload attachment');
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleSubmitQuestions() {
    try {
      setSubmitting(true);
      setError(null);
      setNotice(null);

      const response = await fetch('/api/interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit questions');
      }

      setSubmitForm({
        ...INITIAL_SUBMIT_FORM,
        role: submitForm.role,
        subcategory: '',
      });
      setNotice(`Submitted ${data.createdCount} question${data.createdCount === 1 ? '' : 's'} to the bank.`);
      setActiveTab('guide');
      await fetchQuestions(true);
    } catch (submitError: any) {
      setError(submitError.message || 'Failed to submit questions');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSeedImport() {
    if (!confirm('Import or refresh the full curated interview seed bank?')) return;

    try {
      setImportingSeeds(true);
      setError(null);
      setNotice(null);

      const response = await fetch('/api/interview-questions/import', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import seed bank');
      }

      setNotice(`Seed import complete: ${data.imported} total, ${data.created} created, ${data.updated} refreshed.`);
      await fetchQuestions(true);
    } catch (importError: any) {
      setError(importError.message || 'Failed to import seed bank');
    } finally {
      setImportingSeeds(false);
    }
  }

  async function saveReview(questionId: string, approve = false) {
    try {
      const draft = reviewDrafts[questionId];
      setSavingReviewId(questionId);
      setError(null);
      setNotice(null);

      const response = await fetch(`/api/interview-questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          topicTags: draft.topicTags,
          approved: approve ? true : false,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update question');
      }

      setNotice(approve ? 'Question approved and updated.' : 'Draft saved to review queue.');
      await fetchQuestions(true);
    } catch (reviewError: any) {
      setError(reviewError.message || 'Failed to update question');
    } finally {
      setSavingReviewId(null);
    }
  }

  async function deleteReviewQuestion(questionId: string) {
    if (!confirm('Delete this interview question?')) return;

    try {
      setDeletingReviewId(questionId);
      setError(null);
      setNotice(null);

      const response = await fetch(`/api/interview-questions/${questionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete question');
      }

      setNotice('Question deleted.');
      await fetchQuestions(true);
    } catch (deleteError: any) {
      setError(deleteError.message || 'Failed to delete question');
    } finally {
      setDeletingReviewId(null);
    }
  }

  function toggleRevealAnswer(id: string) {
    setRevealedAnswers((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function resetQuiz() {
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizReveal(false);
  }

  function startQuiz() {
    const pool = approvedFilteredQuestions;
    const requestedCount = quizLength === 'all' ? pool.length : Number(quizLength);
    const deck = shuffleQuestions(pool).slice(0, Math.max(1, requestedCount));
    setQuizQuestions(deck);
    setQuizIndex(0);
    setQuizReveal(false);
  }

  const filteredQuestions = questions.filter((question) => {
    if (selectedRole && question.role !== selectedRole) return false;
    if (selectedSubcategory && question.subcategory !== selectedSubcategory) return false;
    if (selectedQuestionType && question.questionType !== selectedQuestionType) return false;
    if (selectedDifficulty && question.difficulty !== selectedDifficulty) return false;
    if (selectedCompany && !(question.company || '').toLowerCase().includes(selectedCompany.toLowerCase())) return false;
    if (!showCommunity && !question.approved) return false;

    if (deferredSearch) {
      const haystack = [
        question.question,
        question.answer || '',
        question.company || '',
        question.submitterName || '',
        question.topicTags.join(' '),
      ].join(' ').toLowerCase();

      if (!haystack.includes(deferredSearch.toLowerCase())) return false;
    }

    return true;
  });

  const approvedFilteredQuestions = filteredQuestions.filter((question) => question.approved);
  const communityFilteredQuestions = filteredQuestions.filter((question) => !question.approved);
  const totalApproved = questions.filter((question) => question.approved).length;
  const totalCommunity = questions.length - totalApproved;
  const pendingReview = questions.filter((question) => !question.approved).length;

  const currentQuizQuestion = quizQuestions[quizIndex] || null;
  const submitSubcategories = getSubcategoryOptions(submitForm.role);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading interview tool...
        </div>
      </div>
    );
  }

  if (session?.user?.role === 'visitor') {
    return (
      <div className="p-8">
        <Card hover={false}>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              Visitor accounts cannot access the interview tool. Contact an admin if you need member access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/tools">
            <Button variant="outline" className="text-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 mb-3">
              <Brain className="w-3.5 h-3.5" />
              Dashboard Interview Tool
            </div>
            <h1 className="text-3xl font-bold">Interview Bank & Drill Room</h1>
            <p className="text-muted-foreground mt-2 max-w-3xl">
              A dashboard-only guide for technical, market, and behavioural prep across sales and trading,
              investment banking, buyside, consulting, and general finance.
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-4">
          <Card hover={false} className="border-slate-200">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">{questions.length}</div>
            </CardContent>
          </Card>
          <Card hover={false} className="border-emerald-200 bg-emerald-50/60">
            <CardContent className="p-4">
              <div className="text-xs text-emerald-700">Curated</div>
              <div className="text-2xl font-bold text-emerald-900">{totalApproved}</div>
            </CardContent>
          </Card>
          <Card hover={false} className="border-amber-200 bg-amber-50/70">
            <CardContent className="p-4">
              <div className="text-xs text-amber-700">Community</div>
              <div className="text-2xl font-bold text-amber-900">{totalCommunity}</div>
            </CardContent>
          </Card>
          <Card hover={false} className="border-sky-200 bg-sky-50/70">
            <CardContent className="p-4">
              <div className="text-xs text-sky-700">Pending</div>
              <div className="text-2xl font-bold text-sky-900">{pendingReview}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {(notice || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || notice}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'guide', label: 'Guide', icon: Sparkles },
          { key: 'test', label: 'Test Me', icon: Shuffle },
          { key: 'submit', label: 'Submit Questions', icon: Send },
          ...(isAdmin ? [{ key: 'review', label: 'Admin Review', icon: ShieldCheck }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-[#030116] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <Card hover={false}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-xl">Filter The Bank</CardTitle>
              <CardDescription>
                Search across the interview bank and narrow down by role, desk, difficulty, question type, or company.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="text-gray-700"
              onClick={() => fetchQuestions(true)}
              loading={refreshing}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="xl:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Search</div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search questions, answers, companies, tags..."
                  className="w-full rounded-lg border border-border bg-background px-10 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </label>

            <label>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Role</div>
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">All roles</option>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Track</div>
              <select
                value={selectedSubcategory}
                onChange={(event) => setSelectedSubcategory(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">All tracks</option>
                {getSubcategoryOptions(selectedRole).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Type</div>
              <select
                value={selectedQuestionType}
                onChange={(event) => setSelectedQuestionType(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">All types</option>
                {QUESTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Difficulty</div>
              <select
                value={selectedDifficulty}
                onChange={(event) => setSelectedDifficulty(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">All levels</option>
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
            <label>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Company</div>
              <input
                value={selectedCompany}
                onChange={(event) => setSelectedCompany(event.target.value)}
                placeholder="Filter by firm or platform"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="flex items-end">
              <button
                type="button"
                onClick={() => setShowCommunity((current) => !current)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  showCommunity
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                {showCommunity ? 'Showing community' : 'Curated only'}
              </button>
            </label>

            <label className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedRole('');
                  setSelectedSubcategory('');
                  setSelectedQuestionType('');
                  setSelectedDifficulty('');
                  setSelectedCompany('');
                  setShowCommunity(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Reset Filters
              </button>
            </label>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'guide' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card hover={false} className="border-emerald-200 bg-emerald-50/60">
              <CardHeader>
                <CardTitle className="text-xl">Curated Bank</CardTitle>
                <CardDescription>
                  Approved questions with sample answers, tagged by role, company, and question type.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-emerald-900">{approvedFilteredQuestions.length}</div>
                <p className="text-sm text-emerald-800 mt-2">
                  These are the records that power the default quiz experience.
                </p>
              </CardContent>
            </Card>

            <Card hover={false} className="border-amber-200 bg-amber-50/70">
              <CardHeader>
                <CardTitle className="text-xl">Community Submissions</CardTitle>
                <CardDescription>
                  Newly submitted questions are visible right away, but clearly marked as unreviewed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-amber-900">{communityFilteredQuestions.length}</div>
                <p className="text-sm text-amber-800 mt-2">
                  Review them for extra practice, but treat sample answers cautiously until they are approved.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {approvedFilteredQuestions.length === 0 && communityFilteredQuestions.length === 0 ? (
              <Card hover={false}>
                <CardHeader>
                  <CardTitle>No Questions Match These Filters</CardTitle>
                  <CardDescription>
                    Try widening the filters, importing the seed bank, or submitting fresh questions.
                  </CardDescription>
                </CardHeader>
                {isAdmin && (
                  <CardContent>
                    <Button onClick={handleSeedImport} loading={importingSeeds}>
                      <Database className="w-4 h-4 mr-2" />
                      Import Curated Seed Bank
                    </Button>
                  </CardContent>
                )}
              </Card>
            ) : (
              <>
                {approvedFilteredQuestions.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <h2 className="text-xl font-semibold">Curated Questions</h2>
                    </div>
                    {approvedFilteredQuestions.map((question) => (
                      <Card key={question.id} hover={false} className={questionCardTone(question)}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge className="bg-slate-900 text-white">{getRoleLabel(question.role)}</Badge>
                                <Badge variant="outline">{getSubcategoryLabel(question.role, question.subcategory)}</Badge>
                                <Badge variant="outline">{question.questionType}</Badge>
                                <Badge variant="outline">{question.difficulty}</Badge>
                                {question.company && <Badge className="bg-emerald-100 text-emerald-800">{question.company}</Badge>}
                              </div>
                              <CardTitle className="text-xl leading-snug">{question.question}</CardTitle>
                            </div>
                            <button
                              onClick={() => toggleRevealAnswer(question.id)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            >
                              {revealedAnswers[question.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              {revealedAnswers[question.id] ? 'Hide Answer' : 'Reveal Sample Answer'}
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {question.topicTags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {question.topicTags.map((tag) => (
                                <span key={`${question.id}-${tag}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {revealedAnswers[question.id] && (
                            <div className="rounded-xl border border-emerald-200 bg-white/80 p-4">
                              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                                Sample Answer
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                {question.answer || 'No sample answer has been added yet.'}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {showCommunity && communityFilteredQuestions.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-amber-600" />
                      <h2 className="text-xl font-semibold">Community Submissions</h2>
                    </div>
                    {communityFilteredQuestions.map((question) => (
                      <Card key={question.id} hover={false} className={questionCardTone(question)}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge className="bg-amber-100 text-amber-900">Unreviewed</Badge>
                                <Badge className="bg-slate-900 text-white">{getRoleLabel(question.role)}</Badge>
                                <Badge variant="outline">{getSubcategoryLabel(question.role, question.subcategory)}</Badge>
                                <Badge variant="outline">{question.questionType}</Badge>
                                <Badge variant="outline">{question.difficulty}</Badge>
                                {question.company && <Badge className="bg-white text-amber-800 border border-amber-200">{question.company}</Badge>}
                              </div>
                              <CardTitle className="text-xl leading-snug">{question.question}</CardTitle>
                              <CardDescription>
                                Submitted by {question.submitterName || 'a dashboard member'} on{' '}
                                {new Date(question.createdAt).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <button
                              onClick={() => toggleRevealAnswer(question.id)}
                              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100"
                            >
                              {revealedAnswers[question.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              {revealedAnswers[question.id] ? 'Hide Answer' : 'Reveal Sample Answer'}
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {question.topicTags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {question.topicTags.map((tag) => (
                                <span key={`${question.id}-${tag}`} className="rounded-full bg-white px-2.5 py-1 text-xs text-amber-700 border border-amber-200">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {revealedAnswers[question.id] && (
                            <div className="rounded-xl border border-amber-200 bg-white p-4">
                              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
                                Community-Proposed Answer
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                {question.answer || 'No answer has been attached to this submission yet.'}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'test' && (
        <div className="space-y-6">
          <Card hover={false}>
            <CardHeader>
              <CardTitle className="text-xl">Quiz Setup</CardTitle>
              <CardDescription>
                Test Me mode only draws from approved questions that match your current filters.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <label className="min-w-[180px]">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Question Count</div>
                <select
                  value={quizLength}
                  onChange={(event) => setQuizLength(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="5">5 questions</option>
                  <option value="10">10 questions</option>
                  <option value="15">15 questions</option>
                  <option value="25">25 questions</option>
                  <option value="all">All matching questions</option>
                </select>
              </label>

              <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                {approvedFilteredQuestions.length} approved question{approvedFilteredQuestions.length === 1 ? '' : 's'} available in the current pool.
              </div>

              <Button onClick={startQuiz} disabled={approvedFilteredQuestions.length === 0}>
                <Shuffle className="w-4 h-4 mr-2" />
                Start Quiz
              </Button>

              {quizQuestions.length > 0 && (
                <Button variant="outline" className="text-gray-700" onClick={resetQuiz}>
                  Reset Quiz
                </Button>
              )}
            </CardContent>
          </Card>

          {currentQuizQuestion ? (
            <Card hover={false} className="border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-slate-900 text-white">Question {quizIndex + 1} / {quizQuestions.length}</Badge>
                      <Badge variant="outline">{getRoleLabel(currentQuizQuestion.role)}</Badge>
                      <Badge variant="outline">{getSubcategoryLabel(currentQuizQuestion.role, currentQuizQuestion.subcategory)}</Badge>
                      <Badge variant="outline">{currentQuizQuestion.questionType}</Badge>
                    </div>
                    <CardTitle className="text-2xl leading-snug">{currentQuizQuestion.question}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setQuizReveal((current) => !current)}>
                    {quizReveal ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {quizReveal ? 'Hide Sample Answer' : 'Reveal Sample Answer'}
                  </Button>

                  <Button
                    variant="outline"
                    className="text-gray-700"
                    onClick={() => {
                      if (quizIndex < quizQuestions.length - 1) {
                        setQuizIndex((current) => current + 1);
                        setQuizReveal(false);
                      } else {
                        resetQuiz();
                        setNotice('Quiz complete. Start another round whenever you are ready.');
                      }
                    }}
                  >
                    Next Question
                  </Button>
                </div>

                {quizReveal && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                      Sample Answer
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {currentQuizQuestion.answer || 'No sample answer has been written for this prompt yet.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card hover={false}>
              <CardHeader>
                <CardTitle>Ready To Drill</CardTitle>
                <CardDescription>
                  Start a randomized session from the approved pool that matches your current filters.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'submit' && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card hover={false}>
            <CardHeader>
              <CardTitle className="text-xl">Submit Questions</CardTitle>
              <CardDescription>
                Paste one question or many. If you paste multiple lines, each line is saved as a separate submission.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Questions</div>
                <textarea
                  value={submitForm.bulkQuestions}
                  onChange={(event) => setField('bulkQuestions', event.target.value)}
                  rows={10}
                  placeholder={'One question per line\nHow would you pitch a rates steepener trade?\nWalk me through a DCF from revenue to equity value.'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Role</div>
                  <select
                    value={submitForm.role}
                    onChange={(event) => setField('role', event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Track</div>
                  <select
                    value={submitForm.subcategory}
                    onChange={(event) => setField('subcategory', event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="">General within role</option>
                    {submitSubcategories.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Question Type</div>
                  <select
                    value={submitForm.questionType}
                    onChange={(event) => setField('questionType', event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    {QUESTION_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Difficulty</div>
                  <select
                    value={submitForm.difficulty}
                    onChange={(event) => setField('difficulty', event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Company</div>
                  <input
                    value={submitForm.company}
                    onChange={(event) => setField('company', event.target.value)}
                    placeholder="Optional firm or desk"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>

                <label>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Firm Type</div>
                  <select
                    value={submitForm.firmType}
                    onChange={(event) => setField('firmType', event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Optional</option>
                    {FIRM_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4">
                <label>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Topic Tags</div>
                  <input
                    value={submitForm.topicTags}
                    onChange={(event) => setField('topicTags', event.target.value)}
                    placeholder="Comma-separated tags like rates, market-making, dcf"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>

                <label>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Proposed Sample Answer</div>
                  <textarea
                    value={submitForm.answer}
                    onChange={(event) => setField('answer', event.target.value)}
                    rows={6}
                    placeholder="Optional. Best used when submitting a single question."
                    className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
                  />
                </label>

                <label>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</div>
                  <textarea
                    value={submitForm.notes}
                    onChange={(event) => setField('notes', event.target.value)}
                    rows={4}
                    placeholder="Optional context, interview round, desk, or why this question matters."
                    className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Source Title</div>
                    <input
                      value={submitForm.sourceTitle}
                      onChange={(event) => setField('sourceTitle', event.target.value)}
                      placeholder="Optional source or interview context"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  <label>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Source URL</div>
                    <input
                      value={submitForm.sourceUrl}
                      onChange={(event) => setField('sourceUrl', event.target.value)}
                      placeholder="Optional link"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Optional Supporting Attachment</div>
                    <div className="text-sm text-slate-500 mt-1">
                      Upload a PDF, DOC, or DOCX file with notes or source material.
                    </div>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleAttachmentUpload(file);
                      }}
                    />
                    <div className={`inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 ${uploadingAttachment ? 'opacity-60' : 'hover:bg-slate-50'}`}>
                      {uploadingAttachment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingAttachment ? 'Uploading...' : 'Upload Attachment'}
                    </div>
                  </label>
                </div>

                {submitForm.attachmentUrl && (
                  <div className="mt-3 text-sm">
                    <a
                      href={submitForm.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      View uploaded attachment
                    </a>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSubmitQuestions} loading={submitting}>
                  <Send className="w-4 h-4 mr-2" />
                  Submit To Interview Bank
                </Button>
                <Button
                  variant="outline"
                  className="text-gray-700"
                  onClick={() => setSubmitForm({ ...INITIAL_SUBMIT_FORM, role: submitForm.role })}
                >
                  Reset Form
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card hover={false} className="border-slate-200 bg-slate-50/60">
            <CardHeader>
              <CardTitle className="text-xl">Submission Notes</CardTitle>
              <CardDescription>
                A few guardrails so the shared bank stays high-signal for everyone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 leading-7">
              <p>
                Paste one question per line if you want to upload a batch quickly. Multi-line uploads keep the same
                role, track, difficulty, and company metadata.
              </p>
              <p>
                If you include a proposed answer, it works best with a single question. Batch uploads prioritize
                getting the prompts into the bank quickly and can be enriched later by admins.
              </p>
              <p>
                New submissions appear immediately with an <span className="font-semibold text-amber-700">Unreviewed</span>{' '}
                badge so other members can still benefit from them right away.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'review' && isAdmin && (
        <div className="space-y-6">
          <Card hover={false}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-xl">Admin Review Queue</CardTitle>
                  <CardDescription>
                    Moderate new submissions, enrich answers, retag records, and import or refresh the curated seed bank.
                  </CardDescription>
                </div>
                <Button onClick={handleSeedImport} loading={importingSeeds}>
                  <Database className="w-4 h-4 mr-2" />
                  Import / Refresh Seed Bank
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Pending Review</div>
                  <div className="text-3xl font-bold mt-2">{pendingReview}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-emerald-700">Approved Bank</div>
                  <div className="text-3xl font-bold mt-2 text-emerald-900">{totalApproved}</div>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-sky-700">Total Records</div>
                  <div className="text-3xl font-bold mt-2 text-sky-900">{questions.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {pendingReview === 0 ? (
            <Card hover={false}>
              <CardHeader>
                <CardTitle>No Pending Submissions</CardTitle>
                <CardDescription>
                  The review queue is clear. You can still refresh the curated seed bank if you want to repopulate or update it.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            questions
              .filter((question) => !question.approved)
              .map((question) => {
                const draft = reviewDrafts[question.id] || buildReviewDraft(question);
                const draftSubcategories = getSubcategoryOptions(draft.role);

                return (
                  <Card key={question.id} hover={false} className="border-amber-200 bg-amber-50/50">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge className="bg-amber-100 text-amber-900">Unreviewed</Badge>
                            <Badge variant="outline">{getRoleLabel(question.role)}</Badge>
                            <Badge variant="outline">{getSubcategoryLabel(question.role, question.subcategory)}</Badge>
                          </div>
                          <CardTitle className="text-xl">{question.question}</CardTitle>
                          <CardDescription className="mt-2">
                            Submitted by {question.submitterName || 'a dashboard member'} on{' '}
                            {new Date(question.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <label className="block">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Question</div>
                        <textarea
                          value={draft.question}
                          onChange={(event) => updateReviewDraft(question.id, 'question', event.target.value)}
                          rows={4}
                          className="w-full rounded-lg border border-border bg-white px-3 py-3 text-sm outline-none focus:border-primary"
                        />
                      </label>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <label>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Role</div>
                          <select
                            value={draft.role}
                            onChange={(event) => updateReviewDraft(question.id, 'role', event.target.value)}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Track</div>
                          <select
                            value={draft.subcategory}
                            onChange={(event) => updateReviewDraft(question.id, 'subcategory', event.target.value)}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          >
                            <option value="">General within role</option>
                            {draftSubcategories.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Type</div>
                          <select
                            value={draft.questionType}
                            onChange={(event) => updateReviewDraft(question.id, 'questionType', event.target.value)}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          >
                            {QUESTION_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Difficulty</div>
                          <select
                            value={draft.difficulty}
                            onChange={(event) => updateReviewDraft(question.id, 'difficulty', event.target.value)}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          >
                            {DIFFICULTY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Company</div>
                          <input
                            value={draft.company}
                            onChange={(event) => updateReviewDraft(question.id, 'company', event.target.value)}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          />
                        </label>

                        <label>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Firm Type</div>
                          <select
                            value={draft.firmType}
                            onChange={(event) => updateReviewDraft(question.id, 'firmType', event.target.value)}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          >
                            <option value="">Optional</option>
                            {FIRM_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Submitter Name</div>
                          <input
                            value={draft.submitterName}
                            onChange={(event) => updateReviewDraft(question.id, 'submitterName', event.target.value)}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Topic Tags</div>
                          <input
                            value={draft.topicTags}
                            onChange={(event) => updateReviewDraft(question.id, 'topicTags', event.target.value)}
                            placeholder="Comma-separated tags"
                            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          />
                        </label>

                        <label>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Source Type</div>
                          <input
                            value={draft.sourceType}
                            onChange={(event) => updateReviewDraft(question.id, 'sourceType', event.target.value)}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Source Title</div>
                          <input
                            value={draft.sourceTitle}
                            onChange={(event) => updateReviewDraft(question.id, 'sourceTitle', event.target.value)}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          />
                        </label>

                        <label>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Source URL</div>
                          <input
                            value={draft.sourceUrl}
                            onChange={(event) => updateReviewDraft(question.id, 'sourceUrl', event.target.value)}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Attachment URL</div>
                        <input
                          value={draft.attachmentUrl}
                          onChange={(event) => updateReviewDraft(question.id, 'attachmentUrl', event.target.value)}
                          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                      </label>

                      <label className="block">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</div>
                        <textarea
                          value={draft.notes}
                          onChange={(event) => updateReviewDraft(question.id, 'notes', event.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-border bg-white px-3 py-3 text-sm outline-none focus:border-primary"
                        />
                      </label>

                      <label className="block">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sample Answer</div>
                        <textarea
                          value={draft.answer}
                          onChange={(event) => updateReviewDraft(question.id, 'answer', event.target.value)}
                          rows={8}
                          className="w-full rounded-lg border border-border bg-white px-3 py-3 text-sm outline-none focus:border-primary"
                        />
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => saveReview(question.id, false)}
                          loading={savingReviewId === question.id}
                        >
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Save Draft
                        </Button>
                        <Button
                          onClick={() => saveReview(question.id, true)}
                          loading={savingReviewId === question.id}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve Question
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-600"
                          onClick={() => deleteReviewQuestion(question.id)}
                          disabled={deletingReviewId === question.id}
                        >
                          {deletingReviewId === question.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
