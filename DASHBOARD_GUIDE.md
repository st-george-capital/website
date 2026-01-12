# Dashboard Guide - Complete System

## ✅ What's Now Functional

Your dashboard is now **fully functional** with real features, not just proof of concept!

### Features

#### 1. **Article Management** (NEW! ⭐)
- Create research articles with rich content
- Upload images
- Markdown support
- Publish or save as drafts
- Edit and delete articles
- Full CRUD operations

#### 2. **User Roles**
- **Admin**: Full access to everything
- **User**: Read-only access

#### 3. **Image Uploads**
- Upload cover images for articles
- Automatic file validation (5MB max)
- Secure storage in `/public/images/research/`

#### 4. **Team Management**
- View team members
- Edit team information (admins only)

#### 5. **Contact Submissions**
- View contact form submissions
- Manage inquiries

#### 6. **Holdings** (Portfolio)
- View holdings
- Edit positions (admins only)

## 🚀 Quick Start

### 1. Login as Admin
```
Email: kabirsdhillon@icloud.com
Password: 2003
```

### 2. Access Dashboard
Go to: `http://localhost:3000/dashboard`

### 3. Create Your First Article
1. Click "Articles" in sidebar
2. Click "New Article"
3. Fill in the form
4. Upload an image (optional)
5. Click "Publish"

Done! Your article is live at `/research`

## 📝 Adding Content

### Create Article
1. Dashboard → Articles → New Article
2. Fill in:
   - Title
   - Excerpt (summary)
   - Content (Markdown)
   - Author, Division, Tags
3. Upload cover image
4. Publish or Save as Draft

### Edit Article
1. Dashboard → Articles
2. Click pencil icon
3. Make changes
4. Click "Update"

### Delete Article
1. Dashboard → Articles
2. Click trash icon
3. Confirm

## 👥 User Management

### Add New Admin
```json
// In users.json
{
  "email": "newadmin@sgc.com",
  "password": "password123",
  "name": "New Admin",
  "role": "admin"
}
```

### Add Read-Only User
```json
{
  "email": "viewer@sgc.com",
  "password": "viewerpass",
  "name": "Viewer",
  "role": "user"
}
```

Then run: `npm run sync-users`

## 🔐 Permissions

### Admin Can:
- ✅ Create articles
- ✅ Edit any article
- ✅ Delete articles
- ✅ Upload images
- ✅ Publish/unpublish
- ✅ Manage team
- ✅ View contact submissions
- ✅ Manage holdings

### Regular User Can:
- ✅ View dashboard
- ✅ See published articles
- ❌ Cannot edit or create
- ❌ Cannot delete
- ❌ Cannot upload files

## 📁 File Structure

```
app/
├── api/
│   ├── articles/          # Article CRUD endpoints
│   │   ├── route.ts       # List & create
│   │   └── [id]/route.ts  # Get, update, delete
│   └── upload/route.ts    # Image upload
├── dashboard/
│   ├── articles/
│   │   ├── page.tsx       # Articles list
│   │   ├── new/page.tsx   # Create form
│   │   └── [id]/edit/page.tsx # Edit form
│   └── layout.tsx         # Dashboard layout

public/
└── images/
    └── research/          # Uploaded images go here

users.json                 # User credentials
```

## 🎨 Article Content

### Markdown Support

Your articles support full Markdown:

```markdown
# Heading 1
## Heading 2

**Bold text**
*Italic text*

- Bullet list
- Item two

1. Numbered list
2. Item two

[Link](https://example.com)

​```python
code block
​```

![Image](/images/research/image.jpg)
```

## 🔄 Workflow

### Publishing Research

1. **Write** - Create article in dashboard
2. **Draft** - Save as draft to review
3. **Review** - Preview on research page
4. **Publish** - Make it live
5. **Update** - Edit anytime

### Team Collaboration

- Admin creates article
- Team reviews
- Admin publishes
- Everyone can view

## 📊 Dashboard Sections

### Home
- Overview stats
- Recent activity

### Articles ⭐ NEW
- Manage research content
- Create, edit, delete
- View published/drafts

### Holdings
- Portfolio positions
- Performance tracking

### Team
- Team member management
- Update profiles

### Contact
- Form submissions
- Inquiries

## 🆘 Troubleshooting

### Can't Create Articles
- Check you're logged in as **admin**
- Verify role in `users.json`
- Run `npm run sync-users`

### Image Upload Fails
- Max size: 5MB
- Formats: JPG, PNG, WebP
- Check file permissions

### Article Not Showing
- Must be "Published" (not draft)
- Check on `/research` page
- Refresh browser

## 📚 Documentation

- `ADDING_ARTICLES_SIMPLE.md` - Simple guide to adding articles
- `USER_ROLES.md` - User roles and permissions
- `USER_MANAGEMENT.md` - Managing users
- `HOW_TO_ADD_RESEARCH.md` - Detailed research guide

## 🎯 Next Steps

1. **Add your team to users.json**
   - Set appropriate roles (admin vs user)
   - Run `npm run sync-users`

2. **Create your first article**
   - Login as admin
   - Go to Articles → New Article
   - Write and publish

3. **Customize**
   - Add more divisions if needed
   - Customize article fields
   - Add your branding

## 💡 Pro Tips

1. **Draft First**: Always save as draft to review
2. **Use Images**: Articles with images get more views
3. **Tags**: Use consistent tags for better organization
4. **Excerpts**: Write compelling 1-2 sentence summaries
5. **Markdown**: Learn basic Markdown for better formatting

## 🔗 Quick Links

- Dashboard: `/dashboard`
- Articles: `/dashboard/articles`
- Research Page: `/research`
- Login: `/login`

## Questions?

See the documentation files or check the code comments!

