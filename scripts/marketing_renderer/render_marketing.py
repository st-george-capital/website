#!/usr/bin/env python3

import json
import sys
from html import escape


# Modern color palette
NAVY = "#030116"
NAVY_2 = "#0b1f3a"
NAVY_3 = "#1a2a4a"
SLATE = "#8fa1c2"
ICE = "#b9c9e8"
TEAL = "#00d9d9"
EMERALD = "#10b981"
AMBER = "#f59e0b"
ROSE = "#f43f5e"
OFF_WHITE = "#f8fbff"
LINE = "rgba(143, 161, 194, 0.24)"

# Accents per source type
ACCENTS = {
    "job_posting": TEAL,
    "article": EMERALD,
    "research_report": AMBER,
    "strategy_document": ROSE,
    "manual": ICE,
}


def read_payload():
    return json.loads(sys.stdin.read())


def safe(value):
    return escape(str(value or ""))


def collapse(value):
    return " ".join(str(value or "").split())


def clamp(value, length):
    text = collapse(value)
    if len(text) <= length:
        return text
    return text[: length - 1].rstrip() + "…"


def smart_clamp(value, length, prefer_sentences=False):
    """Clamp with sentence awareness for better truncation"""
    text = collapse(value)
    if len(text) <= length:
        return text

    if prefer_sentences:
        # Try to cut at sentence boundary
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        if sentences:
            result = ""
            for sentence in sentences:
                candidate = result + sentence + "."
                if len(candidate) <= length:
                    result = candidate
                else:
                    return result.rstrip(". ") if result else clamp(value, length)

    return text[: length - 1].rstrip() + "…"


def render_logo(logo_url):
    if not logo_url:
        return ""
    return f'<img src="{safe(logo_url)}" alt="SGC" style="height:38px; width:auto; display:block;" />'


def background_media(image_url, overlay=0.32):
    if not image_url:
        return ""
    return f"""
    <div style="position:absolute; inset:0; background-image:url('{safe(image_url)}'); background-size:cover; background-position:center;"></div>
    <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(3,1,22,{overlay + 0.12}) 0%, rgba(3,1,22,0.76) 48%, rgba(3,1,22,0.98) 100%);"></div>
    """


def accent_bar(accent_color):
    """Gradient accent bar element"""
    return f"""<div style="position:absolute; top:0; left:0; right:0; height:4px; background:linear-gradient(90deg, {accent_color} 0%, {accent_color}80 100%);"></div>"""


def stat_cell(label, value, accent=SLATE):
    """Modern stat cell with accent"""
    return f"""
    <div style="padding:14px 16px; border:1px solid {LINE}; border-radius:14px; background:rgba(255,255,255,0.04); border-left:3px solid {accent};">
      <div style="font:600 9px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{SLATE};">{safe(label)}</div>
      <div style="margin-top:8px; font:700 24px/1.05 Georgia, 'Times New Roman', serif; color:{OFF_WHITE};">{safe(value or '—')}</div>
    </div>
    """


def stat_row(label, value, accent=SLATE):
    """Stat row for LinkedIn (horizontal layout)"""
    return f"""
    <div style="display:flex; justify-content:space-between; align-items:baseline; gap:16px; padding:12px 0; border-top:1px solid {LINE};">
      <span style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE};">{safe(label)}</span>
      <span style="font:700 20px/1.1 Georgia, 'Times New Roman', serif; color:{accent};">{safe(value or '—')}</span>
    </div>
    """


def research_metrics(fields, accent):
    return [
        ("Rating", str(fields.get("recommendation", "—")).upper(), accent),
        ("Target", fields.get("targetPriceFormatted") or "—", accent),
        ("Current", fields.get("currentPriceFormatted") or "—", SLATE),
        ("Upside", fields.get("impliedUpsideFormatted") or "—", accent),
    ]


