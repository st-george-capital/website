'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import { Users, Linkedin, Plus } from 'lucide-react';
import Link from 'next/link';

interface TeamMember {
  id: string;
  name: string;
  title: string;
  role: string;
  division: string;
  program: string | null;
  year: string | null;
  headshot: string | null;
  linkedin: string | null;
  isExecutive: boolean;
}

export default function TeamDashboardPage() {
  const { data: session } = useSession();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team');
      const data = await response.json();
      setTeamMembers(data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const divisions = ['all', ...new Set(teamMembers.map(m => m.division))];
  
  const filteredMembers = selectedDivision === 'all' 
    ? teamMembers 
    : teamMembers.filter(m => m.division === selectedDivision);

  const divisionCounts = teamMembers.reduce((acc, member) => {
    acc[member.division] = (acc[member.division] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Team Management</h1>
          <p className="text-muted-foreground">View and manage your organization's team members</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/team/add">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardDescription>Total Members</CardDescription>
            <CardTitle className="text-3xl">{teamMembers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>On Website</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {teamMembers.filter(m => m.isExecutive).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Internal Only</CardDescription>
            <CardTitle className="text-3xl text-gray-600">
              {teamMembers.filter(m => !m.isExecutive).length}
            </CardTitle>
          </CardHeader>
        </Card>
        {Object.entries(divisionCounts).slice(0, 1).map(([division, count]) => (
          <Card key={division}>
            <CardHeader>
              <CardDescription>{division}</CardDescription>
              <CardTitle className="text-3xl">{count}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 overflow-x-auto pb-2">
        {divisions.map((division) => (
          <button
            key={division}
            onClick={() => setSelectedDivision(division)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedDivision === division
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {division === 'all' ? 'All Members' : division}
          </button>
        ))}
      </div>

      {/* Team Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <Card key={member.id}>
            <CardHeader>
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                  {member.headshot ? (
                    <img
                      src={member.headshot}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-primary">
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    {member.isExecutive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                        On Website
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        Internal Only
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-sm mb-2">
                    {member.title || member.role || 'No title'}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                      {member.division}
                    </span>
                    {member.program && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {member.program}
                      </span>
                    )}
                    {member.year && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {member.year}
                      </span>
                    )}
                  </div>
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-3 text-sm text-primary hover:underline"
                    >
                      <Linkedin className="w-4 h-4 mr-1" />
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card>
          <CardHeader className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <CardTitle>No Team Members Found</CardTitle>
            <CardDescription>
              No team members match the selected filter.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Division Breakdown */}
      {Object.keys(divisionCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Members by Division</CardTitle>
            <CardDescription>Distribution across teams</CardDescription>
            <div className="mt-6 space-y-4">
              {Object.entries(divisionCounts).map(([division, count]) => {
                const percentage = (count / teamMembers.length) * 100;
                return (
                  <div key={division}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{division}</span>
                      <span className="text-muted-foreground">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
