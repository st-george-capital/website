'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ArrowLeft, Download, Mail, Calendar, Briefcase, FileText, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface JobApplication {
  id: string;
  name: string;
  email: string;
  phone?: string;
  resumeFile?: string;
  coverLetter?: string;
  appliedAt: string;
  jobPosting: {
    id: string;
    title: string;
    team: string;
    description: string;
  };
}

const teamColors = {
  quant_trading: 'bg-blue-100 text-blue-700',
  quant_research: 'bg-green-100 text-green-700',
  macro: 'bg-purple-100 text-purple-700',
  equity: 'bg-orange-100 text-orange-700',
};

export default function ViewApplicationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (params.id) {
      fetchApplication();
    }
  }, [params.id]);

  const fetchApplication = async () => {
    try {
      const response = await fetch(`/api/job-applications/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setApplication(data);
      } else {
        alert('Failed to fetch application');
        router.push('/dashboard/postings');
      }
    } catch (error) {
      console.error('Error fetching application:', error);
      alert('Failed to fetch application');
      router.push('/dashboard/postings');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to view applications.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Application Not Found</h1>
          <p className="text-muted-foreground mb-4">This application doesn't exist or has been deleted.</p>
          <Link href="/dashboard/postings">
            <Button>Back to Postings</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/postings" className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{application.name}</h1>
          <p className="text-muted-foreground">
            Application for {application.jobPosting.title}
          </p>
        </div>
      </div>

      {/* Application Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Information */}
          <Card>
            <CardHeader>
              <CardTitle>Applicant Information</CardTitle>
              <CardDescription>
                Contact details and basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-lg font-semibold">{application.name}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                  <a href={`mailto:${application.email}`} className="text-lg font-semibold text-blue-600 hover:underline">
                    {application.email}
                  </a>
                </div>
              </div>

              {application.phone && (
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                    <p className="text-lg font-semibold">{application.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Applied On</p>
                  <p className="text-lg font-semibold">
                    {new Date(application.appliedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cover Letter */}
          {application.coverLetter && (
            <Card>
              <CardHeader>
                <CardTitle>Cover Letter</CardTitle>
                <CardDescription>
                  Applicant's message and motivation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700">{application.coverLetter}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Posting Info */}
          <Card>
            <CardHeader>
              <CardTitle>Position Applied For</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <p className="font-semibold">{application.jobPosting.title}</p>
                </div>
                <Badge className={teamColors[application.jobPosting.team as keyof typeof teamColors] || 'bg-gray-100 text-gray-700'}>
                  {application.jobPosting.team.replace('_', ' ')}
                </Badge>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Job Description</p>
                <p className="text-sm text-gray-700 line-clamp-4">{application.jobPosting.description}</p>
              </div>

              <Link href={`/dashboard/postings/${application.jobPosting.id}/edit`}>
                <Button variant="outline" className="w-full text-sm">
                  View Full Job Posting
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Resume */}
          {application.resumeFile && (
            <Card>
              <CardHeader>
                <CardTitle>Resume</CardTitle>
                <CardDescription>
                  Applicant's curriculum vitae
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={application.resumeFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Resume
                  </Button>
                </a>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Opens in new tab
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = `mailto:${application.email}`}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
