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
): void {
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

  doc.save('take-home-pay-report.pdf');
}
