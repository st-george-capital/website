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
  category: 'equity' | 'fx' | 'commodity';
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
                      University of Toronto's Student-Run Investment Club
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

function buildMarketTable(rows: MarketRow[]): string {
  const header = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
      <tr>
        <td colspan="3" style="padding-bottom:10px;">
          <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;">
            Market Snapshot
          </p>
        </td>
      </tr>
    </table>`;

  const tableRows = rows.map((row, i) => {
    const isUp = (row.changePercent ?? 0) >= 0;
    const color = isUp ? '#15803d' : '#b91c1c';
    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    const arrow = isUp ? '▲' : '▼';

    const priceStr = formatPrice(row);
    const changeStr = row.change !== null
      ? `${isUp ? '+' : ''}${row.change.toFixed(row.category === 'fx' ? 4 : 2)}`
      : '—';
    const pctStr = row.changePercent !== null
      ? `${isUp ? '+' : ''}${row.changePercent.toFixed(2)}%`
      : '—';

    return `<tr style="background-color:${bg};">
      <td style="padding:7px 10px 7px 0;font-size:13px;font-weight:600;color:#111827;white-space:nowrap;border-bottom:1px solid #f1f5f9;">
        ${escapeHtml(row.name)}
      </td>
      <td style="padding:7px 16px 7px 0;font-size:13px;color:#374151;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9;">
        ${priceStr}
      </td>
      <td style="padding:7px 0;font-size:12px;font-weight:600;color:${color};text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9;">
        ${arrow} ${changeStr} &nbsp;(${pctStr})
      </td>
    </tr>`;
  }).join('');

  return `${header}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:2px solid #e5e7eb;">
          <th style="padding:6px 10px 6px 0;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">Instrument</th>
          <th style="padding:6px 16px 6px 0;text-align:right;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">Price</th>
          <th style="padding:6px 0;text-align:right;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">24h Change</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>`;
}

function formatPrice(row: MarketRow): string {
  if (row.price === null) return '—';
  if (row.category === 'fx') return row.price.toFixed(4);
  if (row.price >= 1000) return row.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return row.price.toFixed(2);
}

// ─── Content parser ───────────────────────────────────────────────────────────

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

    // Numbered section header
    const sectionMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (sectionMatch) {
      blocks.push(renderSectionHeader(sectionMatch[1], sectionMatch[2]));
      i++;
      continue;
    }

    // Bullet list (• or -)
    if (line.startsWith('•') || line.startsWith('\t•') || (line.startsWith('-') && line.length > 2)) {
      const bullets: string[] = [];
      while (i < lines.length) {
        const bl = lines[i].trim();
        if (bl.startsWith('•') || (bl.startsWith('-') && bl.length > 2)) {
          bullets.push(bl.replace(/^[•\-]\s*/, ''));
          i++;
        } else break;
      }
      blocks.push(renderBulletList(bullets));
      continue;
    }

    // Sub-heading: "Equities:", "Rates/Bonds:", "Growth:" etc.
    const subheadMatch = line.match(/^([A-Z][A-Za-z /()&-]{1,40}):\s*(.*)$/);
    if (subheadMatch && subheadMatch[1].split(' ').length <= 4) {
      blocks.push(renderSubheading(subheadMatch[1], subheadMatch[2]));
      i++;
      continue;
    }

    blocks.push(renderParagraph(line));
    i++;
  }

  return blocks.join('\n');
}

function renderSectionHeader(num: string, text: string): string {
  const clean = stripArtifacts(text);
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;margin-bottom:14px;">
      <tr>
        <td style="padding:10px 16px;background-color:#f1f5f9;border-left:4px solid #030116;border-radius:0 6px 6px 0;">
          <span style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:0.12em;text-transform:uppercase;margin-right:8px;">${num}</span>
          <span style="font-size:15px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${escapeHtml(clean)}</span>
        </td>
      </tr>
    </table>`;
}

function renderBulletList(items: string[]): string {
  const lis = items.map(item => {
    const clean = stripArtifacts(item);
    return `<tr><td style="padding:4px 0 4px 8px;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:10px;padding-top:2px;vertical-align:top;color:#1a56db;font-size:16px;line-height:1;">•</td>
        <td style="font-size:14px;color:#374151;line-height:1.65;">${inlineFormat(clean)}</td>
      </tr></table>
    </td></tr>`;
  }).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 12px 4px;">${lis}</table>`;
}

function renderSubheading(label: string, rest: string): string {
  const cleanRest = stripArtifacts(rest);
  return `<p style="margin:10px 0 5px 0;font-size:14px;color:#1e293b;line-height:1.65;">
    <span style="font-weight:700;color:#0f172a;">${escapeHtml(label)}:</span>${cleanRest ? ' ' + inlineFormat(cleanRest) : ''}
  </p>`;
}

function renderParagraph(text: string): string {
  const clean = stripArtifacts(text);
  if (!clean) return '';
  return `<p style="margin:0 0 12px 0;font-size:14px;color:#374151;line-height:1.7;">${inlineFormat(clean)}</p>`;
}

function stripArtifacts(text: string): string {
  return text.replace(/\uFFFC/g, '').replace(/\[image\]/gi, '').replace(/\s{2,}/g, ' ').trim();
}

function inlineFormat(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
