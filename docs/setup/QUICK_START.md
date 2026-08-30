# SGC Website - Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
npm run db:push
```

### 3. Add Users
Edit `users.json` and add your team:
```json
{
  "users": [
    {
      "email": "your@email.com",
      "password": "yourpassword",
      "name": "Your Name"
    }
  ]
}
```

Then sync:
```bash
npm run sync-users
```

### 4. Add Team Members
```bash
npm run seed-team
```

### 5. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

## 📋 Common Tasks

### Add a New User
1. Open `users.json`
2. Add user to the array
3. Run: `npm run sync-users`

### Update Team Members
1. Edit `scripts/seed-team.js`
2. Run: `npm run seed-team`

### Add Research Articles
See `HOW_TO_ADD_RESEARCH.md`

### View Database
```bash
npm run db:studio
```

## 🔑 Login

Go to: http://localhost:3000/login

Use any email/password from `users.json`

## 📁 Important Files

- `users.json` - User credentials
- `scripts/seed-team.js` - Team member data
- `prisma/schema.prisma` - Database schema
- `.env` - Environment variables

## 🆘 Need Help?

- `README.md` - Full documentation
- `SETUP.md` - Detailed setup
- `USER_MANAGEMENT.md` - User management
- `HOW_TO_ADD_RESEARCH.md` - Research articles

## 🛠️ Useful Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run sync-users   # Sync users from users.json
npm run seed-team    # Seed team members
npm run db:studio    # Open database GUI
npm run db:push      # Push schema changes
```

