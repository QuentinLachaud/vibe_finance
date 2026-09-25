import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('unified reporting contracts', () => {
  it('uses one shared picker with the same four formats on every core report page', () => {
    const picker = read('src/components/ReportFormatPicker.tsx');
    expect(picker).toContain("'pdf-native' | 'html' | 'pdf' | 'csv'");
    for (const label of ['PDF Snapshot', 'HTML', 'Print PDF', 'CSV']) expect(picker).toContain(label);
    for (const page of ['NetWorthPage.tsx', 'TakeHomePayPage.tsx', 'CalculatorPage.tsx']) {
      expect(read(`src/pages/${page}`)).toContain('ReportFormatPicker');
    }
  });

  it('keeps native snapshot exporters and saved-report downloads wired for all report types', () => {
    const takeHome = read('src/pages/TakeHomePayPage.tsx');
    const savings = read('src/pages/CalculatorPage.tsx');
    const netWorth = read('src/pages/NetWorthPage.tsx');
    expect(takeHome).toContain('exportTakeHomePdf');
    expect(takeHome).toContain('exportHouseholdTakeHomePdf');
    expect(savings).toContain('exportSavingsCalcPdf');
    expect(netWorth).toContain('exportNetWorthPdf');
    for (const source of [takeHome, savings, netWorth]) {
      expect(source).toContain('downloadDataUrlMobileSafe');
      expect(source).toContain('addReport');
    }
  });

  it('uses the shared neutral HTML and native PDF report hierarchy', () => {
    const html = read('src/utils/reportHtml.ts');
    const pdf = read('src/utils/exportPdf.ts');
    expect(html).toContain('@page { size: A4; margin: 18mm; }');
    expect(html).toContain('--report-ink: #111827');
    expect(html).toContain('border-bottom: 1px solid var(--report-rule)');
    expect(pdf).toContain('doc.setFillColor(255, 255, 255)');
    expect(pdf).toContain('doc.setFontSize(continuation ? 12 : 18)');
    expect(pdf).toContain('doc.setFontSize(26)');
    expect(pdf).not.toContain('headerBg');
    expect(pdf).not.toContain('cyan');
    expect(pdf).not.toContain('purple');
    expect(pdf).not.toContain('amber');
  });
});