def instagram_detail(snapshot, accent):
    """Instagram footer detail section with metrics"""
    fields = snapshot.get("fields", {})
    source_type = snapshot.get("sourceType")

    if source_type == "research_report":
        metrics = "".join(
            stat_cell(label, value, color)
            for label, value, color in research_metrics(fields, accent)
        )
        return f'<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:22px;">{metrics}</div>'

    if source_type == "job_posting":
        return f"""
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:22px;">
        {stat_cell('Team', fields.get('teamLabel') or 'SGC', accent)}
        {stat_cell('Status', snapshot.get('dateLabel') or 'Rolling', accent)}
      </div>
      """

    if source_type == "strategy_document":
        return f"""
      <div style="padding:14px 16px; border:1px solid {LINE}; border-radius:14px; background:rgba(255,255,255,0.04); border-left:3px solid {accent}; margin-top:22px;">
        <div style="font:600 9px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{SLATE};">Document Type</div>
        <div style="margin-top:8px; font:700 22px/1.1 Georgia, 'Times New Roman', serif; color:{OFF_WHITE};">{safe(fields.get('documentTypeLabel') or 'Research')}</div>
      </div>
      """

    return ""


def render_instagram(snapshot, brand):
    """Modern Instagram feed post (1080x1080 square)"""
    image_url = snapshot.get("imageUrl")
    source_type = snapshot.get("sourceType")
    accent = ACCENTS.get(source_type, ICE)

    title = safe(snapshot.get('title'))
    eyebrow = safe(snapshot.get('eyebrow'))
    subtitle = safe(smart_clamp(snapshot.get('subtitle') or snapshot.get('summary'), 140, prefer_sentences=True))
    summary = safe(smart_clamp(snapshot.get('summary'), 200, prefer_sentences=True))
    cta = safe(snapshot.get('cta'))

    detail = instagram_detail(snapshot, accent)

    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {{ box-sizing: border-box; }}
      html, body {{ width:1080px; height:1080px; margin:0; padding:0; }}
      body {{ background:{NAVY}; font-family:Arial, Helvetica, sans-serif; color:{OFF_WHITE}; }}
    </style>
  </head>
  <body>
    <div style="position:relative; width:1080px; height:1080px; overflow:hidden; background:{NAVY};">
      {accent_bar(accent)}
      {background_media(image_url, 0.36)}
      <div style="position:absolute; inset:0; background:
        radial-gradient(circle at top right, rgba(0,217,217,0.12) 0%, rgba(3,1,22,0) 46%),
        linear-gradient(180deg, rgba(3,1,22,0.08) 0%, rgba(3,1,22,0.82) 44%, rgba(3,1,22,0.98) 100%);
      "></div>
      <div style="position:relative; z-index:1; height:100%; padding:48px 52px 54px; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:20px;">
          <div style="display:flex; align-items:center; gap:14px;">
            {render_logo(brand.get('logoUrl'))}
            <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{OFF_WHITE};">St. George Capital</div>
          </div>
          <div style="width:6px; height:6px; border-radius:50%; background:{accent};"></div>
        </div>

        <div style="margin-top:44px;">
          <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.20em; text-transform:uppercase; color:{accent};">{eyebrow}</div>
          <h1 style="margin:16px 0 0; max-width:920px; font:700 62px/0.98 Georgia, 'Times New Roman', serif; letter-spacing:-0.02em; word-spacing:0.1em;">{title}</h1>
          <div style="margin-top:20px; max-width:880px; font:500 24px/1.32 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.86);">{subtitle}</div>
        </div>

        <div style="margin-top:auto;">
          <div style="padding:16px 18px; border:1px solid {LINE}; border-radius:14px; background:rgba(255,255,255,0.04); border-left:3px solid {accent};">
            <div style="font:400 17px/1.6 Arial, Helvetica, sans-serif; color:{OFF_WHITE};">{summary}</div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:16px;">
              <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{SLATE};">{safe(snapshot.get('dateLabel') or 'St. George Capital')}</div>
              <div style="padding:9px 18px; border-radius:999px; background:{accent}; color:{NAVY}; font:700 11px/1 Arial, Helvetica, sans-serif; letter-spacing:0.14em; text-transform:uppercase;">{cta}</div>
            </div>
          </div>
          {detail}
        </div>
      </div>
    </div>
  </body>
