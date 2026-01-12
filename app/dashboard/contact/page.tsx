'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import { Mail, Trash2, Reply, X } from 'lucide-react';

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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);

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
    }
  }, [isAdmin]);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/contact');
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
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

  const handleReply = async (submission: ContactSubmission) => {
    if (!replyMessage.trim()) {
      alert('Please enter a reply message');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/contact/${submission.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: submission.email,
          subject: `Re: Your message to St. George Capital`,
          message: replyMessage,
        }),
      });

      if (res.ok) {
        alert('Reply sent successfully!');
        setReplyingTo(null);
        setReplyMessage('');
        
        // Mark as read
        const updatedSubmissions = submissions.map((s) =>
          s.id === submission.id ? { ...s, status: 'READ' } : s
        );
        setSubmissions(updatedSubmissions);
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

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Contact Form Submissions</h1>
          <p className="text-muted-foreground">
            Review and respond to contact requests • Auto-forwarded to outreach@stgeorgecapital.ca
          </p>
        </div>

        {/* Stats */}
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

        {/* Filters & Sort */}
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

        {/* Submissions List */}
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
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
                      <a href={`mailto:${submission.email}`} className="hover:text-primary">
                        {submission.email}
                      </a>
                    </div>
                    <CardDescription className="whitespace-pre-wrap">
                      {submission.message}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReplyingTo(submission.id)}
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

      {/* Reply Modal */}
      {replyingTo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold">Reply to {submissions.find(s => s.id === replyingTo)?.firstName}</h2>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyMessage('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">To:</label>
                <input
                  type="text"
                  value={submissions.find(s => s.id === replyingTo)?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message:</label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Type your reply here..."
                />
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyMessage('');
                  }}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const submission = submissions.find(s => s.id === replyingTo);
                    if (submission) handleReply(submission);
                  }}
                  disabled={sending}
                >
                  {sending ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
