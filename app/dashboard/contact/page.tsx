'use client';

import { DashboardLoadError } from '@/components/dashboard-load-error';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import { Mail, Trash2, Reply, X, Pencil } from 'lucide-react';
import {
  CONTACT_REPLY_SUBJECT_KEY,
  CONTACT_REPLY_TEMPLATE_KEY,
  DEFAULT_CONTACT_REPLY_SUBJECT,
  DEFAULT_CONTACT_REPLY_TEMPLATE,
  renderContactReplyTemplate,
} from '@/lib/contact-reply';

interface ContactSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function ContactDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [filter, setFilter] = useState<'all' | 'new' | 'read'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState('');
  const [replySubject, setReplySubject] = useState(DEFAULT_CONTACT_REPLY_SUBJECT);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_CONTACT_REPLY_TEMPLATE);
  const [subjectTemplate, setSubjectTemplate] = useState(DEFAULT_CONTACT_REPLY_SUBJECT);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState(DEFAULT_CONTACT_REPLY_TEMPLATE);
  const [draftSubject, setDraftSubject] = useState(DEFAULT_CONTACT_REPLY_SUBJECT);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ configured: boolean; from: string } | null>(null);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !isAdmin) {
      router.push('/dashboard');
    }
  }, [status, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchSubmissions();
      fetch('/api/contact/email-status')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => data && setEmailStatus(data))
        .catch(() => setEmailStatus({ configured: false, from: '' }));
      fetch('/api/settings', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : {}))
        .then((data) => {
          if (data[CONTACT_REPLY_TEMPLATE_KEY]) setTemplate(data[CONTACT_REPLY_TEMPLATE_KEY]);
          if (data[CONTACT_REPLY_SUBJECT_KEY]) setSubjectTemplate(data[CONTACT_REPLY_SUBJECT_KEY]);
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const fetchSubmissions = async () => {
    setLoadError(false);
    try {
      const res = await fetch('/api/contact');
      if (!res.ok) throw new Error("Request failed");
      setSubmissions(await res.json());
    } catch (error) {
      setLoadError(true);
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReply = (submission: ContactSubmission) => {
    setReplyingTo(submission.id);
    setReplyTo(submission.email);
    setReplySubject(subjectTemplate || DEFAULT_CONTACT_REPLY_SUBJECT);
    setReplyMessage(renderContactReplyTemplate(template, submission));
    setEditingTemplate(false);
    setDraftTemplate(template);
    setDraftSubject(subjectTemplate);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSubmissions(submissions.filter((s) => s.id !== id));
      } else {
        alert('Failed to delete submission');
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Failed to delete submission');
    }
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const responses = await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: CONTACT_REPLY_TEMPLATE_KEY, value: draftTemplate }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: CONTACT_REPLY_SUBJECT_KEY, value: draftSubject }),
        }),
      ]);
      if (responses.some((res) => !res.ok)) throw new Error('Failed to save template');
      setTemplate(draftTemplate);
      setSubjectTemplate(draftSubject);
      const submission = submissions.find((s) => s.id === replyingTo);
      if (submission) {
        setReplySubject(draftSubject);
        setReplyMessage(renderContactReplyTemplate(draftTemplate, submission));
      }
      setEditingTemplate(false);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save reply template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleReply = async (submission: ContactSubmission) => {
    if (!replyTo.trim() || !replyMessage.trim()) {
      alert('Please enter a recipient and reply message');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/contact/${submission.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: replyTo.trim(),
          subject: replySubject,
          message: replyMessage,
        }),
      });

      if (res.ok) {
        alert('Reply sent successfully!');
        setReplyingTo(null);
        setReplyMessage('');
        setSubmissions(submissions.map((s) =>
          s.id === submission.id ? { ...s, status: 'READ' } : s
        ));
      } else {
        const error = await res.json();
        alert(`Failed to send reply: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const filteredSubmissions = submissions
    .filter((sub) => {
      if (filter === 'all') return true;
      return sub.status.toLowerCase() === filter;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'latest' ? dateB - dateA : dateA - dateB;
    });

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'NEW':
        return 'bg-blue-100 text-blue-800';
      case 'READ':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Less than an hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (loadError) return <DashboardLoadError onRetry={() => fetchSubmissions()} />;

  const activeSubmission = submissions.find((s) => s.id === replyingTo);

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Contact Form Submissions</h1>
          <p className="text-muted-foreground">
            Review and respond to contact requests. Click a submission to reply.
          </p>
          {emailStatus && (
            <p className={`mt-3 text-sm ${emailStatus.configured ? 'text-green-700' : 'text-amber-700'}`}>
              {emailStatus.configured
                ? `Replies send through Resend from ${emailStatus.from}.`
                : 'Email is not connected. Set RESEND_API_KEY so replies actually send.'}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardDescription>Total Submissions</CardDescription>
              <CardTitle className="text-3xl">{submissions.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>New</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {submissions.filter((s) => s.status === 'NEW').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Read</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {submissions.filter((s) => s.status === 'READ').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('new')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'new'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              New
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'read'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Read
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'latest' | 'oldest')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <button
                    type="button"
                    onClick={() => openReply(submission)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Mail className="w-5 h-5 text-primary" />
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(submission.status)}`}>
                        {submission.status}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {getRelativeTime(submission.createdAt)}
                      </span>
                    </div>
                    <CardTitle className="mb-2">
                      {submission.firstName} {submission.lastName}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mb-3">
                      {submission.email}
                    </div>
                    <CardDescription className="whitespace-pre-wrap">
                      {submission.message}
                    </CardDescription>
                  </button>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReply(submission)}
                    >
                      <Reply className="w-4 h-4 mr-1" />
                      Reply
                    </Button>
                    <button
                      onClick={() => handleDelete(submission.id)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}

          {filteredSubmissions.length === 0 && (
            <Card>
              <CardHeader className="text-center py-12">
                <p className="text-muted-foreground">No submissions found.</p>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>

      {replyingTo && activeSubmission && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div
            role="dialog"
            aria-labelledby="contact-reply-title"
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 id="contact-reply-title" className="text-2xl font-bold">
                Reply to {activeSubmission.firstName}
              </h2>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyMessage('');
                  setEditingTemplate(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {emailStatus && !emailStatus.configured && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Email is not connected, so this reply will not send until RESEND_API_KEY is set.
                </p>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="contact-reply-to">To:</label>
                <input
                  id="contact-reply-to"
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="contact-reply-subject">Subject:</label>
                <input
                  id="contact-reply-subject"
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {editingTemplate ? (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium">Edit default reply template</p>
                  <p className="text-xs text-muted-foreground">
                    Use {'{{firstName}}'}, {'{{lastName}}'}, {'{{fullName}}'}, or {'{{email}}'}.
                  </p>
                  <input
                    type="text"
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Default subject"
                  />
                  <textarea
                    value={draftTemplate}
                    onChange={(e) => setDraftTemplate(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Default reply template"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingTemplate(false)} disabled={savingTemplate}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
                      {savingTemplate ? 'Saving...' : 'Save template'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium" htmlFor="contact-reply-message">Message:</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDraftTemplate(template);
                        setDraftSubject(subjectTemplate);
                        setEditingTemplate(true);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit template
                    </Button>
                  </div>
                  <textarea
                    id="contact-reply-message"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Type your reply here..."
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyMessage('');
                    setEditingTemplate(false);
                  }}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReply(activeSubmission)}
                  disabled={sending || editingTemplate}
                >
                  {sending ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