</html>"""


def render_linkedin(snapshot, brand):
    """Modern LinkedIn share graphic (1200x627)"""
    image_url = snapshot.get("imageUrl")
    source_type = snapshot.get("sourceType")
    accent = ACCENTS.get(source_type, ICE)

    title = safe(snapshot.get('title'))
    eyebrow = safe(snapshot.get('eyebrow'))
    subtitle = safe(smart_clamp(snapshot.get('subtitle') or snapshot.get('summary'), 120, prefer_sentences=True))
    summary = safe(smart_clamp(snapshot.get('summary'), 220, prefer_sentences=True))
    cta = safe(snapshot.get('cta'))

    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {{ box-sizing: border-box; }}
      html, body {{ width:1200px; height:627px; margin:0; padding:0; }}
      body {{ background:{NAVY}; font-family:Arial, Helvetica, sans-serif; color:{OFF_WHITE}; }}
    </style>
  </head>
  <body>
    <div style="position:relative; width:1200px; height:627px; overflow:hidden; background:{NAVY};">
      {accent_bar(accent)}
      {background_media(image_url, 0.18)}
      <div style="position:absolute; inset:0; background:
        linear-gradient(90deg, rgba(3,1,22,0.98) 0%, rgba(3,1,22,0.94) 62%, rgba(3,1,22,0.52) 100%),
        radial-gradient(circle at top right, rgba(0,217,217,0.10) 0%, rgba(3,1,22,0) 42%);
      "></div>
      <div style="position:relative; z-index:1; height:100%; padding:40px 48px; display:grid; grid-template-columns: 1.5fr 0.7fr; gap:36px;">
        <div style="display:flex; flex-direction:column;">
          <div style="display:flex; align-items:center; gap:14px;">
            {render_logo(brand.get('logoUrl'))}
            <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{OFF_WHITE};">St. George Capital</div>
          </div>

          <div style="margin-top:28px;">
            <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.20em; text-transform:uppercase; color:{accent};">{eyebrow}</div>
            <h1 style="margin:14px 0 0; max-width:680px; font:700 52px/0.96 Georgia, 'Times New Roman', serif; letter-spacing:-0.02em;">{title}</h1>
            <div style="margin-top:14px; max-width:700px; font:500 19px/1.32 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.84);">{subtitle}</div>
          </div>

          <div style="margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:18px;">
            <div style="max-width:620px; font:400 15px/1.6 Arial, Helvetica, sans-serif; color:{OFF_WHITE};">{summary}</div>
            <div style="padding:10px 16px; border-radius:999px; border:1px solid {accent}; background:rgba(0,217,217,0.08); font:700 10px/1 Arial, Helvetica, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{accent}; white-space:nowrap;">{cta}</div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; justify-content:space-between; padding:20px 24px; border:1px solid {LINE}; border-radius:16px; background:rgba(255,255,255,0.04); border-left:3px solid {accent};">
          <div>
            <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{SLATE};">Key Info</div>
            <div style="margin-top:14px;">"""

    # Add metrics based on source type
    if source_type == "research_report":
        metrics = research_metrics(snapshot.get("fields", {}), accent)
        linkedin_body = "".join(stat_row(label, value, color) for label, value, color in metrics)
    elif source_type == "job_posting":
        fields = snapshot.get("fields", {})
        linkedin_body = f"""
            {stat_row('Team', fields.get('teamLabel') or 'SGC', accent)}
            {stat_row('Deadline', snapshot.get('dateLabel') or 'Rolling', accent)}
            """
    else:
        linkedin_body = f"""
            {stat_row('Published', snapshot.get('dateLabel') or 'SGC', accent)}
            """

    return f"""{linkedin_body}
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>"""


