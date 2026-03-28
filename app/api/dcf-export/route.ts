import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

// ─── Colors (ARGB, no #) ──────────────────────────────────────────────────────
const NAVY      = 'FF1F3864';
const DKGREEN   = 'FF1A4731';
const DKMAROON  = 'FF7B1A2F';
const LT_NAVY   = 'FFD6DCE4';   // light navy bg for sub-headers
const LT_GREEN  = 'FFD9EAD3';   // revenue / EBITDA rows
const LT_MAROON = 'FFFCE4D6';   // adjustment rows
const BLUE_BG   = 'FFDDEEFF';   // NOPAT / FCFF / PV rows
const YELLOW    = 'FFFFF2CC';   // input cells
const WHITE     = 'FFFFFFFF';
const GRAY_HDR  = 'FFF2F2F2';   // sensitivity axis headers
const DARK_TEXT = 'FF000000';
const WHITE_TXT = 'FFFFFFFF';

type CellRef = ExcelJS.Cell;

function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function border(style: ExcelJS.BorderStyle = 'thin'): Partial<ExcelJS.Borders> {
  const s = { style } as ExcelJS.Border;
  return { top: s, bottom: s, left: s, right: s };
}
const hairBorder = border('hair');
const thinBorder = border('thin');

function applyCell(
  cell: CellRef,
  value: string | number | null,
  opts: {
    bg?: string; fg?: string; bold?: boolean; size?: number; italic?: boolean;
    hAlign?: ExcelJS.Alignment['horizontal']; vAlign?: ExcelJS.Alignment['vertical'];
    borders?: Partial<ExcelJS.Borders>; wrap?: boolean;
  } = {}
) {
  cell.value = value;
  if (opts.bg)      cell.fill   = fill(opts.bg);
  if (opts.fg || opts.bold || opts.size || opts.italic) {
    cell.font = {
      color: { argb: opts.fg ?? DARK_TEXT },
      bold:  opts.bold  ?? false,
      size:  opts.size  ?? 10,
      italic: opts.italic ?? false,
    };
  }
  cell.alignment = {
    horizontal: opts.hAlign ?? 'left',
    vertical:   opts.vAlign ?? 'middle',
    wrapText:   opts.wrap   ?? false,
  };
  if (opts.borders) cell.border = opts.borders;
}

// Helpers for formatted values
function fmtM(v: number): string {
  if (v == null || isNaN(v)) return '—';
  const abs = Math.abs(v / 1e6);
  const s = abs >= 1000 ? `${(abs / 1000).toFixed(1)}B` : `${abs.toFixed(0)}M`;
  return v < 0 ? `(${s})` : s;
}
function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
function fmtPct2(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}
function fmtPrice(v: number): string {
  return isNaN(v) || !isFinite(v) ? '—' : `$${v.toFixed(2)}`;
}

// Heat color for sensitivity: red→white→green relative to base price
function heatArgb(price: number, base: number): string {
  if (!base || isNaN(price) || !isFinite(price)) return 'FFE0E0E0';
  const pct = Math.max(-0.3, Math.min(0.3, (price - base) / base));
  const t = (pct + 0.3) / 0.6;
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const s = t / 0.5;
    r = Math.round(193 + (255 - 193) * (1 - s));
    g = Math.round(84  + (255 - 84)  * s);
    b = Math.round(84  + (255 - 84)  * s);
  } else {
    const s = (t - 0.5) / 0.5;
    r = Math.round(255 - (255 - 84)  * s);
    g = Math.round(255 - (255 - 130) * s);
    b = Math.round(255 - (255 - 53)  * s);
  }
  return 'FF' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const WACC_STEPS   = 9;   // rows:  WACC − 1% to WACC + 1% in 0.25% steps
