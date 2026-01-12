# Settings Management Guide

## Overview
You can now manage key website statistics directly from the dashboard without editing code!

## What You Can Edit

### 1. **Homepage Statistics**
- **Founded Year** (currently: 2023)
- **Number of Members** (currently: 80+)
- **Number of Research Projects** (currently: 50+)

### 2. **Charity Amount**
- **Total Raised for SickKids** (currently: $3,000)

## How to Update Settings

### Step 1: Log in to Dashboard
Go to: `http://localhost:3000/login`
- Use your admin credentials

### Step 2: Navigate to Settings
- Click **"Settings"** in the left sidebar
- (Only visible to admins)

### Step 3: Edit Values
- Update any numbers you want
- Click **"Save Settings"**

### Step 4: See Changes Live
- Changes appear immediately on the website
- Homepage stats update automatically
- Charity page shows new amount

## Where These Appear

### Homepage (`/`)
```
2023          80+          50+
Year Founded  Members      Research Projects
```

### Charity Page (`/charity`)
```
$3,000
Total Raised for SickKids
```

## Technical Details

### Database
Settings are stored in the `Settings` table:
```
charity_amount    → Charity page
founded_year      → Homepage
member_count      → Homepage
research_projects → Homepage
```

### Initial Setup
If you need to reset settings to defaults:
```bash
npm run init-settings
```

This will set:
- Founded: 2023
- Members: 80
- Projects: 50
- Charity: $3000

## Access Control
- **Admins**: Can view and edit all settings
- **Users**: Cannot access Settings page

## API Endpoints
- `GET /api/settings` - Fetch all settings
- `PUT /api/settings` - Update settings (admin only)

