# Equity Research System Guide

## 📊 Overview
Complete equity research report creation and publishing system with institutional-grade formatting, DCF integration, and visual analytics.

---

## 🌐 Public Pages

### **1. Equity Research** (`/equity-research`)
- **Purpose**: Dedicated page for ALL published equity research reports
- **Layout**: 
  - Hero: "Equity Research"
  - Left side: "Evaluating Companies" headline
  - Right side: Description about business model analysis and competitive positioning
  - Dark section: Grid of report cards
- **What shows**: All reports with `published = true`

### **2. Our Take** (`/research`)
- **Purpose**: Market commentary and macro articles  
- **Layout**:
  - Hero: "Our Take"
  - Left side: "Market Perspectives" headline
  - Right side: Description about market events and macro trends
  - Dark section: Grid of article cards
- **What shows**: All articles with `published = true`

### **3. Individual Report** (`/equity-research/[ticker]`)
- Full report with all sections
- Professional formatting
- **Institutional valuation section** with:
  - Valuation Summary Box (large numbers)
  - Valuation Bridge Chart
  - Revenue Growth Chart
  - EBIT Margin Chart
  - Sensitivity Analysis Heatmap
  - Professional tables

---

## 🎯 Navigation

**Top Nav → Research** (dropdown):
- **Equity Research** → `/equity-research`
- **Our Take** → `/research`

---

## 🛠️ Dashboard Features

### **Creating Reports** (`/dashboard/research/new`)

**1. Load DCF Model:**
- Select saved DCF model from dropdown
- Auto-populates:
  - Company name, ticker, prices, sector, industry
  - **DCF inputs/outputs** (for charts)
  - Valuation analysis with tables

**2. Upload Images:**
- Click purple "Upload Image" button
- Select image (JPG, PNG, GIF, WebP, max 5MB)
- Markdown auto-copied to clipboard
- Paste `![Image](url)` into any field

**3. Fill Content Sections:**
- 8 sections with large textareas
- Markdown formatting supported
- Investment thesis (structured bullets)
- Catalysts (structured events)
- Risks (structured items)

**4. Save:**
- "Save Draft" - saves without publishing
- "Save & Publish" - publishes to `/equity-research`

### **Managing Reports** (`/dashboard/research`)

**Actions per report:**
- **Preview Report** (blue) - See formatted report
- **Edit** (outline) - Edit content
- **View Public** (green, if published) - View on website
- **Delete** (red) - Remove report

**Filters:**
- All Reports
- Drafts
- Published

### **Managing Articles** (`/dashboard/articles`)

**Actions per article:**
- **Edit** (blue icon)
- **Toggle Publish** (green/orange eye icon)
  - Green eye = Publish (when draft)
  - Orange eye-off = Unpublish (when published)
- **No delete** - articles are toggled on/off, not deleted

---

## 📈 Valuation Charts (Auto-Generated)

When a report has DCF data, the valuation section automatically shows:

### **1. Valuation Summary Box**
- Intrinsic Value
- Current Price  
- Upside/Downside %
- Valuation Method

### **2. Valuation Bridge**
Bar chart showing:
- PV of Forecast Free Cash Flow
- PV of Terminal Value
- = Enterprise Value
- Less: Net Debt
- = Equity Value

### **3. Revenue Growth Trajectory**
Line chart showing:
- Revenue growth rates declining over forecast period
- Terminal growth rate (dashed line)
- Maturity narrative

### **4. EBIT Margin Forecast**
Bar chart showing:
- EBIT margins by year
- Average margin calculation

### **5. Sensitivity Analysis**
5×5 heatmap showing intrinsic value at:
- Different WACC levels (±100 bps)
- Different terminal growth rates (±100 bps)
- Color-coded: Green (upside), Blue (base), Red (downside)

### **6. Professional Tables**
- WACC calculation with formulas
- Operating assumptions
- Terminal value summary

---

## 🎨 Design Principles

### **Institutional Styling:**
- Muted professional colors (navy, gray, subtle greens/reds)
- Clean typography with clear hierarchy
- White space between sections
- Bordered cards with subtle shadows

### **Consistent with JPM/GS Reports:**
- Summary box at top (not buried)
- Visual breakdowns (charts > bullet lists)
- Right-aligned numbers in tables
- Concise declarative language
- Professional color palette

---

## 🔑 Key Features

✅ **DCF Integration**: Load saved models, auto-populate data
✅ **Visual Analytics**: Charts auto-generate from DCF data
✅ **Image Upload**: Direct upload with markdown clipboard copy
✅ **Markdown Support**: Tables, formatting, images in all text fields
✅ **PDF Export**: Print/save reports as PDF
✅ **Version Control**: Manual versioning system
✅ **Collaboration**: Comments on sections (API ready)
✅ **Role-Based**: Admins publish, users edit drafts
✅ **Two Tabs**: Separate equity research from articles
✅ **Toggle Publishing**: Articles toggle on/off (no delete)

---

## 📝 Content Workflow

1. **DCF Tool** → Calculate valuation → Save Model
2. **Create Report** → Load DCF → Auto-populate
3. **Add Content** → Fill sections → Upload images
4. **Preview** → Review formatting → Edit if needed
5. **Publish** → Appears on `/equity-research`
6. **Manage** → Toggle publish status as needed

---

## 🚀 URLs Summary

| Page | URL | Purpose |
|------|-----|---------|
| Equity Research Index | `/equity-research` | All published equity reports |
| Individual Report | `/equity-research/[ticker]` | Full report view |
| Our Take Index | `/research` | All published articles |
| Individual Article | `/research/[slug]` | Full article view |
| Dashboard - Reports | `/dashboard/research` | Manage equity reports |
| Dashboard - Articles | `/dashboard/articles` | Manage articles |
| Create Report | `/dashboard/research/new` | New report editor |
| Edit Report | `/dashboard/research/[id]` | Edit existing report |
| Preview Report | `/dashboard/research/[id]/preview` | Preview with formatting |

---

## 🎯 Everything Is Now Clean and Polished!

✅ Two separate tabs in navigation
✅ Clean page layouts with professional design
✅ Auto-generating charts from DCF data
✅ Image upload functionality
✅ Toggle publish (no delete)
✅ Edit buttons on all pages
✅ Institutional valuation formatting
✅ Proper separation of content types
