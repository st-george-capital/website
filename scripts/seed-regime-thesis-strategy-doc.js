// One-off seed script for the CVaR optimizer research report's StrategyDocument row —
// see plan Section 8 ("Publishing") and Section 12 step 13.
//
// This does NOT generate or upload the PDF itself — it only creates the CMS row that
// makes the report appear on the public /strategy page, once you already have a real
// Vercel Blob URL for the generated PDF. Run this AFTER:
//   1. Deploying this branch.
//   2. Hitting GET /api/reports/regime-thesis/pdf once (or via curl) to generate the PDF.
//   3. Uploading that PDF buffer to Vercel Blob (via `put()`, same pattern as
//      lib/marketing-renderer.ts's uploadBinaryAsset) to get a permanent public URL.
//
// Usage:
//   BLOB_URL="https://<your-blob-url>.pdf" node scripts/seed-regime-thesis-strategy-doc.js
//
// If BLOB_URL is not set, this script still creates the row with documentFile left as a
// placeholder string so you can fill it in later via the Strategy admin UI — but the row
// is created UNPUBLISHED in that case, specifically so a live, empty/broken document link
// never accidentally goes public on /strategy.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BLOB_URL = process.env.BLOB_URL || null;

const TITLE = 'Late-Cycle Regime Positioning: CVaR Optimization Methodology & Thesis';
const EXECUTIVE_SUMMARY =
  'A CVaR-minimizing portfolio optimization encoding a manually-configured late-cycle/' +
  'recessionary macro view: an approximately 57.5% US equity weight (roughly a 12.5-point ' +
  'underweight versus MSCI World’s approximately 70% US weight), tilted toward Quality ' +
  'and low-Volatility factors and defensive sectors (consumer staples, utilities, ' +
  'healthcare). Full methodology, citations, constraint documentation, and stress-test/' +
  'backtest evidence are in the attached PDF.';

async function main() {
  if (!BLOB_URL) {
    console.warn(
      'WARNING: BLOB_URL env var not set. Creating the StrategyDocument row with a ' +
      'placeholder documentFile and published: false. Fill in the real Blob URL via the ' +
      'Strategy admin UI (or re-run this script with BLOB_URL set) before publishing.'
    );
  }

  const existing = await prisma.strategyDocument.findFirst({
    where: { title: TITLE },
  });
  if (existing) {
    console.log(`A StrategyDocument titled "${TITLE}" already exists (id: ${existing.id}). Skipping create — update it via the Strategy admin UI instead if you need to change its Blob URL.`);
    return;
  }

  const doc = await prisma.strategyDocument.create({
    data: {
      type: 'industry_report',
      title: TITLE,
      year: String(new Date().getFullYear()),
      content: EXECUTIVE_SUMMARY,
      executiveSummary: EXECUTIVE_SUMMARY,
      industries: 'Multi-sector (diversified defensive tilt)',
      sectors: 'Consumer Staples, Utilities, Health Care',
      documentFile: BLOB_URL || 'PLACEHOLDER — replace with the real Vercel Blob PDF URL after generating the report (see file header comment)',
      published: !!BLOB_URL,
      publishDate: BLOB_URL ? new Date() : null,
    },
  });

  console.log(`✓ Created StrategyDocument "${doc.title}" (id: ${doc.id}), published: ${doc.published}`);
  if (!BLOB_URL) {
    console.log('Remember to set the real documentFile URL and flip published to true once the PDF is generated and uploaded.');
  }
}

main()
  .catch((e) => {
    console.error('Error seeding regime-thesis StrategyDocument:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
