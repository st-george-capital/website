#!/usr/bin/env python3

import json
import sys
from html import escape


# Professional color palette inspired by WISE
NAVY = "#1a1a3e"
PURPLE = "#5b4b9f"
LAVENDER = "#e8dff5"
SLATE = "#7a7a9e"
TEAL = "#00d9d9"
GOLD = "#f4d35e"
OFF_WHITE = "#f8f9fa"
WHITE = "#ffffff"
LINE = "rgba(122, 122, 158, 0.2)"

# Accents per source type
ACCENTS = {
    "job_posting": TEAL,
    "article": "#10b981",
    "research_report": GOLD,
    "strategy_document": "#f43f5e",
    "manual": PURPLE,
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


def render_logo(logo_url):
    if not logo_url:
        return ""
    return f'<img src="{safe(logo_url)}" alt="SGC" style="height:36px; width:auto; display:block;" />'


def accent_bar(accent_color, thickness=3):
    """Top accent bar"""
    return f'<div style="position:absolute; top:0; left:0; right:0; height:{thickness}px; background:{accent_color};"></div>'


def render_instagram_event(snapshot, brand):
    """Instagram template for job postings/events - bold, structured"""
    accent = ACCENTS.get(snapshot.get("sourceType"), PURPLE)

    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {{ box-sizing: border-box; }}
      html, body {{ width:1080px; height:1080px; margin:0; padding:0; }}
      body {{ background:{NAVY}; font-family:'Arial', sans-serif; color:{OFF_WHITE}; }}
    </style>
  </head>
  <body>
    <div style="position:relative; width:1080px; height:1080px; overflow:hidden; background:linear-gradient(135deg, {NAVY} 0%, {PURPLE} 100%); display:flex; flex-direction:column;">
      {accent_bar(accent, 5)}

      <div style="position:relative; z-index:1; padding:56px 52px; flex:1; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          {render_logo(brand.get('logoUrl'))}
          <div style="font:700 11px/1 Arial, sans-serif; letter-spacing:0.2em; text-transform:uppercase; color:{accent};">SGC</div>
        </div>

        <div style="margin-top:48px; flex:1; display:flex; flex-direction:column; justify-content:center;">
          <div style="font:600 12px/1.2 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{accent}; margin-bottom:16px;">
            {safe(snapshot.get('eyebrow'))}
          </div>
          <h1 style="margin:0; font:700 76px/0.95 Georgia, serif; letter-spacing:-0.02em; color:{WHITE}; word-break:break-word;">
            {safe(clamp(snapshot.get('title'), 40))}
          </h1>

          <div style="margin-top:28px; max-width:700px;">
            <div style="font:500 22px/1.35 Arial, sans-serif; color:rgba(255,255,255,0.88);">
              {safe(clamp(snapshot.get('summary'), 180))}
            </div>
          </div>
        </div>

        <div style="margin-top:auto; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div style="padding:16px 18px; background:rgba(255,255,255,0.08); border:1px solid {LINE}; border-radius:12px; border-left:3px solid {accent};">
            <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE};">When</div>
            <div style="margin-top:8px; font:700 18px/1.1 Arial, sans-serif; color:{OFF_WHITE};">{safe(snapshot.get('dateLabel') or 'TBA')}</div>
          </div>
          <div style="padding:16px 18px; background:{accent}; border-radius:12px;">
            <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{NAVY};">Action</div>
            <div style="margin-top:8px; font:700 16px/1.1 Arial, sans-serif; color:{NAVY}; word-break:break-word;">{safe(clamp(snapshot.get('cta'), 25))}</div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>"""


def render_instagram_article(snapshot, brand):
    """Instagram template for articles - clean, minimal, image-focused"""
    accent = ACCENTS.get(snapshot.get("sourceType"), PURPLE)
    image_url = snapshot.get("imageUrl")

    bg = f"background-image:url('{escape(image_url)}'); background-size:cover; background-position:center;" if image_url else f"background:{NAVY};"

    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {{ box-sizing: border-box; }}
      html, body {{ width:1080px; height:1080px; margin:0; padding:0; }}
      body {{ font-family:'Arial', sans-serif; color:{OFF_WHITE}; }}
    </style>
  </head>
  <body>
    <div style="position:relative; width:1080px; height:1080px; overflow:hidden; {bg}">
      {accent_bar(accent, 5)}

      <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(26,26,62,0.12) 0%, rgba(26,26,62,0.88) 60%, rgba(26,26,62,0.98) 100%);"></div>

      <div style="position:relative; z-index:1; height:100%; padding:48px 48px; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          {render_logo(brand.get('logoUrl'))}
          <div style="font:600 11px/1 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{accent};">Featured</div>
        </div>

        <div style="margin-top:auto;">
          <div style="font:600 11px/1.2 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{accent}; margin-bottom:12px;">
            {safe(snapshot.get('eyebrow'))}
          </div>
          <h1 style="margin:0 0 20px; font:700 62px/1 Georgia, serif; letter-spacing:-0.01em; color:{WHITE}; max-width:900px;">
            {safe(clamp(snapshot.get('title'), 45))}
          </h1>

          <div style="max-width:800px;">
            <p style="margin:0; font:400 18px/1.6 Arial, sans-serif; color:rgba(255,255,255,0.85);">
              {safe(clamp(snapshot.get('summary'), 200))}
            </p>
          </div>

          <div style="margin-top:24px; display:flex; align-items:center; gap:12px;">
            <div style="padding:10px 18px; background:{accent}; border-radius:999px; font:700 11px/1 Arial, sans-serif; letter-spacing:0.12em; text-transform:uppercase; color:{NAVY};">
              {safe(snapshot.get('cta'))}
            </div>
            <div style="font:500 12px/1.2 Arial, sans-serif; color:{SLATE};">
              {safe(snapshot.get('dateLabel') or 'St. George Capital')}
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>"""


