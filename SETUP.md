# Quick Setup Guide

Follow these steps to get your SGC website up and running:

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy from example
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database - Get free PostgreSQL from neon.tech or supabase.com
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# NextAuth - Generate secret with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret-here"

# Market Data (Optional - for real-time pricing)
POLYGON_API_KEY="your-polygon-api-key"
```

## 3. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

## 4. Create Admin User

Open Prisma Studio:
```bash
npx prisma studio
```

Or use SQL:
```sql
-- Password is "admin123" (change after first login!)
INSERT INTO "User" (id, email, "passwordHash", role, name, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@stgeorgecapital.ca',
  '$2a$10$rOzJc5vVYx.KHY5gEqKYJeYXxF8ixCZqQmzDZFqVY0EJUXGPQqY8u',
  'ADMIN',
  'Admin User',
  NOW(),
  NOW()
);
```

## 5. Start Development Server

```bash
npm run dev
```

Visit:
- **Public Site**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard

## 6. Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

For database, recommend:
- **Neon** (PostgreSQL): https://neon.tech - Free tier available
- **Supabase**: https://supabase.com - Includes auth + storage

## Common Issues

### "Prisma Client not generated"
```bash
npx prisma generate
```

### "Can't connect to database"
- Check DATABASE_URL is correct
- Ensure database is running
- Try adding `?sslmode=require` to connection string

### "Market data not loading"
- Works without API key (uses Yahoo Finance fallback)
- For better reliability, get free Polygon.io key

## Next Steps

1. ✅ Login at `/login` (admin@stgeorgecapital.ca / admin123)
2. ✅ Add your first holding
3. ✅ Create a research article
4. ✅ Add team members
5. ✅ Customize content and branding

## Need Help?

- Check the full README.md for detailed documentation
- Email: outreach@stgeorgecapital.ca
- Review code comments for implementation details

---

**Estimated setup time: 10-15 minutes**

