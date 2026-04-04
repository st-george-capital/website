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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RenderedHtmlPack {
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

/* ------------------------------------------------------------------ */
/*  Color palette                                                      */
/* ------------------------------------------------------------------ */

const NAVY = '#0b1f3a';
const PURPLE = '#5b4b9f';
const SLATE = '#7a7a9e';
const TEAL = '#00d9d9';
const GREEN = '#10b981';
const GOLD = '#f4d35e';
const ROSE = '#f43f5e';
const OFF_WHITE = '#f8f9fa';
const WHITE = '#ffffff';
const LINE = 'rgba(122, 122, 158, 0.2)';

/* ------------------------------------------------------------------ */
/*  Utility helpers (kept from original)                               */
/* ------------------------------------------------------------------ */

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
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

function stripMarkdown(value: string) {
  return value
    .replace(/^#{1,6}\s+/gm, '')          // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // bold
    .replace(/\*([^*]+)\*/g, '$1')         // italic
    .replace(/__([^_]+)__/g, '$1')         // bold alt
    .replace(/_([^_]+)_/g, '$1')           // italic alt
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/`([^`]+)`/g, '$1')           // inline code
    .replace(/^\s*[-*+]\s+/gm, '')         // list bullets
    .replace(/^\s*\d+\.\s+/gm, '');        // numbered lists
}

function clampText(value: string | null | undefined, length: number) {
  const text = collapseWhitespace(stripMarkdown(String(value || '')));
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trimEnd()}…`;
}

function renderLogoSvg(color: string, size = 52) {
  const borderRadius = Math.round(size * 0.16);
  return `<div style="width:${size}px; height:${size}px; border:2px solid ${color}; border-radius:${borderRadius}px; display:flex; align-items:center; justify-content:center;">
    <div style="font:700 ${Math.round(size * 0.42)}px/1 Georgia, 'Times New Roman', serif; color:${color}; letter-spacing:0.04em;">SGC</div>
  </div>`;
}

function renderLogo(logoUrl: string | undefined) {
  if (!logoUrl) return '';
  return `<img src="${escapeHtml(logoUrl)}" alt="SGC" style="height:48px; width:auto; display:block;" />`;
}

function siteUrlForSource(sourceType: string) {
  switch (sourceType) {
    case 'job_posting': return 'stgeorgecapital.ca/contact';
    case 'article': return 'stgeorgecapital.ca/research';
    case 'research_report': return 'stgeorgecapital.ca/equity-research';
    case 'strategy_document': return 'stgeorgecapital.ca/strategy';
    default: return 'stgeorgecapital.ca';
  }
}

function ratingColor(recommendation: string | null | undefined) {
  const rec = String(recommendation || '').toLowerCase().trim();
  if (rec === 'buy' || rec === 'strong buy' || rec === 'overweight') return '#22c55e'; // green
  if (rec === 'sell' || rec === 'strong sell' || rec === 'underweight') return '#ef4444'; // red
  if (rec === 'hold' || rec === 'neutral' || rec === 'equal-weight') return GOLD; // yellow/gold
  return GOLD; // default
}

function backgroundMedia(imageUrl: string | null | undefined, overlay = 0.32) {
  if (!imageUrl) return '';
  return `
    <div style="position:absolute; inset:0; background-image:url('${escapeHtml(imageUrl)}'); background-size:cover; background-position:center;"></div>
    <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(11,31,58,${overlay}) 0%, rgba(11,31,58,0.78) 50%, rgba(11,31,58,0.98) 100%);"></div>
  `;
}

function accentForSource(sourceType: string) {
  switch (sourceType) {
    case 'job_posting': return TEAL;
    case 'article': return '#2dd4bf';
    case 'research_report': return GOLD;
    case 'strategy_document': return ROSE;
    default: return PURPLE;
  }
}

function accentBar(color: string, thickness = 4) {
  return `<div style="position:absolute; top:0; left:0; right:0; height:${thickness}px; background:${color}; z-index:10;"></div>`;
}

/* ------------------------------------------------------------------ */
/*  Shared HTML boilerplate                                            */
/* ------------------------------------------------------------------ */

function igHead() {
  return `<meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width:1080px; height:1080px; }
      body { font-family: Arial, Helvetica, sans-serif; }
    </style>`;
}

