#!/usr/bin/env python3

import json
import sys
from html import escape


NAVY = "#030116"
NAVY_2 = "#0b1f3a"
SLATE = "#8fa1c2"
OFF_WHITE = "#f8fbff"
LINE = "rgba(143, 161, 194, 0.24)"


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


def background_media(image_url, overlay=0.26):
    if not image_url:
        return ""
    return f"""
    <div style="position:absolute; inset:0; background-image:url('{safe(image_url)}'); background-size:cover; background-position:center;"></div>
    <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(3,1,22,{overlay + 0.12}) 0%, rgba(3,1,22,0.72) 48%, rgba(3,1,22,0.96) 100%);"></div>
    """


def stat_cell(label, value):
    return f"""
    <div style="padding:14px 16px; border:1px solid {LINE}; border-radius:18px; background:rgba(255,255,255,0.04);">
      <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{SLATE};">{safe(label)}</div>
      <div style="margin-top:8px; font:700 25px/1.05 Georgia, 'Times New Roman', serif; color:{OFF_WHITE};">{safe(value or '—')}</div>
    </div>
    """


def research_metrics(fields):
    return [
        ("Rating", str(fields.get("recommendation", "—")).upper()),
        ("Target Price", fields.get("targetPriceFormatted") or "—"),
        ("Current Price", fields.get("currentPriceFormatted") or "—"),
        ("Upside", fields.get("impliedUpsideFormatted") or "—"),
    ]


def instagram_detail(snapshot):
    fields = snapshot.get("fields", {})
    source_type = snapshot.get("sourceType")

    if source_type == "research_report":
      metrics = "".join(stat_cell(label, value) for label, value in research_metrics(fields))
      return f'<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">{metrics}</div>'

    if source_type == "job_posting":
      return f"""
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        {stat_cell('Team', fields.get('teamLabel') or 'SGC')}
        {stat_cell('Deadline', snapshot.get('dateLabel') or 'Rolling')}
      </div>
      """

    if source_type == "strategy_document":
      return f"""
      <div style="padding:16px 18px; border:1px solid {LINE}; border-radius:18px; background:rgba(255,255,255,0.04);">
        <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{SLATE};">Coverage</div>
        <div style="margin-top:10px; font:700 22px/1.15 Georgia, 'Times New Roman', serif; color:{OFF_WHITE};">{safe(fields.get('documentTypeLabel') or 'Research Memo')}</div>
      </div>
      """

    return f"""
    <div style="padding:16px 18px; border:1px solid {LINE}; border-radius:18px; background:rgba(255,255,255,0.04);">
      <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{SLATE};">SGC Brief</div>
      <div style="margin-top:10px; font:700 20px/1.2 Georgia, 'Times New Roman', serif; color:{OFF_WHITE};">{safe(snapshot.get('subtitle') or snapshot.get('summary') or 'Institutional update')}</div>
    </div>
    """


def linkedin_detail(snapshot):
    fields = snapshot.get("fields", {})
    source_type = snapshot.get("sourceType")

    if source_type == "research_report":
      rows = "".join(
          f"""
          <div style="display:flex; justify-content:space-between; gap:14px; padding:12px 0; border-top:1px solid {LINE};">
            <span style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:{SLATE};">{safe(label)}</span>
            <span style="font:700 17px/1.15 Georgia, 'Times New Roman', serif; color:{OFF_WHITE}; text-align:right;">{safe(value or '—')}</span>
          </div>
          """
          for label, value in research_metrics(fields)
      )
      return f"""
      <div style="padding:22px 24px; border-radius:24px; border:1px solid {LINE}; background:rgba(255,255,255,0.04);">
        <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{SLATE};">Rating Snapshot</div>
        {rows}
      </div>
      """

    if source_type == "job_posting":
      description = safe(clamp(fields.get("description"), 300))
      return f"""
      <div style="padding:22px 24px; border-radius:24px; border:1px solid {LINE}; background:rgba(255,255,255,0.04);">
        <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{SLATE};">Role Snapshot</div>
        <div style="margin-top:14px; font:700 18px/1.2 Georgia, 'Times New Roman', serif; color:{OFF_WHITE};">{safe(fields.get('teamLabel') or 'SGC')}</div>
        <div style="margin-top:8px; font:400 14px/1.65 Arial, Helvetica, sans-serif; color:{OFF_WHITE};">{description}</div>
      </div>
      """

    return f"""
    <div style="padding:22px 24px; border-radius:24px; border:1px solid {LINE}; background:rgba(255,255,255,0.04);">
      <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{SLATE};">SGC Release</div>
      <div style="margin-top:14px; font:400 14px/1.65 Arial, Helvetica, sans-serif; color:{OFF_WHITE};">{safe(clamp(snapshot.get('summary'), 320))}</div>
    </div>
    """


