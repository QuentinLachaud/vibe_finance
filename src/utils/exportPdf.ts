import jsPDF from 'jspdf';

interface TaxBreakdownForPdf {
  grossAnnual: number;
  pensionSacrifice: number;
  taxableIncome: number;
  personalAllowance: number;
  incomeTax: number;
  nationalInsurance: number;
  totalDeductions: number;
  netAnnual: number;
  netMonthly: number;
  netWeekly: number;
  effectiveRate: number;
  taxBands: { name: string; rate: string; amount: number }[];
  niBands: { name: string; rate: string; amount: number }[];
}

// ── Shared palette (soft, clean, paper-white) ──
const C = {
  // Backgrounds
  headerBg:    [30, 41, 59]   as const, // slate-800
  cardBg:      [248, 250, 252] as const, // slate-50
  tableBg:     [241, 245, 249] as const, // slate-100
  altRowBg:    [248, 250, 252] as const, // slate-50
  // Text
  title:       [15, 23, 42]   as const, // slate-900
  body:        [51, 65, 85]   as const, // slate-700
  muted:       [100, 116, 139] as const, // slate-500
  headerText:  [248, 250, 252] as const, // slate-50
  headerSub:   [148, 163, 184] as const, // slate-400
  // Accents
  cyan:        [8, 145, 178]  as const, // cyan-600
  red:         [220, 38, 38]  as const, // red-600
  green:       [5, 150, 105]  as const, // emerald-600
  amber:       [217, 119, 6]  as const, // amber-600
  purple:      [124, 58, 237] as const, // violet-600
  blue:        [37, 99, 235]  as const, // blue-600
  gold:        [180, 140, 50] as const, // brand gold
  // Borders
  border:      [226, 232, 240] as const, // slate-200
};

