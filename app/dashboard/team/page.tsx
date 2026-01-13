'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import { Users, Linkedin, Plus } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  teamMember?: {
    id: string;
    name: string;
    division: string;
    title: string;
    isExecutive: boolean;
  } | null;
}

export default function TeamDashboardPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const roles = ['all', 'admin', 'user'];

  const filteredUsers = selectedRole === 'all'
    ? users
    : users.filter(u => u.role === selectedRole);

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    users: users.filter(u => u.role === 'user').length,
    verified: users.filter(u => u.emailVerified).length,
  };

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
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.admins}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.users}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Verified Emails</CardDescription>
            <CardTitle className="text-3xl text-purple-600">{stats.verified}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 overflow-x-auto pb-2">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedRole === role
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {role === 'all' ? 'All Users' : role.charAt(0).toUpperCase() + role.slice(1) + 's'}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>
            Manage user accounts and their team member associations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">User</th>
                  <th className="text-left py-3 px-4 font-medium">Role</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Team Member</th>
                  <th className="text-left py-3 px-4 font-medium">Joined</th>
                  {isAdmin && <th className="text-left py-3 px-4 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        user.role === 'admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        user.emailVerified
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {user.emailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.teamMember ? (
                        <div>
                          <div className="font-medium text-sm">{user.teamMember.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.teamMember.title} • {user.teamMember.division}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not linked</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            Link Member
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
