# How to Add Articles - Super Simple Guide

## Method 1: Through Dashboard (Easiest!) ⭐

### Step 1: Login
1. Go to: `http://localhost:3000/login`
2. Login with your admin email and password

### Step 2: Go to Articles
1. Click "Dashboard" in the nav
2. You'll see "Articles" in the sidebar
3. Click "Articles"

### Step 3: Create New Article
1. Click the "New Article" button (top right)
2. Fill in the form:
   - **Title**: "Q4 2025 Market Outlook"
   - **Excerpt**: "Brief 1-2 sentence summary"
   - **Author**: Your name
   - **Division**: Choose from dropdown
   - **Content**: Write your article (Markdown supported)
3. **Optional**: Upload a cover image
4. **Optional**: Add tags (comma separated)
5. Click "Save as Draft" or "Publish"

That's it! Your article is now on the website!

## Adding an Image

### Option 1: Upload Cover Image
1. Click "Upload Image" button in the form
2. Select your image (JPG, PNG, or WebP)
3. It will show a preview
4. The image appears at the top of your article

### Option 2: Images in Content
```markdown
![Alt text](/images/research/your-image.jpg)
```

First, put your image in: `public/images/research/`

## Markdown Tips

Your content supports Markdown:

### Headers
```markdown
# Big Header
## Medium Header
### Small Header
```

### Bold and Italic
```markdown
**bold text**
*italic text*
```

### Lists
```markdown
- Item one
- Item two
- Item three

1. First
2. Second
3. Third
```

### Links
```markdown
[Link text](https://example.com)
```

### Code
```markdown
`inline code`

​```python
def hello():
    print("Hello world")
​```
```

## Draft vs Published

- **Save as Draft**: Only you (admins) can see it
- **Publish**: Everyone can see it on the Research page

## Editing an Article

1. Go to Dashboard → Articles
2. Click the edit icon (pencil) next to any article
3. Make your changes
4. Click "Update"

## Deleting an Article

1. Go to Dashboard → Articles
2. Click the trash icon next to the article
3. Confirm deletion

## Example Article

Here's a complete example:

**Title:** AI in Quantitative Trading

**Excerpt:** Exploring how machine learning is revolutionizing systematic trading strategies and alpha generation.

**Division:** Quant Research

**Tags:** AI, Machine Learning, Trading

**Content:**
```markdown
# AI in Quantitative Trading

## Executive Summary

Artificial intelligence is transforming quantitative trading...

## Key Findings

- **Pattern Recognition**: ML models can identify complex patterns
- **Adaptive Systems**: Algorithms that learn from market behavior
- **Risk Management**: Better prediction of tail risks

## Methodology

We analyzed 5 years of trading data using...

## Conclusion

Our research demonstrates that AI-enhanced strategies...
```

## Troubleshooting

### "Access Denied"
- Make sure you're logged in as an admin
- Check your role in `users.json`

### Image Won't Upload
- File must be JPG, PNG, or WebP
- Maximum size: 5MB
- Try a smaller file

### Article Not Showing
- Make sure you clicked "Publish" (not just "Save as Draft")
- Check that it's marked as published in the articles list

## Quick Checklist

Before publishing, make sure you have:
- ✅ Title
- ✅ Excerpt (summary)
- ✅ Author name
- ✅ Division selected
- ✅ Content written
- ✅ Cover image (optional but recommended)
- ✅ Tags added (optional)

Then click **Publish**!

## Need Help?

Check the full guide: `HOW_TO_ADD_RESEARCH.md`