def render_instagram_research(snapshot, brand):
    """Instagram template for research reports - metrics-focused"""
    accent = ACCENTS.get(snapshot.get("sourceType"), GOLD)
    fields = snapshot.get("fields", {})

    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {{ box-sizing: border-box; }}
      html, body {{ width:1080px; height:1080px; margin:0; padding:0; }}
      body {{ background:{NAVY}; font-family:'Arial', sans-serif; color:{OFF_WHITE}; }}
    </style>
  </head>
  <body>
    <div style="position:relative; width:1080px; height:1080px; overflow:hidden; background:{NAVY}; display:flex; flex-direction:column;">
      {accent_bar(accent, 5)}

      <div style="position:relative; z-index:1; padding:52px 52px; flex:1; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          {render_logo(brand.get('logoUrl'))}
          <div style="font:700 11px/1 Arial, sans-serif; letter-spacing:0.2em; text-transform:uppercase; color:{accent};">Research</div>
        </div>

        <div style="margin-top:44px; flex:1; display:flex; flex-direction:column; justify-content:center;">
          <div style="font:600 12px/1.2 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{accent};">
            Equity Analysis
          </div>
          <h1 style="margin:16px 0 0; font:700 68px/0.96 Georgia, serif; letter-spacing:-0.02em; color:{WHITE};">
            {safe(fields.get('ticker', 'TBD').upper())}
          </h1>
          <div style="margin-top:12px; font:500 24px/1.3 Arial, sans-serif; color:rgba(255,255,255,0.82);">
            {safe(clamp(fields.get('companyName', snapshot.get('title')), 40))}
          </div>
        </div>

        <div style="margin-top:auto; display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
          <div style="padding:14px 14px; background:rgba(255,255,255,0.08); border-radius:10px; border-left:3px solid {accent};">
            <div style="font:600 9px/1.1 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE};">Rating</div>
            <div style="margin-top:6px; font:700 20px/1 Georgia, serif; color:{accent};">{safe(str(fields.get('recommendation', '—')).upper())}</div>
          </div>
          <div style="padding:14px 14px; background:rgba(255,255,255,0.08); border-radius:10px; border-left:3px solid {accent};">
            <div style="font:600 9px/1.1 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE};">Target</div>
            <div style="margin-top:6px; font:700 18px/1 Georgia, serif; color:{OFF_WHITE};">{safe(fields.get('targetPriceFormatted', '—'))}</div>
          </div>
          <div style="padding:14px 14px; background:rgba(255,255,255,0.08); border-radius:10px; border-left:3px solid {accent};">
            <div style="font:600 9px/1.1 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE};">Upside</div>
            <div style="margin-top:6px; font:700 20px/1 Georgia, serif; color:{accent};">{safe(fields.get('impliedUpsideFormatted', '—'))}</div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>"""


def render_linkedin_event(snapshot, brand):
    """LinkedIn template for events - structured, professional"""
    accent = ACCENTS.get(snapshot.get("sourceType"), PURPLE)

    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {{ box-sizing: border-box; }}
      html, body {{ width:1200px; height:627px; margin:0; padding:0; }}
      body {{ background:{WHITE}; font-family:'Arial', sans-serif; }}
    </style>
  </head>
  <body>
    <div style="position:relative; width:1200px; height:627px; overflow:hidden; background:{WHITE}; display:grid; grid-template-columns:1.2fr 0.8fr;">
      {accent_bar(accent, 4)}

      <div style="padding:44px 48px; display:flex; flex-direction:column; border-right:1px solid {LINE};">
        <div style="display:flex; align-items:center; gap:12px;">
          {render_logo(brand.get('logoUrl'))}
          <div style="font:600 11px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{NAVY};">St. George Capital</div>
        </div>

        <div style="margin-top:32px; flex:1; display:flex; flex-direction:column; justify-content:center;">
          <div style="font:600 11px/1.2 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{accent}; margin-bottom:12px;">
            {safe(snapshot.get('eyebrow'))}
          </div>
          <h1 style="margin:0; font:700 46px/1.05 Georgia, serif; letter-spacing:-0.01em; color:{NAVY};">
            {safe(clamp(snapshot.get('title'), 50))}
          </h1>

          <div style="margin-top:16px; font:500 16px/1.5 Arial, sans-serif; color:#334155;">
            {safe(clamp(snapshot.get('summary'), 150))}
          </div>
        </div>

        <div style="margin-top:auto;">
          <a href="#" style="padding:11px 22px; background:{accent}; color:{NAVY}; border-radius:999px; font:700 11px/1 Arial, sans-serif; letter-spacing:0.12em; text-transform:uppercase; text-decoration:none; display:inline-block;">
            {safe(snapshot.get('cta'))}
          </a>
        </div>
      </div>

      <div style="padding:40px 32px; display:flex; flex-direction:column; background:linear-gradient(135deg, {accent}11 0%, transparent 100%); justify-content:center;">
        <div style="text-align:center;">
          <div style="font:700 14px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{SLATE}; margin-bottom:16px;">Event Details</div>

          <div style="margin-bottom:20px;">
            <div style="font:600 12px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE}; margin-bottom:6px;">When</div>
            <div style="font:700 16px/1.2 Arial, sans-serif; color:{NAVY};">{safe(snapshot.get('dateLabel') or 'TBA')}</div>
          </div>

          <div style="padding:12px 0; border-top:1px solid {LINE}; border-bottom:1px solid {LINE};">
            <div style="font:600 12px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE}; margin-bottom:6px;">Location</div>
            <div style="font:700 14px/1.2 Arial, sans-serif; color:{NAVY};">Online</div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>"""


