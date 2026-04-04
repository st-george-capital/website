import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
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
const ICE = '#b9c9e8';
const TEAL = '#8fd0cf';
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

function resolvePostingAccent(roleTag: string | null | undefined) {
  const normalized = collapseWhitespace(roleTag).toLowerCase();
  if (normalized.includes('philanthropy') || normalized.includes('community') || normalized.includes('charity')) {
    return TEAL;
  }
  if (normalized.includes('executive') || normalized.includes('leadership')) {
    return '#d8dfef';
  }
  return ICE;
}

function normalizeRoleHighlights(value: unknown, fallback: string | null | undefined) {
  const candidateList = Array.isArray(value)
    ? value.map((item) => collapseWhitespace(String(item || ''))).filter(Boolean)
    : [];

  if (candidateList.length > 0) {
    return candidateList.slice(0, 3).map((item) => clampText(item, 88));
  }

  const fallbackText = String(fallback || '');
  return fallbackText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => collapseWhitespace(sentence))
    .filter((sentence) => sentence.length >= 16)
    .slice(0, 3)
    .map((sentence) => clampText(sentence, 88));
}

function renderPill(label: string, value: string, accent = SLATE) {
  return `
    <div style="padding:10px 14px; border-radius:999px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.035); min-width:0;">
      <div style="font:600 9px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${accent}; white-space:nowrap;">${escapeHtml(label)}</div>
      <div style="margin-top:6px; font:600 14px/1.2 Arial, Helvetica, sans-serif; color:${OFF_WHITE}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(value)}</div>
    </div>
  `;
}

function renderRecruitingTexture(accent: string) {
  return `
    <div style="position:absolute; inset:0; pointer-events:none;">
      <div style="position:absolute; inset:0; background-image:
        linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px);
        background-size: 34px 34px;
        opacity:0.16;"></div>
      <div style="position:absolute; right:0; top:0; bottom:0; width:42%; background:
        linear-gradient(180deg, rgba(185,201,232,0.05) 0%, rgba(185,201,232,0) 38%),
        radial-gradient(circle at 80% 14%, ${accent}22 0%, transparent 38%);
      "></div>
      <svg viewBox="0 0 380 520" xmlns="http://www.w3.org/2000/svg" style="position:absolute; right:22px; top:92px; width:320px; height:420px; opacity:0.58;">
        <defs>
          <linearGradient id="sgc-accent-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.85" />
            <stop offset="100%" stop-color="${accent}" stop-opacity="0.2" />
          </linearGradient>
        </defs>
        <path d="M10 380 C80 360 128 286 186 274 C232 264 270 286 318 244 C340 224 355 193 370 148" fill="none" stroke="url(#sgc-accent-line)" stroke-width="3" />
        <path d="M10 420 C70 396 124 386 176 330 C214 289 266 314 326 252 C344 233 356 214 370 196" fill="none" stroke="rgba(248,251,255,0.22)" stroke-width="1.5" />
        <g fill="${accent}">
          <circle cx="186" cy="274" r="4" />
          <circle cx="318" cy="244" r="4" />
          <circle cx="370" cy="148" r="4" />
        </g>
      </svg>
    </div>
  `;
}

