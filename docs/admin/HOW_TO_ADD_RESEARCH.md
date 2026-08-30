# How to Add Research Articles to the Website

## Overview
The website has a built-in CMS (Content Management System) for managing research articles. You can add, edit, and publish research through the admin dashboard.

## Steps to Add Research

### 1. Access the Dashboard
1. Go to: `http://localhost:3000/dashboard` (or your production URL + `/dashboard`)
2. Login with your admin credentials

### 2. Navigate to Articles Section
- In the dashboard sidebar, click on **"Articles"** or **"Research"**
- You'll see a list of existing articles (if any)

### 3. Create a New Article
Click the **"New Article"** button and fill in:

#### Required Fields:
- **Title**: The article headline (e.g., "Q4 2025 Market Outlook")
- **Slug**: URL-friendly version (auto-generated from title, e.g., "q4-2025-market-outlook")
- **Excerpt**: Short summary (1-2 sentences) shown in listings
- **Content**: Full article content (supports Markdown or rich text)
- **Author**: Select from team members
- **Division**: Choose division (Quant Trading, Quant Research, or Equity & Macro)
- **Status**: Draft or Published

#### Optional Fields:
- **Cover Image**: Upload a featured image
- **Tags**: Add tags like "Macro", "Technology", "Energy", etc.
- **Published Date**: When to publish (defaults to now)
- **Featured**: Toggle to show on homepage

### 4. Upload Documents (PDFs)
If your research includes a downloadable PDF:
1. Go to **"Documents"** in the dashboard
2. Click **"Upload Document"**
3. Fill in:
   - Title
   - Description
   - Category (Market Outlook, Strategy, Holdings Analysis, etc.)
   - Upload PDF file
4. Link it to your article

### 5. Publish
- Click **"Save as Draft"** to save without publishing
- Click **"Publish"** to make it live immediately

## File Structure (For Developers)

If you need to manually add articles or customize the system:

### Database Schema
Articles are stored in the `Article` table (see `prisma/schema.prisma`):
```prisma
model Article {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  excerpt     String
  content     String
  coverImage  String?
  author      String
  division    String
  tags        String   // Comma-separated
  featured    Boolean  @default(false)
  published   Boolean  @default(false)
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### API Routes
- `GET /api/articles` - List all published articles
- `POST /api/articles` - Create new article (admin only)
- `GET /api/articles/[slug]` - Get single article
- `PUT /api/articles/[id]` - Update article (admin only)
- `DELETE /api/articles/[id]` - Delete article (admin only)

### Pages
- `/research` - Lists all published articles with filters
- `/research/[slug]` - Individual article page

## Adding Research via Database (Alternative)

If you prefer to add articles directly to the database:

```javascript
// scripts/add-article.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addArticle() {
  const article = await prisma.article.create({
    data: {
      title: "Q4 2025 Market Outlook",
      slug: "q4-2025-market-outlook",
      excerpt: "Our comprehensive analysis of market conditions heading into Q4 2025",
      content: `# Q4 2025 Market Outlook
      
## Executive Summary
[Your content here in Markdown]

## Key Themes
1. Theme one
2. Theme two

## Conclusion
[Your conclusion]
      `,
      author: "SGC Research Team",
      division: "Equity & Macro",
      tags: "Macro,Market Outlook,2025",
      featured: true,
      published: true,
      publishedAt: new Date(),
    }
  });
  
  console.log('Created article:', article);
}

addArticle()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run with: `node scripts/add-article.js`

## Tips

1. **Use Markdown**: The content field supports Markdown for formatting
2. **SEO**: Use descriptive titles and excerpts
3. **Tags**: Use consistent tags for better filtering
4. **Images**: Store images in `public/images/research/`
5. **PDFs**: Store PDFs in `public/documents/research/`

## Current Research Page Features

✅ **Filtering**: By division, tags, and search
✅ **Featured Posts**: Highlighted on homepage
✅ **Author Attribution**: Links to author profiles
✅ **Related Posts**: Shows similar articles
✅ **Social Sharing**: Share buttons for LinkedIn, Twitter
✅ **Reading Time**: Auto-calculated
✅ **Responsive**: Mobile-friendly layout

## Need Help?

- Check the dashboard for existing examples
- Review `app/(public)/research/page.tsx` for the listing page
- Review `app/(public)/research/[slug]/page.tsx` for article pages
- Contact the tech team for custom features

