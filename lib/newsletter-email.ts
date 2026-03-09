/**
 * Converts raw pasted newsletter content into a styled HTML email.
 * Handles: numbered sections, bullet points (• or -), sub-heading labels (e.g. "Equities:"),
 * **bold** inline text, and strips ￼ / [image] artifacts.
 * Optionally injects a live market data table at the top.
 */

export interface MarketRow {
  name: string;
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  category: 'equity' | 'fx' | 'commodity' | 'yield' | 'volatility';
  group?: 'equities' | 'asia' | 'fx' | 'rates' | 'commodities';
}

export function buildNewsletterEmail(opts: {
  title: string;
  issueNumber: number;
  date: string;
  rawContent: string;
  unsubscribeUrl: string;
  marketData?: MarketRow[];
}): string {
  const { title, issueNumber, date, rawContent, unsubscribeUrl, marketData } = opts;
  const bodyHtml = parseContent(rawContent);
  const marketTableHtml = marketData && marketData.length > 0 ? buildMarketTable(marketData) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#030116;padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="display:inline-block;background-color:#ffffff;border-radius:6px;padding:6px 14px;margin-bottom:16px;">
                      <span style="font-size:15px;font-weight:800;color:#030116;letter-spacing:0.05em;">SGC</span>
                    </div>
                    <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#8b8fa8;">
                      DAILY MARKET SNAPSHOT &nbsp;·&nbsp; ISSUE #${issueNumber}
                    </p>
                    <h1 style="margin:6px 0 0 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                      ${escapeHtml(title)}
                    </h1>
                  </td>
                  <td align="right" valign="bottom" style="padding-bottom:4px;">
                    <p style="margin:0;font-size:13px;color:#8b8fa8;white-space:nowrap;">${escapeHtml(date)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- GRADIENT DIVIDER -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#1a56db 0%,#7e3af2 50%,#c81e1e 100%);"></td>
          </tr>

          ${marketTableHtml ? `
          <!-- MARKET SNAPSHOT TABLE -->
          <tr>
            <td style="padding:24px 40px 8px;">
              ${marketTableHtml}
            </td>
          </tr>
          <tr><td style="padding:0 40px 8px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr>
          ` : ''}

          <!-- BODY -->
          <tr>
            <td style="padding:${marketTableHtml ? '24px' : '36px'} 40px 24px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f8f9fc;border-top:1px solid #e5e7eb;padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#030116;letter-spacing:0.08em;text-transform:uppercase;">
                      St. George Capital
                    </p>
                    <p style="margin:0;font-size:11px;color:#6b7280;">
                      University of Toronto's Premier Student-Run Investment Club
                    </p>
                  </td>
                  <td align="right">
                    <a href="${unsubscribeUrl}" style="font-size:11px;color:#6b7280;text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:12px;">
                    <p style="margin:0;font-size:10px;color:#9ca3af;line-height:1.5;">
                      This newsletter is produced by St. George Capital for informational purposes only.
                      It does not constitute investment advice. Past performance is not indicative of future results.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Market table ────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = {
  equities: 'Equities',
  asia: 'Asia',
  fx: 'FX',
  rates: 'Rates',
  commodities: 'Commodities & Volatility',
};

function buildMarketTable(rows: MarketRow[]): string {
  // Bucket rows by group, preserving order of first appearance
  const groupOrder: string[] = [];
  const grouped: Record<string, MarketRow[]> = {};
  for (const row of rows) {
    const g = row.group ?? 'equities';
    if (!grouped[g]) { grouped[g] = []; groupOrder.push(g); }
    grouped[g].push(row);
  }

  const header = `
    <p style="margin:0 0 10px 0;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;">
      Market Snapshot
    </p>`;

  const colHeader = `
    <tr style="border-bottom:2px solid #e5e7eb;">
      <th style="padding:5px 8px 5px 0;text-align:left;font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">Instrument</th>
      <th style="padding:5px 14px 5px 0;text-align:right;font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">Value</th>
      <th style="padding:5px 0;text-align:right;font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">24h Change</th>
    </tr>`;

  let rowIdx = 0;
  const sectionBlocks = groupOrder.map(g => {
    const groupRows = grouped[g];
    const label = GROUP_LABELS[g] ?? g;
    const groupHeader = `
      <tr>
        <td colspan="3" style="padding:${rowIdx === 0 ? '2px' : '10px'} 0 4px 0;">
          <span style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6366f1;">${label}</span>
        </td>
      </tr>`;

    const dataRows = groupRows.map(row => {
      const isUp = (row.changePercent ?? 0) >= 0;
      const isFlat = row.changePercent === null || (row.change !== null && Math.abs(row.change) < 0.0001);
      const color = isFlat ? '#6b7280' : isUp ? '#15803d' : '#b91c1c';
      const bg = rowIdx++ % 2 === 0 ? '#ffffff' : '#f8fafc';
      const arrow = isFlat ? '—' : isUp ? '▲' : '▼';

      const priceStr = formatPrice(row);
      const changeStr = formatChange(row);
      const pctStr = formatPct(row);

      return `<tr style="background-color:${bg};">
        <td style="padding:6px 8px 6px 0;font-size:12px;font-weight:600;color:#111827;white-space:nowrap;border-bottom:1px solid #f1f5f9;">${escapeHtml(row.name)}</td>
        <td style="padding:6px 14px 6px 0;font-size:12px;font-family:monospace;color:#374151;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9;">${priceStr}</td>
        <td style="padding:6px 0;font-size:11px;font-weight:600;color:${color};text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9;">${isFlat ? '—' : `${arrow}&nbsp;${changeStr}&nbsp;(${pctStr})`}</td>
      </tr>`;
    }).join('');

    return groupHeader + dataRows;
  }).join('');

  return `${header}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <thead>${colHeader}</thead>
      <tbody>${sectionBlocks}</tbody>
    </table>`;
}

function formatPrice(row: MarketRow): string {
  if (row.price === null) return '—';
  if (row.category === 'yield') return `${row.price.toFixed(2)}%`;
  if (row.category === 'fx') {
    // JPY pairs show 2 decimals; others show 4
    return row.ticker === 'USDJPY' ? row.price.toFixed(2) : row.price.toFixed(4);
  }
  if (row.price >= 1000) return row.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return row.price.toFixed(2);
}

function formatChange(row: MarketRow): string {
  if (row.change === null) return '—';
  const sign = row.change >= 0 ? '+' : '';
  if (row.category === 'yield') {
    // Show change in basis points
    const bps = row.change * 100;
    return `${sign}${bps.toFixed(1)} bps`;
  }
  if (row.category === 'fx') {
    return row.ticker === 'USDJPY'
      ? `${sign}${row.change.toFixed(2)}`
      : `${sign}${row.change.toFixed(4)}`;
  }
  return `${sign}${row.change.toFixed(2)}`;
}

function formatPct(row: MarketRow): string {
  if (row.category === 'yield') return ''; // bps already shown
  if (row.changePercent === null) return '—';
  const sign = row.changePercent >= 0 ? '+' : '';
  return `${sign}${row.changePercent.toFixed(2)}%`;
}

// ─── Content parser (supports both ChatGPT markdown AND original bullet format)
function parseContent(raw: string): string {
  const cleaned = raw
    .replace(/\uFFFC/g, '')
    .replace(/\[image\]/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  const lines = cleaned.split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // ── Markdown headings ──────────────────────────────────────────────────
    if (/^#{1}\s/.test(line) && !/^#{2,}/.test(line)) {
      blocks.push(renderH1(line.replace(/^#+\s*/, '')));
      i++; continue;
    }
    if (/^#{2}\s/.test(line) && !/^#{3,}/.test(line)) {
      blocks.push(renderH2(line.replace(/^#+\s*/, '')));
      i++; continue;
    }
    if (/^#{3,}\s/.test(line)) {
      blocks.push(renderH3(line.replace(/^#+\s*/, '')));
      i++; continue;
    }

    // ── Legacy numbered section header: "1. Executive Summary" ────────────
    const sectionMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (sectionMatch) {
      blocks.push(renderH1(`${sectionMatch[1]}. ${sectionMatch[2]}`));
      i++; continue;
    }

    // ── Markdown table: lines starting with | ─────────────────────────────
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      blocks.push(renderMdTable(tableLines));
      continue;
    }

    // ── Bullet list: -, *, or • ────────────────────────────────────────────
    if (/^[-*•]\s/.test(line)) {
      const bullets: string[] = [];
      while (i < lines.length) {
        const bl = lines[i].trim();
        if (/^[-*•]\s/.test(bl)) {
          bullets.push(bl.replace(/^[-*•]\s+/, ''));
          i++;
        } else break;
      }
      blocks.push(renderBulletList(bullets));
      continue;
    }

    // ── Blockquote: > text ─────────────────────────────────────────────────
    if (line.startsWith('> ')) {
      const clean = stripArtifacts(line.slice(2));
      blocks.push(`<blockquote style="margin:10px 0 12px 0;padding:10px 16px;border-left:3px solid #cbd5e1;color:#64748b;font-style:italic;font-size:13px;line-height:1.6;">${inlineFormat(clean)}</blockquote>`);
      i++; continue;
    }

    // ── Legacy label-colon sub-heading: "Equities:", "Rates/Bonds:" ────────
    const subheadMatch = line.match(/^([A-Z][A-Za-z /()&-]{1,40}):\s*(.*)$/);
    if (subheadMatch && subheadMatch[1].split(' ').length <= 5) {
      const cleanRest = stripArtifacts(subheadMatch[2]);
      blocks.push(`<p style="margin:10px 0 5px 0;font-size:14px;color:#1e293b;line-height:1.65;">
        <span style="font-weight:700;color:#0f172a;">${escapeHtml(subheadMatch[1])}:</span>${cleanRest ? ' ' + inlineFormat(cleanRest) : ''}
      </p>`);
      i++; continue;
    }

    // ── Plain paragraph ────────────────────────────────────────────────────
    const clean = stripArtifacts(line);
    if (clean) blocks.push(`<p style="margin:0 0 12px 0;font-size:14px;color:#374151;line-height:1.7;">${inlineFormat(clean)}</p>`);
    i++;
  }

  return blocks.join('\n');
}

// ─── Block renderers ──────────────────────────────────────────────────────────

/** H1 / numbered section — dark left-border tile */
function renderH1(text: string): string {
  const clean = stripArtifacts(text);
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;margin-bottom:14px;">
      <tr>
        <td style="padding:10px 16px;background-color:#f1f5f9;border-left:4px solid #030116;border-radius:0 6px 6px 0;">
          <span style="font-size:15px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${inlineFormat(clean)}</span>
        </td>
      </tr>
    </table>`;
}

/** H2 — indigo underline */
function renderH2(text: string): string {
  const clean = stripArtifacts(text);
  return `<p style="margin:20px 0 6px 0;font-size:14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">${inlineFormat(clean)}</p>`;
}

/** H3 — small bold label */
function renderH3(text: string): string {
  const clean = stripArtifacts(text);
  return `<p style="margin:14px 0 4px 0;font-size:13px;font-weight:700;color:#334155;">${inlineFormat(clean)}</p>`;
}

/** Bullet list */
function renderBulletList(items: string[]): string {
  const lis = items.map(item => {
    const clean = stripArtifacts(item);
    return `<tr><td style="padding:3px 0 3px 8px;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:10px;padding-top:2px;vertical-align:top;color:#1a56db;font-size:16px;line-height:1;">•</td>
        <td style="font-size:14px;color:#374151;line-height:1.65;">${inlineFormat(clean)}</td>
      </tr></table>
    </td></tr>`;
  }).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 12px 4px;">${lis}</table>`;
}

/** Markdown table: | col | col | */
function renderMdTable(lines: string[]): string {
  if (lines.length < 1) return '';
  // Skip the separator row (|---|---|)
  const dataLines = lines.filter(l => !/^\|[\s\-:|]+\|/.test(l.replace(/[^|\-:]/g, '')));
  if (dataLines.length === 0) return '';

  const parseRow = (l: string) =>
    l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

  const [headerLine, ...bodyLines] = dataLines;
  const headers = parseRow(headerLine);

  const headerHtml = headers
    .map(h => `<th style="padding:7px 12px;text-align:left;font-size:12px;font-weight:700;color:#374151;background:#f1f5f9;border-bottom:2px solid #e2e8f0;white-space:nowrap;">${inlineFormat(stripArtifacts(h))}</th>`)
    .join('');

  const bodyHtml = bodyLines.map((l, ri) => {
    const cells = parseRow(l);
    const bg = ri % 2 === 0 ? '#ffffff' : '#f8fafc';
    const cellsHtml = cells
      .map(c => `<td style="padding:6px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;">${inlineFormat(stripArtifacts(c))}</td>`)
      .join('');
    return `<tr style="background-color:${bg};">${cellsHtml}</tr>`;
  }).join('');

  return `<div style="overflow-x:auto;margin:12px 0 16px;">
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  </div>`;
}

// ─── Inline helpers ───────────────────────────────────────────────────────────

function stripArtifacts(text: string): string {
  return text.replace(/\uFFFC/g, '').replace(/\[image\]/gi, '').replace(/\s{2,}/g, ' ').trim();
}

/** Converts **bold**, *italic*, `code`, [link](url) markdown to HTML inline */
function inlineFormat(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;font-size:12px;font-family:monospace;color:#0f172a;">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#1a56db;text-decoration:underline;">$1</a>');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
