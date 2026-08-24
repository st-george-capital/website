import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { launchPdfBrowser } from '@/lib/pdf/browser';
import type { Browser } from 'puppeteer-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// One-off PDF generation route for the CVaR optimizer research report — mirrors
// app/api/research-reports/[id]/pdf/route.ts exactly (launchPdfBrowser(), navigate to the
// print page, emulateMediaType('print'), page.pdf(...), stream buffer back).
//
// This route is invoked exactly once per plan Section 8 — the report is hand-written and
// static (not regenerated from live SavedOptimizationRun data), so there is no reason to
// re-run this after the first successful generation. Given Vercel's ephemeral filesystem,
// the intended flow (documented in the plan and in scripts/seed-regime-thesis-strategy-
// doc.js) is: deploy this branch -> hit this route once (browser or curl) -> upload the
// returned PDF buffer to Vercel Blob via `put()` (same pattern as
// lib/marketing-renderer.ts's uploadBinaryAsset) -> seed the StrategyDocument row with
// that permanent Blob URL. This route itself does NOT touch Vercel Blob — it only
// generates and streams the PDF.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'http';

  if (!host) {
    return NextResponse.json({ error: 'Unable to resolve export host' }, { status: 500 });
  }

  const origin = `${protocol}://${host}`;
  const exportUrl = new URL('/reports/regime-thesis', origin);
  const cookieHeader = request.headers.get('cookie') ?? '';

  let browser: Browser | null = null;

  try {
    browser = await launchPdfBrowser();
    const page = await browser.newPage();

    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    }

    const response = await page.goto(exportUrl.toString(), {
      waitUntil: 'networkidle0',
      timeout: 120000,
    });

    if (!response || !response.ok()) {
      throw new Error(`Failed to load report page: ${response?.status() ?? 'no response'}`);
    }

    await page.emulateMediaType('print');
    await page.waitForSelector('.pdf-doc', { timeout: 30000 });
    await page.evaluate(async () => {
      // Wait for fonts before locking the PDF.
      // @ts-ignore
      if (document.fonts?.ready) await document.fonts.ready;
    });

    const headerTemplate = `
      <div style="width:100%; padding:0 0.65in; font-family:Helvetica, Arial, sans-serif; font-size:8px; color:#475569;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; width:100%; padding-bottom:6px;">
          <div style="font-weight:600; color:#0f172a; letter-spacing:0.02em;">Late-Cycle Regime Positioning</div>
          <div style="color:#334155;">St. George Capital &middot; Portfolio Construction &amp; Optimization</div>
        </div>
        <div style="height:1px; background:#0f2747;"></div>
      </div>
    `;

    const footerTemplate = `
      <div style="width:100%; padding:0 0.65in; font-family:Helvetica, Arial, sans-serif; font-size:8px; color:#64748b;">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; border-top:1px solid #cbd5e1; padding-top:6px;">
          <div>Prepared for internal research and educational use. Not investment advice. Recommendation-only — no trades are auto-executed.</div>
          <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
        </div>
      </div>
    `;

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: '0.9in',
        right: '0.65in',
        bottom: '0.85in',
        left: '0.65in',
      },
      preferCSSPageSize: false,
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="sgc-late-cycle-regime-positioning-cvar-methodology.pdf"',
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating regime-thesis report PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF export' }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
