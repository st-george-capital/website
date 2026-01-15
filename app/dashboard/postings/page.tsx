'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Plus, Users, Eye, Download, Calendar } from 'lucide-react';

interface JobPosting {
  id: string;
  title: string;
  description: string;
  team: string;
  endDate: string;
  published: boolean;
  createdAt: string;
  _count?: {
    applications: number;
  };
}

interface JobApplication {
  id: string;
  name: string;
  email: string;
  resumeFile?: string;
  appliedAt: string;
  jobPosting: {
    title: string;
    team: string;
  };
}

const teamColors = {
  quant_trading: 'bg-blue-100 text-blue-700',
  quant_research: 'bg-green-100 text-green-700',
  macro: 'bg-purple-100 text-purple-700',
  equity: 'bg-orange-100 text-orange-700',
};

export default function PostingsDashboardPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'postings' | 'applications'>('postings');
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (activeTab === 'postings') {
      fetchPostings();
    } else {
      fetchApplications();
    }
  }, [activeTab]);

  const fetchPostings = async () => {
    try {
      const response = await fetch('/api/job-postings');
      if (response.ok) {
        const data = await response.json();
        setPostings(data);
      }
    } catch (error) {
      console.error('Error fetching postings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/job-applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePosting = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job posting? This will also delete all associated applications.')) return;

    try {
      const response = await fetch(`/api/job-postings/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPostings(postings.filter(p => p.id !== id));
      } else {
        alert('Failed to delete posting');
      }
    } catch (error) {
      console.error('Error deleting posting:', error);
      alert('Failed to delete posting');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to manage job postings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Job Postings</h1>
          <p className="text-muted-foreground">
            Manage job openings and review applications
          </p>
        </div>
        <Link href="/dashboard/postings/new" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          New Posting
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('postings')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'postings'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Job Postings ({postings.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'applications'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Applications ({applications.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'postings' ? (
        <Card>
          <CardHeader>
            <CardTitle>Job Postings</CardTitle>
            <CardDescription>
              Create and manage job openings for your teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : postings.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No job postings yet</h3>
                <p className="text-muted-foreground">
                  Get started by creating your first job posting.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {postings.map((posting) => (
                  <div key={posting.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium">{posting.title}</h3>
                          <Badge className={teamColors[posting.team as keyof typeof teamColors] || 'bg-gray-100 text-gray-700'}>
                            {posting.team.replace('_', ' ')}
                          </Badge>
                          {posting.published ? (
                            <Badge className="bg-green-100 text-green-700">Published</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700">Draft</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Applications: {posting._count?.applications || 0} •
                          Ends: {new Date(posting.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {posting.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/dashboard/postings/${posting.id}/edit`}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        title="Edit posting"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => deletePosting(posting.id)}
                        className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete posting"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Job Applications</CardTitle>
            <CardDescription>
              Review and manage job applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No applications yet</h3>
                <p className="text-muted-foreground">
                  Applications will appear here once candidates apply to your job postings.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div key={application.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium">{application.name}</h3>
                          <Badge className={teamColors[application.jobPosting.team as keyof typeof teamColors] || 'bg-gray-100 text-gray-700'}>
                            {application.jobPosting.team.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {application.email} • Applied for: {application.jobPosting.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Applied: {new Date(application.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {application.resumeFile && (
                        <a
                          href={application.resumeFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Download resume"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}