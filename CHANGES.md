# Website Updates - January 2026

## Color Scheme
- **Darker Blue**: Changed primary color from `#0d0a2e` to `#06041f` (much darker, more professional)
- Applied consistently across all components, sections, and dark backgrounds
- Updated hover states and button colors

## Navigation Improvements
- **Donation Counter Banner**: Added fixed banner at top showing "$3,000 raised for SickKids"
- **New Dropdown Structure**:
  - **Who We Are**: Our Mission, Culture, Leadership Team, Charity & Impact
  - **What We Do**: Quant Trading, Quant Research, Equity & Macro Research, Our Strategy
  - **Research**: Direct link
  - **Career Panels**: New dedicated page
  - **Join Us**: Contact page
- Fixed header visibility on scroll - now properly dark with white text
- Better logo integration with improved sizing and opacity

## New Pages Created

### 1. Culture Page (`/culture`)
- Detailed explanation of SGC's values
- Four core principles: Excellence, Collaboration, Innovation, Community
- "Life at SGC" section describing member experience
- Professional card layout with icons

### 2. Charity & Impact Page (`/charity`)
- **$3,000 fundraising counter** prominently displayed
- Information about not-for-profit status
- Detailed SickKids partnership section
- Annual events, community engagement, and impact metrics
- Call-to-action for involvement

### 3. Career Panels Page (`/career-panels`)
- Showcases partnerships with major firms:
  - Goldman Sachs
  - Optiver
  - Ontario Teachers' Pension Plan (OTPP)
  - Canada Pension Plan Investment Board (CPPIB)
  - RBC Capital Markets
  - TD Securities
  - Jump Trading
- Benefits and what to expect from panels
- Past panel topics highlighted
- Professional card-based layout

## Contact Page Updates
- **Updated Address**: Bahen Centre for Information Technology, 40 St George St
- **Map Integration**: Google Maps embed with pinpoint to Bahen Centre
- **Social Links Updated**:
  - LinkedIn: https://www.linkedin.com/company/101142532
  - Instagram: https://www.instagram.com/st_george_capital
- Improved font consistency with serif headings
- Removed all gray text for better contrast

## Typography Improvements
- **Consistent Font System**:
  - All headings/titles now use `font-serif` class (Playfair Display)
  - Body text uses sans-serif (Inter)
  - Matches Citadel's two-font approach
- **Removed Gray Text**: Changed all `text-muted-foreground` to standard text color
- Better hierarchy with consistent heading sizes

## Design Polish
- Fixed text centering issues across all pages
- Improved card icon colors (now using primary color)
- Better spacing and padding throughout
- Enhanced readability with proper contrast
- Consistent button styling with inline arrows

## Updated Across All Pages
- Quant Trading
- Quant Research
- Equity & Macro Research
- The Fund
- Team
- Contact

## Technical Improvements
- Proper component structure with font-serif classes
- Consistent color variables
- Better hover states
- Improved mobile responsiveness
- Fixed navigation z-index for donation banner

## Files Modified
- `tailwind.config.ts` - Updated color values
- `app/globals.css` - Updated CSS custom properties
- `components/navigation.tsx` - Complete restructure with dropdowns and banner
- `components/footer.tsx` - Updated links and color
- `components/hero.tsx` - Updated color
- `components/section.tsx` - Better centering and typography
- `components/card.tsx` - Removed gray text
- `components/button.tsx` - Updated colors
- `app/page.tsx` - Updated icons and colors
- All division pages - Typography and color updates
- `app/(public)/contact/page.tsx` - Address, map, and social links

## New Files Created
- `app/(public)/culture/page.tsx`
- `app/(public)/charity/page.tsx`
- `app/(public)/career-panels/page.tsx`
- `CHANGES.md` (this file)