def render_instagram(snapshot, brand):
    image_url = snapshot.get("imageUrl")
    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {{ box-sizing: border-box; }}
      html, body {{ width:1080px; height:1350px; margin:0; padding:0; }}
      body {{ background:{NAVY}; font-family:Arial, Helvetica, sans-serif; color:{OFF_WHITE}; }}
    </style>
  </head>
  <body>
    <div style="position:relative; width:1080px; height:1350px; overflow:hidden; background:{NAVY};">
      {background_media(image_url)}
      <div style="position:absolute; inset:0; background:
        radial-gradient(circle at top right, rgba(17,56,108,0.34) 0%, rgba(3,1,22,0) 42%),
        linear-gradient(180deg, rgba(3,1,22,0.12) 0%, rgba(3,1,22,0.84) 38%, rgba(3,1,22,0.98) 100%);
      "></div>
      <div style="position:relative; z-index:1; height:100%; padding:54px 64px 58px; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:24px;">
          <div style="display:flex; align-items:center; gap:18px;">
            {render_logo(brand.get('logoUrl'))}
            <div style="font:600 13px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{OFF_WHITE};">St. George Capital</div>
          </div>
          <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{SLATE};">Instagram Feed</div>
        </div>
        <div style="margin-top:48px; font:600 13px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.28em; text-transform:uppercase; color:{SLATE};">{safe(snapshot.get('eyebrow'))}</div>
        <h1 style="margin:22px 0 0; max-width:870px; font:700 78px/0.96 Georgia, 'Times New Roman', serif; letter-spacing:-0.03em;">{safe(snapshot.get('title'))}</h1>
        <div style="margin-top:24px; max-width:820px; font:500 28px/1.35 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.82);">{safe(clamp(snapshot.get('subtitle') or snapshot.get('summary'), 180))}</div>

        <div style="margin-top:auto;">
          {instagram_detail(snapshot)}
          <div style="margin-top:18px; padding:18px 22px; border:1px solid {LINE}; border-radius:18px; background:rgba(255,255,255,0.04);">
            <div style="font:400 18px/1.55 Arial, Helvetica, sans-serif; color:{OFF_WHITE};">{safe(clamp(snapshot.get('summary'), 240))}</div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:18px; margin-top:18px;">
              <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{SLATE};">{safe(snapshot.get('dateLabel') or 'St. George Capital')}</div>
              <div style="padding:10px 16px; border-radius:999px; background:{OFF_WHITE}; color:{NAVY}; font:700 12px/1 Arial, Helvetica, sans-serif; letter-spacing:0.14em; text-transform:uppercase;">{safe(snapshot.get('cta'))}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>"""


def render_linkedin(snapshot, brand):
    image_url = snapshot.get("imageUrl")
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
      {background_media(image_url, 0.18)}
      <div style="position:absolute; inset:0; background:
        linear-gradient(90deg, rgba(3,1,22,0.98) 0%, rgba(3,1,22,0.92) 58%, rgba(3,1,22,0.58) 100%),
        radial-gradient(circle at top right, rgba(19,62,120,0.26) 0%, rgba(3,1,22,0) 44%);
      "></div>
      <div style="position:relative; z-index:1; height:100%; padding:44px 48px; display:grid; grid-template-columns: 1.4fr 0.82fr; gap:30px;">
        <div style="display:flex; flex-direction:column;">
          <div style="display:flex; align-items:center; gap:18px;">
            {render_logo(brand.get('logoUrl'))}
            <div style="font:600 12px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{OFF_WHITE};">St. George Capital</div>
          </div>
          <div style="margin-top:34px; font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.28em; text-transform:uppercase; color:{SLATE};">{safe(snapshot.get('eyebrow'))}</div>
          <h1 style="margin:18px 0 0; max-width:650px; font:700 58px/0.94 Georgia, 'Times New Roman', serif; letter-spacing:-0.03em;">{safe(snapshot.get('title'))}</h1>
          <div style="margin-top:18px; max-width:640px; font:500 22px/1.35 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.84);">{safe(clamp(snapshot.get('subtitle') or snapshot.get('summary'), 150))}</div>
          <div style="margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:20px;">
            <div style="max-width:620px; font:400 16px/1.6 Arial, Helvetica, sans-serif; color:{OFF_WHITE};">{safe(clamp(snapshot.get('summary'), 250))}</div>
            <div style="padding:11px 16px; border-radius:999px; border:1px solid {LINE}; background:rgba(255,255,255,0.06); font:700 11px/1 Arial, Helvetica, sans-serif; letter-spacing:0.16em; text-transform:uppercase;">{safe(snapshot.get('cta'))}</div>
          </div>
        </div>
        <div style="display:flex; align-items:stretch;">
          {linkedin_detail(snapshot)}
        </div>
      </div>
    </div>
  </body>
</html>"""


