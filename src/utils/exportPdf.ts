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

function fmt(n: number, symbol: string): string {
  return `${symbol}${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
  doc.setFillColor(11, 17, 32); // dark navy
  doc.rect(0, 0, pw, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(241, 245, 249);
  doc.text('TakeHomeCalc.co.uk', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text('Gross-to-Net Pay Report  |  UK Tax Year 2025-26', margin, 28);
  doc.text(`Region: ${region === 'scotland' ? 'Scotland' : 'England / Wales / NI'}`, margin, 34);

  y = 50;

  // ── Hero Section ──
  doc.setFillColor(26, 35, 50);
  doc.roundedRect(margin, y, contentW, 30, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('YOUR MONTHLY TAKE HOME PAY', margin + 10, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(34, 211, 238);
  doc.text(fmt(result.netMonthly, currencySymbol), margin + 10, y + 24);

  // Annual/weekly on the right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${fmt(result.netAnnual, currencySymbol)}/year  ·  ${fmt(result.netWeekly, currencySymbol)}/week`,
    pw - margin - 10,
    y + 24,
    { align: 'right' },
  );

  y += 38;

  // ── KPI Row ──
  const kpis = [
    { label: 'Income Tax', value: fmt(result.incomeTax, currencySymbol), color: [245, 158, 11] },
    { label: 'National Insurance', value: fmt(result.nationalInsurance, currencySymbol), color: [139, 92, 246] },
    { label: 'Effective Rate', value: `${result.effectiveRate}%`, color: [241, 245, 249] },
  ];
  if (result.pensionSacrifice > 0) {
    kpis.push({ label: 'Salary Sacrifice', value: fmt(result.pensionSacrifice, currencySymbol), color: [59, 130, 246] });
  }

  const kpiW = (contentW - (kpis.length - 1) * 6) / kpis.length;
  kpis.forEach((kpi, i) => {
    const kx = margin + i * (kpiW + 6);
    doc.setFillColor(26, 35, 50);
    doc.roundedRect(kx, y, kpiW, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx + kpiW / 2, y + 8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, kx + kpiW / 2, y + 18, { align: 'center' });
  });

  y += 30;

  // ── Helper: draw a table section ──
  function drawSection(
    title: string,
    headers: string[],
    rows: [string, string, string][],
    totalLabel: string,
    totalValue: string,
  ) {
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(241, 245, 249);
    doc.text(title, margin, y);
    y += 6;

    // Header row
    doc.setFillColor(15, 23, 41);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(headers[0], margin + 4, y + 5);
    doc.text(headers[1], margin + contentW * 0.55, y + 5);
    doc.text(headers[2], pw - margin - 4, y + 5, { align: 'right' });
    y += 7;

    // Data rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    rows.forEach((row, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(22, 32, 50);
        doc.rect(margin, y, contentW, 7, 'F');
      }
      doc.setTextColor(148, 163, 184);
      doc.text(row[0], margin + 4, y + 5);
      doc.text(row[1], margin + contentW * 0.55, y + 5);
      doc.text(row[2], pw - margin - 4, y + 5, { align: 'right' });
      y += 7;
    });

    // Total
    doc.setDrawColor(30, 41, 59);
    doc.line(margin, y, pw - margin, y);
    y += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(241, 245, 249);
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
  doc.setFontSize(11);
  doc.setTextColor(241, 245, 249);
  doc.text('Summary', margin, y);
  y += 6;

  const summaryRows: [string, string, number[]][] = [
    ['Gross Salary', fmt(result.grossAnnual, currencySymbol), [148, 163, 184]],
  ];
  if (result.pensionSacrifice > 0) {
    summaryRows.push([
      'Salary Sacrifice',
      `−${fmt(result.pensionSacrifice, currencySymbol)}`,
      [59, 130, 246],
    ]);
  }
  summaryRows.push(
    ['Personal Allowance', fmt(result.personalAllowance, currencySymbol), [148, 163, 184]],
    ['Income Tax', `−${fmt(result.incomeTax, currencySymbol)}`, [245, 158, 11]],
    ['National Insurance', `−${fmt(result.nationalInsurance, currencySymbol)}`, [139, 92, 246]],
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  summaryRows.forEach(([label, value, color]) => {
    doc.setTextColor(148, 163, 184);
    doc.text(label, margin + 4, y + 5);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(value, pw - margin - 4, y + 5, { align: 'right' });
    y += 8;
  });

  // Net annual total
  doc.setDrawColor(30, 41, 59);
  doc.line(margin, y, pw - margin, y);
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(34, 211, 238);
  doc.text('Net Annual Pay', margin + 4, y + 6);
  doc.text(fmt(result.netAnnual, currencySymbol), pw - margin - 4, y + 6, { align: 'right' });
  y += 16;

  // ── Footer ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Generated by TakeHomeCalc.co.uk  •  Estimates based on UK HMRC 2025-26 rates  •  Not financial advice',
    pw / 2,
    285,
    { align: 'center' },
  );

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
  const colW = (contentW - 10) / 2;
  let y = 20;

  // ── Brand header ──
  doc.setFillColor(11, 17, 32);
  doc.rect(0, 0, pw, 44, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(241, 245, 249);
  doc.text('TakeHomeCalc.co.uk', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text('Household Gross-to-Net Pay Report  |  UK Tax Year 2025-26', margin, 28);

  const r1Label = region1 === 'scotland' ? 'Scotland' : 'England / Wales / NI';
  const r2Label = region2 === 'scotland' ? 'Scotland' : 'England / Wales / NI';
  doc.text(`${name1}: ${r1Label}  ·  ${name2}: ${r2Label}`, margin, 36);

  y = 54;

  // ── Hero: Combined Household ──
  doc.setFillColor(26, 35, 50);
  doc.roundedRect(margin, y, contentW, 30, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('HOUSEHOLD MONTHLY TAKE HOME PAY', margin + 10, y + 10);

  const combinedMonthly = partner1.netMonthly + partner2.netMonthly;
  const combinedAnnual = partner1.netAnnual + partner2.netAnnual;
  const combinedWeekly = partner1.netWeekly + partner2.netWeekly;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(34, 211, 238);
  doc.text(fmt(combinedMonthly, currencySymbol), margin + 10, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${fmt(combinedAnnual, currencySymbol)}/year  ·  ${fmt(combinedWeekly, currencySymbol)}/week`,
    pw - margin - 10,
    y + 24,
    { align: 'right' },
  );

  y += 38;

  // ── Side-by-side partner columns ──
  const leftX = margin;
  const rightX = margin + colW + 10;
  const colH = 90;

  doc.setFillColor(22, 32, 50);
  doc.roundedRect(leftX, y - 4, colW, colH, 3, 3, 'F');
  doc.setFillColor(22, 32, 50);
  doc.roundedRect(rightX, y - 4, colW, colH, 3, 3, 'F');

  function drawPartnerColumn(partner: TaxBreakdownForPdf, name: string, x: number, w: number) {
    let cy = y;

    // Name header
    doc.setFillColor(15, 23, 41);
    doc.roundedRect(x + 2, cy - 2, w - 4, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(34, 211, 238);
    doc.text(name, x + w / 2, cy + 5, { align: 'center' });
    cy += 14;

    // Monthly take home
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('MONTHLY TAKE HOME', x + 6, cy);
    cy += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(241, 245, 249);
    doc.text(fmt(partner.netMonthly, currencySymbol), x + 6, cy + 2);
    cy += 10;

    // Key figures
    const rows: [string, string, number[]][] = [
      ['Gross Salary', fmt(partner.grossAnnual, currencySymbol), [148, 163, 184]],
    ];
    if (partner.pensionSacrifice > 0) {
      rows.push(['Salary Sacrifice', `−${fmt(partner.pensionSacrifice, currencySymbol)}`, [59, 130, 246]]);
    }
    rows.push(
      ['Personal Allowance', fmt(partner.personalAllowance, currencySymbol), [148, 163, 184]],
      ['Income Tax', `−${fmt(partner.incomeTax, currencySymbol)}`, [245, 158, 11]],
      ['National Insurance', `−${fmt(partner.nationalInsurance, currencySymbol)}`, [139, 92, 246]],
      ['Effective Rate', `${partner.effectiveRate}%`, [241, 245, 249]],
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    rows.forEach(([label, value, color]) => {
      doc.setTextColor(100, 116, 139);
      doc.text(label, x + 6, cy + 4);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(value, x + w - 6, cy + 4, { align: 'right' });
      cy += 7;
    });

    // Net Annual
    doc.setDrawColor(30, 41, 59);
    doc.line(x + 4, cy, x + w - 4, cy);
    cy += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(34, 211, 238);
    doc.text('Net Annual', x + 6, cy + 4);
    doc.text(fmt(partner.netAnnual, currencySymbol), x + w - 6, cy + 4, { align: 'right' });
  }

  drawPartnerColumn(partner1, name1, leftX, colW);
  drawPartnerColumn(partner2, name2, rightX, colW);

  y += colH + 8;

  // ── Combined KPIs ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(241, 245, 249);
  doc.text('Household Combined', margin, y);
  y += 6;

  const combinedTax = partner1.incomeTax + partner2.incomeTax;
  const combinedNI = partner1.nationalInsurance + partner2.nationalInsurance;
  const totalGross = partner1.grossAnnual + partner2.grossAnnual;
  const avgRate = totalGross > 0 ? Math.round(((combinedTax + combinedNI) / totalGross) * 1000) / 10 : 0;

  const kpis = [
    { label: 'Combined Tax', value: fmt(combinedTax, currencySymbol), color: [245, 158, 11] },
    { label: 'Combined NI', value: fmt(combinedNI, currencySymbol), color: [139, 92, 246] },
    { label: 'Avg Eff. Rate', value: `${avgRate}%`, color: [241, 245, 249] },
    { label: 'Net Annual', value: fmt(combinedAnnual, currencySymbol), color: [34, 211, 238] },
  ];

  const kpiW = (contentW - 18) / 4;
  kpis.forEach((kpi, i) => {
    const kx = margin + i * (kpiW + 6);
    doc.setFillColor(26, 35, 50);
    doc.roundedRect(kx, y, kpiW, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx + kpiW / 2, y + 8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, kx + kpiW / 2, y + 18, { align: 'center' });
  });

  y += 30;

  // ── Tax breakdown tables (side-by-side) ──
  function drawTaxTable(partner: TaxBreakdownForPdf, name: string, region: string, x: number, w: number, startY: number): number {
    let ty = startY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(241, 245, 249);
    doc.text(`${name} — Income Tax (${region === 'scotland' ? 'Scotland' : 'England'})`, x, ty);
    ty += 5;

    doc.setFillColor(15, 23, 41);
    doc.rect(x, ty, w, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Band', x + 2, ty + 4);
    doc.text('Rate', x + w * 0.6, ty + 4);
    doc.text('Tax', x + w - 2, ty + 4, { align: 'right' });
    ty += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    partner.taxBands.forEach((b, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(22, 32, 50);
        doc.rect(x, ty, w, 6, 'F');
      }
      doc.setTextColor(148, 163, 184);
      doc.text(b.name, x + 2, ty + 4);
      doc.text(b.rate, x + w * 0.6, ty + 4);
      doc.text(fmt(b.amount, currencySymbol), x + w - 2, ty + 4, { align: 'right' });
      ty += 6;
    });

    doc.setDrawColor(30, 41, 59);
    doc.line(x, ty, x + w, ty);
    ty += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(241, 245, 249);
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
    doc.setFontSize(9);
    doc.setTextColor(241, 245, 249);
    doc.text(`${name} — National Insurance`, x, ty);
    ty += 5;

    doc.setFillColor(15, 23, 41);
    doc.rect(x, ty, w, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Band', x + 2, ty + 4);
    doc.text('Rate', x + w * 0.6, ty + 4);
    doc.text('NI', x + w - 2, ty + 4, { align: 'right' });
    ty += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    partner.niBands.forEach((b, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(22, 32, 50);
        doc.rect(x, ty, w, 6, 'F');
      }
      doc.setTextColor(148, 163, 184);
      doc.text(b.name, x + 2, ty + 4);
      doc.text(b.rate, x + w * 0.6, ty + 4);
      doc.text(fmt(b.amount, currencySymbol), x + w - 2, ty + 4, { align: 'right' });
      ty += 6;
    });

    doc.setDrawColor(30, 41, 59);
    doc.line(x, ty, x + w, ty);
    ty += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(241, 245, 249);
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
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Generated by TakeHomeCalc.co.uk  •  Estimates based on UK HMRC 2025-26 rates  •  Not financial advice',
    pw / 2,
    285,
    { align: 'center' },
  );

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

  // ── Brand header ──
  doc.setFillColor(11, 17, 32);
  doc.rect(0, 0, pw, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(241, 245, 249);
  doc.text('TakeHomeCalc.co.uk', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text(`Savings Calculator Report  —  ${data.name}`, margin, 28);

  const now = new Date();
  doc.text(
    `Generated ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    margin,
    34,
  );

  y = 50;

  // ── Hero: Monthly Savings ──
  doc.setFillColor(26, 35, 50);
  doc.roundedRect(margin, y, contentW, 30, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('MONTHLY SAVINGS', margin + 10, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(data.monthlySavings >= 0 ? 34 : 239, data.monthlySavings >= 0 ? 211 : 68, data.monthlySavings >= 0 ? 238 : 68);
  doc.text(fmt(data.monthlySavings, currencySymbol), margin + 10, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${fmt(data.annualSavings, currencySymbol)}/year  ·  ${data.savingsRate}% savings rate`,
    pw - margin - 10,
    y + 24,
    { align: 'right' },
  );

  y += 38;

  // ── KPI Row ──
  const kpis = [
    { label: 'Monthly Income', value: fmt(data.monthlyIncome, currencySymbol), color: [34, 211, 238] },
    { label: 'Total Expenses', value: fmt(data.totalExpenses, currencySymbol), color: [239, 68, 68] },
    { label: 'Savings Rate', value: `${data.savingsRate}%`, color: [16, 185, 129] },
  ];

  const kpiW = (contentW - 12) / 3;
  kpis.forEach((kpi, i) => {
    const kx = margin + i * (kpiW + 6);
    doc.setFillColor(26, 35, 50);
    doc.roundedRect(kx, y, kpiW, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx + kpiW / 2, y + 8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, kx + kpiW / 2, y + 18, { align: 'center' });
  });

  y += 30;

  // ── Expense Breakdown ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(241, 245, 249);
  doc.text('Expense Breakdown', margin, y);
  y += 6;

  // Header
  doc.setFillColor(15, 23, 41);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Category', margin + 4, y + 5);
  doc.text('Monthly', pw - margin - 4, y + 5, { align: 'right' });
  y += 7;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  data.expenses.forEach((exp, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(22, 32, 50);
      doc.rect(margin, y, contentW, 7, 'F');
    }
    doc.setTextColor(148, 163, 184);
    doc.text(`${exp.icon || '•'} ${exp.name}`, margin + 4, y + 5);
    doc.text(fmt(exp.amount, currencySymbol), pw - margin - 4, y + 5, { align: 'right' });
    y += 7;
  });

  // Total
  doc.setDrawColor(30, 41, 59);
  doc.line(margin, y, pw - margin, y);
  y += 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(241, 245, 249);
  doc.text('Total Expenses', margin + 4, y + 5);
  doc.text(fmt(data.totalExpenses, currencySymbol), pw - margin - 4, y + 5, { align: 'right' });
  y += 12;

  // ── Summary ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(241, 245, 249);
  doc.text('Summary', margin, y);
  y += 6;

  const summaryRows: [string, string, number[]][] = [
    [`Income (${data.incomeFrequency})`, fmt(data.income, currencySymbol), [148, 163, 184]],
    ['Monthly Income', fmt(data.monthlyIncome, currencySymbol), [34, 211, 238]],
    ['Total Expenses', `−${fmt(data.totalExpenses, currencySymbol)}`, [239, 68, 68]],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  summaryRows.forEach(([label, value, color]) => {
    doc.setTextColor(148, 163, 184);
    doc.text(label, margin + 4, y + 5);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(value, pw - margin - 4, y + 5, { align: 'right' });
    y += 8;
  });

  // Net savings total
  doc.setDrawColor(30, 41, 59);
  doc.line(margin, y, pw - margin, y);
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(data.monthlySavings >= 0 ? 34 : 239, data.monthlySavings >= 0 ? 211 : 68, data.monthlySavings >= 0 ? 238 : 68);
  doc.text('Monthly Savings', margin + 4, y + 6);
  doc.text(fmt(data.monthlySavings, currencySymbol), pw - margin - 4, y + 6, { align: 'right' });

  // ── Footer ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Generated by TakeHomeCalc.co.uk  •  Not financial advice',
    pw / 2,
    285,
    { align: 'center' },
  );

  if (!skipDownload) doc.save(`savings-report-${data.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  return doc.output('datauristring');
}
