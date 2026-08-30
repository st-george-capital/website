# Image Upload Guide - Super Simple!

## ✨ New Feature: Upload Images Directly!

You can now upload images right in the dashboard - no need to manually add files!

## How to Add Images to Your Articles

### Option 1: Cover Image (Main Image)

1. When creating/editing an article, look for "Cover Image" section
2. Click "Upload Cover Image"
3. Choose your image
4. Done! It shows at the top of your article

### Option 2: Images in Content (Step by Step)

1. **Upload the Image**
   - Look for "Upload Image for Content" button (top right of content box)
   - Click it
   - Select your image
   - Wait for upload (shows in gallery above content box)

2. **Use the Image**
   - Click on the uploaded image thumbnail
   - Markdown code is automatically copied!
   - Paste it in your content where you want the image
   - Done!

## Visual Guide

```
┌─────────────────────────────────────┐
│ Content * (Markdown supported)      │  ← [Upload Image for Content] button here
├─────────────────────────────────────┤
│ Uploaded Images:                    │
│ [img1] [img2] [img3] [img4]        │  ← Click any image to copy markdown
│ 💡 Click to copy markdown           │
├─────────────────────────────────────┤
│                                     │
│ Your article content goes here...  │  ← Paste the markdown here
│                                     │
│ ![Image](url) ← Pasted!            │
│                                     │
└─────────────────────────────────────┘
```

## Complete Example

### Step 1: Upload
1. Click "Upload Image for Content"
2. Choose `chart.jpg`
3. Image appears in gallery

### Step 2: Copy
1. Click the uploaded image
2. Message: "Markdown copied!"

### Step 3: Paste
```markdown
# Market Analysis

Here are our Q4 results:

![Image description](/images/research/1234567890-chart.jpg)

As shown in the chart above...
```

## What Gets Copied

When you click an uploaded image, you get:
```markdown
![Image description](/images/research/your-image.jpg)
```

You can change "Image description" to whatever you want:
```markdown
![Q4 Performance Chart](/images/research/your-image.jpg)
```

## Tips

1. **Upload First, Write Later**: Upload all your images first, then write
2. **Click to Copy**: Just click any uploaded image to copy its markdown
3. **Change Description**: Edit the text in `![here]()` to describe your image
4. **Multiple Images**: Upload as many as you need
5. **Cover Image**: Use "Cover Image" for the main article image

## Full Workflow

### Creating an Article with Images

1. **Fill Basic Info**
   - Title
   - Excerpt
   - Author, Division

2. **Upload Cover Image**
   - Click "Upload Cover Image"
   - Choose main image

3. **Upload Content Images**
   - Click "Upload Image for Content" for each image
   - All images show in gallery

4. **Write Content**
   - Start writing
   - When you want an image, click it in gallery
   - Paste the markdown

5. **Publish**
   - Review
   - Click "Publish"

## Example Article Creation

```markdown
# AI in Trading

![AI Header](/images/research/ai-header.jpg)
     ↑ Clicked first uploaded image, pasted here

## Introduction

Artificial intelligence is changing trading...

## Our Approach

![Methodology Diagram](/images/research/methodology.jpg)
     ↑ Clicked second uploaded image, pasted here

We developed a three-phase approach...

## Results

![Performance Chart](/images/research/results.jpg)
     ↑ Clicked third uploaded image, pasted here

The results were impressive...
```

## Troubleshooting

### Image Won't Upload
- **File too large**: Max 5MB
- **Wrong format**: Use JPG, PNG, or WebP
- **Network issue**: Try again

### Can't See Uploaded Images
- Check if upload completed (no loading spinner)
- Refresh page if needed
- Try uploading again

### Markdown Not Working
- Make sure you pasted in content box
- Check format: `![Description](url)`
- Verify the URL is correct

## Pro Tips

1. **Name Your Images**: Before uploading, name files clearly
   - Good: `q4-performance-chart.jpg`
   - Bad: `image1.jpg`

2. **Optimize First**: Resize large images before uploading
   - Recommended: Under 1MB for web
   - Tools: TinyPNG, Squoosh

3. **Use Alt Text**: Change the description in markdown
   ```markdown
   ![Quarterly Performance Chart](/images/research/q4.jpg)
   ```

4. **Gallery Organization**: Upload images in order you'll use them

5. **Preview**: Use the cover image preview to check quality

## What This Replaces

### Before (Manual):
1. Save image to `public/images/research/`
2. Remember filename
3. Type markdown manually
4. Hope you got the path right

### Now (Automatic):
1. Click upload button
2. Click image to copy
3. Paste
4. Done!

## Quick Reference

| Task | Action |
|------|--------|
| Upload cover image | Click "Upload Cover Image" |
| Upload content image | Click "Upload Image for Content" |
| Use image in content | Click uploaded thumbnail |
| Change description | Edit text in `![here]()` |
| Remove cover | Click X on cover image |
| See all uploads | Look at gallery above content |

## You're All Set!

Now you can upload images directly in the dashboard - no more manual file management! 🎉

Just upload, click, paste, and publish!