function fmt(n: number, symbol: string): string {
  return `${symbol}${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Shared brand header bar across all PDFs */
function drawBrandHeader(doc: jsPDF, pw: number, margin: number, subtitle: string, extra?: string): void {
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, pw, extra ? 38 : 34, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...C.headerText);
  doc.text('Vibe Finance', margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...C.headerSub);
  doc.text(subtitle, margin, 24);

  if (extra) {
    doc.text(extra, margin, 31);
  }
}

/** Shared footer across all PDFs */
function drawFooter(doc: jsPDF, pw: number, text: string): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(text, pw / 2, 287, { align: 'center' });
}

export function exportTakeHomePdf(
  result: TaxBreakdownForPdf,
  region: string,
  currencySymbol: string,
  skipDownload = false,
): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pw - margin * 2;
  let y = 20;

  // ── Brand header ──
  drawBrandHeader(
    doc, pw, margin,
    'Gross-to-Net Pay Report  |  UK Tax Year 2025-26',
    `Region: ${region === 'scotland' ? 'Scotland' : 'England / Wales / NI'}`,
  );

  y = 46;

  // ── Hero Section ──
  doc.setFillColor(...C.cardBg);
  doc.roundedRect(margin, y, contentW, 26, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.roundedRect(margin, y, contentW, 26, 3, 3, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text('YOUR MONTHLY TAKE HOME PAY', margin + 8, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...C.cyan);
  doc.text(fmt(result.netMonthly, currencySymbol), margin + 8, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(
    `${fmt(result.netAnnual, currencySymbol)}/year  ·  ${fmt(result.netWeekly, currencySymbol)}/week`,
    pw - margin - 8,
    y + 20,
    { align: 'right' },
  );

  y += 34;

  // ── KPI Row ──
  const kpis: { label: string; value: string; color: readonly [number, number, number] }[] = [
    { label: 'Income Tax', value: fmt(result.incomeTax, currencySymbol), color: C.amber },
    { label: 'National Insurance', value: fmt(result.nationalInsurance, currencySymbol), color: C.purple },
    { label: 'Effective Rate', value: `${result.effectiveRate}%`, color: C.body },
  ];
  if (result.pensionSacrifice > 0) {
    kpis.push({ label: 'Salary Sacrifice', value: fmt(result.pensionSacrifice, currencySymbol), color: C.blue });
  }

  const kpiW = (contentW - (kpis.length - 1) * 5) / kpis.length;
  kpis.forEach((kpi, i) => {
    const kx = margin + i * (kpiW + 5);
    doc.setFillColor(...C.cardBg);
    doc.roundedRect(kx, y, kpiW, 20, 2, 2, 'F');
    doc.setDrawColor(...C.border);
    doc.roundedRect(kx, y, kpiW, 20, 2, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(kpi.label, kx + kpiW / 2, y + 7, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, kx + kpiW / 2, y + 16, { align: 'center' });
  });

  y += 28;

  // ── Helper: draw a table section ──
  function drawSection(
    title: string,
    headers: string[],
    rows: [string, string, string][],
    totalLabel: string,
    totalValue: string,
  ) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.title);
    doc.text(title, margin, y);
    y += 5;

    // Header row
    doc.setFillColor(...C.tableBg);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(headers[0], margin + 4, y + 5);
    doc.text(headers[1], margin + contentW * 0.55, y + 5);
    doc.text(headers[2], pw - margin - 4, y + 5, { align: 'right' });
    y += 7;

    // Data rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    rows.forEach((row, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(...C.altRowBg);
        doc.rect(margin, y, contentW, 7, 'F');
      }
      doc.setTextColor(...C.body);
      doc.text(row[0], margin + 4, y + 5);
      doc.text(row[1], margin + contentW * 0.55, y + 5);
      doc.text(row[2], pw - margin - 4, y + 5, { align: 'right' });
      y += 7;
    });

    // Total
    doc.setDrawColor(...C.border);
    doc.line(margin, y, pw - margin, y);
    y += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.title);
    doc.text(totalLabel, margin + 4, y + 5);
    doc.text(totalValue, pw - margin - 4, y + 5, { align: 'right' });
    y += 10;
  }

  // ── Income Tax Breakdown ──
  drawSection(
    `Income Tax (${region === 'scotland' ? 'Scotland' : 'England'})`,
    ['Band', 'Rate', 'Tax'],
    result.taxBands.map((b) => [b.name, b.rate, fmt(b.amount, currencySymbol)]),
    'Total Income Tax',
    fmt(result.incomeTax, currencySymbol),
  );

  // ── National Insurance Breakdown ──
  drawSection(
    'National Insurance (Class 1)',
    ['Earnings Band', 'Rate', 'NI'],
    result.niBands.map((b) => [b.name, b.rate, fmt(b.amount, currencySymbol)]),
    'Total NI',
    fmt(result.nationalInsurance, currencySymbol),
  );

  // ── Summary ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.title);
  doc.text('Summary', margin, y);
  y += 6;

  const summaryRows: [string, string, readonly [number, number, number]][] = [
    ['Gross Salary', fmt(result.grossAnnual, currencySymbol), C.body],
  ];
  if (result.pensionSacrifice > 0) {
    summaryRows.push([
      'Salary Sacrifice',
      `-${fmt(result.pensionSacrifice, currencySymbol)}`,
      C.blue,
    ]);
  }
  summaryRows.push(
    ['Personal Allowance', fmt(result.personalAllowance, currencySymbol), C.body],
    ['Income Tax', `-${fmt(result.incomeTax, currencySymbol)}`, C.amber],
    ['National Insurance', `-${fmt(result.nationalInsurance, currencySymbol)}`, C.purple],
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  summaryRows.forEach(([label, value, color]) => {
    doc.setTextColor(...C.muted);
    doc.text(label, margin + 4, y + 5);
    doc.setTextColor(...color);
    doc.text(value, pw - margin - 4, y + 5, { align: 'right' });
    y += 8;
  });

  // Net annual total
  doc.setDrawColor(...C.border);
  doc.line(margin, y, pw - margin, y);
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.cyan);
  doc.text('Net Annual Pay', margin + 4, y + 6);
  doc.text(fmt(result.netAnnual, currencySymbol), pw - margin - 4, y + 6, { align: 'right' });

  // ── Footer ──
  drawFooter(doc, pw, 'Generated by Vibe Finance  ·  Estimates based on UK HMRC 2025-26 rates  ·  Not financial advice');

  if (!skipDownload) doc.save('take-home-pay-report.pdf');
  return doc.output('datauristring');
}

// ══════════════════════════════════════════════
//  Household Take Home Pay PDF (side-by-side)
// ══════════════════════════════════════════════

export function exportHouseholdTakeHomePdf(
  partner1: TaxBreakdownForPdf,
  partner2: TaxBreakdownForPdf,
  name1: string,
  name2: string,
  region1: string,
  region2: string,
  currencySymbol: string,
  skipDownload = false,
): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pw - margin * 2;
  const colW = (contentW - 8) / 2;
  let y = 20;

  const r1Label = region1 === 'scotland' ? 'Scotland' : 'England / Wales / NI';
  const r2Label = region2 === 'scotland' ? 'Scotland' : 'England / Wales / NI';

  // ── Brand header ──
  drawBrandHeader(
    doc, pw, margin,
    'Household Gross-to-Net Pay Report  |  UK Tax Year 2025-26',
    `${name1}: ${r1Label}  ·  ${name2}: ${r2Label}`,
  );

  y = 46;

  // ── Hero: Combined Household ──
  doc.setFillColor(...C.cardBg);
  doc.roundedRect(margin, y, contentW, 26, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.roundedRect(margin, y, contentW, 26, 3, 3, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text('HOUSEHOLD MONTHLY TAKE HOME PAY', margin + 8, y + 8);

  const combinedMonthly = partner1.netMonthly + partner2.netMonthly;
  const combinedAnnual = partner1.netAnnual + partner2.netAnnual;
  const combinedWeekly = partner1.netWeekly + partner2.netWeekly;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...C.cyan);
  doc.text(fmt(combinedMonthly, currencySymbol), margin + 8, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(
    `${fmt(combinedAnnual, currencySymbol)}/year  ·  ${fmt(combinedWeekly, currencySymbol)}/week`,
    pw - margin - 8,
    y + 20,
    { align: 'right' },
  );

  y += 34;

  // ── Side-by-side partner columns ──
  const leftX = margin;
  const rightX = margin + colW + 8;
  const colH = 86;

  doc.setFillColor(...C.cardBg);
  doc.roundedRect(leftX, y - 4, colW, colH, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.roundedRect(leftX, y - 4, colW, colH, 3, 3, 'S');
  doc.setFillColor(...C.cardBg);
  doc.roundedRect(rightX, y - 4, colW, colH, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.roundedRect(rightX, y - 4, colW, colH, 3, 3, 'S');

  function drawPartnerColumn(partner: TaxBreakdownForPdf, name: string, x: number, w: number) {
    let cy = y;

    // Name header
    doc.setFillColor(...C.tableBg);
    doc.roundedRect(x + 2, cy - 2, w - 4, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.cyan);
    doc.text(name, x + w / 2, cy + 5, { align: 'center' });
    cy += 14;

    // Monthly take home
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text('MONTHLY TAKE HOME', x + 6, cy);
    cy += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...C.title);
    doc.text(fmt(partner.netMonthly, currencySymbol), x + 6, cy + 2);
    cy += 10;

    // Key figures
    const rows: [string, string, readonly [number, number, number]][] = [
      ['Gross Salary', fmt(partner.grossAnnual, currencySymbol), C.body],
    ];
    if (partner.pensionSacrifice > 0) {
      rows.push(['Salary Sacrifice', `-${fmt(partner.pensionSacrifice, currencySymbol)}`, C.blue]);
    }
    rows.push(
      ['Personal Allowance', fmt(partner.personalAllowance, currencySymbol), C.body],
      ['Income Tax', `-${fmt(partner.incomeTax, currencySymbol)}`, C.amber],
      ['National Insurance', `-${fmt(partner.nationalInsurance, currencySymbol)}`, C.purple],
      ['Effective Rate', `${partner.effectiveRate}%`, C.title],
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    rows.forEach(([label, value, color]) => {
      doc.setTextColor(...C.muted);
      doc.text(label, x + 6, cy + 4);
      doc.setTextColor(...color);
      doc.text(value, x + w - 6, cy + 4, { align: 'right' });
      cy += 7;
    });

    // Net Annual
    doc.setDrawColor(...C.border);
    doc.line(x + 4, cy, x + w - 4, cy);
    cy += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.cyan);
    doc.text('Net Annual', x + 6, cy + 4);
    doc.text(fmt(partner.netAnnual, currencySymbol), x + w - 6, cy + 4, { align: 'right' });
  }

  drawPartnerColumn(partner1, name1, leftX, colW);
  drawPartnerColumn(partner2, name2, rightX, colW);

  y += colH + 6;

  // ── Combined KPIs ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.title);
  doc.text('Household Combined', margin, y);
  y += 6;

  const combinedTax = partner1.incomeTax + partner2.incomeTax;
  const combinedNI = partner1.nationalInsurance + partner2.nationalInsurance;
  const totalGross = partner1.grossAnnual + partner2.grossAnnual;
  const avgRate = totalGross > 0 ? Math.round(((combinedTax + combinedNI) / totalGross) * 1000) / 10 : 0;

  const kpis: { label: string; value: string; color: readonly [number, number, number] }[] = [
    { label: 'Combined Tax', value: fmt(combinedTax, currencySymbol), color: C.amber },
    { label: 'Combined NI', value: fmt(combinedNI, currencySymbol), color: C.purple },
    { label: 'Avg Eff. Rate', value: `${avgRate}%`, color: C.body },
    { label: 'Net Annual', value: fmt(combinedAnnual, currencySymbol), color: C.cyan },
  ];

  const kpiW = (contentW - 18) / 4;
  kpis.forEach((kpi, i) => {
    const kx = margin + i * (kpiW + 6);
    doc.setFillColor(...C.cardBg);
    doc.roundedRect(kx, y, kpiW, 20, 2, 2, 'F');
    doc.setDrawColor(...C.border);
    doc.roundedRect(kx, y, kpiW, 20, 2, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text(kpi.label, kx + kpiW / 2, y + 7, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, kx + kpiW / 2, y + 16, { align: 'center' });
  });

  y += 28;

  // ── Tax breakdown tables (side-by-side) ──
  function drawTaxTable(partner: TaxBreakdownForPdf, name: string, region: string, x: number, w: number, startY: number): number {
    let ty = startY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.title);
    doc.text(`${name} — Income Tax (${region === 'scotland' ? 'Scotland' : 'England'})`, x, ty);
    ty += 5;

    doc.setFillColor(...C.tableBg);
    doc.rect(x, ty, w, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...C.muted);
    doc.text('Band', x + 2, ty + 4);
    doc.text('Rate', x + w * 0.6, ty + 4);
    doc.text('Tax', x + w - 2, ty + 4, { align: 'right' });
    ty += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    partner.taxBands.forEach((b, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(...C.altRowBg);
        doc.rect(x, ty, w, 6, 'F');
      }
      doc.setTextColor(...C.body);
      doc.text(b.name, x + 2, ty + 4);
      doc.text(b.rate, x + w * 0.6, ty + 4);
      doc.text(fmt(b.amount, currencySymbol), x + w - 2, ty + 4, { align: 'right' });
      ty += 6;
    });

    doc.setDrawColor(...C.border);
    doc.line(x, ty, x + w, ty);
    ty += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.title);
    doc.text('Total', x + 2, ty + 4);
    doc.text(fmt(partner.incomeTax, currencySymbol), x + w - 2, ty + 4, { align: 'right' });
    ty += 8;

    return ty;
  }

  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  const ty1 = drawTaxTable(partner1, name1, region1, leftX, colW, y);
  const ty2 = drawTaxTable(partner2, name2, region2, rightX, colW, y);
  y = Math.max(ty1, ty2) + 4;

  // ── NI breakdown tables (side-by-side) ──
  function drawNITable(partner: TaxBreakdownForPdf, name: string, x: number, w: number, startY: number): number {
    let ty = startY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.title);
    doc.text(`${name} — National Insurance`, x, ty);
    ty += 5;

    doc.setFillColor(...C.tableBg);
    doc.rect(x, ty, w, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...C.muted);
    doc.text('Band', x + 2, ty + 4);
    doc.text('Rate', x + w * 0.6, ty + 4);
    doc.text('NI', x + w - 2, ty + 4, { align: 'right' });
    ty += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    partner.niBands.forEach((b, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(...C.altRowBg);
        doc.rect(x, ty, w, 6, 'F');
      }
      doc.setTextColor(...C.body);
      doc.text(b.name, x + 2, ty + 4);
      doc.text(b.rate, x + w * 0.6, ty + 4);
      doc.text(fmt(b.amount, currencySymbol), x + w - 2, ty + 4, { align: 'right' });
      ty += 6;
    });

    doc.setDrawColor(...C.border);
    doc.line(x, ty, x + w, ty);
    ty += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.title);
    doc.text('Total', x + 2, ty + 4);
    doc.text(fmt(partner.nationalInsurance, currencySymbol), x + w - 2, ty + 4, { align: 'right' });
    ty += 8;

    return ty;
  }

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  const ny1 = drawNITable(partner1, name1, leftX, colW, y);
  const ny2 = drawNITable(partner2, name2, rightX, colW, y);
  y = Math.max(ny1, ny2);

  // ── Footer ──
  drawFooter(doc, pw, 'Generated by Vibe Finance  ·  Estimates based on UK HMRC 2025-26 rates  ·  Not financial advice');

  if (!skipDownload) doc.save('household-take-home-pay-report.pdf');
  return doc.output('datauristring');
}

// ══════════════════════════════════════════════
//  Savings Calculator PDF
// ══════════════════════════════════════════════

interface SavingsCalcForPdf {
  name: string;
  income: number;
  incomeFrequency: string;
  monthlyIncome: number;
  expenses: { name: string; amount: number; icon?: string }[];
  totalExpenses: number;
  monthlySavings: number;
  annualSavings: number;
  savingsRate: number;
}

export function exportSavingsCalcPdf(
  data: SavingsCalcForPdf,
  currencySymbol: string,
  skipDownload = false,
): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pw - margin * 2;
  let y = 20;

  const now = new Date();
  // ── Brand header ──
  drawBrandHeader(
    doc, pw, margin,
    `Savings Calculator Report  —  ${data.name}`,
    `Generated ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
  );

  y = 46;

  // ── Hero: Monthly Savings ──
  doc.setFillColor(...C.cardBg);
  doc.roundedRect(margin, y, contentW, 26, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.roundedRect(margin, y, contentW, 26, 3, 3, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text('MONTHLY SAVINGS', margin + 8, y + 8);

  const savingsColor: readonly [number, number, number] = data.monthlySavings >= 0 ? C.green : C.red;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(savingsColor[0], savingsColor[1], savingsColor[2]);
  doc.text(fmt(data.monthlySavings, currencySymbol), margin + 8, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(
    `${fmt(data.annualSavings, currencySymbol)}/year  ·  ${data.savingsRate}% savings rate`,
    pw - margin - 8,
    y + 20,
    { align: 'right' },
  );

  y += 34;

  // ── KPI Row ──
  const kpis: { label: string; value: string; color: readonly [number, number, number] }[] = [
    { label: 'Monthly Income', value: fmt(data.monthlyIncome, currencySymbol), color: C.cyan },
    { label: 'Total Expenses', value: fmt(data.totalExpenses, currencySymbol), color: C.red },
    { label: 'Savings Rate', value: `${data.savingsRate}%`, color: C.green },
  ];

  const kpiW = (contentW - 10) / 3;
  kpis.forEach((kpi, i) => {
    const kx = margin + i * (kpiW + 5);
    doc.setFillColor(...C.cardBg);
    doc.roundedRect(kx, y, kpiW, 20, 2, 2, 'F');
    doc.setDrawColor(...C.border);
    doc.roundedRect(kx, y, kpiW, 20, 2, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(kpi.label, kx + kpiW / 2, y + 7, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, kx + kpiW / 2, y + 16, { align: 'center' });
  });

  y += 28;

  // ── Expense Breakdown ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.title);
  doc.text('Expense Breakdown', margin, y);
  y += 5;

  // Header
  doc.setFillColor(...C.tableBg);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text('Category', margin + 4, y + 5);
  doc.text('Monthly', pw - margin - 4, y + 5, { align: 'right' });
  y += 7;

  // Rows — use bullet for category prefix (safe ASCII)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  data.expenses.forEach((exp, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...C.altRowBg);
      doc.rect(margin, y, contentW, 7, 'F');
    }
    doc.setTextColor(...C.body);
    // Use a plain bullet instead of emoji icon to avoid encoding issues
    doc.text(`  ${exp.name}`, margin + 4, y + 5);
    doc.text(fmt(exp.amount, currencySymbol), pw - margin - 4, y + 5, { align: 'right' });
    y += 7;
  });

  // Total
  doc.setDrawColor(...C.border);
  doc.line(margin, y, pw - margin, y);
  y += 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.title);
  doc.text('Total Expenses', margin + 4, y + 5);
  doc.text(fmt(data.totalExpenses, currencySymbol), pw - margin - 4, y + 5, { align: 'right' });
  y += 12;

  // ── Summary ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.title);
  doc.text('Summary', margin, y);
  y += 6;

  const summaryRows: [string, string, readonly [number, number, number]][] = [
    [`Income (${data.incomeFrequency})`, fmt(data.income, currencySymbol), C.body],
    ['Monthly Income', fmt(data.monthlyIncome, currencySymbol), C.cyan],
    ['Total Expenses', `-${fmt(data.totalExpenses, currencySymbol)}`, C.red],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  summaryRows.forEach(([label, value, color]) => {
    doc.setTextColor(...C.muted);
    doc.text(label, margin + 4, y + 5);
    doc.setTextColor(...color);
    doc.text(value, pw - margin - 4, y + 5, { align: 'right' });
    y += 8;
  });

  // Net savings total
  doc.setDrawColor(...C.border);
  doc.line(margin, y, pw - margin, y);
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(savingsColor[0], savingsColor[1], savingsColor[2]);
  doc.text('Monthly Savings', margin + 4, y + 6);
  doc.text(fmt(data.monthlySavings, currencySymbol), pw - margin - 4, y + 6, { align: 'right' });

  // ── Footer ──
  drawFooter(doc, pw, 'Generated by Vibe Finance  ·  Not financial advice');

  if (!skipDownload) doc.save(`savings-report-${data.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  return doc.output('datauristring');
}
// ══════════════════════════════════════════════
//  Net Worth Snapshot PDF (1 page)
// ══════════════════════════════════════════════

interface NetWorthAssetForPdf {
  name: string;
  type: string;
  value: number; // positive = asset, negative = liability
}

interface NetWorthPdfData {
  assets: NetWorthAssetForPdf[];
  totalAssets: number;
  totalDebts: number;
  netWorth: number;
}

/** Colour per asset type — same as in the app */
const NW_TYPE_COLORS: Record<string, readonly [number, number, number]> = {
  Property:          [8, 145, 178],   // cyan-600
  'Cash & Savings':  [5, 150, 105],   // emerald-600
  Investments:       [124, 58, 237],  // violet-600
  Pension:           [217, 119, 6],   // amber-600
  Vehicle:           [37, 99, 235],   // blue-600
  Crypto:            [219, 39, 119],  // pink-600
  Collectibles:      [220, 38, 38],   // red-600
  Business:          [8, 145, 178],   // cyan-600
  Mortgage:          [234, 88, 12],   // orange-600
  'Student Loan':    [124, 58, 237],  // violet-600
  'Car Loan':        [79, 70, 229],   // indigo-600
  'Credit Card':     [220, 38, 38],   // red-600
  'Personal Loan':   [217, 119, 6],   // amber-600
  'Other Debt':      [113, 113, 122], // zinc-500
};

const FALLBACK_COLORS: readonly (readonly [number, number, number])[] = [
  [8, 145, 178], [124, 58, 237], [5, 150, 105], [217, 119, 6],
  [37, 99, 235], [219, 39, 119], [220, 38, 38], [79, 70, 229],
];

function nwColor(type: string, idx: number): readonly [number, number, number] {
  return NW_TYPE_COLORS[type] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

export function exportNetWorthPdf(
  data: NetWorthPdfData,
  currencySymbol: string,
  skipDownload = false,
): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pw - margin * 2;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // ── Brand header ──
  drawBrandHeader(doc, pw, margin, `Net Worth Snapshot  ·  ${dateStr}`);

  let y = 42;

  // ── Hero: Net Worth ──
  const nwColor_: readonly [number, number, number] = data.netWorth >= 0 ? C.cyan : C.red;
  doc.setFillColor(...C.cardBg);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text('TOTAL NET WORTH', margin + 8, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(nwColor_[0], nwColor_[1], nwColor_[2]);
  const prefix = data.netWorth < 0 ? '-' : '';
  doc.text(`${prefix}${fmt(data.netWorth, currencySymbol)}`, margin + 8, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(`${data.assets.length} item${data.assets.length !== 1 ? 's' : ''} tracked`, pw - margin - 8, y + 22, { align: 'right' });

  y += 36;

  // ── KPI Row: Assets / Debts / Debt-to-Asset ──
  const debtToAsset = data.totalAssets > 0 ? Math.round((data.totalDebts / data.totalAssets) * 1000) / 10 : 0;
  const kpis: { label: string; value: string; color: readonly [number, number, number] }[] = [
    { label: 'Total Assets', value: fmt(data.totalAssets, currencySymbol), color: C.green },
    { label: 'Total Debts', value: fmt(data.totalDebts, currencySymbol), color: C.red },
    { label: 'Debt-to-Asset', value: `${debtToAsset}%`, color: C.body },
  ];

  const kpiW = (contentW - 10) / 3;
  kpis.forEach((kpi, i) => {
    const kx = margin + i * (kpiW + 5);
    doc.setFillColor(...C.cardBg);
    doc.roundedRect(kx, y, kpiW, 20, 2, 2, 'F');
    doc.setDrawColor(...C.border);
    doc.roundedRect(kx, y, kpiW, 20, 2, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(kpi.label, kx + kpiW / 2, y + 7, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, kx + kpiW / 2, y + 16, { align: 'center' });
  });

  y += 28;

  // ── Asset vs Debt visual bar ──
  const total = data.totalAssets + data.totalDebts;
  if (total > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.title);
    doc.text('Assets vs Debts', margin, y);
    y += 5;

    const barH = 8;
    const assetW = (data.totalAssets / total) * contentW;
    const debtW = contentW - assetW;

    // Asset bar
    doc.setFillColor(...C.green);
    if (assetW > 0) doc.roundedRect(margin, y, Math.max(assetW, 2), barH, 2, 2, 'F');
    // Debt bar
    doc.setFillColor(...C.red);
    if (debtW > 0) doc.roundedRect(margin + assetW, y, Math.max(debtW, 2), barH, 2, 2, 'F');

    // Labels on the bar
    if (assetW > 30) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`Assets ${Math.round((data.totalAssets / total) * 100)}%`, margin + 3, y + 5.5);
    }
    if (debtW > 30) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`Debts ${Math.round((data.totalDebts / total) * 100)}%`, margin + assetW + 3, y + 5.5);
    }
    y += barH + 8;
  }

  // ── Allocation breakdown (grouped by type) ──
  const byType = new Map<string, { items: NetWorthAssetForPdf[]; total: number }>();
  for (const a of data.assets) {
    const entry = byType.get(a.type) ?? { items: [], total: 0 };
    entry.items.push(a);
    entry.total += a.value;
    byType.set(a.type, entry);
  }

  // Separate assets and debts groups
  const assetGroups = Array.from(byType.entries())
    .filter(([, g]) => g.total >= 0)
    .sort((a, b) => b[1].total - a[1].total);
  const debtGroups = Array.from(byType.entries())
    .filter(([, g]) => g.total < 0)
    .sort((a, b) => a[1].total - b[1].total);

  // ── Asset Allocation donut-style colour strip + table ──
  if (assetGroups.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.title);
    doc.text('Asset Allocation', margin, y);
    y += 5;

    // Colour strip
    const stripH = 5;
    let sx = margin;
    assetGroups.forEach(([type, g], i) => {
      const w = (g.total / data.totalAssets) * contentW;
      if (w > 0.5) {
        const col = nwColor(type, i);
        doc.setFillColor(...col);
        doc.rect(sx, y, w, stripH, 'F');
        sx += w;
      }
    });
    // Round left/right corners
    doc.setDrawColor(...C.border);
    doc.roundedRect(margin, y, contentW, stripH, 1.5, 1.5, 'S');
    y += stripH + 4;

    // Table
    doc.setFillColor(...C.tableBg);
    doc.rect(margin, y, contentW, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text('Type', margin + 10, y + 4);
    doc.text('Value', margin + contentW * 0.6, y + 4);
    doc.text('% of Assets', pw - margin - 4, y + 4, { align: 'right' });
    y += 6;

    doc.setFontSize(8);
    assetGroups.forEach(([type, g], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(...C.altRowBg);
        doc.rect(margin, y, contentW, 6.5, 'F');
      }
      // Colour dot
      const col = nwColor(type, i);
      doc.setFillColor(...col);
      doc.circle(margin + 5, y + 3.2, 1.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.body);
      doc.text(type, margin + 10, y + 4.5);
      doc.text(fmt(g.total, currencySymbol), margin + contentW * 0.6, y + 4.5);
      const pct = data.totalAssets > 0 ? Math.round((g.total / data.totalAssets) * 100) : 0;
      doc.text(`${pct}%`, pw - margin - 4, y + 4.5, { align: 'right' });
      y += 6.5;
    });
    y += 4;
  }

  // ── Debts ──
  if (debtGroups.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.title);
    doc.text('Liabilities', margin, y);
    y += 5;

    doc.setFillColor(...C.tableBg);
    doc.rect(margin, y, contentW, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text('Type', margin + 10, y + 4);
    doc.text('Balance', margin + contentW * 0.6, y + 4);
    doc.text('% of Debts', pw - margin - 4, y + 4, { align: 'right' });
    y += 6;

    doc.setFontSize(8);
    debtGroups.forEach(([type, g], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(...C.altRowBg);
        doc.rect(margin, y, contentW, 6.5, 'F');
      }
      const col = nwColor(type, i);
      doc.setFillColor(...col);
      doc.circle(margin + 5, y + 3.2, 1.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.red);
      doc.text(type, margin + 10, y + 4.5);
      doc.text(fmt(Math.abs(g.total), currencySymbol), margin + contentW * 0.6, y + 4.5);
      const pct = data.totalDebts > 0 ? Math.round((Math.abs(g.total) / data.totalDebts) * 100) : 0;
      doc.text(`${pct}%`, pw - margin - 4, y + 4.5, { align: 'right' });
      y += 6.5;
    });
    y += 4;
  }

  // ── Detailed item list (compact, remaining space) ──
  const remainingSpace = ph - y - 20; // footroom for footer
  if (remainingSpace > 30 && data.assets.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.title);
    doc.text('All Items', margin, y);
    y += 5;

    doc.setFillColor(...C.tableBg);
    doc.rect(margin, y, contentW, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text('Name', margin + 4, y + 4);
    doc.text('Type', margin + contentW * 0.5, y + 4);
    doc.text('Value', pw - margin - 4, y + 4, { align: 'right' });
    y += 6;

    const sortedItems = [...data.assets].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const maxRows = Math.floor((ph - y - 18) / 6);
    const displayItems = sortedItems.slice(0, maxRows);

    doc.setFontSize(7.5);
    displayItems.forEach((item, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(...C.altRowBg);
        doc.rect(margin, y, contentW, 6, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.body);
      doc.text(item.name, margin + 4, y + 4.2);
      doc.setTextColor(...C.muted);
      doc.text(item.type, margin + contentW * 0.5, y + 4.2);
      const valColor: readonly [number, number, number] = item.value >= 0 ? C.body : C.red;
      doc.setTextColor(valColor[0], valColor[1], valColor[2]);
      const valStr = item.value < 0 ? `-${fmt(item.value, currencySymbol)}` : fmt(item.value, currencySymbol);
      doc.text(valStr, pw - margin - 4, y + 4.2, { align: 'right' });
      y += 6;
    });

    if (sortedItems.length > displayItems.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      doc.text(`+ ${sortedItems.length - displayItems.length} more items`, margin + 4, y + 4);
    }
  }

  // ── Footer ──
  drawFooter(doc, pw, 'Generated by Vibe Finance  ·  Net Worth Snapshot  ·  Not financial advice');

  if (!skipDownload) doc.save(`net-worth-snapshot-${now.toISOString().slice(0, 10)}.pdf`);
  return doc.output('datauristring');
}