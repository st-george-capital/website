'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Edit, Tag, Trash2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  tags: string[];
  emailVerified: boolean;
  createdAt: string;
}

export default function UsersDashboardPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserTags = async (userId: string, tags: string[]) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      });

      if (response.ok) {
        setUsers(users.map(user =>
          user.id === userId ? { ...user, tags } : user
        ));
      } else {
        alert('Failed to update user tags');
      }
    } catch (error) {
      console.error('Error updating user tags:', error);
      alert('Failed to update user tags');
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        setUsers(users.map(user =>
          user.id === userId ? { ...user, role } : user
        ));
      } else {
        alert('Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!userId) {
      alert('Error: User ID is missing');
      console.error('Attempted to delete user without ID');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${userName || 'this user'}? This action cannot be undone.`)) {
      return;
    }

    const endpoint = `/api/users/${userId}`;
    console.log('Deleting user:', { userId, endpoint });

    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Delete response status:', response.status);

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId));
        alert('User deleted successfully');
      } else {
        let errorMessage = 'Failed to delete user';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          errorMessage = `Failed to delete user (Status: ${response.status})`;
        }
        console.error('Delete failed:', errorMessage);
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and tags
          </p>
        </div>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Users ({users.length})
          </CardTitle>
          <CardDescription>
            View and manage all registered users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground">
                Users will appear here once they register.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onUpdateTags={updateUserTags}
                  onUpdateRole={updateUserRole}
                  onDelete={deleteUser}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserCard({
  user,
  onUpdateTags,
  onUpdateRole,
  onDelete
}: {
  user: User;
  onUpdateTags: (userId: string, tags: string[]) => void;
  onUpdateRole: (userId: string, role: string) => void;
  onDelete: (userId: string, userName: string) => void;
}) {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState(user.tags.join(', '));
  const [selectedRole, setSelectedRole] = useState(user.role);

  const handleSaveTags = () => {
    const tags = tagInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    onUpdateTags(user.id, tags);
    setIsEditingTags(false);
  };

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    onUpdateRole(user.id, newRole);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'user': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
      <div className="flex items-start space-x-4">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-medium">{user.name || 'No name'}</h3>
            <Badge className={getRoleBadgeColor(user.role)}>
              {user.role}
            </Badge>
            {user.emailVerified && (
              <Badge className="bg-green-100 text-green-700">Verified</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {user.email}
          </p>
          <p className="text-sm text-muted-foreground">
            Joined: {new Date(user.createdAt).toLocaleDateString()}
          </p>

          {/* Tags Section */}
          <div className="mt-3">
            <div className="flex items-center space-x-2 mb-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tags:</span>
            </div>
            {isEditingTags ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Enter tags separated by commas"
                  className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:border-primary focus:outline-none"
                />
                <Button size="sm" onClick={handleSaveTags}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditingTags(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="flex flex-wrap gap-1">
                  {user.tags.length > 0 ? (
                    user.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No tags</span>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsEditingTags(true)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit Tags
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <select
          value={selectedRole}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="px-3 py-1 text-sm border border-gray-300 rounded focus:border-primary focus:outline-none"
        >
          <option value="visitor">Visitor</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(user.id, user.name || user.email)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}