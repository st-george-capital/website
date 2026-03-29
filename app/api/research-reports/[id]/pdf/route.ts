import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { launchPdfBrowser } from '@/lib/pdf/browser';
import type { Browser } from 'puppeteer-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sanitizeFileName(value: string) {
  return value
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
  const exportUrl = new URL(`/research-export/${params.id}`, origin);
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
      throw new Error(`Failed to load export page: ${response?.status() ?? 'no response'}`);
    }

    if (page.url().includes('/login')) {
      throw new Error('Authenticated export session could not be established.');
    }

    await page.emulateMediaType('print');
    await page.waitForSelector('.pdf-doc', { timeout: 30000 });
    const reportMeta = await page.$eval('.pdf-doc', (element) => ({
      companyName: element.getAttribute('data-company-name') ?? 'Equity Research Report',
      ticker: element.getAttribute('data-ticker') ?? '',
      reportDate: element.getAttribute('data-report-date') ?? '',
    }));
    await page.evaluate(async () => {
      // Wait for fonts and image assets before locking the PDF.
      // @ts-ignore
      if (document.fonts?.ready) await document.fonts.ready;
    });

    const headerTemplate = `
      <div style="width:100%; padding:0 0.65in; font-family:Helvetica, Arial, sans-serif; font-size:8px; color:#475569;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; width:100%; border-bottom:1px solid #cbd5e1; padding-bottom:6px;">
          <div style="font-weight:600; color:#0f172a;">${escapeHtml(reportMeta.companyName)}${reportMeta.ticker ? ` (${escapeHtml(reportMeta.ticker)})` : ''}</div>
          <div>${escapeHtml(reportMeta.reportDate)} | St. George Capital Equity Research</div>
        </div>
      </div>
    `;

    const footerTemplate = `
      <div style="width:100%; padding:0 0.65in; font-family:Helvetica, Arial, sans-serif; font-size:8px; color:#64748b;">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; border-top:1px solid #cbd5e1; padding-top:6px;">
          <div>Prepared for educational and internal research use.</div>
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

    const fileName = `${sanitizeFileName(reportMeta.companyName)}${reportMeta.ticker ? `-${sanitizeFileName(reportMeta.ticker)}` : ''}-equity-research-report.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating research report PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF export' },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