def render_job_posting_pdf(snapshot, brand):
    """Modern job posting PDF (letter size: 8.5x11in)"""
    fields = snapshot.get("fields", {})
    accent = ACCENTS.get("job_posting", TEAL)

    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {{ box-sizing: border-box; }}
      html, body {{ margin:0; padding:0; background:white; }}
      body {{ font-family:Arial, Helvetica, sans-serif; color:#0f172a; }}
    </style>
  </head>
  <body>
    <div style="padding:40px 48px 44px; max-width:800px;">
      <div style="background:{NAVY}; border-radius:20px; padding:28px 32px; color:{OFF_WHITE}; border-left:4px solid {accent};">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:20px;">
          <div style="display:flex; align-items:center; gap:16px;">
            {render_logo(brand.get('logoUrl'))}
            <div>
              <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{SLATE};">St. George Capital</div>
              <div style="margin-top:6px; font:700 14px/1.2 Georgia, 'Times New Roman', serif;">Investment Research | Student-Led</div>
            </div>
          </div>
          <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{accent}; text-align:right;">Recruiting<br />Flyer</div>
        </div>
        <div style="margin-top:24px; font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.20em; text-transform:uppercase; color:{accent};">{safe(snapshot.get('eyebrow'))}</div>
        <h1 style="margin:12px 0 0; font:700 36px/1.04 Georgia, 'Times New Roman', serif; color:{OFF_WHITE};">{safe(snapshot.get('title'))}</h1>
        <div style="margin-top:12px; font:500 16px/1.4 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.84);">{safe(snapshot.get('subtitle') or '')}</div>
      </div>

      <div style="display:grid; grid-template-columns:1.3fr 0.7fr; gap:32px; margin-top:32px;">
        <div>
          <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{NAVY_2};">About the Role</div>
          <div style="margin-top:12px; font:400 14px/1.72 Arial, Helvetica, sans-serif; color:#334155; line-height:1.8;">{safe(smart_clamp(fields.get('description') or snapshot.get('summary'), 450, prefer_sentences=True))}</div>

          <div style="margin-top:28px; font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{NAVY_2};">How To Apply</div>
          <div style="margin-top:12px; font:400 14px/1.72 Arial, Helvetica, sans-serif; color:#334155;">Visit sgcresearch.ca to submit your application. Shortlisted candidates will be contacted for interviews.</div>
        </div>

        <div>
          <div style="border:1px solid #d8e0ee; border-radius:16px; padding:22px 24px; background:#f8fbff; border-left:3px solid {accent};">
            <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:#64748b;">Key Details</div>
            <div style="margin-top:16px; display:grid; gap:18px;">
              <div>
                <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:#64748b;">Team</div>
                <div style="margin-top:8px; font:700 18px/1.15 Georgia, 'Times New Roman', serif; color:{NAVY_2};">{safe(fields.get('teamLabel') or 'SGC')}</div>
              </div>
              <div>
                <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:#64748b;">Deadline</div>
                <div style="margin-top:8px; font:700 18px/1.15 Georgia, 'Times New Roman', serif; color:{NAVY_2};">{safe(snapshot.get('dateLabel') or 'Rolling')}</div>
              </div>
              <div style="padding-top:14px; border-top:1px solid #d8e0ee;">
                <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:#64748b;">Action</div>
                <div style="margin-top:8px; font:600 13px/1.6 Arial, Helvetica, sans-serif; color:{NAVY_2};">{safe(snapshot.get('cta'))}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>"""


def main():
    payload = read_payload()
    snapshot = payload["snapshot"]
    brand = payload.get("brand", {})

    result = {
        "instagramHtml": render_instagram(snapshot, brand),
        "linkedinHtml": render_linkedin(snapshot, brand),
        "pdfHtml": render_job_posting_pdf(snapshot, brand)
        if snapshot.get("sourceType") == "job_posting"
        else None,
    }
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