function liHead() {
  return `<meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width:1200px; height:627px; }
      body { font-family: Arial, Helvetica, sans-serif; }
    </style>`;
}

function headerRow(badge: string, badgeColor: string) {
  return `
    <div style="display:flex; align-items:center; justify-content:space-between;">
      <div style="font:700 20px/1.2 Georgia, 'Times New Roman', serif; letter-spacing:0.06em; color:${OFF_WHITE};">St. George Capital</div>
      <div style="font:700 13px/1 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${badgeColor};">${escapeHtml(badge)}</div>
    </div>
  `;
}

function headerRowDark(badge: string, badgeColor: string) {
  return `
    <div style="display:flex; align-items:center; justify-content:space-between;">
      <div style="font:700 20px/1.2 Georgia, 'Times New Roman', serif; letter-spacing:0.06em; color:${NAVY};">St. George Capital</div>
      <div style="font:700 13px/1 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${badgeColor};">${escapeHtml(badge)}</div>
    </div>
  `;
}

/* ================================================================== */
/*  INSTAGRAM TEMPLATES (1080 x 1080)                                  */
/* ================================================================== */

function titleFontSize(text: string, maxPx: number, minPx: number, thresholdLen: number) {
  if (text.length <= thresholdLen) return maxPx;
  const scaled = Math.round(maxPx - ((text.length - thresholdLen) * (maxPx - minPx)) / (thresholdLen * 1.4));
  return Math.max(minPx, Math.min(maxPx, scaled));
}

function renderJobPostingInstagramHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  const accent = TEAL;
  const teamLabel = collapseWhitespace(snapshot.fields.teamLabel || 'SGC');
  const title = collapseWhitespace(snapshot.title);
  const titlePx = titleFontSize(title, 88, 52, 20);

  return `<!doctype html><html><head>${igHead()}</head>
  <body>
    <div style="position:relative; width:1080px; height:1080px; overflow:hidden; background:linear-gradient(135deg, ${NAVY} 0%, ${PURPLE} 100%); color:${OFF_WHITE};">
      ${accentBar(accent, 5)}

      <div style="position:relative; z-index:1; height:100%; padding:52px; display:flex; flex-direction:column;">
        ${headerRow(escapeHtml(teamLabel), accent)}

        <div style="margin-top:auto; margin-bottom:auto;">
          <div style="font:600 13px/1.2 Arial, sans-serif; letter-spacing:0.20em; text-transform:uppercase; color:${accent};">
            ${escapeHtml(teamLabel)} — Now Recruiting
          </div>
          <h1 style="margin-top:18px; font:700 ${titlePx}px/0.98 Georgia, 'Times New Roman', serif; letter-spacing:-0.02em; color:${WHITE};">
            ${escapeHtml(title)}
          </h1>
          <div style="margin-top:22px; max-width:860px; font:500 20px/1.35 Arial, sans-serif; color:rgba(248,249,250,0.85);">
            ${escapeHtml(collapseWhitespace(stripMarkdown(snapshot.subtitle || snapshot.summary || '')))}
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div style="padding:18px 20px; background:rgba(255,255,255,0.08); border-left:3px solid ${accent}; border-radius:12px;">
            <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${SLATE};">Deadline</div>
            <div style="margin-top:8px; font:700 20px/1.1 Georgia, serif; color:${OFF_WHITE};">${escapeHtml(snapshot.dateLabel || 'Rolling')}</div>
          </div>
          <div style="padding:18px 20px; background:${accent}; border-radius:12px;">
            <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${NAVY};">Find Out More &amp; Apply</div>
            <div style="margin-top:8px; font:700 18px/1.1 Arial, sans-serif; color:${NAVY};">${escapeHtml(siteUrlForSource('job_posting'))}</div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}

function renderArticleInstagramHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  const accent = '#2dd4bf'; /* teal-400 — professional, distinct from job posting cyan */
  const hasImage = !!snapshot.imageUrl;
  const title = collapseWhitespace(snapshot.title);
  const titlePx = titleFontSize(title, 62, 38, 30);

  return `<!doctype html><html><head>${igHead()}</head>
  <body>
    <div style="position:relative; width:1080px; height:1080px; overflow:hidden; ${hasImage ? `background:${NAVY};` : `background:linear-gradient(135deg, ${NAVY} 0%, ${PURPLE} 100%);`} color:${OFF_WHITE};">
      ${accentBar(accent, 5)}
      ${backgroundMedia(snapshot.imageUrl, 0.36)}

      <div style="position:relative; z-index:1; height:100%; padding:52px; display:flex; flex-direction:column;">
        ${headerRow('Featured', accent)}

        <div style="margin-top:auto;">
          <div style="font:600 12px/1.2 Arial, sans-serif; letter-spacing:0.20em; text-transform:uppercase; color:${accent};">
            ${escapeHtml(snapshot.eyebrow || 'Our Take')}
          </div>
          <h1 style="margin-top:16px; font:700 ${titlePx}px/0.98 Georgia, 'Times New Roman', serif; letter-spacing:-0.02em; color:${WHITE}; max-width:920px;">
            ${escapeHtml(title)}
          </h1>
          <div style="margin-top:18px; max-width:860px; font:400 18px/1.5 Arial, sans-serif; color:rgba(248,249,250,0.85);">
            ${escapeHtml(collapseWhitespace(stripMarkdown(snapshot.subtitle || snapshot.summary || '')))}
          </div>
          <div style="margin-top:24px; display:flex; align-items:center; gap:14px;">
            <div style="padding:10px 20px; background:${accent}; border-radius:999px; font:700 11px/1 Arial, sans-serif; letter-spacing:0.12em; text-transform:uppercase; color:${NAVY};">
              Read More on Our Website
            </div>
            <div style="font:500 13px/1.2 Arial, sans-serif; color:${SLATE};">
              ${escapeHtml(siteUrlForSource('article'))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}

function renderResearchInstagramHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  const fields = snapshot.fields || {};
  const accent = ratingColor(fields.recommendation);
  const thesisPoints: string[] = Array.isArray(fields.thesisPoints) ? fields.thesisPoints : [];

  const thesisHtml = thesisPoints.length > 0
    ? `<div style="margin-top:auto; padding:24px 28px; background:rgba(255,255,255,0.06); border-left:3px solid ${accent}; border-radius:12px;">
        <div style="font:700 11px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:${accent}; margin-bottom:16px;">Investment Thesis</div>
        ${thesisPoints.map((point, i) => `
          <div style="display:flex; gap:12px; ${i > 0 ? 'margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.08);' : ''}">
            <div style="flex-shrink:0; width:24px; height:24px; background:${accent}; border-radius:6px; display:flex; align-items:center; justify-content:center; font:700 12px/1 Arial, sans-serif; color:${NAVY};">${i + 1}</div>
            <div style="font:500 16px/1.4 Arial, sans-serif; color:${OFF_WHITE};">${escapeHtml(point)}</div>
          </div>
        `).join('')}
      </div>`
    : '';

  return `<!doctype html><html><head>${igHead()}</head>
  <body>
    <div style="position:relative; width:1080px; height:1080px; overflow:hidden; background:${NAVY}; color:${OFF_WHITE};">
      ${accentBar(accent, 5)}

      <div style="position:relative; z-index:1; height:100%; padding:52px; display:flex; flex-direction:column;">
        ${headerRow('Research', accent)}

        <div style="margin-top:32px;">
          <div style="font:600 14px/1.2 Arial, sans-serif; letter-spacing:0.20em; text-transform:uppercase; color:${accent};">
            Equity Analysis
          </div>
          <h1 style="margin-top:14px; font:700 96px/0.92 Georgia, 'Times New Roman', serif; letter-spacing:-0.02em; color:${WHITE};">
            ${escapeHtml((fields.ticker || 'TBD').toUpperCase())}
          </h1>
          <div style="margin-top:10px; font:500 28px/1.3 Arial, sans-serif; color:rgba(248,249,250,0.82);">
            ${escapeHtml(collapseWhitespace(fields.companyName || snapshot.title))}
          </div>
          ${fields.sector ? `<div style="margin-top:8px; font:500 16px/1.2 Arial, sans-serif; color:${SLATE}; text-transform:uppercase; letter-spacing:0.08em;">${escapeHtml(fields.sector)}</div>` : ''}
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-top:28px;">
          <div style="padding:20px 22px; background:rgba(255,255,255,0.06); border-left:3px solid ${accent}; border-radius:10px;">
            <div style="font:600 11px/1.1 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${SLATE};">Rating</div>
            <div style="margin-top:10px; font:700 28px/1 Georgia, serif; color:${accent};">${escapeHtml(String(fields.recommendation || '—').toUpperCase())}</div>
          </div>
          <div style="padding:20px 22px; background:rgba(255,255,255,0.06); border-left:3px solid ${accent}; border-radius:10px;">
            <div style="font:600 11px/1.1 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${SLATE};">Target</div>
            <div style="margin-top:10px; font:700 26px/1 Georgia, serif; color:${OFF_WHITE};">${escapeHtml(fields.targetPriceFormatted || '—')}</div>
          </div>
          <div style="padding:20px 22px; background:rgba(255,255,255,0.06); border-left:3px solid ${accent}; border-radius:10px;">
            <div style="font:600 11px/1.1 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${SLATE};">Upside</div>
            <div style="margin-top:10px; font:700 28px/1 Georgia, serif; color:${accent};">${escapeHtml(fields.impliedUpsideFormatted || '—')}</div>
          </div>
        </div>

        ${thesisHtml}

        <div style="${thesisPoints.length === 0 ? 'margin-top:auto;' : 'margin-top:20px;'} display:flex; align-items:center; gap:14px;">
          <div style="padding:10px 20px; background:${accent}; border-radius:999px; font:700 11px/1 Arial, sans-serif; letter-spacing:0.12em; text-transform:uppercase; color:${NAVY};">
            Read More on Our Website
          </div>
          <div style="font:500 13px/1.2 Arial, sans-serif; color:${SLATE};">
            ${escapeHtml(siteUrlForSource('research_report'))}
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}

function renderStrategyInstagramHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  const accent = '#60a5fa'; /* sky blue — visually distinct from job posting teal and navy-purple bg */
  const fields = snapshot.fields || {};
  const docType = fields.documentTypeLabel || (fields.type === 'investment_strategy' ? 'Investment Strategy' : 'Industry Report');
  const title = collapseWhitespace(snapshot.title);
  const titlePx = titleFontSize(title, 64, 40, 28);

  return `<!doctype html><html><head>${igHead()}</head>
  <body>
    <div style="position:relative; width:1080px; height:1080px; overflow:hidden; background:linear-gradient(155deg, #0f172a 0%, #1e3a5f 55%, #0f172a 100%); color:${OFF_WHITE};">
      ${accentBar(accent, 5)}
      ${backgroundMedia(snapshot.imageUrl, 0.4)}

      <div style="position:relative; z-index:1; height:100%; padding:52px; display:flex; flex-direction:column;">
        ${headerRow(docType, accent)}

        <div style="margin-top:auto; margin-bottom:auto;">
          <div style="font:600 12px/1.2 Arial, sans-serif; letter-spacing:0.20em; text-transform:uppercase; color:${accent};">
            ${escapeHtml(docType)}
          </div>
          <h1 style="margin-top:18px; font:700 ${titlePx}px/0.98 Georgia, 'Times New Roman', serif; letter-spacing:-0.02em; color:${WHITE}; max-width:920px;">
            ${escapeHtml(title)}
          </h1>
          ${fields.year ? `<div style="margin-top:16px; display:inline-block; padding:6px 14px; background:rgba(255,255,255,0.1); border-radius:6px; font:600 14px/1.2 Arial, sans-serif; color:${accent};">${escapeHtml(fields.year)}</div>` : ''}
          <div style="margin-top:18px; max-width:860px; font:400 18px/1.5 Arial, sans-serif; color:rgba(248,249,250,0.82);">
            ${escapeHtml(collapseWhitespace(stripMarkdown(snapshot.subtitle || snapshot.summary || '')))}
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:14px;">
          <div style="padding:10px 20px; background:${accent}; border-radius:999px; font:700 11px/1 Arial, sans-serif; letter-spacing:0.12em; text-transform:uppercase; color:#0f172a;">
            Read More on Our Website
          </div>
          <div style="font:500 13px/1.2 Arial, sans-serif; color:${SLATE};">
            ${escapeHtml(siteUrlForSource('strategy_document'))}
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}

