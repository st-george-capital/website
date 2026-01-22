#!/bin/bash

echo "🧪 TESTING COKE DCF DATA PROCESSING"
echo "=================================="

echo ""
echo "📊 COKE Quote Data:"
curl -s "http://localhost:3000/api/alpha-vantage/quote/COKE" | jq '.'

echo ""
echo "🏢 COKE Overview Data:"
curl -s "http://localhost:3000/api/alpha-vantage/overview/COKE" | jq '{symbol, name, marketCapitalization, peRatio, week52High, week52Low}'

echo ""
echo "💰 COKE Income Statement (Last 3 Years):"
curl -s "http://localhost:3000/api/alpha-vantage/income-statement/COKE" | jq '.annualReports[0:3][] | {fiscalDateEnding, totalRevenue, ebit, netIncome}'

echo ""
echo "📈 COKE Balance Sheet (Key Items):"
curl -s "http://localhost:3000/api/alpha-vantage/balance-sheet/COKE" | jq '.annualReports[0] | {totalAssets, totalLiabilities, totalShareholderEquity, cashAndCashEquivalentsAtCarryingValue, longTermDebt, shortTermDebt}'

echo ""
echo "💵 COKE Cash Flow:"
curl -s "http://localhost:3000/api/alpha-vantage/cash-flow/COKE" | jq '.annualReports[0] | {operatingCashflow, capitalExpenditures}'

echo ""
echo "📋 INSTRUCTIONS:"
echo "1. Open DCF tool at http://localhost:3000/dashboard/tools"
echo "2. Type 'COKE' and click 'Run DCF Analysis'"
echo "3. Check browser console for detailed logs"
echo "4. Share console output and these files for debugging"
