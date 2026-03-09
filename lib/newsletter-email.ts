/**
 * Converts raw pasted newsletter content into a styled HTML email.
 * Handles the format: numbered sections, • bullets, sub-heading labels (e.g. "Equities:"),
 * and strips inline image/source reference artifacts (￼ and [image]).
 */

export function buildNewsletterEmail(opts: {
  title: string;
  issueNumber: number;
  date: string;
  rawContent: string;
  unsubscribeUrl: string;
}): string {
  const { title, issueNumber, date, rawContent, unsubscribeUrl } = opts;
  const html = parseContent(rawContent);

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

          <!-- DIVIDER BAR -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#1a56db 0%,#7e3af2 50%,#c81e1e 100%);"></td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 40px 24px;">
              ${html}
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

function parseContent(raw: string): string {
  // Strip inline image/source reference artifacts
  const cleaned = raw
    .replace(/\uFFFC/g, '')  // Object Replacement Character (the ￼ boxes)
    .replace(/\[image\]/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  const lines = cleaned.split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // Numbered section header: e.g. "1. Executive Summary" or "1) Executive Summary"
    const sectionMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (sectionMatch) {
      blocks.push(renderSectionHeader(sectionMatch[1], sectionMatch[2]));
      i++;
      continue;
    }

    // Bullet with • or - or \t•
    if (line.startsWith('•') || line.startsWith('\t•') || (line.startsWith('-') && line.length > 2)) {
      // Collect all consecutive bullets
      const bullets: string[] = [];
      while (i < lines.length) {
        const bl = lines[i].trim();
        if (bl.startsWith('•') || (bl.startsWith('-') && bl.length > 2)) {
          bullets.push(bl.replace(/^[•\-]\s*/, ''));
          i++;
        } else {
          break;
        }
      }
      blocks.push(renderBulletList(bullets));
      continue;
    }

    // Sub-heading: a line that is just "Word:" or "Word/Word:" at the start (like "Equities:", "Rates/Bonds:")
    const subheadMatch = line.match(/^([A-Z][A-Za-z /()&-]{1,40}):\s*(.*)$/);
    if (subheadMatch && subheadMatch[1].split(' ').length <= 4) {
      const label = subheadMatch[1];
      const rest = subheadMatch[2];
      blocks.push(renderSubheading(label, rest));
      i++;
      continue;
    }

    // Market Regime Read label-value pairs: "Growth: Down. ..."
    // Already handled by subheadMatch above.

    // Plain paragraph
    blocks.push(renderParagraph(line));
    i++;
  }

  return blocks.join('\n');
}

function renderSectionHeader(num: string, text: string): string {
  // Strip trailing reference artifacts from the heading text
  const clean = stripTrailingArtifacts(text);
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
  const lis = items
    .map(item => {
      const clean = stripTrailingArtifacts(item);
      return `<tr><td style="padding:4px 0 4px 8px;vertical-align:top;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:10px;padding-top:2px;vertical-align:top;color:#1a56db;font-size:16px;line-height:1;">•</td>
          <td style="font-size:14px;color:#374151;line-height:1.65;">${inlineFormat(clean)}</td>
        </tr></table>
      </td></tr>`;
    })
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 12px 4px;">${lis}</table>`;
}

function renderSubheading(label: string, rest: string): string {
  const cleanRest = stripTrailingArtifacts(rest);
  return `<p style="margin:10px 0 5px 0;font-size:14px;color:#1e293b;line-height:1.65;">
    <span style="font-weight:700;color:#0f172a;">${escapeHtml(label)}:</span>${cleanRest ? ' ' + inlineFormat(cleanRest) : ''}
  </p>`;
}

function renderParagraph(text: string): string {
  const clean = stripTrailingArtifacts(text);
  if (!clean) return '';
  return `<p style="margin:0 0 12px 0;font-size:14px;color:#374151;line-height:1.7;">${inlineFormat(clean)}</p>`;
}

/** Strips trailing artifact characters and trims */
function stripTrailingArtifacts(text: string): string {
  return text
    .replace(/\uFFFC/g, '')
    .replace(/\[image\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Converts **bold** and _italic_ markdown inline to HTML */
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