const GROWTH_STEPS = 9;   // cols:  g − 1% to g + 1% in 0.25% steps
const MULT_STEPS   = 9;   // cols:  mult − 4 to mult + 4 in 1.0x steps

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inputs, outputs } = body as { inputs: any; outputs: any };

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SGC DCF Tool';
    wb.created = new Date();

    const fy        = inputs.forecastYears as number;
    const years     = Array.from({ length: fy }, (_, i) => i);
    const baseYear  = new Date().getFullYear();
    const today     = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // ── Derived per-year financials ────────────────────────────────────────────
    const depRateAt = (i: number) =>
      inputs.forecastMode === 'advanced' && inputs.depreciationByYear?.[i] != null
        ? inputs.depreciationByYear[i] : inputs.depreciationPercentOfRevenue;
    const capRateAt = (i: number) =>
      inputs.forecastMode === 'advanced' && inputs.capexByYear?.[i] != null
        ? inputs.capexByYear[i] : inputs.capexPercentOfRevenue;

    const dna    = years.map(i => outputs.revenues[i] * depRateAt(i));
    const capex  = years.map(i => outputs.revenues[i] * capRateAt(i));
    const nwcChg = years.map(i => outputs.nopat[i] + dna[i] - capex[i] - outputs.freeCashFlow[i]);
    const ebitda = years.map(i => outputs.ebit[i] + dna[i]);
    const taxes  = years.map(i => outputs.ebit[i] - outputs.nopat[i]);

    const disc = (i: number) => {
      const p = inputs.midYearConvention ? i + 0.5 : i + 1;
      return 1 / Math.pow(1 + outputs.wacc, p);
    };
    const pvFcfYear = years.map(i => outputs.freeCashFlow[i] * disc(i));

    const lastFCFF   = outputs.freeCashFlow[outputs.freeCashFlow.length - 1] as number;
    const lastEBITDA = ebitda[ebitda.length - 1];
    const pvFcfTotal = outputs.pvOfFcff as number;
    const wacc       = outputs.wacc as number;
    const n          = fy;

    const tvPerp = wacc > inputs.perpetualGrowth
      ? lastFCFF * (1 + inputs.perpetualGrowth) / (wacc - inputs.perpetualGrowth) : 0;
    const pvTvPerp = tvPerp / Math.pow(1 + wacc, n);
    const tvMult   = lastEBITDA * inputs.exitMultiple;
    const pvTvMult = tvMult / Math.pow(1 + wacc, n);

    function bridgeEquity(pvTV: number) {
      const ev = pvFcfTotal + pvTV;
      return ev - inputs.totalDebt + inputs.cashEquivalents
        - inputs.preferredEquity - inputs.minorityInterest + inputs.nonOperatingAssets;
    }
    const eqPerp    = bridgeEquity(pvTvPerp);
    const eqMult    = bridgeEquity(pvTvMult);
    const pricePerp = inputs.sharesDiluted > 0 ? eqPerp / inputs.sharesDiluted : 0;
    const priceMult = inputs.sharesDiluted > 0 ? eqMult / inputs.sharesDiluted : 0;
    const premPerp  = inputs.currentPrice > 0 ? pricePerp / inputs.currentPrice - 1 : 0;
    const premMult  = inputs.currentPrice > 0 ? priceMult / inputs.currentPrice - 1 : 0;

    // ── Sensitivity grids ─────────────────────────────────────────────────────
    function priceForScenario(adjWacc: number, adjTV: number): number {
      const pv = (outputs.freeCashFlow as number[]).reduce(
        (s: number, f: number, i: number) => s + f / Math.pow(1 + adjWacc, inputs.midYearConvention ? i + 0.5 : i + 1), 0
      );
      const ev = pv + adjTV / Math.pow(1 + adjWacc, fy);
      const { totalDebt: D, cashEquivalents: C, preferredEquity: P, minorityInterest: Mi, nonOperatingAssets: NO, sharesDiluted: S } = inputs;
      return S > 0 ? (ev - D + C - P - Mi + NO) / S : 0;
    }

    const waccDeltas   = Array.from({ length: WACC_STEPS },   (_, i) => (i - Math.floor(WACC_STEPS / 2))   * 0.0025);
    const growthDeltas = Array.from({ length: GROWTH_STEPS }, (_, i) => (i - Math.floor(GROWTH_STEPS / 2)) * 0.0025);
    const multDeltas   = Array.from({ length: MULT_STEPS },   (_, i) => (i - Math.floor(MULT_STEPS / 2))   * 1.0);

    const perpGrid = waccDeltas.map(wd => growthDeltas.map(gd => {
      const aw = wacc + wd, ag = inputs.perpetualGrowth + gd;
      return aw > ag ? priceForScenario(aw, lastFCFF * (1 + ag) / (aw - ag)) : NaN;
    }));
    const multGrid = waccDeltas.map(wd => multDeltas.map(md =>
      priceForScenario(wacc + wd, lastEBITDA * (inputs.exitMultiple + md))
    ));

    // ═══════════════════════════════════════════════════════════════════════════
    // SHEET 1: COVER
    // ═══════════════════════════════════════════════════════════════════════════
    const wsCover = wb.addWorksheet('Cover', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    });
    wsCover.views = [{ showGridLines: false }];

    // Column widths
    wsCover.getColumn(1).width = 10;
    wsCover.getColumn(2).width = 55;
    wsCover.getColumn(3).width = 30;
    wsCover.getColumn(4).width = 10;

    // Fill entire background navy
    for (let rr = 1; rr <= 40; rr++) {
      for (let cc = 1; cc <= 4; cc++) {
        wsCover.getCell(rr, cc).fill = fill(NAVY);
      }
      wsCover.getRow(rr).height = 18;
    }

    // ── Embed SGC logo ─────────────────────────────────────────────────────────
    const logoPath = path.join(process.cwd(), 'public', 'images', 'logo', 'sgc_logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const logoId = wb.addImage({ base64: logoBuffer.toString('base64'), extension: 'png' });
      wsCover.addImage(logoId, {
        tl: { col: 1, row: 3 },
        ext: { width: 180, height: 140 },
      });
    }

    // ── Cover text ─────────────────────────────────────────────────────────────
    wsCover.getRow(5).height = 24;
    wsCover.getRow(6).height = 36;
    wsCover.getRow(7).height = 24;
    wsCover.getRow(10).height = 20;
    wsCover.getRow(11).height = 20;
    wsCover.getRow(12).height = 20;
    wsCover.getRow(13).height = 20;
    wsCover.getRow(14).height = 20;
    wsCover.getRow(16).height = 20;
    wsCover.getRow(28).height = 20;
    wsCover.getRow(29).height = 20;

    // "St. George Capital" label
    applyCell(wsCover.getCell(5, 2), 'St. George Capital', {
      fg: 'FFAABBCC', bold: false, size: 11, italic: true, hAlign: 'left',
    });

    // Big company name
    const companyTitle = `${inputs.companyName || inputs.ticker || 'Company'} (${inputs.ticker || ''})`;
    applyCell(wsCover.getCell(6, 2), companyTitle, {
      fg: WHITE_TXT, bold: true, size: 24, hAlign: 'left',
    });

    // Subtitle
    applyCell(wsCover.getCell(7, 2), 'Discounted Cash Flow Analysis  —  ($ in Millions)', {
      fg: 'FFAABBCC', size: 11, hAlign: 'left',
    });

    // Key stats block
    const statRows: Array<[string, string]> = [
      ['Date:',              today],
      ['Ticker:',            inputs.ticker || '—'],
      ['Current Price:',     inputs.currentPrice > 0 ? fmtPrice(inputs.currentPrice) : '—'],
      ['WACC:',              fmtPct2(wacc)],
      ['Forecast Period:',   `${fy} Years`],
    ];
    statRows.forEach(([label, val], i) => {
      applyCell(wsCover.getCell(10 + i, 2), label, { fg: 'FFAABBCC', size: 10 });
      applyCell(wsCover.getCell(10 + i, 3), val,   { fg: WHITE_TXT, bold: true, size: 10, hAlign: 'left' });
    });

    // Implied price summary block
    applyCell(wsCover.getCell(16, 2), 'Implied Share Price', { fg: WHITE_TXT, bold: true, size: 11 });

    const priceRows: Array<[string, string, string]> = [
      ['Method',                  'Implied Price', 'vs. Current'],
      ['Perpetuity Growth Method', fmtPrice(pricePerp), inputs.currentPrice > 0 ? `${premPerp >= 0 ? '+' : ''}${fmtPct(premPerp)}` : '—'],
      ['Exit Multiple Method',    fmtPrice(priceMult), inputs.currentPrice > 0 ? `${premMult >= 0 ? '+' : ''}${fmtPct(premMult)}` : '—'],
    ];
    priceRows.forEach(([a, b, c], i) => {
      const rr = 17 + i;
      const isBold = i === 0;
      applyCell(wsCover.getCell(rr, 2), a, { fg: isBold ? 'FFAABBCC' : WHITE_TXT, bold: isBold, size: 10 });
      applyCell(wsCover.getCell(rr, 3), b, { fg: isBold ? 'FFAABBCC' : WHITE_TXT, bold: !isBold, size: 10, hAlign: 'left' });
      applyCell(wsCover.getCell(rr, 4), c, {
        fg: isBold ? 'FFAABBCC'
          : (i === 1 ? (premPerp >= 0 ? 'FF6FCF97' : 'FFEB5757')
                     : (premMult >= 0 ? 'FF6FCF97' : 'FFEB5757')),
        bold: !isBold, size: 10, hAlign: 'left',
      });
    });

    // Footer
    applyCell(wsCover.getCell(38, 2), 'CONFIDENTIAL — FOR INTERNAL USE ONLY', {
      fg: 'FF556677', size: 8, italic: true,
    });
    applyCell(wsCover.getCell(39, 2), 'St. George Capital  •  SGC Investment Group', {
      fg: 'FF556677', size: 8, italic: true,
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // SHEET 2: DCF  (assumptions + bridge → FCF projections → sensitivity tables)
    // Matches the Walmart DCF single-sheet layout exactly
    // ═══════════════════════════════════════════════════════════════════════════
    const totalCols = fy + 3; // col 1 = label, col 2 = units, cols 3..n+2 = years, col n+3 = spare
    const ws = wb.addWorksheet('DCF', {
      pageSetup: { paperSize: 9, fitToPage: true, fitToWidth: 1, orientation: 'landscape' },
    });
    ws.views = [{ showGridLines: false }];

    ws.getColumn(1).width = 2;   // margin
    ws.getColumn(2).width = 34;  // label
    ws.getColumn(3).width = 8;   // units
    for (let c = 4; c <= fy + 4; c++) ws.getColumn(c).width = 12;

    let r = 1;

    // Shorthand helpers scoped to ws
    const mrgH = (row: number, c1: number, c2: number, val: string, bgArgb: string, size = 11) => {
      ws.mergeCells(row, c1, row, c2);
      const cell = ws.getCell(row, c1);
      applyCell(cell, val, { bg: bgArgb, fg: WHITE_TXT, bold: true, size, hAlign: 'center', vAlign: 'middle' });
      ws.getRow(row).height = 20;
    };
    const lbl = (row: number, col: number, val: string, bg = WHITE, bold = false) => {
      applyCell(ws.getCell(row, col), val, { bg, bold, size: 10, borders: hairBorder });
    };
    const dat = (row: number, col: number, val: string | number | null, bg = WHITE, bold = false, hAlign: ExcelJS.Alignment['horizontal'] = 'right') => {
      applyCell(ws.getCell(row, col), val, { bg, bold, size: 10, hAlign, borders: hairBorder });
    };

    // ── Title row ─────────────────────────────────────────────────────────────
    ws.mergeCells(r, 1, r, totalCols);
    applyCell(ws.getCell(r, 1), `${inputs.companyName || inputs.ticker || 'Company'} — Discounted Cash Flow Analysis`, {
      bg: NAVY, fg: WHITE_TXT, bold: true, size: 13, hAlign: 'center', vAlign: 'middle',
    });
    ws.getRow(r).height = 24;
    r++;

    ws.mergeCells(r, 1, r, totalCols);
    applyCell(ws.getCell(r, 1), `($ in Millions Except Per Share Data)   |   WACC: ${fmtPct2(wacc)}   |   Prepared: ${today}`, {
      bg: NAVY, fg: 'FFAABBCC', italic: true, size: 9, hAlign: 'center',
    });
    ws.getRow(r).height = 14;
    r += 2;

    // ── Section A: DCF Assumptions & Output ───────────────────────────────────
    ws.mergeCells(r, 2, r, totalCols);
    applyCell(ws.getCell(r, 2), 'DCF Assumptions & Output:', { bold: true, size: 11 });
    ws.getRow(r).height = 16;
    r++;
    r++; // blank

    // Two-column layout: left = company info, right = TV methods (mirroring Walmart)
    // Columns: B(2)=left label, C(3)=left value, D(4)=blank, E(5)=mult label, F(6)=mult val, G(7)=blank, H(8)=perp label, I(9)=perp val
    const cLL = 2, cLV = 4;         // left label/value
    const cML = 6, cMV = 8;         // multiples method label/value (col E-F)
    const cPL = 10, cPV = 12;       // perpetuity method label/value (col H-I)

    // Row 1: Company Name | Multiples header | Perp header
    lbl(r, cLL, 'Company Name:', GRAY_HDR);
    dat(r, cLV, inputs.companyName || inputs.ticker || '—', YELLOW, false, 'left');
    lbl(r, cML, 'Terminal Value — Multiples Method:', GRAY_HDR, true);
    lbl(r, cPL, 'Terminal Value — Perpetuity Growth Method:', GRAY_HDR, true);
    r++;

    lbl(r, cLL, 'Ticker:', GRAY_HDR);
    dat(r, cLV, inputs.ticker || '—', YELLOW, false, 'left');
    r++;

    lbl(r, cLL, 'Current Share Price:', GRAY_HDR);
    dat(r, cLV, inputs.currentPrice > 0 ? `$${inputs.currentPrice.toFixed(2)}` : '—', YELLOW, false, 'right');
    lbl(r, cML, 'Baseline Terminal EBITDA Multiple:', GRAY_HDR);
    dat(r, cMV, `${inputs.exitMultiple.toFixed(1)}x`, YELLOW, false, 'center');
    lbl(r, cPL, 'Expected Long-Term Growth Rate:', GRAY_HDR);
    dat(r, cPV, fmtPct2(inputs.perpetualGrowth), YELLOW, false, 'center');
    r++;

    lbl(r, cLL, 'Discount Rate (WACC):', GRAY_HDR);
    dat(r, cLV, fmtPct2(wacc), YELLOW, false, 'right');
    lbl(r, cML, 'Terminal Value:', GRAY_HDR);
    dat(r, cMV, fmtM(tvMult), WHITE, false, 'right');
    lbl(r, cPL, 'Terminal Value:', GRAY_HDR);
    dat(r, cPV, fmtM(tvPerp), WHITE, false, 'right');
    r++;

    lbl(r, cLL, 'Effective Tax Rate:', GRAY_HDR);
    dat(r, cLV, fmtPct(inputs.taxRate), YELLOW, false, 'right');
    lbl(r, cML, 'Implied Terminal FCF Growth Rate:', GRAY_HDR);
    const impliedGrowth = tvMult > 0 ? (tvMult * wacc - lastFCFF) / (tvMult + lastFCFF) : 0;
    dat(r, cMV, fmtPct2(impliedGrowth), WHITE, false, 'right');
    lbl(r, cPL, 'Implied Terminal EBITDA Multiple:', GRAY_HDR);
    const impliedMult = lastEBITDA > 0 ? tvPerp / lastEBITDA : 0;
    dat(r, cPV, `${impliedMult.toFixed(1)}x`, WHITE, false, 'center');
    r++;

    r++; // blank

    // Bridge rows: mirroring Walmart layout (both methods side by side)
    const bridgePairs: Array<{ label: string; mult: string; perp: string; bold?: boolean; bg?: string }> = [
      { label: '(+) PV of Terminal Value:',    mult: fmtM(pvTvMult),  perp: fmtM(pvTvPerp) },
      { label: '(+) Sum of PV of Free Cash Flows:', mult: fmtM(pvFcfTotal), perp: fmtM(pvFcfTotal) },
      { label: 'Implied Enterprise Value:',    mult: fmtM(pvFcfTotal + pvTvMult), perp: fmtM(pvFcfTotal + pvTvPerp), bold: true, bg: BLUE_BG },
      { label: '' , mult: '', perp: '' },
      { label: '% of TEV from Terminal Value:', mult: fmtPct(pvTvMult / (pvFcfTotal + pvTvMult)), perp: fmtPct(pvTvPerp / (pvFcfTotal + pvTvPerp)) },
      { label: '' , mult: '', perp: '' },
      { label: '(+) Cash & Cash-Equivalents:', mult: fmtM(inputs.cashEquivalents), perp: fmtM(inputs.cashEquivalents) },
      ...(inputs.preferredEquity  ? [{ label: '(−) Preferred Stock:',    mult: `(${fmtM(inputs.preferredEquity)})`,  perp: `(${fmtM(inputs.preferredEquity)})` }] : []),
      ...(inputs.minorityInterest ? [{ label: '(−) Noncontrolling Interests:', mult: `(${fmtM(inputs.minorityInterest)})`, perp: `(${fmtM(inputs.minorityInterest)})` }] : []),
      ...(inputs.nonOperatingAssets ? [{ label: '(+) Non-Operating Assets:', mult: fmtM(inputs.nonOperatingAssets), perp: fmtM(inputs.nonOperatingAssets) }] : []),
      { label: '(−) Total Debt & Leases:',     mult: `(${fmtM(inputs.totalDebt)})`,  perp: `(${fmtM(inputs.totalDebt)})` },
      { label: 'Implied Equity Value:',        mult: fmtM(eqMult), perp: fmtM(eqPerp), bold: true, bg: BLUE_BG },
      { label: '' , mult: '', perp: '' },
      { label: 'Diluted Shares Outstanding:',  mult: (inputs.sharesDiluted / 1e6).toFixed(1) + 'M', perp: (inputs.sharesDiluted / 1e6).toFixed(1) + 'M' },
      { label: 'Implied Share Price from DCF:', mult: fmtPrice(priceMult), perp: fmtPrice(pricePerp), bold: true, bg: BLUE_BG },
      { label: 'Premium / (Discount) to Current:', mult: inputs.currentPrice > 0 ? `${premMult >= 0 ? '+' : ''}${fmtPct(premMult)}` : '—', perp: inputs.currentPrice > 0 ? `${premPerp >= 0 ? '+' : ''}${fmtPct(premPerp)}` : '—', bold: true },
    ];

    for (const row of bridgePairs) {
      const bg = row.bg ?? WHITE;
      lbl(r, cML, row.label, bg, row.bold);
      dat(r, cMV, row.mult,  bg, row.bold, 'right');
      dat(r, cPV, row.perp,  bg, row.bold, 'right');
      ws.getRow(r).height = 14;
      r++;
    }

    r += 2; // gap

    // ── Section B: FCF Projections (Walmart layout: label | units | year cols) ─
    ws.mergeCells(r, 2, r, totalCols);
    applyCell(ws.getCell(r, 2), 'Unlevered Free Cash Flow Projections:', {
      bold: true, size: 11,
    });
    ws.getRow(r).height = 16;
    r++;

    // Historical label + Projected label (row like Walmart row 37)
    ws.mergeCells(r, 4, r, 4);
    applyCell(ws.getCell(r, 4), '', { bg: GRAY_HDR });
    ws.mergeCells(r, 5, r, fy + 4);
    applyCell(ws.getCell(r, 5), 'Projected:', { bg: GRAY_HDR, bold: true, size: 9, hAlign: 'center' });
    ws.getRow(r).height = 14;
    r++;

    // Year header row
    dat(r, 2, 'Line Item', LT_NAVY, true, 'left');
    dat(r, 3, 'Units', LT_NAVY, true, 'center');
    for (let i = 0; i < fy; i++) {
      const cell = ws.getCell(r, i + 4);
      applyCell(cell, `FY${baseYear + i}E`, { bg: LT_NAVY, fg: WHITE_TXT, bold: true, size: 10, hAlign: 'center', borders: thinBorder });
    }
    ws.getRow(r).height = 16;
    r++;

    // FCF projection rows — matching Walmart section order
    const projSections: Array<{
      label: string; units: string; vals: (number | null)[];
      bg: string; bold?: boolean; fmt?: (v: number) => string; indent?: boolean;
    }> = [
      { label: 'Total Revenue:',                 units: '$ M',  vals: outputs.revenues,       bg: LT_GREEN, bold: true },
      { label: 'Revenue Growth:',                units: '%',    vals: years.map(i => i === 0 ? NaN : (outputs.revenues[i] - outputs.revenues[i-1]) / outputs.revenues[i-1]), bg: WHITE, fmt: fmtPct },
      { label: '',                               units: '',     vals: Array(fy).fill(null),   bg: WHITE },
      { label: 'EBITDA:',                        units: '$ M',  vals: ebitda,                 bg: LT_GREEN },
      { label: 'EBITDA Margin:',                 units: '%',    vals: years.map(i => outputs.revenues[i] > 0 ? ebitda[i] / outputs.revenues[i] : 0), bg: WHITE, fmt: fmtPct },
      { label: '',                               units: '',     vals: Array(fy).fill(null),   bg: WHITE },
      { label: 'Operating Income (EBIT):',       units: '$ M',  vals: outputs.ebit,           bg: LT_GREEN },
      { label: 'EBIT Margin:',                   units: '%',    vals: years.map(i => outputs.revenues[i] > 0 ? outputs.ebit[i] / outputs.revenues[i] : 0), bg: WHITE, fmt: fmtPct },
      { label: '',                               units: '',     vals: Array(fy).fill(null),   bg: WHITE },
      { label: '(−) Taxes on EBIT:',             units: '$ M',  vals: taxes.map(v => -v),     bg: LT_MAROON, indent: true },
      { label: '',                               units: '',     vals: Array(fy).fill(null),   bg: WHITE },
      { label: 'Net Operating Profit After Tax (NOPAT):', units: '$ M', vals: outputs.nopat, bg: BLUE_BG, bold: true },
      { label: '',                               units: '',     vals: Array(fy).fill(null),   bg: WHITE },
      { label: 'Adjustments for Non-Cash Charges:', units: '', vals: Array(fy).fill(null),   bg: WHITE, bold: true },
      { label: '(+) Depreciation & Amortization:', units: '$ M', vals: dna,                  bg: LT_MAROON, indent: true },
      { label: '',                               units: '',     vals: Array(fy).fill(null),   bg: WHITE },
      { label: 'Change in Working Capital:', units: '', vals: Array(fy).fill(null),           bg: WHITE, bold: true },
      { label: '(+/−) Change in Working Capital:', units: '$ M', vals: nwcChg.map(v => -v), bg: LT_MAROON, indent: true },
      { label: '',                               units: '',     vals: Array(fy).fill(null),   bg: WHITE },
      { label: '(−) Capital Expenditures:',      units: '$ M',  vals: capex.map(v => -v),    bg: LT_MAROON, indent: true },
      { label: '',                               units: '',     vals: Array(fy).fill(null),   bg: WHITE },
      { label: 'Annual Unlevered Free Cash Flow:', units: '$ M', vals: outputs.freeCashFlow,  bg: BLUE_BG, bold: true },
      { label: 'Growth Rate:',                   units: '%',    vals: years.map(i => i === 0 ? NaN : (outputs.freeCashFlow[i] - outputs.freeCashFlow[i-1]) / Math.abs(outputs.freeCashFlow[i-1])), bg: WHITE, fmt: fmtPct },
      { label: '',                               units: '',     vals: Array(fy).fill(null),   bg: WHITE },
      { label: 'Period:',                        units: '#',    vals: years.map(i => i + 1),  bg: WHITE, fmt: (v) => v.toString() },
      { label: 'PV of Unlevered FCF:',           units: '$ M',  vals: pvFcfYear,              bg: BLUE_BG, bold: true },
    ];

    for (const row of projSections) {
      const labelText = row.indent ? `    ${row.label}` : row.label;
      dat(r, 2, labelText, row.bg, row.bold ?? false, 'left');
      dat(r, 3, row.units, row.bg, false, 'center');
      for (let i = 0; i < fy; i++) {
        const v = row.vals[i];
        let display: string | number | null;
        if (v === null) {
          display = null;
        } else if (isNaN(v as number) || !isFinite(v as number)) {
          display = 'N/A';
        } else {
          display = row.fmt ? row.fmt(v as number) : fmtM(v as number);
        }
        dat(r, i + 4, display, row.bg, row.bold ?? false, 'right');
      }
      ws.getRow(r).height = 14;
      r++;
    }

    r += 2; // gap

    // ── Section C: Sensitivity Tables (same sheet, bottom — matching Walmart) ──
    ws.mergeCells(r, 2, r, 2);
    applyCell(ws.getCell(r, 2), 'Sensitivity Tables:', { bold: true, size: 11 });
    ws.getRow(r).height = 16;
    r++;
    r++;

    function writeSensTable(
      ws: ExcelJS.Worksheet,
      startRow: number,
      title: string,
      titleBg: string,
      rowLabelHdr: string,
      colLabelHdr: string,
      rowVals: number[],
      colVals: number[],
      rowFmt: (v: number) => string,
      colFmt: (v: number) => string,
      grid: number[][],
      basePrice: number,
    ): number {
      const numCols = colVals.length;
      const startCol = 2;

      // Title row
      ws.mergeCells(startRow, startCol, startRow, startCol + numCols);
      applyCell(ws.getCell(startRow, startCol), title, {
        bg: titleBg, fg: WHITE_TXT, bold: true, size: 10,
        hAlign: 'left', vAlign: 'middle', borders: thinBorder,
      });
      ws.getRow(startRow).height = 16;
      startRow++;

      // Blank label + col header label
      ws.mergeCells(startRow, startCol + 1, startRow, startCol + numCols);
      applyCell(ws.getCell(startRow, startCol + 1), colLabelHdr, {
        bg: GRAY_HDR, bold: true, size: 9, hAlign: 'center', borders: thinBorder,
      });
      ws.getRow(startRow).height = 14;
      startRow++;

      // Axis labels row: corner + col values
      applyCell(ws.getCell(startRow, startCol), `${rowLabelHdr} ↓ \\ ${colLabelHdr} →`, {
        bg: GRAY_HDR, bold: true, size: 8, hAlign: 'center', borders: thinBorder,
      });
      for (let ci = 0; ci < numCols; ci++) {
        applyCell(ws.getCell(startRow, startCol + 1 + ci), colFmt(colVals[ci]), {
          bg: GRAY_HDR, bold: true, size: 9, hAlign: 'center', borders: thinBorder,
        });
      }
      ws.getRow(startRow).height = 15;
      startRow++;

      // Data rows
      for (let ri = 0; ri < rowVals.length; ri++) {
        const isBase = ri === Math.floor(rowVals.length / 2);
        // Row label
        applyCell(ws.getCell(startRow, startCol), rowFmt(rowVals[ri]), {
          bg: isBase ? LT_NAVY : GRAY_HDR,
          bold: isBase, size: 9, hAlign: 'center',
          borders: thinBorder,
        });
        // Data cells
        for (let ci = 0; ci < grid[ri].length; ci++) {
          const v = grid[ri][ci];
          const isCenter = isBase && ci === Math.floor(grid[ri].length / 2);
          const cellArgb = isNaN(v) || !isFinite(v) ? 'FFDDDDDD' : heatArgb(v, basePrice);
          const cell = ws.getCell(startRow, startCol + 1 + ci);
          applyCell(cell, isNaN(v) || !isFinite(v) ? '—' : `$${v.toFixed(2)}`, {
            bg: cellArgb, bold: isCenter, size: 9, hAlign: 'center',
            borders: hairBorder,
          });
        }
        ws.getRow(startRow).height = 15;
        startRow++;
      }

      // Legend note
      applyCell(ws.getCell(startRow, startCol), 'Green = above current price  |  Red = below current price  |  Highlighted center cell = base case', {
        size: 8, italic: true, fg: '666666',
      });
      ws.mergeCells(startRow, startCol, startRow, startCol + numCols);
      ws.getRow(startRow).height = 13;

      return startRow + 2;
    }

    const waccVals   = waccDeltas.map(d => wacc + d);
    const growthVals = growthDeltas.map(d => inputs.perpetualGrowth + d);
    const multVals   = multDeltas.map(d => inputs.exitMultiple + d);

    // Table 1: WACC vs. Perpetuity Growth Rate
    ws.mergeCells(r, 2, r, 2 + GROWTH_STEPS);
    applyCell(ws.getCell(r, 2), `Sensitivity — Terminal FCF Growth Rate vs. Discount Rate and Implied Share Price from DCF Analysis:`, {
      size: 10, bold: false, italic: false,
    });
    ws.getRow(r).height = 14;
    r++;

    r = writeSensTable(
      ws, r,
      'IMPLIED SHARE PRICE — Perpetuity Growth Method  (WACC × Terminal FCF Growth Rate)',
      DKGREEN,
      'WACC', 'Terminal FCF Growth Rate',
      waccVals, growthVals,
      fmtPct2, fmtPct2,
      perpGrid, inputs.currentPrice,
    );

    // Table 2: WACC vs. Exit Multiple (matches Walmart row 120+)
    ws.mergeCells(r, 2, r, 2 + MULT_STEPS);
    applyCell(ws.getCell(r, 2), `Sensitivity — Terminal EBITDA Multiple vs. Discount Rate and Implied Share Price from DCF Analysis:`, {
      size: 10, bold: false, italic: false,
    });
    ws.getRow(r).height = 14;
    r++;

    r = writeSensTable(
      ws, r,
      'IMPLIED SHARE PRICE — Exit Multiple Method  (WACC × Terminal EBITDA Multiple)',
      DKMAROON,
      'WACC', 'Terminal EBITDA Multiple',
      waccVals, multVals,
      fmtPct2, (v) => `${v.toFixed(1)}x`,
      multGrid, inputs.currentPrice,
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // SHEET 3: WACC (mirrors Walmart "WACC" tab)
    // ═══════════════════════════════════════════════════════════════════════════
    const wsWacc = wb.addWorksheet('WACC');
    wsWacc.views = [{ showGridLines: false }];
    wsWacc.getColumn(1).width = 2;
    wsWacc.getColumn(2).width = 32;
    wsWacc.getColumn(3).width = 16;
    wsWacc.getColumn(4).width = 16;

    let rw = 1;

    wsWacc.mergeCells(rw, 2, rw, 4);
    applyCell(wsWacc.getCell(rw, 2), `WACC Analysis — ${inputs.companyName || inputs.ticker || 'Company'}`, {
      bg: NAVY, fg: WHITE_TXT, bold: true, size: 13, hAlign: 'center',
    });
    wsWacc.getRow(rw).height = 22;
    rw += 2;

    wsWacc.mergeCells(rw, 2, rw, 4);
    applyCell(wsWacc.getCell(rw, 2), 'Discount Rate Calculations — Assumptions:', { bold: true, size: 11 });
    rw++;

    const waccRows: Array<[string, string, boolean]> = [
      ['Risk-Free Rate:',            fmtPct2(inputs.riskFreeRate),                          true],
      ['Equity Risk Premium:',       fmtPct2(inputs.equityRiskPremium),                     true],
      ['Beta:',                      (inputs.beta ?? 1).toFixed(2),                          true],
      ['Cost of Equity:',            fmtPct2(inputs.costOfEquity ?? (inputs.riskFreeRate + (inputs.beta ?? 1) * inputs.equityRiskPremium)), false],
      ['', '', false],
      ['Pre-Tax Cost of Debt:',      fmtPct2(inputs.costOfDebt),                             true],
      ['Tax Rate:',                  fmtPct2(inputs.taxRate),                                false],
      ['After-Tax Cost of Debt:',    fmtPct2(inputs.costOfDebt * (1 - inputs.taxRate)),      false],
      ['', '', false],
      ['Equity Weight:',             fmtPct2(1 - (inputs.debtRatio ?? 0)),                   true],
      ['Debt Weight:',               fmtPct2(inputs.debtRatio ?? 0),                         true],
      ['', '', false],
      ['WACC:',                      fmtPct2(wacc),                                          false],
    ];

    for (const [label, val, isInput] of waccRows) {
      if (!label) { rw++; continue; }
      applyCell(wsWacc.getCell(rw, 2), label, { bg: GRAY_HDR, size: 10, borders: hairBorder });
      applyCell(wsWacc.getCell(rw, 3), val, {
        bg: isInput ? YELLOW : BLUE_BG, bold: !isInput, size: 10, hAlign: 'center', borders: hairBorder,
      });
      wsWacc.getRow(rw).height = 15;
      rw++;
    }

    // ── Stream response ────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const ticker = (inputs.ticker as string) || 'DCF';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${ticker}_DCF_${dateStr}.xlsx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('dcf-export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