/* ================================================================== */
/*  LINKEDIN TEMPLATES (1200 x 627)                                    */
/* ================================================================== */

function renderJobPostingLinkedinHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  const accent = TEAL;
  const teamLabel = collapseWhitespace(snapshot.fields.teamLabel || 'SGC');
  const title = collapseWhitespace(snapshot.title);
  const titlePx = title.length > 40 ? 36 : title.length > 28 ? 40 : 46;

  return `<!doctype html><html><head>${liHead()}</head>
  <body>
    <div style="position:relative; width:1200px; height:627px; overflow:hidden; background:${WHITE}; color:${NAVY};">
      ${accentBar(accent, 4)}

      <div style="height:100%; display:grid; grid-template-columns:1.2fr 0.8fr;">
        <div style="padding:44px 48px; display:flex; flex-direction:column;">
          ${headerRowDark(escapeHtml(teamLabel), accent)}

          <div style="margin-top:28px; flex:1; display:flex; flex-direction:column; justify-content:center;">
            <div style="font:600 11px/1.2 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${accent};">
              ${escapeHtml(teamLabel)} — Now Recruiting
            </div>
            <h1 style="margin-top:12px; font:700 ${titlePx}px/1.02 Georgia, 'Times New Roman', serif; letter-spacing:-0.01em; color:${NAVY}; max-width:640px;">
              ${escapeHtml(title)}
            </h1>
            <div style="margin-top:14px; font:400 16px/1.55 Arial, sans-serif; color:#334155; max-width:600px;">
              ${escapeHtml(collapseWhitespace(stripMarkdown(snapshot.subtitle || snapshot.summary || '')))}
            </div>
          </div>

          <div style="margin-top:auto;">
            <div style="padding:11px 22px; display:inline-block; background:${accent}; border-radius:999px; font:700 11px/1 Arial, sans-serif; letter-spacing:0.12em; text-transform:uppercase; color:${NAVY};">
              Find Out More &amp; Apply
            </div>
          </div>
        </div>

        <div style="padding:44px 36px; display:flex; flex-direction:column; justify-content:center; background:linear-gradient(135deg, rgba(0,217,217,0.06) 0%, transparent 100%); border-left:1px solid ${LINE};">
          <div style="font:700 12px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:${SLATE}; margin-bottom:24px;">Details</div>

          <div style="margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid ${LINE};">
            <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${SLATE}; margin-bottom:6px;">Team</div>
            <div style="font:700 18px/1.2 Georgia, serif; color:${NAVY};">${escapeHtml(teamLabel)}</div>
          </div>

          <div style="margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid ${LINE};">
            <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${SLATE}; margin-bottom:6px;">Deadline</div>
            <div style="font:700 18px/1.2 Georgia, serif; color:${NAVY};">${escapeHtml(snapshot.dateLabel || 'Rolling')}</div>
          </div>

          <div>
            <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${SLATE}; margin-bottom:6px;">Apply</div>
            <div style="font:600 14px/1.4 Arial, sans-serif; color:${NAVY};">${escapeHtml(siteUrlForSource('job_posting'))}</div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}

function renderResearchLinkedinHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  const fields = snapshot.fields || {};
  const accent = ratingColor(fields.recommendation);
  const recColor = accent;

  return `<!doctype html><html><head>${liHead()}</head>
  <body>
    <div style="position:relative; width:1200px; height:627px; overflow:hidden; background:${WHITE}; color:${NAVY};">
      ${accentBar(accent, 4)}

      <div style="height:100%; display:grid; grid-template-columns:1.3fr 0.7fr;">
        <div style="padding:44px 48px; display:flex; flex-direction:column;">
          ${headerRowDark('Research', accent)}

          <div style="margin-top:24px; flex:1; display:flex; flex-direction:column; justify-content:center;">
            <div style="font:600 11px/1.2 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${accent};">Equity Analysis</div>
            <h1 style="margin-top:10px; font:700 48px/1 Georgia, 'Times New Roman', serif; letter-spacing:-0.01em; color:${NAVY};">
              ${escapeHtml((fields.ticker || 'TBD').toUpperCase())}
            </h1>
            <div style="margin-top:8px; font:500 18px/1.3 Arial, sans-serif; color:#334155;">
              ${escapeHtml(collapseWhitespace(fields.companyName || snapshot.title))}
            </div>
          </div>

          <div style="margin-top:auto;">
            <div style="padding:11px 22px; display:inline-block; background:${accent}; border-radius:999px; font:700 11px/1 Arial, sans-serif; letter-spacing:0.12em; text-transform:uppercase; color:${NAVY};">
              Read More on Our Website
            </div>
          </div>
        </div>

        <div style="padding:44px 32px; display:flex; flex-direction:column; justify-content:center; background:linear-gradient(135deg, ${accent}0d 0%, transparent 100%); border-left:1px solid ${LINE};">
          <div style="text-align:center;">
            <div style="margin-bottom:20px;">
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${SLATE}; margin-bottom:8px;">Rating</div>
              <div style="font:700 28px/1 Georgia, serif; color:${recColor};">${escapeHtml(String(fields.recommendation || '—').toUpperCase())}</div>
            </div>
            <div style="padding:18px 0; margin:0; border-top:1px solid ${LINE}; border-bottom:1px solid ${LINE};">
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${SLATE}; margin-bottom:8px;">Target Price</div>
              <div style="font:700 22px/1 Georgia, serif; color:${NAVY};">${escapeHtml(fields.targetPriceFormatted || '—')}</div>
            </div>
            <div style="margin-top:18px;">
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:${SLATE}; margin-bottom:8px;">Implied Upside</div>
              <div style="font:700 26px/1 Georgia, serif; color:${accent};">${escapeHtml(fields.impliedUpsideFormatted || '—')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}

function renderGenericLinkedinHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  const accent = snapshot.sourceType === 'strategy_document' ? '#60a5fa' : accentForSource(snapshot.sourceType);
  const title = collapseWhitespace(snapshot.title);
  const titlePx = title.length > 46 ? 36 : title.length > 30 ? 42 : 48;

  return `<!doctype html><html><head>${liHead()}</head>
  <body>
    <div style="position:relative; width:1200px; height:627px; overflow:hidden; background:${WHITE}; color:${NAVY};">
      ${accentBar(accent, 4)}
      ${backgroundMedia(snapshot.imageUrl, 0.2)}
      <div style="position:absolute; inset:0; background:
        linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 62%, rgba(255,255,255,0.6) 100%);
      "></div>

      <div style="position:relative; z-index:1; height:100%; padding:44px 52px; display:flex; flex-direction:column;">
        ${headerRowDark('SGC', accent)}

        <div style="margin-top:28px; flex:1; display:flex; flex-direction:column; justify-content:center;">
          <div style="font:600 11px/1.2 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${accent};">
            ${escapeHtml(snapshot.eyebrow || '')}
          </div>
          <h1 style="margin-top:12px; font:700 ${titlePx}px/1.02 Georgia, 'Times New Roman', serif; letter-spacing:-0.01em; color:${NAVY}; max-width:900px;">
            ${escapeHtml(title)}
          </h1>
          <div style="margin-top:14px; font:400 17px/1.55 Arial, sans-serif; color:#334155; max-width:860px;">
            ${escapeHtml(collapseWhitespace(stripMarkdown(snapshot.subtitle || snapshot.summary || '')))}
          </div>
        </div>

        <div style="margin-top:auto; display:flex; align-items:center; gap:14px;">
          <div style="padding:11px 22px; display:inline-block; background:${accent}; border-radius:999px; font:700 11px/1 Arial, sans-serif; letter-spacing:0.12em; text-transform:uppercase; color:${NAVY};">
            Read More on Our Website
          </div>
          <div style="font:500 13px/1.2 Arial, sans-serif; color:${SLATE};">
            ${escapeHtml(siteUrlForSource(snapshot.sourceType))}
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}

/* ================================================================== */
/*  PDF TEMPLATE (Job Posting Flyer)                                   */
/* ================================================================== */

function renderJobPostingPdfHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  if (snapshot.sourceType !== 'job_posting') return null;

  const roleTag = collapseWhitespace(snapshot.fields.roleTagLabel || snapshot.fields.teamLabel || 'SGC');
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
    <div style="padding:40px 48px;">
      <div style="background:${NAVY}; border-radius:20px; padding:28px 32px; color:${OFF_WHITE}; border-left:4px solid ${TEAL};">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:20px;">
          <div style="display:flex; align-items:center; gap:16px;">
            ${renderLogo(logoUrl)}
            <div>
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:${SLATE};">St. George Capital</div>
              <div style="margin-top:6px; font:700 14px/1.2 Georgia, serif;">Student Investment Platform</div>
            </div>
          </div>
          <div style="font:700 10px/1.2 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${TEAL};">Recruiting</div>
        </div>
        <div style="margin-top:24px;">
          <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:${TEAL};">${escapeHtml(snapshot.eyebrow)}</div>
          <h1 style="margin-top:10px; font:700 34px/1.04 Georgia, serif; color:${WHITE};">${escapeHtml(snapshot.title)}</h1>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1.4fr 0.6fr; gap:28px; margin-top:28px;">
        <div>
          <h2 style="margin:0 0 12px; font:600 12px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:${NAVY};">About the Role</h2>
          <div style="font:400 14px/1.8 Arial, sans-serif; color:#334155;">
            ${escapeHtml(clampText(snapshot.fields.description || snapshot.summary, 500))}
          </div>
          ${requirements ? `
            <h2 style="margin:24px 0 12px; font:600 12px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:${NAVY};">Requirements</h2>
            <div style="font:400 14px/1.8 Arial, sans-serif; color:#334155;">${escapeHtml(requirements)}</div>
          ` : ''}
          <h2 style="margin:24px 0 12px; font:600 12px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:${NAVY};">How To Apply</h2>
          <div style="font:400 14px/1.8 Arial, sans-serif; color:#334155;">Visit stgeorgecapital.ca/contact to apply. All qualified candidates are encouraged to submit their materials.</div>
        </div>

        <div>
          <div style="background:#f1f5f9; border-radius:16px; padding:22px; border-left:3px solid ${TEAL};">
            <h3 style="margin:0 0 18px; font:600 11px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:${NAVY};">Key Info</h3>
            <div style="margin-bottom:16px;">
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:#64748b; margin-bottom:6px;">Role</div>
              <div style="font:700 16px/1.2 Georgia, serif; color:${NAVY};">${escapeHtml(roleTag)}</div>
            </div>
            <div style="margin-bottom:16px;">
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:#64748b; margin-bottom:6px;">Team</div>
              <div style="font:700 16px/1.2 Georgia, serif; color:${NAVY};">${escapeHtml(snapshot.fields.teamLabel || 'SGC')}</div>
            </div>
            <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid #d8e0ee;">
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:#64748b; margin-bottom:6px;">Deadline</div>
              <div style="font:700 16px/1.2 Georgia, serif; color:${NAVY};">${escapeHtml(snapshot.dateLabel || 'Rolling')}</div>
            </div>
            <div>
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:#64748b; margin-bottom:6px;">Website</div>
              <div style="font:600 14px/1.4 Arial, sans-serif; color:${NAVY};">stgeorgecapital.ca/contact</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

/* ================================================================== */
/*  Dispatcher + Orchestration                                         */
/* ================================================================== */

function renderInstagramHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  switch (snapshot.sourceType) {
    case 'job_posting':
      return renderJobPostingInstagramHtml(snapshot, logoUrl);
    case 'article':
      return renderArticleInstagramHtml(snapshot, logoUrl);
    case 'research_report':
      return renderResearchInstagramHtml(snapshot, logoUrl);
    case 'strategy_document':
      return renderStrategyInstagramHtml(snapshot, logoUrl);
    default:
      return renderArticleInstagramHtml(snapshot, logoUrl);
  }
}

function renderLinkedinHtml(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined) {
  switch (snapshot.sourceType) {
    case 'job_posting':
      return renderJobPostingLinkedinHtml(snapshot, logoUrl);
    case 'research_report':
      return renderResearchLinkedinHtml(snapshot, logoUrl);
    default:
      return renderGenericLinkedinHtml(snapshot, logoUrl);
  }
}

function renderAll(snapshot: MarketingSourceSnapshot, logoUrl: string | undefined): RenderedHtmlPack {
  return {
    instagramHtml: renderInstagramHtml(snapshot, logoUrl),
    linkedinHtml: renderLinkedinHtml(snapshot, logoUrl),
    pdfHtml: renderJobPostingPdfHtml(snapshot, logoUrl),
  };
}

/* ================================================================== */
/*  Infrastructure (Puppeteer, Blob, Logo)                             */
/* ================================================================== */

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

/* ================================================================== */
/*  Public API                                                         */
/* ================================================================== */

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

  const rendered = renderAll(finalSnapshot, logoSource);

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