def render_job_posting_pdf(snapshot, brand):
    fields = snapshot.get("fields", {})
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
    <div style="padding:36px 44px 40px;">
      <div style="background:{NAVY}; border-radius:24px; padding:24px 26px; color:{OFF_WHITE};">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:18px;">
          <div style="display:flex; align-items:center; gap:16px;">
            {render_logo(brand.get('logoUrl'))}
            <div>
              <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.2em; text-transform:uppercase; color:{SLATE};">St. George Capital</div>
              <div style="margin-top:6px; font:700 15px/1.2 Georgia, 'Times New Roman', serif;">Canada’s Premier Investment Research Student Group</div>
            </div>
          </div>
          <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.2em; text-transform:uppercase; color:{SLATE};">Recruiting Flyer</div>
        </div>
        <div style="margin-top:34px; font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.24em; text-transform:uppercase; color:{SLATE};">{safe(snapshot.get('eyebrow'))}</div>
        <h1 style="margin:14px 0 0; font:700 34px/1.02 Georgia, 'Times New Roman', serif;">{safe(snapshot.get('title'))}</h1>
        <div style="margin-top:12px; font:500 17px/1.45 Arial, Helvetica, sans-serif; color:rgba(248,251,255,0.82);">{safe(snapshot.get('subtitle') or '')}</div>
      </div>

      <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:28px; margin-top:28px;">
        <div>
          <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{NAVY_2};">Role Overview</div>
          <div style="margin-top:14px; font:400 14px/1.72 Arial, Helvetica, sans-serif; color:#1e293b;">{safe(collapse(fields.get('description') or snapshot.get('summary')))}</div>

          <div style="margin-top:26px; font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:{NAVY_2};">How To Apply</div>
          <div style="margin-top:14px; font:400 14px/1.72 Arial, Helvetica, sans-serif; color:#1e293b;">Submit your application materials through the SGC dashboard. Selected candidates will be contacted directly for follow-up.</div>
        </div>
        <div>
          <div style="border:1px solid #d8e0ee; border-radius:20px; padding:20px 22px; background:#f8fbff;">
            <div style="font:600 11px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:#64748b;">Snapshot</div>
            <div style="margin-top:16px; display:grid; gap:16px;">
              <div>
                <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:#64748b;">Team</div>
                <div style="margin-top:6px; font:700 20px/1.15 Georgia, 'Times New Roman', serif; color:{NAVY_2};">{safe(fields.get('teamLabel') or 'SGC')}</div>
              </div>
              <div>
                <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:#64748b;">Deadline</div>
                <div style="margin-top:6px; font:700 20px/1.15 Georgia, 'Times New Roman', serif; color:{NAVY_2};">{safe(snapshot.get('dateLabel') or 'Rolling')}</div>
              </div>
              <div>
                <div style="font:600 10px/1.2 Arial, Helvetica, sans-serif; letter-spacing:0.18em; text-transform:uppercase; color:#64748b;">Call To Action</div>
                <div style="margin-top:6px; font:600 13px/1.55 Arial, Helvetica, sans-serif; color:#1e293b;">{safe(snapshot.get('cta'))}</div>
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
