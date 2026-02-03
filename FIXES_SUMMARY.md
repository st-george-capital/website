# Fixes Summary - Jan 27, 2026

## Issues Reported
1. **White buttons not visible** - Edit and other buttons had white text on white background
2. **Edit button goes to blank template** - Clicking edit didn't load existing report data
3. **No article preview** - Couldn't preview articles without publishing them

---

## Fixes Implemented

### 1. Button Visibility ✅

**Problem**: Buttons using `variant="outline"` were white on white background

**Solution**: Changed all buttons to colored variants with white text
- **Blue** (`bg-blue-600`) = Edit
- **Green** (`bg-green-600`) = Preview  
- **Purple** (`bg-purple-600`) = View Live (for published content)
- **Gray** (`bg-gray-600`) = Print

**Files Changed**:
- `app/dashboard/research/[id]/preview/page.tsx`
- `app/dashboard/research/page.tsx`

---

### 2. Edit Functionality ✅

**Problem**: `/dashboard/research/[id]/page.tsx` was just redirecting to new page, not loading data

**Solution**: Created proper edit page with full form and data loading
- **New file**: `app/dashboard/research/[id]/edit/page.tsx`
- **Deleted**: Broken `app/dashboard/research/[id]/page.tsx` redirect
- **Updated**: All edit button links to use `/edit` route

**How it works**:
1. Copied entire form structure from `new/page.tsx`
2. Added `useEffect` to fetch existing report via `/api/research-reports/[id]`
3. Populates all form fields on load:
   - Metadata (company, ticker, prices, analysts, etc.)
   - Investment thesis bullets
   - Business model sections
   - Industry analysis
   - Catalysts (near-term and medium-term)
   - Valuation analysis
   - Bear case and risks
   - ESG factors
   - DCF data (inputs/outputs)
4. Shows loading spinner while fetching
5. Uses existing `handleSave` logic (PATCH method)

**Files Changed**:
- Created: `app/dashboard/research/[id]/edit/page.tsx` (1235 lines)
- Updated: `app/dashboard/research/page.tsx` (button links)
- Updated: `app/dashboard/research/[id]/preview/page.tsx` (edit button link)

---

### 3. Article Preview ✅

**Problem**: No way to preview article formatting without publishing it first

**Solution**: Created article preview page accessible from dashboard

**New file**: `app/dashboard/articles/[id]/preview/page.tsx`

**Features**:
- Works for **both draft and published** articles
- Shows article with **full public formatting**
- Dark hero section with title, excerpt, author, date
- Cover image display
- Markdown-rendered content with proper styling
- Tags at bottom
- Header bar with:
  - Back to Articles button
  - Draft/Published badge
  - **Edit Article** button (blue)
  - **View Live** button (purple, if published)

**Files Changed**:
- Created: `app/dashboard/articles/[id]/preview/page.tsx`
- Updated: `app/dashboard/articles/page.tsx` (added preview button)

**Button Layout in Articles Dashboard**:
- **Green eye** = Preview (all articles)
- **Purple eye** = View Live (published only)
- **Blue pencil** = Edit
- **Green/Orange eye toggle** = Publish/Unpublish

---

## Additional Improvements

### Navigation Split ✅
- Research dropdown now has two clear options:
  - **Equity Research** → `/equity-research`
  - **Our Take** → `/research`

### Equity Research Page ✅
- Professional hero layout
- "Evaluating Companies" headline
- Description about business models and competitive analysis
- All published equity reports display automatically

### Our Take Page ✅
- Professional hero layout
- "Market Perspectives" headline
- Description about market events and macro trends
- All published articles display automatically

### Clean Separation ✅
- Equity reports have their own dedicated page
- Articles have their own dedicated page
- No mixing of content types
- Removed unused `showOnWebsite` field

---

## User Can Now

### For Equity Research Reports:
✅ Click **Edit** → Loads existing data in form
✅ Modify any field
✅ Click **Preview** → See formatted report
✅ Save changes
✅ Publish to website
✅ Click **View Live** → See published report

### For Articles:
✅ Click **Preview** → See formatted article (draft or published)
✅ Click **Edit** → Edit article content
✅ Click **Toggle Publish** → Publish/unpublish without deleting
✅ Click **View Live** → See published article (if published)

---

## All Buttons Now Visible

| Location | Button | Color | Purpose |
|----------|--------|-------|---------|
| Research Dashboard | Edit | Blue | Open edit form |
| Research Dashboard | Preview | Green | View formatted report |
| Research Dashboard | View Live | Purple | Open published page |
| Report Preview Header | Edit Report | Blue | Return to edit form |
| Report Preview Header | Export to PDF | Purple | Generate PDF |
| Report Preview Header | Print Report | Gray | Print report |
| Article Dashboard | Preview | Green | View formatted article |
| Article Dashboard | View Live | Purple | Open published page |
| Article Dashboard | Edit | Blue | Open edit form |
| Article Dashboard | Toggle Publish | Green/Orange | Publish/unpublish |

---

## Technical Details

### Edit Page Loading Sequence:
1. Component mounts with `reportId` from URL params
2. `useEffect` fires on mount
3. Fetches `/api/research-reports/${reportId}`
4. Populates all `useState` hooks with existing data
5. Sets `loading` to `false`
6. Form renders with all existing values

### Save Logic:
- Uses same `handleSave` function as new page
- Automatically uses `PATCH` method when `reportId` exists
- Sends to `/api/research-reports/${reportId}`
- Updates existing report in database

---

## Files Modified

**Created**:
- `app/dashboard/research/[id]/edit/page.tsx` (1235 lines)
- `app/dashboard/articles/[id]/preview/page.tsx` (180 lines)

**Modified**:
- `app/dashboard/research/page.tsx` (button colors and routes)
- `app/dashboard/research/[id]/preview/page.tsx` (button colors)
- `app/dashboard/articles/page.tsx` (added preview button)
- `components/navigation.tsx` (split research into dropdown)
- `app/(public)/equity-research/page.tsx` (created dedicated page)
- `app/(public)/research/page.tsx` (renamed to "Our Take")

**Deleted**:
- `app/dashboard/research/[id]/page.tsx` (broken redirect)

---

## Commits

1. `feat: split research into two tabs and create dedicated equity research page`
2. `feat: replace article delete with publish toggle`
3. `chore: remove showOnWebsite field (no longer needed with separate pages)`
4. `chore: remove showOnWebsite from schema`
5. `docs: add comprehensive equity research system guide`
6. `fix: make buttons visible, fix edit routing, add article preview`
7. `fix: complete edit page with full form and data loading`
8. `chore: clean up new page - remove edit logic`

---

## Everything Now Working! 🎉

✅ Buttons are all visible with proper colors
✅ Edit loads existing report data
✅ Preview works for both reports and articles
✅ Two research tabs (Equity Research + Our Take)
✅ Professional page layouts
✅ Toggle publish for articles
✅ Clean separation of content types
✅ All routes working correctly
