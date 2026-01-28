'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Users, Linkedin, Plus, UserCheck, Trash2, Edit, Save, X, Upload } from 'lucide-react';
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

interface TeamMember {
  id: string;
  name: string;
  title: string;
  role: string;
  division: string;
  program: string | null;
  year: string | null;
  bio: string | null;
  headshot: string | null;
  linkedin: string | null;
  isExecutive: boolean;
  order: number;
}

export default function TeamDashboardPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'members' | 'users'>('members');
  const [users, setUsers] = useState<User[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TeamMember>>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchTeamMembers();
    }
  }, [activeTab]);

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

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setUsers(users.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        ));
      } else {
        alert('Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      // Remove user from local state
      setUsers(users.filter(u => u.id !== userId));
      setDeletingUser(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const startEditingMember = (member: TeamMember) => {
    setEditingMember(member.id);
    setEditForm({
      name: member.name,
      title: member.title,
      role: member.role,
      division: member.division,
      program: member.program,
      year: member.year,
      bio: member.bio,
      linkedin: member.linkedin,
      headshot: member.headshot,
      isExecutive: member.isExecutive,
      order: member.order,
    });
  };

  const cancelEditingMember = () => {
    setEditingMember(null);
    setEditForm({});
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setEditForm(prev => ({ ...prev, headshot: data.url }));
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      handleImageUpload(file);
    }
  };

  const saveMemberEdits = async () => {
    if (!editingMember) return;

    try {
      const response = await fetch(`/api/team-members/${editingMember}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const updatedMember = await response.json();
        setTeamMembers(teamMembers.map(m => m.id === editingMember ? updatedMember : m));
        setEditingMember(null);
        setEditForm({});
      } else {
        alert('Failed to update team member');
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      alert('Failed to update team member');
    }
  };

  const roles = ['all', 'admin', 'user'];

  const filteredUsers = selectedRole === 'all'
    ? users
    : users.filter(u => u.role === selectedRole);

  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    users: users.filter(u => u.role === 'user').length,
    verified: users.filter(u => u.emailVerified).length,
  };

  const memberStats = {
    total: teamMembers.length,
    executives: teamMembers.filter(m => m.isExecutive).length,
    members: teamMembers.filter(m => !m.isExecutive).length,
  };

  const stats = activeTab === 'users' ? userStats : memberStats;

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
          <p className="text-muted-foreground">
            {activeTab === 'members'
              ? 'Manage team member profiles for the website'
              : 'Manage user accounts and permissions'
            }
          </p>
        </div>
        {isAdmin && activeTab === 'members' && (
          <Link href="/dashboard/team/add">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'members'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Team Members
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserCheck className="w-4 h-4 inline mr-2" />
          User Accounts
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardDescription>{activeTab === 'users' ? 'Total Users' : 'Total Members'}</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        {activeTab === 'users' ? (
          <>
            <Card>
              <CardHeader>
                <CardDescription>Admins</CardDescription>
                <CardTitle className="text-3xl text-blue-600">{userStats.admins}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Members</CardDescription>
                <CardTitle className="text-3xl text-green-600">{userStats.users}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Verified Emails</CardDescription>
                <CardTitle className="text-3xl text-purple-600">{userStats.verified}</CardTitle>
              </CardHeader>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardDescription>On Website</CardDescription>
                <CardTitle className="text-3xl text-green-600">{memberStats.executives}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Internal Only</CardDescription>
                <CardTitle className="text-3xl text-gray-600">{memberStats.members}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Divisions</CardDescription>
                <CardTitle className="text-3xl text-purple-600">
                  {new Set(teamMembers.map(m => m.division)).size}
                </CardTitle>
              </CardHeader>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      {activeTab === 'users' ? (
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
      ) : (
        <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          {['all', 'executive', 'member'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedRole(type)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                selectedRole === type
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All Members' : type === 'executive' ? 'On Website' : 'Internal Only'}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'users' ? (
        /* Users Table */
        <Card>
          <CardHeader>
            <CardTitle>Registered Users</CardTitle>
            <CardDescription>
              Manage user accounts, roles, and team member associations
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
                        {isAdmin ? (
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-gray-300 focus:border-primary focus:outline-none"
                          >
                            <option value="visitor">Visitor</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 text-xs rounded ${
                            user.role === 'admin'
                              ? 'bg-blue-100 text-blue-700'
                              : user.role === 'visitor'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {user.role}
                          </span>
                        )}
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingUser(user.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
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
      ) : (
        /* Team Members Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers
            .filter(member => {
              if (selectedRole === 'all') return true;
              if (selectedRole === 'executive') return member.isExecutive;
              if (selectedRole === 'member') return !member.isExecutive;
              return true;
            })
            .map((member) => (
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

                  {/* Edit Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-4">
                      <Link href={`/dashboard/team/${member.id}/edit`}>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardHeader>

                {/* Old Inline Edit Form - Keeping for backward compatibility */}
                {editingMember === member.id && false && (
                  <CardContent className="border-t">
                    <div className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Name</label>
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Title</label>
                          <input
                            type="text"
                            value={editForm.title || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Division</label>
                          <select
                            value={editForm.division || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, division: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="Quantitative Trading">Quantitative Trading</option>
                            <option value="Quantitative Research">Quantitative Research</option>
                            <option value="Equity & Macro Research">Equity & Macro Research</option>
                            <option value="Technology">Technology</option>
                            <option value="Operations">Operations</option>
                            <option value="Charity & Impact">Charity & Impact</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Program</label>
                          <input
                            type="text"
                            value={editForm.program || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, program: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="e.g., Computer Science"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Year</label>
                          <input
                            type="text"
                            value={editForm.year || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, year: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="e.g., 2024"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Display Order</label>
                          <input
                            type="number"
                            value={editForm.order || 0}
                            onChange={(e) => setEditForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
                        <input
                          type="url"
                          value={editForm.linkedin || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, linkedin: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="https://linkedin.com/in/username"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Bio</label>
                        <textarea
                          value={editForm.bio || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Brief bio or description..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Headshot Photo</label>
                        
                        {/* Preview */}
                        {editForm.headshot && (
                          <div className="mb-3 flex items-center space-x-3">
                            <img
                              src={editForm.headshot}
                              alt="Preview"
                              className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => setEditForm(prev => ({ ...prev, headshot: '' }))}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        )}

                        {/* Upload Button */}
                        <div className="flex items-center space-x-2 mb-2">
                          <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors text-sm">
                            <Upload className="w-3 h-3 mr-2" />
                            {uploadingImage ? 'Uploading...' : 'Upload Image'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                              disabled={uploadingImage}
                            />
                          </label>
                          <span className="text-xs text-gray-500">Max 5MB</span>
                        </div>

                        {/* Or use URL */}
                        <input
                          type="url"
                          value={editForm.headshot || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, headshot: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Or enter image URL"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editForm.isExecutive || false}
                            onChange={(e) => setEditForm(prev => ({ ...prev, isExecutive: e.target.checked }))}
                          />
                          Show on public website
                        </label>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button size="sm" onClick={saveMemberEdits}>
                          <Save className="w-3 h-3 mr-1" />
                          Save Changes
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditingMember}>
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete User</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setDeletingUser(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => deleteUser(deletingUser)}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Delete User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
