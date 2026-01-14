'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import { FileText, Users, Mail, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Show visitor message
  if (session?.user?.role === 'visitor') {
    return (
      <div className="space-y-8">
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Welcome to SGC</h1>
            <p className="text-muted-foreground mb-8">
              Your account is currently set to visitor status. Please contact an administrator to gain access to dashboard features.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>You can view your team profile and public content, but dashboard access requires user privileges.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const [stats, setStats] = useState({
    articles: 0,
    teamMembers: 0,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [articlesRes, teamRes] = await Promise.all([
        fetch('/api/articles?published=true'),
        fetch('/api/team'),
      ]);

      const articles = await articlesRes.json();
      const team = await teamRes.json();

      setStats({
        articles: articles.length || 0,
        teamMembers: team.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const isAdmin = session?.user?.role === 'admin';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {session?.user?.name || session?.user?.email}!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardDescription>Published Articles</CardDescription>
                <CardTitle className="text-3xl">{stats.articles}</CardTitle>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardDescription>Team Members</CardDescription>
                <CardTitle className="text-3xl">{stats.teamMembers}</CardTitle>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardDescription>Your Role</CardDescription>
                <CardTitle className="text-3xl capitalize">{session?.user?.role}</CardTitle>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardDescription>Access Level</CardDescription>
                <CardTitle className="text-2xl">
                  {isAdmin ? 'Full Access' : 'Read Only'}
                </CardTitle>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
            <div className="mt-4 space-y-3">
              {isAdmin && (
                <Link href="/dashboard/articles/new" className="block">
                  <Button className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Create New Article
                  </Button>
                </Link>
              )}
              <Link href="/dashboard/articles" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  View All Articles
                </Button>
              </Link>
              <Link href="/dashboard/team" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  View Team
                </Button>
              </Link>
              <Link href="/research" target="_blank" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Public Site
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Helpful resources</CardDescription>
            <div className="mt-4 space-y-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium mb-1">📝 Create Articles</p>
                <p className="text-gray-600">
                  {isAdmin 
                    ? 'Go to Articles → New Article to publish research'
                    : 'Only admins can create articles'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium mb-1">📷 Upload Images</p>
                <p className="text-gray-600">
                  Upload images directly in the article editor
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium mb-1">✍️ Use Markdown</p>
                <p className="text-gray-600">
                  Format your articles with Markdown for better styling
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
