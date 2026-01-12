# 🚀 Deployment Guide - Make Your Website Public

## Overview
Deploy your SGC website to the internet in ~15 minutes using Vercel (free hosting for Next.js).

---

## Step 1: Prepare Your Code

### 1.1 Push to GitHub (if not already)

```bash
# In your project folder
git add .
git commit -m "Ready for deployment"
git push origin main
```

If you don't have a GitHub repo yet:
1. Go to https://github.com/new
2. Create a new repository (e.g., "sgc-website")
3. Follow GitHub's instructions to push your code

### 1.2 Update Environment Variables

Create a `.env.production` file:

```bash
# Copy your .env file
cp .env .env.production
```

Update the `NEXTAUTH_URL` in `.env.production`:
```
NEXTAUTH_URL=https://yourdomain.com
```

---

## Step 2: Deploy to Vercel (Free)

### 2.1 Create Vercel Account
1. Go to https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your repos

### 2.2 Import Your Project
1. Click **"Add New Project"**
2. Find your GitHub repo (e.g., "sgc-website")
3. Click **"Import"**

### 2.3 Configure Build Settings
Vercel auto-detects Next.js, but verify:

- **Framework Preset:** Next.js
- **Root Directory:** ./
- **Build Command:** `npm run build`
- **Output Directory:** .next

Click **"Deploy"**

### 2.4 Wait for Build
- First build takes 2-3 minutes
- You'll get a temporary URL like: `sgc-website.vercel.app`
- Test it to make sure everything works!

---

## Step 3: Add Environment Variables

In Vercel dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add these variables:

```
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://yourdomain.com
```

**Important:** Generate a new `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

3. Click **"Save"**
4. Redeploy: **Deployments** → **...** → **Redeploy**

---

## Step 4: Connect Your Domain

### If you own the domain (e.g., stgeorgecapital.ca):

#### 4.1 In Vercel Dashboard:
1. Go to your project → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain: `stgeorgecapital.ca`
4. Also add: `www.stgeorgecapital.ca`

#### 4.2 In Your Domain Registrar (GoDaddy, Namecheap, etc.):

**Option A: Use Vercel Nameservers (Recommended)**
1. Vercel will show you nameservers like:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
2. Go to your domain registrar
3. Find **DNS Settings** or **Nameservers**
4. Replace existing nameservers with Vercel's
5. **Save** (propagation takes 24-48 hours, usually faster)

**Option B: Add DNS Records (Faster)**
1. In your domain registrar's DNS settings:
2. Add these records:

   **For root domain (stgeorgecapital.ca):**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

   **For www subdomain:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **Save** (propagation takes 5-60 minutes)

---

## Step 5: Update Production URLs

### 5.1 Update NEXTAUTH_URL
In Vercel → **Settings** → **Environment Variables**:
```
NEXTAUTH_URL=https://stgeorgecapital.ca
```
(Change to your actual domain)

### 5.2 Redeploy
- Go to **Deployments**
- Click **...** → **Redeploy**
- Wait 2-3 minutes

---

## Step 6: Set Up Database for Production

### Option A: Keep SQLite (Simple, Good for Start)
✅ Your current SQLite database works fine
✅ Already configured
⚠️ Resets on every deploy (you'll lose data)

### Option B: Use PostgreSQL (Recommended for Production)

#### Using Vercel Postgres (Easiest):
1. In Vercel dashboard → **Storage** → **Create Database**
2. Select **Postgres**
3. Choose your plan (Free tier available)
4. Click **Create**
5. Vercel automatically adds `DATABASE_URL` to your env vars

#### Update Prisma Schema:
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

#### Migrate Database:
```bash
npx prisma migrate dev --name init
npx prisma generate
git add .
git commit -m "Switch to PostgreSQL"
git push
```

Vercel will automatically redeploy!

---

## Step 7: Seed Your Production Database

### After Deployment:

```bash
# Set production database URL
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy

# Seed team members
npm run seed-team

# Create admin user
node scripts/create-admin.js
```

Or run these in Vercel's terminal (see Step 8).

---

## Step 8: Post-Deployment Checklist

### Test Everything:
- [ ] Visit your domain - homepage loads
- [ ] Navigation works
- [ ] All pages load (Research, Team, etc.)
- [ ] Login works at `/login`
- [ ] Dashboard accessible
- [ ] Can create articles
- [ ] Contact form works
- [ ] Mobile responsive

### Set Up Email (Optional but Recommended):
1. Sign up for Resend: https://resend.com
2. Get API key
3. Add to Vercel env vars:
   ```
   RESEND_API_KEY=re_xxxxx
   ```
4. Update `/app/api/send-email/route.ts` (uncomment Resend code)

---

## Troubleshooting

### Issue: Build Fails
**Check Vercel logs:**
- Go to **Deployments** → Click failed deployment → **View Function Logs**
- Common issues:
  - Missing env vars
  - Database connection errors
  - TypeScript errors

**Fix:**
- Add missing env vars in Vercel Settings
- Check `.env.production` matches

### Issue: Database Resets on Deploy
**Problem:** Using SQLite (file-based)
**Solution:** Switch to PostgreSQL (see Step 6)

### Issue: Login Doesn't Work
**Check:**
- `NEXTAUTH_URL` matches your domain
- `NEXTAUTH_SECRET` is set
- Redeploy after changing env vars

### Issue: Domain Not Working
**Check:**
- DNS propagation: https://dnschecker.org
- Wait 24-48 hours for nameservers
- Or 5-60 mins for A/CNAME records
- Try incognito mode / clear cache

---

## Quick Reference

### Vercel Dashboard URLs:
- **Project:** https://vercel.com/dashboard
- **Deployments:** Project → Deployments tab
- **Environment Variables:** Project → Settings → Environment Variables
- **Domains:** Project → Settings → Domains

### Useful Commands:
```bash
# Deploy from command line (optional)
npm install -g vercel
vercel

# Check build locally
npm run build
npm run start

# View production logs
vercel logs
```

---

## Step-by-Step Summary

1. ✅ Push code to GitHub
2. ✅ Create Vercel account
3. ✅ Import GitHub repo
4. ✅ Add environment variables
5. ✅ Connect your domain
6. ✅ Update DNS settings
7. ✅ Test the live site
8. ✅ Set up production database (optional)
9. ✅ Configure email (optional)

**Total Time:** 15-30 minutes (plus DNS propagation)

---

## Your Live Website Will Be At:

```
https://stgeorgecapital.ca
https://www.stgeorgecapital.ca
```

(Replace with your actual domain)

---

## Need Help?

Common issues and solutions:
- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **DNS Help:** Contact your domain registrar's support

---

## Cost Breakdown

### Free Tier (Perfect for You):
- ✅ Vercel Hosting: **FREE**
  - Unlimited bandwidth
  - Automatic HTTPS
  - Global CDN
  - 100GB bandwidth/month

- ✅ Vercel Postgres: **FREE**
  - 256MB storage
  - 60 hours compute/month
  - Perfect for starting out

- ✅ Custom Domain: **Already paid for**
  - Just need to connect it

### When to Upgrade:
- If you get 100k+ monthly visitors
- If you need more database storage
- Vercel will notify you, but unlikely for now

---

## Success! 🎉

Once deployed, your website will be:
- ✅ Live 24/7
- ✅ Lightning fast (global CDN)
- ✅ Auto HTTPS/SSL
- ✅ Auto-scaling
- ✅ Always up-to-date (auto-deploys on git push)

Next time you make changes:
1. `git push`
2. Vercel auto-deploys
3. Live in 2 minutes! 🚀

