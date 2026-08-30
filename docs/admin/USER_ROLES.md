# User Roles Guide

## Available Roles

### 1. **admin** - Full Access
Admins can do everything:
- ✅ Create, edit, delete articles
- ✅ Upload images
- ✅ Manage team members
- ✅ Access all dashboard features
- ✅ View all content (published and drafts)
- ✅ Publish/unpublish articles
- ✅ Manage users

### 2. **user** - Read-Only Access
Regular users can only:
- ✅ View published articles
- ✅ Access public pages
- ✅ View dashboard (read-only)
- ❌ Cannot create or edit content
- ❌ Cannot delete anything
- ❌ Cannot upload files

## Setting User Roles

### In `users.json`:

```json
{
  "users": [
    {
      "email": "admin@example.com",
      "password": "password123",
      "name": "Admin User",
      "role": "admin"     ← Full access
    },
    {
      "email": "viewer@example.com",
      "password": "password456",
      "name": "Regular User",
      "role": "user"      ← Read-only
    }
  ]
}
```

### Default Role
If you don't specify a role, it defaults to `"admin"` for backwards compatibility.

## Examples

### Admin Team Member
```json
{
  "email": "kabir@sgc.com",
  "password": "secure_password",
  "name": "Kabir Dhillon",
  "role": "admin"
}
```

### Read-Only Member
```json
{
  "email": "member@sgc.com",
  "password": "member_pass",
  "name": "Team Member",
  "role": "user"
}
```

## Workflow

### Adding an Admin
1. Add to `users.json` with `"role": "admin"`
2. Run `npm run sync-users`
3. They can now login and manage content

### Adding a Regular User
1. Add to `users.json` with `"role": "user"`
2. Run `npm run sync-users`  
3. They can login and view, but not edit

## What Each Role Can Do

| Feature | Admin | User |
|---------|-------|------|
| View published articles | ✅ | ✅ |
| View draft articles | ✅ | ❌ |
| Create articles | ✅ | ❌ |
| Edit articles | ✅ | ❌ |
| Delete articles | ✅ | ❌ |
| Upload images | ✅ | ❌ |
| Publish/unpublish | ✅ | ❌ |
| Access dashboard | ✅ | ✅ (read-only) |
| Manage team | ✅ | ❌ |

## Changing Roles

To change someone's role:
1. Update their `"role"` in `users.json`
2. Run `npm run sync-users`
3. Changes take effect on their next login

## Security Notes

- Keep admin access limited to trusted team members
- Regular users can see they're in read-only mode
- API endpoints enforce permissions
- All admin actions are protected by authentication

