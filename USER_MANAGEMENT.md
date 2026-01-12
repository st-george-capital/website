# User Management Guide

## Quick Start

### Adding Users

1. Open `users.json` in the root directory
2. Add your users to the array:

```json
{
  "users": [
    {
      "email": "user@example.com",
      "password": "their_password",
      "name": "User Name",
      "role": "admin"
    }
  ]
}
```

3. Run the sync command:

```bash
npm run sync-users
```

That's it! The users can now log in at `/login`

## File Format

### users.json Structure

```json
{
  "users": [
    {
      "email": "required@email.com",      // Required: User's email (used for login)
      "password": "required_password",    // Required: Plain text password (will be hashed)
      "name": "Optional Name",            // Optional: Display name (defaults to email)
      "role": "admin"                     // Optional: Role (defaults to "admin")
    }
  ]
}
```

### Fields

- **email** (required): The user's email address. Used for logging in.
- **password** (required): Plain text password. Will be automatically hashed when synced.
- **name** (optional): Display name for the user. Defaults to email if not provided.
- **role** (optional): User role. Currently supports "admin" and "editor". Defaults to "admin".

## Examples

### Example 1: Simple User List

```json
{
  "users": [
    {
      "email": "kabir@sgc.com",
      "password": "kabir2003",
      "name": "Kabir Dhillon"
    },
    {
      "email": "zack@sgc.com",
      "password": "zack2024",
      "name": "Zack Willson"
    },
    {
      "email": "michael@sgc.com",
      "password": "michael123",
      "name": "Michael Nguyen"
    }
  ]
}
```

### Example 2: Different Roles

```json
{
  "users": [
    {
      "email": "admin@sgc.com",
      "password": "admin_strong_password",
      "name": "Main Admin",
      "role": "admin"
    },
    {
      "email": "editor@sgc.com",
      "password": "editor_password",
      "name": "Content Editor",
      "role": "editor"
    }
  ]
}
```

## Commands

### Sync Users to Database

```bash
npm run sync-users
```

This command will:
- Read all users from `users.json`
- Hash their passwords securely
- Create new users if they don't exist
- Update existing users if they do exist

### What Gets Updated

When you run `sync-users`:
- ✅ **New users**: Created with the information from users.json
- ✅ **Existing users**: Password, name, and role are updated
- ✅ **Passwords**: Always re-hashed for security

## Security Notes

### Important Security Practices

1. **Don't commit passwords to git**
   - Consider adding `users.json` to `.gitignore` if sharing code
   - Currently it's tracked for convenience, but be careful!

2. **Use strong passwords**
   - Even though passwords are hashed, use strong passwords
   - Minimum 8 characters recommended
   - Mix of letters, numbers, and symbols

3. **Limit access**
   - Only give admin access to trusted team members
   - Keep the `users.json` file secure
   - Don't share passwords over insecure channels

4. **Regular updates**
   - Change passwords periodically
   - Remove users who no longer need access
   - Run `sync-users` after any changes

## Troubleshooting

### "users.json file not found"

**Problem**: The script can't find the users.json file.

**Solution**: Make sure `users.json` is in the root directory (same level as `package.json`)

### "No users found in users.json"

**Problem**: The users array is empty or missing.

**Solution**: Add at least one user to the `users` array in `users.json`

### "Skipping user: missing email or password"

**Problem**: A user entry is missing required email or password field.

**Solution**: Make sure every user has both `email` and `password` fields:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Users can't log in

**Problem**: Users exist in users.json but can't log in.

**Solutions**:
1. Make sure you ran `npm run sync-users` after adding them
2. Check that the email and password match exactly
3. Verify the database is running: `npx prisma studio`

## Alternative: Command Line User Creation

If you prefer not to use users.json, you can still create users manually:

```bash
node scripts/create-admin.js
```

Follow the prompts to create a single user.

## Workflow Examples

### Adding a New Team Member

1. Add their info to `users.json`:
```json
{
  "email": "newmember@sgc.com",
  "password": "temp_password_2024",
  "name": "New Member"
}
```

2. Sync to database:
```bash
npm run sync-users
```

3. Tell them to:
   - Go to: `https://yourwebsite.com/login`
   - Login with: `newmember@sgc.com` / `temp_password_2024`
   - Change their password in settings (if you implement this feature)

### Removing a User

1. Delete their entry from `users.json`
2. Manually remove from database using Prisma Studio:
```bash
npx prisma studio
```
3. Or delete using a script (you can create this if needed)

### Bulk Password Reset

1. Update all passwords in `users.json`
2. Run `npm run sync-users`
3. Notify all users of their new passwords

## Pro Tips

1. **Keep a backup**: Save a copy of `users.json` in a secure location
2. **Use meaningful names**: Make it easy to identify who each user is
3. **Document access**: Keep notes on why each user has access
4. **Regular audits**: Periodically review who has access and remove inactive users
5. **Environment-specific**: Consider different user files for dev/staging/production

## Questions?

- Check the main README.md
- Review SETUP.md for initial setup
- Contact the tech team for help

