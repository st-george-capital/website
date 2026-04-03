import { spawn } from 'node:child_process';
import path from 'node:path';
import { put } from '@vercel/blob';
import type { Page } from 'puppeteer-core';
import { launchPdfBrowser } from '@/lib/pdf/browser';
import {
  applyMarketingOverrides,
  buildCaptionPack,
  resolveCampaignTitle,
  type MarketingCaptionPack,
  type MarketingOverrideFields,
  type MarketingSourceSnapshot,
} from '@/lib/marketing';
import type { MarketingAssetKind, MarketingPlatform } from '@/lib/marketing-types';

interface PythonRenderResponse {
  instagramHtml: string;
  linkedinHtml: string;
  pdfHtml: string | null;
}

interface StoredMarketingAsset {
  platform: MarketingPlatform;
  assetKind: MarketingAssetKind;
  mimeType: string;
  blobUrl: string;
  width?: number;
  height?: number;
  ordering: number;
}

const NAVY = '#030116';
const NAVY_2 = '#0b1f3a';
const SLATE = '#8fa1c2';
const OFF_WHITE = '#f8fbff';
const LINE = 'rgba(143, 161, 194, 0.24)';

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}

function runPythonScript(payload: Record<string, unknown>) {
  const scriptPath = path.join(process.cwd(), 'scripts', 'marketing_renderer', 'render_marketing.py');
  const candidates = [process.env.PYTHON_EXECUTABLE_PATH, 'python3', 'python'].filter(Boolean) as string[];

  return new Promise<PythonRenderResponse>((resolve, reject) => {
    let lastError: Error | null = null;

    const runCandidate = (index: number) => {
      if (index >= candidates.length) {
        reject(lastError || new Error('Unable to locate a Python interpreter for marketing rendering.'));
        return;
      }

      const child = spawn(candidates[index], [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        lastError = error;
        runCandidate(index + 1);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          lastError = new Error(stderr.trim() || `Marketing renderer exited with code ${code}`);
          runCandidate(index + 1);
          return;
        }

        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(new Error(`Failed to parse marketing renderer output: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    };

    runCandidate(0);
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function collapseWhitespace(value: string | null | undefined) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function clampText(value: string | null | undefined, length: number) {
  const text = collapseWhitespace(value);
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trimEnd()}…`;
}

function renderLogo(logoUrl: string | undefined) {
  if (!logoUrl) return '';
  return `<img src="${escapeHtml(logoUrl)}" alt="SGC" style="height:36px; width:auto; display:block;" />`;
}

function backgroundMedia(imageUrl: string | null | undefined, overlay = 0.26) {
  if (!imageUrl) return '';
  return `
    <div style="position:absolute; inset:0; background-image:url('${escapeHtml(imageUrl)}'); background-size:cover; background-position:center;"></div>
    <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(3,1,22,${overlay + 0.12}) 0%, rgba(3,1,22,0.72) 48%, rgba(3,1,22,0.96) 100%);"></div>
  `;
}

function statCell(label: string, value: string | null | undefined) {
  return `
    <div style="padding:14px 16px; border:1px solid ${LINE}; border-radius:18px; background:rgba(255,255,255,0.04);">
      <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">${escapeHtml(label)}</div>
      <div style="margin-top:8px; font:700 25px/1.05 Georgia, 'Times New Roman', serif; color:${OFF_WHITE};">${escapeHtml(value || '—')}</div>
    </div>
  `;
}

function researchMetrics(snapshot: MarketingSourceSnapshot) {
  const fields = snapshot.fields || {};
  return [
    ['Rating', String(fields.recommendation || '—').toUpperCase()],
    ['Target Price', fields.targetPriceFormatted || '—'],
    ['Current Price', fields.currentPriceFormatted || '—'],
    ['Upside', fields.impliedUpsideFormatted || '—'],
  ] as const;
}

function renderInstagramDetail(snapshot: MarketingSourceSnapshot) {
  if (snapshot.sourceType === 'research_report') {
    return `<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">${researchMetrics(snapshot)
      .map(([label, value]) => statCell(label, value))
      .join('')}</div>`;
  }

  if (snapshot.sourceType === 'job_posting') {
    return `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        ${statCell('Team', snapshot.fields.teamLabel || 'SGC')}
        ${statCell('Deadline', snapshot.dateLabel || 'Rolling')}
      </div>
    `;
  }

  if (snapshot.sourceType === 'strategy_document') {
    return `
      <div style="padding:16px 18px; border:1px solid ${LINE}; border-radius:18px; background:rgba(255,255,255,0.04);">
        <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">Coverage</div>
        <div style="margin-top:10px; font:700 22px/1.15 Georgia, 'Times New Roman', serif; color:${OFF_WHITE};">${escapeHtml(snapshot.fields.documentTypeLabel || 'Research Memo')}</div>
      </div>
    `;
  }

  return `
    <div style="padding:16px 18px; border:1px solid ${LINE}; border-radius:18px; background:rgba(255,255,255,0.04);">
      <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">SGC Brief</div>
      <div style="margin-top:10px; font:700 20px/1.2 Georgia, 'Times New Roman', serif; color:${OFF_WHITE};">${escapeHtml(snapshot.subtitle || snapshot.summary || 'Institutional update')}</div>
    </div>
  `;
}

function renderLinkedinDetail(snapshot: MarketingSourceSnapshot) {
  if (snapshot.sourceType === 'research_report') {
    const rows = researchMetrics(snapshot)
      .map(
        ([label, value]) => `
          <div style="display:flex; justify-content:space-between; gap:14px; padding:12px 0; border-top:1px solid ${LINE};">
            <span style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:${SLATE};">${escapeHtml(label)}</span>
            <span style="font:700 17px/1.15 Georgia, 'Times New Roman', serif; color:${OFF_WHITE}; text-align:right;">${escapeHtml(value || '—')}</span>
          </div>
        `
      )
      .join('');

    return `
      <div style="padding:22px 24px; border-radius:24px; border:1px solid ${LINE}; background:rgba(255,255,255,0.04);">
        <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">Rating Snapshot</div>
        ${rows}
      </div>
    `;
  }

  if (snapshot.sourceType === 'job_posting') {
    return `
      <div style="padding:22px 24px; border-radius:24px; border:1px solid ${LINE}; background:rgba(255,255,255,0.04);">
        <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">Role Snapshot</div>
        <div style="margin-top:14px; font:700 18px/1.2 Georgia, 'Times New Roman', serif; color:${OFF_WHITE};">${escapeHtml(snapshot.fields.teamLabel || 'SGC')}</div>
        <div style="margin-top:8px; font:400 14px/1.65 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">${escapeHtml(clampText(snapshot.fields.description, 300))}</div>
      </div>
    `;
  }

  return `
    <div style="padding:22px 24px; border-radius:24px; border:1px solid ${LINE}; background:rgba(255,255,255,0.04);">
      <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">SGC Release</div>
      <div style="margin-top:14px; font:400 14px/1.65 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">${escapeHtml(clampText(snapshot.summary, 320))}</div>
    </div>
  `;
}

function renderInstagramHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { width:1080px; height:1350px; margin:0; padding:0; }
      body { background:${NAVY}; font-family:Arial, Helvetica, sans-serif; color:${OFF_WHITE}; }
    </style>
  </head>
  <body>
    <div style="position:relative; width:1080px; height:1350px; overflow:hidden; background:${NAVY};">
      ${backgroundMedia(snapshot.imageUrl)}
      <div style="position:absolute; inset:0; background:
        radial-gradient(circle at top right, rgba(17,56,108,0.34) 0%, rgba(3,1,22,0) 42%),
        linear-gradient(180deg, rgba(3,1,22,0.12) 0%, rgba(3,1,22,0.84) 38%, rgba(3,1,22,0.98) 100%);
      "></div>
      <div style="position:relative; z-index:1; height:100%; padding:54px 64px 58px; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:24px;">
          <div style="display:flex; align-items:center; gap:18px;">
            ${renderLogo(logoUrl)}
            <div style="font:600 13px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${OFF_WHITE};">St. George Capital</div>
          </div>
          <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">Instagram Feed</div>
        </div>
        <div style="margin-top:48px; font:600 13px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.28em; text-transform:uppercase; color:${SLATE};">${escapeHtml(snapshot.eyebrow)}</div>
        <h1 style="margin:22px 0 0; max-width:870px; font:700 78px/0.96 Georgia, 'Times New Roman', serif; letter-spacing:-0.03em;">${escapeHtml(snapshot.title)}</h1>
        <div style="margin-top:24px; max-width:820px; font:500 28px/1.35 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.82);">${escapeHtml(clampText(snapshot.subtitle || snapshot.summary, 180))}</div>
        <div style="margin-top:auto;">
          ${renderInstagramDetail(snapshot)}
          <div style="margin-top:18px; padding:18px 22px; border:1px solid ${LINE}; border-radius:18px; background:rgba(255,255,255,0.04);">
            <div style="font:400 18px/1.55 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">${escapeHtml(clampText(snapshot.summary, 240))}</div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:18px; margin-top:18px;">
              <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">${escapeHtml(snapshot.dateLabel || 'St. George Capital')}</div>
              <div style="padding:10px 16px; border-radius:999px; background:${OFF_WHITE}; color:${NAVY}; font:700 12px/1 Arial, Helvetica, sans-serif; letter-spacing:0.14em; text-transform:uppercase;">${escapeHtml(snapshot.cta)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function renderLinkedinHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { width:1200px; height:627px; margin:0; padding:0; }
      body { background:${NAVY}; font-family:Arial, Helvetica, sans-serif; color:${OFF_WHITE}; }
    </style>
  </head>
  <body>
    <div style="position:relative; width:1200px; height:627px; overflow:hidden; background:${NAVY};">
      ${backgroundMedia(snapshot.imageUrl, 0.18)}
      <div style="position:absolute; inset:0; background:
        linear-gradient(90deg, rgba(3,1,22,0.98) 0%, rgba(3,1,22,0.92) 58%, rgba(3,1,22,0.58) 100%),
        radial-gradient(circle at top right, rgba(19,62,120,0.26) 0%, rgba(3,1,22,0) 44%);
      "></div>
      <div style="position:relative; z-index:1; height:100%; padding:44px 48px; display:grid; grid-template-columns:1.4fr 0.82fr; gap:30px;">
        <div style="display:flex; flex-direction:column;">
          <div style="display:flex; align-items:center; gap:18px;">
            ${renderLogo(logoUrl)}
            <div style="font:600 12px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${OFF_WHITE};">St. George Capital</div>
          </div>
          <div style="margin-top:34px; font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.28em; text-transform:uppercase; color:${SLATE};">${escapeHtml(snapshot.eyebrow)}</div>
          <h1 style="margin:18px 0 0; max-width:650px; font:700 58px/0.94 Georgia, 'Times New Roman', serif; letter-spacing:-0.03em;">${escapeHtml(snapshot.title)}</h1>
          <div style="margin-top:18px; max-width:640px; font:500 22px/1.35 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.84);">${escapeHtml(clampText(snapshot.subtitle || snapshot.summary, 150))}</div>
          <div style="margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:20px;">
            <div style="max-width:620px; font:400 16px/1.6 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">${escapeHtml(clampText(snapshot.summary, 250))}</div>
            <div style="padding:11px 16px; border-radius:999px; border:1px solid ${LINE}; background:rgba(255,255,255,0.06); font:700 11px/1 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase;">${escapeHtml(snapshot.cta)}</div>
          </div>
        </div>
        <div style="display:flex; align-items:stretch;">
          ${renderLinkedinDetail(snapshot)}
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function renderJobPostingPdfHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  if (snapshot.sourceType !== 'job_posting') return null;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin:0; padding:0; background:white; }
      body { font-family:Arial, Helvetica, sans-serif; color:#0f172a; }
    </style>
  </head>
  <body>
    <div style="padding:36px 44px 40px;">
      <div style="background:${NAVY}; border-radius:24px; padding:24px 26px; color:${OFF_WHITE};">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:18px;">
          <div style="display:flex; align-items:center; gap:16px;">
            ${renderLogo(logoUrl)}
            <div>
              <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.2em; text-transform:uppercase; color:${SLATE};">St. George Capital</div>
              <div style="margin-top:6px; font:700 15px/1.2 Georgia, 'Times New Roman', serif;">Canada’s Premier Investment Research Student Group</div>
            </div>
          </div>
          <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.2em; text-transform:uppercase; color:${SLATE};">Recruiting Flyer</div>
        </div>
        <div style="margin-top:34px; font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.24em; text-transform:uppercase; color:${SLATE};">${escapeHtml(snapshot.eyebrow)}</div>
        <h1 style="margin:14px 0 0; font:700 34px/1.02 Georgia, 'Times New Roman', serif;">${escapeHtml(snapshot.title)}</h1>
        <div style="margin-top:12px; font:500 17px/1.45 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.82);">${escapeHtml(snapshot.subtitle || '')}</div>
      </div>
      <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:28px; margin-top:28px;">
        <div>
          <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${NAVY_2};">Role Overview</div>
          <div style="margin-top:14px; font:400 14px/1.72 Arial, Helvetica, sans-serif; color:#1e293b;">${escapeHtml(collapseWhitespace(snapshot.fields.description || snapshot.summary))}</div>
          <div style="margin-top:26px; font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${NAVY_2};">How To Apply</div>
          <div style="margin-top:14px; font:400 14px/1.72 Arial, Helvetica, sans-serif; color:#1e293b;">Submit your application materials through the SGC dashboard. Selected candidates will be contacted directly for follow-up.</div>
        </div>
        <div>
          <div style="border:1px solid #d8e0ee; border-radius:20px; padding:20px 22px; background:#f8fbff;">
            <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:#64748b;">Snapshot</div>
            <div style="margin-top:16px; display:grid; gap:16px;">
              <div>
                <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:#64748b;">Team</div>
                <div style="margin-top:6px; font:700 20px/1.15 Georgia, 'Times New Roman', serif; color:${NAVY_2};">${escapeHtml(snapshot.fields.teamLabel || 'SGC')}</div>
              </div>
              <div>
                <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:#64748b;">Deadline</div>
                <div style="margin-top:6px; font:700 20px/1.15 Georgia, 'Times New Roman', serif; color:${NAVY_2};">${escapeHtml(snapshot.dateLabel || 'Rolling')}</div>
              </div>
              <div>
                <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:#64748b;">Call To Action</div>
                <div style="margin-top:6px; font:600 13px/1.55 Arial, Helvetica, sans-serif; color:#1e293b;">${escapeHtml(snapshot.cta)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function renderInNode(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined): PythonRenderResponse {
  return {
    instagramHtml: renderInstagramHtml(snapshot, logoUrl),
    linkedinHtml: renderLinkedinHtml(snapshot, logoUrl),
    pdfHtml: renderJobPostingPdfHtml(snapshot, logoUrl),
  };
}

async function preparePage(page: Page, html: string, width: number, height: number) {
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    // @ts-ignore
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
}

async function uploadBinaryAsset(params: {
  pathname: string;
  buffer: Buffer;
  contentType: string;
}) {
  const blob = await put(params.pathname, params.buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: params.contentType,
  });

  return blob.url;
}

async function uploadTextAsset(params: {
  pathname: string;
  text: string;
}) {
  const blob = await put(params.pathname, params.text, {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'text/plain; charset=utf-8',
  });

  return blob.url;
}

export async function renderAndStoreMarketingPack(params: {
  campaignId: string;
  snapshot: MarketingSourceSnapshot;
  overrides?: MarketingOverrideFields | null;
  captions?: MarketingCaptionPack | null;
  origin: string;
}) {
  const finalSnapshot = applyMarketingOverrides(params.snapshot, params.overrides);
  const captions = params.captions || buildCaptionPack(finalSnapshot);
  const rendererPayload = {
    snapshot: finalSnapshot,
    brand: {
      logoUrl: `${params.origin}/images/logo/sgc_logo.png`,
    },
  };

  let rendered: PythonRenderResponse;
  try {
    rendered = await runPythonScript(rendererPayload);
  } catch (error) {
    console.warn('[marketing-renderer] Falling back to built-in renderer:', error);
    rendered = renderInNode(finalSnapshot, rendererPayload.brand.logoUrl);
  }
  const browser = await launchPdfBrowser();
  const titleSlug = sanitizeSegment(resolveCampaignTitle(finalSnapshot));
  const basePath = `marketing/${params.campaignId}/${titleSlug}`;

  try {
    const assets: StoredMarketingAsset[] = [];

    const instagramPage = await browser.newPage();
    await preparePage(instagramPage, rendered.instagramHtml, 1080, 1350);
    const instagramBuffer = Buffer.from(await instagramPage.screenshot({ type: 'png' }) as Uint8Array);
    await instagramPage.close();
    assets.push({
      platform: 'instagram',
      assetKind: 'feed',
      mimeType: 'image/png',
      blobUrl: await uploadBinaryAsset({
        pathname: `${basePath}-instagram.png`,
        buffer: instagramBuffer,
        contentType: 'image/png',
      }),
      width: 1080,
      height: 1350,
      ordering: 0,
    });

    const linkedinPage = await browser.newPage();
    await preparePage(linkedinPage, rendered.linkedinHtml, 1200, 627);
    const linkedinBuffer = Buffer.from(await linkedinPage.screenshot({ type: 'png' }) as Uint8Array);
    await linkedinPage.close();
    assets.push({
      platform: 'linkedin',
      assetKind: 'feed',
      mimeType: 'image/png',
      blobUrl: await uploadBinaryAsset({
        pathname: `${basePath}-linkedin.png`,
        buffer: linkedinBuffer,
        contentType: 'image/png',
      }),
      width: 1200,
      height: 627,
      ordering: 0,
    });

    const instagramCaptionUrl = await uploadTextAsset({
      pathname: `${basePath}-instagram-caption.txt`,
      text: captions.instagram,
    });
    assets.push({
      platform: 'instagram',
      assetKind: 'caption',
      mimeType: 'text/plain',
      blobUrl: instagramCaptionUrl,
      ordering: 1,
    });

    const linkedinCaptionUrl = await uploadTextAsset({
      pathname: `${basePath}-linkedin-caption.txt`,
      text: captions.linkedin,
    });
    assets.push({
      platform: 'linkedin',
      assetKind: 'caption',
      mimeType: 'text/plain',
      blobUrl: linkedinCaptionUrl,
      ordering: 1,
    });

    if (rendered.pdfHtml) {
      const pdfPage = await browser.newPage();
      await preparePage(pdfPage, rendered.pdfHtml, 1100, 1556);
      const pdfBuffer = Buffer.from(
        await pdfPage.pdf({
          format: 'Letter',
          printBackground: true,
          margin: {
            top: '0.35in',
            right: '0.35in',
            bottom: '0.35in',
            left: '0.35in',
          },
        })
      );
      await pdfPage.close();

      assets.push({
        platform: 'pdf',
        assetKind: 'flyer',
        mimeType: 'application/pdf',
        blobUrl: await uploadBinaryAsset({
          pathname: `${basePath}-flyer.pdf`,
          buffer: pdfBuffer,
          contentType: 'application/pdf',
        }),
        ordering: 0,
      });
    }

    return {
      snapshot: finalSnapshot,
      captions,
      assets,
    };
  } finally {
    await browser.close();
  }
}