def render_linkedin_research(snapshot, brand):
    """LinkedIn template for research - data-forward"""
    accent = ACCENTS.get(snapshot.get("sourceType"), GOLD)
    fields = snapshot.get("fields", {})

    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {{ box-sizing: border-box; }}
      html, body {{ width:1200px; height:627px; margin:0; padding:0; }}
      body {{ background:{WHITE}; font-family:'Arial', sans-serif; }}
    </style>
  </head>
  <body>
    <div style="position:relative; width:1200px; height:627px; overflow:hidden; background:{WHITE}; display:grid; grid-template-columns:1.3fr 0.7fr;">
      {accent_bar(accent, 4)}

      <div style="padding:44px 48px; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; gap:12px;">
          {render_logo(brand.get('logoUrl'))}
          <div style="font:600 11px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{NAVY};">SGC Research</div>
        </div>

        <div style="margin-top:28px;">
          <div style="font:600 11px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{accent}; margin-bottom:8px;">Equity Analysis</div>
          <h1 style="margin:0; font:700 44px/1.05 Georgia, serif; letter-spacing:-0.01em; color:{NAVY};">
            {safe(fields.get('ticker', 'TBD').upper())}
          </h1>
          <div style="margin-top:6px; font:500 18px/1.3 Arial, sans-serif; color:#334155;">
            {safe(clamp(fields.get('companyName', snapshot.get('title')), 40))}
          </div>
        </div>

        <div style="margin-top:auto; font:400 15px/1.6 Arial, sans-serif; color:#334155;">
          {safe(clamp(snapshot.get('summary'), 180))}
        </div>
      </div>

      <div style="padding:32px 28px; background:linear-gradient(135deg, {accent}15 0%, transparent 100%); display:flex; flex-direction:column; justify-content:center; border-left:1px solid {LINE};">
        <div style="text-align:center;">
          <div style="margin-bottom:16px;">
            <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE}; margin-bottom:6px;">Rating</div>
            <div style="font:700 26px/1 Georgia, serif; color:{accent};">{safe(str(fields.get('recommendation', '—')).upper())}</div>
          </div>

          <div style="padding:12px 0; margin:12px 0; border-top:1px solid {LINE}; border-bottom:1px solid {LINE};">
            <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE}; margin-bottom:6px;">Target Price</div>
            <div style="font:700 20px/1 Georgia, serif; color:{NAVY};">{safe(fields.get('targetPriceFormatted', '—'))}</div>
          </div>

          <div>
            <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE}; margin-bottom:6px;">Upside</div>
            <div style="font:700 24px/1 Georgia, serif; color:{accent};">{safe(fields.get('impliedUpsideFormatted', '—'))}</div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>"""


def render_job_posting_pdf(snapshot, brand):
    """Professional job posting PDF"""
    accent = ACCENTS.get("job_posting", TEAL)
    fields = snapshot.get("fields", {})

    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {{ box-sizing: border-box; }}
      html, body {{ margin:0; padding:0; background:{WHITE}; }}
      body {{ font-family:Arial, Helvetica, sans-serif; color:{NAVY}; }}
    </style>
  </head>
  <body>
    <div style="padding:44px 52px;">
      <div style="background:{NAVY}; border-radius:20px; padding:32px 36px; color:{OFF_WHITE}; border-left:4px solid {accent}; margin-bottom:32px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:20px;">
          <div style="display:flex; align-items:center; gap:16px;">
            {render_logo(brand.get('logoUrl'))}
            <div>
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{SLATE};">St. George Capital</div>
              <div style="margin-top:6px; font:700 14px/1.2 Georgia, serif;">Student Investment Platform</div>
            </div>
          </div>
          <div style="font:700 11px/1.2 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{accent}; text-align:right;">Recruiting<br/>Opportunity</div>
        </div>

        <div style="margin-top:28px;">
          <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{accent}; margin-bottom:10px;">
            {safe(snapshot.get('eyebrow'))}
          </div>
          <h1 style="margin:0; font:700 40px/1.05 Georgia, serif; color:{WHITE};">
            {safe(snapshot.get('title'))}
          </h1>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1.4fr 0.6fr; gap:28px;">
        <div>
          <h2 style="margin:0 0 14px; font:600 13px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{NAVY};">About the Role</h2>
          <div style="font:400 14px/1.8 Arial, sans-serif; color:#334155; margin-bottom:28px;">
            {safe(clamp(fields.get('description') or snapshot.get('summary'), 500))}
          </div>

          <h2 style="margin:0 0 14px; font:600 13px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{NAVY};">How To Apply</h2>
          <div style="font:400 14px/1.8 Arial, sans-serif; color:#334155;">
            Visit sgcresearch.ca to apply. All qualified candidates are encouraged to submit their materials.
          </div>
        </div>

        <div>
          <div style="background:{LAVENDER}; border-radius:16px; padding:24px; border-left:3px solid {accent};">
            <h3 style="margin:0 0 18px; font:600 12px/1.2 Arial, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{NAVY};">Key Info</h3>

            <div style="margin-bottom:16px;">
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE}; margin-bottom:6px;">Team</div>
              <div style="font:700 16px/1.2 Georgia, serif; color:{NAVY};">{safe(fields.get('teamLabel') or 'SGC')}</div>
            </div>

            <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid rgba(26,26,62,0.1);">
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE}; margin-bottom:6px;">Deadline</div>
              <div style="font:700 16px/1.2 Georgia, serif; color:{NAVY};">{safe(snapshot.get('dateLabel') or 'Rolling')}</div>
            </div>

            <div>
              <div style="font:600 10px/1.2 Arial, sans-serif; letter-spacing:0.14em; text-transform:uppercase; color:{SLATE}; margin-bottom:8px;">Action</div>
              <div style="font:600 13px/1.5 Arial, sans-serif; color:{NAVY};">{safe(snapshot.get('cta'))}</div>
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
    source_type = snapshot.get("sourceType")

    # Choose templates based on source type
    if source_type == "job_posting":
        instagram = render_instagram_event(snapshot, brand)
        linkedin = render_linkedin_event(snapshot, brand)
        pdf = render_job_posting_pdf(snapshot, brand)
    elif source_type == "research_report":
        instagram = render_instagram_research(snapshot, brand)
        linkedin = render_linkedin_research(snapshot, brand)
        pdf = None
    else:  # article, strategy, manual
        instagram = render_instagram_article(snapshot, brand)
        linkedin = render_linkedin_event(snapshot, brand)
        pdf = None

    result = {
        "instagramHtml": instagram,
        "linkedinHtml": linkedin,
        "pdfHtml": pdf,
    }
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
