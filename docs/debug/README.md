# DCF Debug Files - COKE Analysis Issues

## 📁 Files Overview

### Main DCF Component
- **`page.tsx`** - Main DCF valuation tool component
  - `autoPopulateFromFinancials()` - Calculates assumptions from financial data (revenue growth, margins, etc.)
  - `processAlphaVantageData()` - Converts API data to internal format
  - `runFullAnalysis()` - Orchestrates data fetching and processing

### API Routes (Alpha Vantage Integration)
- **`overview/route.ts`** - Company overview data (market cap, P/E, beta, etc.)
- **`quote/route.ts`** - Current price and trading data (high, low, volume)
- **`income-statement/route.ts`** - Revenue, EBIT, net income, margins
- **`balance-sheet/route.ts`** - Assets, liabilities, debt, equity
- **`cash-flow/route.ts`** - Operating cash flow, CapEx, free cash flow
- **`search/route.ts`** - Company search functionality

## 🐛 Issues to Debug

### Price Data Issues
- COKE shows $154 in API but user expects ~$150
- Need to verify price data accuracy and freshness

### Assumption Calculation Issues  
- Revenue growth calculations may be incorrect
- EBIT margins, tax rates, CapEx rates may not make sense
- Debt calculations may be incomplete

### Data Processing Issues
- API field mapping may be wrong
- Financial data extraction may be incorrect
- Growth rate calculations may be backwards

## 🔍 Key Functions to Examine

1. **`autoPopulateFromFinancials()`** in `page.tsx` - Lines ~757-930
   - Revenue growth calculation
   - EBIT margin averaging
   - Tax rate calculation
   - CapEx and depreciation rates

2. **`processAlphaVantageData()`** in `page.tsx` - Lines ~700-755
   - API data extraction and mapping
   - Financial metric calculations

3. **API Route Transformations** - All `route.ts` files
   - How raw Alpha Vantage data is transformed
   - Field name mappings and calculations

## 🧪 Testing Commands

```bash
# Test individual APIs
curl http://localhost:3000/api/alpha-vantage/quote/COKE
curl http://localhost:3000/api/alpha-vantage/overview/COKE
curl http://localhost:3000/api/alpha-vantage/income-statement/COKE

# Check console logs during DCF analysis
# Look for: 'Financial data for auto-population:', 'Individual growth rates:', 'Calculated DCF assumptions:'
```

## 📋 To Fix Issues:

1. **Check API data accuracy** - Compare with Yahoo Finance/Yahoo data
2. **Verify field mappings** - Ensure correct API fields are being used
3. **Validate calculations** - Check math in growth rates, margins, etc.
4. **Test with multiple tickers** - See if issues are COKE-specific or general

