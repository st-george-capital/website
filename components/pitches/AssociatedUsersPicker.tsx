'use client';

import { useState } from 'react';
import { Search, Users } from 'lucide-react';

interface UserOption {
  id: string;
  name?: string;
  email: string;
  role: string;
}

interface Props {
  users: UserOption[];
  selectedUserIds: string[];
  onToggle: (userId: string) => void;
}

export function AssociatedUsersPicker({ users, selectedUserIds, onToggle }: Props) {
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = users
    .filter((user) => {
      if (!normalizedQuery) return true;

      const haystack = `${user.name || ''} ${user.email} ${user.role}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .sort((a, b) => {
      const aSelected = selectedUserIds.includes(a.id);
      const bSelected = selectedUserIds.includes(b.id);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return (a.name || a.email).localeCompare(b.name || b.email);
    });

  const selectedUsers = users.filter((user) => selectedUserIds.includes(user.id));

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Associated Members</label>
      <div className="rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
            placeholder="Search users by name, email, or role"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{selectedUserIds.length} selected</span>
          <span>{filteredUsers.length} visible</span>
        </div>

        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => onToggle(user.id)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
              >
                <Users className="w-3 h-3" />
                {user.name || user.email}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users match your search.</p>
          ) : (
            filteredUsers.map((user) => (
              <label
                key={user.id}
                className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(user.id)}
                  onChange={() => onToggle(user.id)}
                  className="mt-1 rounded"
                />
                <div>
                  <div className="font-medium text-sm">{user.name || user.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.email} • {user.role}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tagged members can see private feedback submitted on this pitch.
      </p>
    </div>
  );
}