function renderLogo(logoUrl: string | undefined) {
  if (!logoUrl) return '';
  return `<img src="${escapeHtml(logoUrl)}" alt="SGC" style="height:42px; width:auto; display:block;" />`;
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

function renderJobPostingInstagramHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  const roleTag = collapseWhitespace(snapshot.fields.roleTagLabel || snapshot.fields.teamLabel || 'SGC Careers');
  const teamLabel = collapseWhitespace(snapshot.fields.teamLabel || 'SGC');
  const accent = resolvePostingAccent(roleTag);
  const highlights = normalizeRoleHighlights(snapshot.fields.roleHighlights, snapshot.summary);

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
      <div style="position:absolute; inset:0; background:
        radial-gradient(circle at top right, ${accent}22 0%, rgba(3,1,22,0) 36%),
        linear-gradient(180deg, #071126 0%, #030116 62%, #020111 100%);
      "></div>
      ${renderRecruitingTexture(accent)}
      <div style="position:relative; z-index:1; height:100%; padding:52px;">
        <div style="height:100%; border-radius:34px; border:1px solid rgba(255,255,255,0.08); background:linear-gradient(180deg, rgba(9,20,41,0.9) 0%, rgba(3,1,22,0.96) 100%); padding:38px 40px 34px; display:flex; flex-direction:column; box-shadow:0 28px 80px rgba(0,0,0,0.32);">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:18px;">
            <div style="display:flex; align-items:center; gap:16px;">
              ${renderLogo(logoUrl)}
              <div>
                <div style="font:700 13px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${OFF_WHITE};">St. George Capital</div>
                <div style="margin-top:6px; font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:${SLATE};">Canada's Premier Investment Research Student Group</div>
              </div>
            </div>
            <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.22em; text-transform:uppercase; color:${accent};">SGC / Careers</div>
          </div>

          <div style="display:grid; grid-template-columns:1.26fr 0.74fr; gap:24px; margin-top:28px; flex:1;">
            <div style="display:flex; flex-direction:column;">
              <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.24em; text-transform:uppercase; color:${SLATE};">${escapeHtml(snapshot.eyebrow)}</div>
              <h1 style="margin:16px 0 0; max-width:580px; font:700 60px/0.95 Georgia, 'Times New Roman', serif; letter-spacing:-0.03em;">${escapeHtml(snapshot.title)}</h1>
              <div style="margin-top:16px; max-width:560px; font:500 21px/1.42 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.84);">${escapeHtml(clampText(snapshot.subtitle || snapshot.summary, 130))}</div>

              <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; margin-top:20px; max-width:620px;">
                ${renderPill('Role', roleTag, accent)}
                ${renderPill('Team', teamLabel, accent)}
                ${renderPill('Deadline', snapshot.dateLabel || 'Rolling', accent)}
              </div>

              <div style="margin-top:22px; display:grid; gap:12px; max-width:620px;">
                ${highlights
                  .map(
                    (highlight, index) => `
                      <div style="display:grid; grid-template-columns:auto 1fr; gap:12px; align-items:flex-start; padding:12px 14px; border:1px solid rgba(255,255,255,0.08); border-radius:18px; background:rgba(255,255,255,0.035);">
                        <div style="width:26px; height:26px; border-radius:999px; background:${accent}22; color:${accent}; display:flex; align-items:center; justify-content:center; font:700 11px/1 Arial, Helvetica, sans-serif;">0${index + 1}</div>
                        <div style="font:500 16px/1.5 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">${escapeHtml(highlight)}</div>
                      </div>
                    `
                  )
                  .join('')}
              </div>

              <div style="margin-top:auto; padding-top:20px;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:18px; padding:16px 18px; border-radius:18px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04);">
                  <div>
                    <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.2em; text-transform:uppercase; color:${SLATE};">Apply Online</div>
                    <div style="margin-top:8px; font:500 14px/1.45 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">Review the full posting and submit your application on the SGC website.</div>
                  </div>
                  <div style="padding:12px 16px; border-radius:999px; background:${OFF_WHITE}; color:${NAVY}; font:700 11px/1 Arial, Helvetica, sans-serif; letter-spacing:0.14em; text-transform:uppercase; white-space:nowrap;">${escapeHtml(snapshot.cta)}</div>
                </div>
              </div>
            </div>

            <div style="display:flex; align-items:stretch;">
              <div style="position:relative; width:100%; border-radius:26px; border:1px solid rgba(255,255,255,0.08); background:linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%); padding:24px 22px 22px; overflow:hidden;">
                <div style="position:relative; z-index:1;">
                  <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.2em; text-transform:uppercase; color:${accent};">Opportunity Snapshot</div>
                  <div style="margin-top:14px; font:700 24px/1.06 Georgia, 'Times New Roman', serif; color:${OFF_WHITE};">${escapeHtml(roleTag)}</div>
                  <div style="margin-top:8px; font:500 15px/1.5 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.76);">${escapeHtml(teamLabel)} team recruiting for a high-conviction role inside the St. George Capital platform.</div>

                  <div style="margin-top:28px; display:grid; gap:14px;">
                    <div style="padding-top:14px; border-top:1px solid rgba(255,255,255,0.1);">
                      <div style="font:600 9px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">Track</div>
                      <div style="margin-top:6px; font:600 15px/1.35 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">${escapeHtml(roleTag)}</div>
                    </div>
                    <div style="padding-top:14px; border-top:1px solid rgba(255,255,255,0.1);">
                      <div style="font:600 9px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">Deadline</div>
                      <div style="margin-top:6px; font:600 15px/1.35 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">${escapeHtml(snapshot.dateLabel || 'Rolling')}</div>
                    </div>
                    <div style="padding-top:14px; border-top:1px solid rgba(255,255,255,0.1);">
                      <div style="font:600 9px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">Channel</div>
                      <div style="margin-top:6px; font:600 15px/1.35 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">Apply on website</div>
                    </div>
                  </div>
                </div>
                <div style="position:absolute; inset:0; z-index:0; background:
                  linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.04) 100%),
                  radial-gradient(circle at 75% 22%, ${accent}22 0%, rgba(3,1,22,0) 38%);
                "></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function renderJobPostingLinkedinHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  const roleTag = collapseWhitespace(snapshot.fields.roleTagLabel || snapshot.fields.teamLabel || 'SGC Careers');
  const teamLabel = collapseWhitespace(snapshot.fields.teamLabel || 'SGC');
  const accent = resolvePostingAccent(roleTag);
  const highlights = normalizeRoleHighlights(snapshot.fields.roleHighlights, snapshot.summary);

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
      <div style="position:absolute; inset:0; background:
        linear-gradient(90deg, rgba(3,1,22,0.98) 0%, rgba(4,10,24,0.96) 60%, rgba(6,15,35,0.92) 100%),
        radial-gradient(circle at top right, ${accent}22 0%, rgba(3,1,22,0) 42%);
      "></div>
      ${renderRecruitingTexture(accent)}
      <div style="position:relative; z-index:1; height:100%; padding:34px 38px;">
        <div style="height:100%; border-radius:28px; border:1px solid rgba(255,255,255,0.08); background:linear-gradient(180deg, rgba(10,21,41,0.92) 0%, rgba(3,1,22,0.95) 100%); padding:30px 34px; display:grid; grid-template-columns:1.3fr 0.78fr; gap:28px;">
          <div style="display:flex; flex-direction:column;">
            <div style="display:flex; align-items:center; gap:14px;">
              ${renderLogo(logoUrl)}
              <div>
                <div style="font:700 12px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${OFF_WHITE};">St. George Capital</div>
                <div style="margin-top:5px; font:600 9px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${SLATE};">SGC / Careers</div>
              </div>
            </div>
            <div style="margin-top:24px; font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.22em; text-transform:uppercase; color:${SLATE};">${escapeHtml(snapshot.eyebrow)}</div>
            <h1 style="margin:14px 0 0; max-width:620px; font:700 50px/0.95 Georgia, 'Times New Roman', serif; letter-spacing:-0.03em;">${escapeHtml(snapshot.title)}</h1>
            <div style="margin-top:14px; max-width:620px; font:500 20px/1.38 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.84);">${escapeHtml(clampText(snapshot.subtitle || snapshot.summary, 138))}</div>
            <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:18px;">
              ${renderPill('Role', roleTag, accent)}
              ${renderPill('Team', teamLabel, accent)}
              ${renderPill('Deadline', snapshot.dateLabel || 'Rolling', accent)}
            </div>
            <div style="margin-top:18px; display:grid; gap:10px; max-width:640px;">
              ${highlights
                .map(
                  (highlight) => `
                    <div style="display:grid; grid-template-columns:auto 1fr; gap:10px; align-items:flex-start;">
                      <div style="width:8px; height:8px; border-radius:999px; background:${accent}; margin-top:8px;"></div>
                      <div style="font:500 15px/1.5 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">${escapeHtml(highlight)}</div>
                    </div>
                  `
                )
                .join('')}
            </div>
            <div style="margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:20px; padding-top:18px;">
              <div style="font:500 14px/1.5 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">Apply on the SGC website for the full role brief and application instructions.</div>
              <div style="padding:11px 16px; border-radius:999px; background:${OFF_WHITE}; color:${NAVY}; font:700 11px/1 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; white-space:nowrap;">${escapeHtml(snapshot.cta)}</div>
            </div>
          </div>
          <div style="display:flex; align-items:stretch;">
            <div style="position:relative; width:100%; border-radius:24px; border:1px solid rgba(255,255,255,0.08); background:linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%); padding:22px; overflow:hidden;">
              <div style="position:relative; z-index:1;">
                <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${accent};">Opportunity Snapshot</div>
                <div style="margin-top:12px; font:700 24px/1.08 Georgia, 'Times New Roman', serif; color:${OFF_WHITE};">${escapeHtml(roleTag)}</div>
                <div style="margin-top:8px; font:500 14px/1.55 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.76);">${escapeHtml(teamLabel)} recruiting cycle with applications currently open.</div>
                <div style="margin-top:22px; display:grid; gap:12px;">
                  <div style="padding-top:12px; border-top:1px solid rgba(255,255,255,0.1);">
                    <div style="font:600 9px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">Track</div>
                    <div style="margin-top:6px; font:600 15px/1.35 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">${escapeHtml(roleTag)}</div>
                  </div>
                  <div style="padding-top:12px; border-top:1px solid rgba(255,255,255,0.1);">
                    <div style="font:600 9px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">Deadline</div>
                    <div style="margin-top:6px; font:600 15px/1.35 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">${escapeHtml(snapshot.dateLabel || 'Rolling')}</div>
                  </div>
                  <div style="padding-top:12px; border-top:1px solid rgba(255,255,255,0.1);">
                    <div style="font:600 9px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${SLATE};">Call To Action</div>
                    <div style="margin-top:6px; font:600 14px/1.35 Arial, Helvetica, sans-serif; color:${OFF_WHITE};">Apply on website</div>
                  </div>
                </div>
              </div>
              <div style="position:absolute; inset:0; z-index:0; background:
                linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.045) 100%),
                radial-gradient(circle at 82% 18%, ${accent}22 0%, rgba(3,1,22,0) 42%);
              "></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function renderInstagramHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  if (snapshot.sourceType === 'job_posting') {
    return renderJobPostingInstagramHtml(snapshot, logoUrl);
  }

  // Modern Instagram 1080x1080 square template
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { width:1080px; height:1080px; margin:0; padding:0; }
      body { background:#1a1a3e; font-family:Arial, Helvetica, sans-serif; color:#f8f9fa; }
    </style>
  </head>
  <body>
    <div style="position:relative; width:1080px; height:1080px; overflow:hidden; background:linear-gradient(135deg, #1a1a3e 0%, #5b4b9f 100%);">
      <div style="position:absolute; top:0; left:0; right:0; height:4px; background:linear-gradient(90deg, #00d9d9 0%, #10b981 100%);"></div>
      ${backgroundMedia(snapshot.imageUrl, 0.36)}
      <div style="position:absolute; inset:0; background:
        radial-gradient(circle at top right, rgba(0,217,217,0.12) 0%, rgba(26,26,62,0) 46%),
        linear-gradient(180deg, rgba(26,26,62,0.08) 0%, rgba(26,26,62,0.82) 44%, rgba(26,26,62,0.98) 100%);
      "></div>
      <div style="position:relative; z-index:1; height:100%; padding:48px 52px 54px; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:14px;">
            ${renderLogo(logoUrl)}
            <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:#f8f9fa;">St. George Capital</div>
          </div>
          <div style="width:6px; height:6px; border-radius:50%; background:#00d9d9;"></div>
        </div>

        <div style="margin-top:44px; flex:1; display:flex; flex-direction:column; justify-content:center;">
          <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.20em; text-transform:uppercase; color:#00d9d9; margin-bottom:16px;">
            ${escapeHtml(snapshot.eyebrow)}
          </div>
          <h1 style="margin:0; font:700 62px/0.98 Georgia, 'Times New Roman', serif; letter-spacing:-0.02em; word-spacing:0.1em; color:#ffffff; max-width:920px;">
            ${escapeHtml(clampText(snapshot.title, 45))}
          </h1>
          <div style="margin-top:20px; max-width:880px; font:500 24px/1.32 Arial, Helvetica, sans-serif; color:rgba(248,249,250,0.86);">
            ${escapeHtml(clampText(snapshot.subtitle || snapshot.summary, 140))}
          </div>
        </div>

        <div style="margin-top:auto;">
          <div style="padding:16px 18px; border:1px solid rgba(122,122,158,0.2); border-radius:14px; background:rgba(255,255,255,0.04); border-left:3px solid #00d9d9;">
            <div style="font:400 17px/1.6 Arial, Helvetica, sans-serif; color:#f8f9fa;">${escapeHtml(clampText(snapshot.summary, 200))}</div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:16px;">
              <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:#7a7a9e;">${escapeHtml(snapshot.dateLabel || 'St. George Capital')}</div>
              <div style="padding:9px 18px; border-radius:999px; background:#00d9d9; color:#1a1a3e; font:700 11px/1 Arial, Helvetica, sans-serif; letter-spacing:0.14em; text-transform:uppercase;">${escapeHtml(clampText(snapshot.cta, 25))}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function renderLinkedinHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  if (snapshot.sourceType === 'job_posting') {
    return renderJobPostingLinkedinHtml(snapshot, logoUrl);
  }

  // Modern LinkedIn 1200x627 template
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { width:1200px; height:627px; margin:0; padding:0; }
      body { background:#ffffff; font-family:Arial, Helvetica, sans-serif; color:#1a1a3e; }
    </style>
  </head>
  <body>
    <div style="position:relative; width:1200px; height:627px; overflow:hidden; background:#ffffff; display:grid; grid-template-columns:1.2fr 0.8fr;">
      <div style="position:absolute; top:0; left:0; right:0; height:3px; background:#00d9d9;"></div>
      ${backgroundMedia(snapshot.imageUrl, 0.18)}
      <div style="position:absolute; inset:0; background:
        linear-gradient(90deg, rgba(26,26,62,0.98) 0%, rgba(26,26,62,0.94) 62%, rgba(26,26,62,0.52) 100%),
        radial-gradient(circle at top right, rgba(0,217,217,0.10) 0%, rgba(26,26,62,0) 42%);
      "></div>

      <div style="position:relative; z-index:1; padding:40px 48px; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; gap:14px;">
          ${renderLogo(logoUrl)}
          <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:#f8f9fa;">St. George Capital</div>
        </div>

        <div style="margin-top:28px; flex:1; display:flex; flex-direction:column; justify-content:center;">
          <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.20em; text-transform:uppercase; color:#00d9d9; margin-bottom:12px;">
            ${escapeHtml(snapshot.eyebrow)}
          </div>
          <h1 style="margin:0; font:700 46px/1.05 Georgia, 'Times New Roman', serif; letter-spacing:-0.01em; color:#ffffff; max-width:680px;">
            ${escapeHtml(clampText(snapshot.title, 50))}
          </h1>

          <div style="margin-top:16px; font:500 16px/1.5 Arial, Helvetica, sans-serif; color:#f8f9fa; max-width:700px;">
            ${escapeHtml(clampText(snapshot.summary, 150))}
          </div>
        </div>

        <div style="margin-top:auto;">
          <a href="#" style="padding:11px 22px; background:#00d9d9; color:#1a1a3e; border-radius:999px; font:700 11px/1 Arial, Helvetica, sans-serif; letter-spacing:0.12em; text-transform:uppercase; text-decoration:none; display:inline-block;">
            ${escapeHtml(snapshot.cta)}
          </a>
        </div>
      </div>

      <div style="position:relative; z-index:1; padding:40px 32px; display:flex; flex-direction:column; background:linear-gradient(135deg, rgba(0,217,217,0.07) 0%, transparent 100%); justify-content:center; border-left:1px solid rgba(122,122,158,0.2);">
        <div style="text-align:center;">
          <div style="font:700 14px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:#7a7a9e; margin-bottom:16px;">Details</div>

          <div style="margin-bottom:20px;">
            <div style="font:600 12px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:#7a7a9e; margin-bottom:6px;">Published</div>
            <div style="font:700 16px/1.2 Arial, Helvetica, sans-serif; color:#1a1a3e; word-break:break-word;">${escapeHtml(snapshot.dateLabel || 'St. George Capital')}</div>
          </div>

          ${renderInstagramDetail(snapshot)}
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function renderJobPostingPdfHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  if (snapshot.sourceType !== 'job_posting') return null;

  const roleTag = collapseWhitespace(snapshot.fields.roleTagLabel || snapshot.fields.teamLabel || 'SGC Careers');
  const requirements = collapseWhitespace(snapshot.fields.requirements);

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
          ${requirements ? `
            <div style="margin-top:26px; font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${NAVY_2};">Requirements</div>
            <div style="margin-top:14px; font:400 14px/1.72 Arial, Helvetica, sans-serif; color:#1e293b;">${escapeHtml(requirements)}</div>
          ` : ''}
          <div style="margin-top:26px; font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${NAVY_2};">How To Apply</div>
          <div style="margin-top:14px; font:400 14px/1.72 Arial, Helvetica, sans-serif; color:#1e293b;">Review the full posting and submit your application on the SGC website. Selected candidates will be contacted directly for follow-up.</div>
        </div>
        <div>
          <div style="border:1px solid #d8e0ee; border-radius:20px; padding:20px 22px; background:#f8fbff;">
            <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:#64748b;">Snapshot</div>
            <div style="margin-top:16px; display:grid; gap:16px;">
              <div>
                <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:#64748b;">Role</div>
                <div style="margin-top:6px; font:700 20px/1.15 Georgia, 'Times New Roman', serif; color:${NAVY_2};">${escapeHtml(roleTag)}</div>
              </div>
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

async function resolveMarketingLogoSource(origin: string) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'logo', 'sgc_logo.png');
  try {
    const logoBuffer = await readFile(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.warn('[marketing-renderer] Falling back to public logo URL:', error);
    return `${origin}/images/logo/sgc_logo.png`;
  }
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
  const logoSource = await resolveMarketingLogoSource(params.origin);
  const rendererPayload = {
    snapshot: finalSnapshot,
    brand: {
      logoUrl: logoSource,
    },
  };

  let rendered: PythonRenderResponse;
  if (finalSnapshot.sourceType === 'job_posting') {
    rendered = renderInNode(finalSnapshot, rendererPayload.brand.logoUrl);
  } else {
    try {
      rendered = await runPythonScript(rendererPayload);
    } catch (error) {
      console.warn('[marketing-renderer] Falling back to built-in renderer:', error);
      rendered = renderInNode(finalSnapshot, rendererPayload.brand.logoUrl);
    }
  }
  const browser = await launchPdfBrowser();
  const titleSlug = sanitizeSegment(resolveCampaignTitle(finalSnapshot));
  const basePath = `marketing/${params.campaignId}/${titleSlug}`;

  try {
    const assets: StoredMarketingAsset[] = [];

    const instagramPage = await browser.newPage();
    await preparePage(instagramPage, rendered.instagramHtml, 1080, 1080);
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
      height: 1080,
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
