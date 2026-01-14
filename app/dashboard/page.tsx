'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import { FileText, Users, Calendar, BarChart3, TrendingUp, Plus, Eye } from 'lucide-react';

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
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const isAdmin = session?.user?.role === 'admin';

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage your team, content, and research' : 'Access team resources and research'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="px-3 py-1 bg-accent rounded-full capitalize">
            {session?.user?.role} access
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Articles */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Articles</CardTitle>
                  <CardDescription>Research & publications</CardDescription>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {isAdmin && (
                <Link href="/dashboard/articles/new">
                  <Button size="sm" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    New Article
                  </Button>
                </Link>
              )}
              <Link href="/dashboard/articles">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Eye className="w-4 h-4 mr-2" />
                  View Articles
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        {/* Team */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Team</CardTitle>
                  <CardDescription>Manage team members</CardDescription>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link href="/dashboard/team">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  View Team
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/dashboard/team/add">
                  <Button size="sm" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Calendar */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Calendar</CardTitle>
                  <CardDescription>Events & schedules</CardDescription>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link href="/dashboard/calendar">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Calendar
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/dashboard/calendar/new">
                  <Button size="sm" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    New Event
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Investments */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Investments</CardTitle>
                  <CardDescription>Portfolio & research</CardDescription>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link href="/dashboard/investments">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Holdings
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/dashboard/investments/new">
                  <Button size="sm" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    New Investment
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Strategy */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Strategy</CardTitle>
                  <CardDescription>Documents & research</CardDescription>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link href="/dashboard/strategy">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  View Strategy
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/dashboard/strategy/new">
                  <Button size="sm" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    New Document
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Public Site */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Public Site</CardTitle>
                  <CardDescription>View published content</CardDescription>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link href="/" target="_blank">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Eye className="w-4 h-4 mr-2" />
                  Homepage
                </Button>
              </Link>
              <Link href="/research" target="_blank">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Research
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Admin Quick Stats */}
      {isAdmin && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Quick Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <CardDescription>Content Management</CardDescription>
                </div>
                <CardTitle className="text-sm">Articles, Strategy, Pitches</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <CardDescription>Team Management</CardDescription>
                </div>
                <CardTitle className="text-sm">User roles & permissions</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <CardDescription>Event Planning</CardDescription>
                </div>
                <CardTitle className="text-sm">Schedule & coordination</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
