import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('professional mobile UX contracts', () => {
  it('uses bottom-ribbon navigation without active swipe navigation', () => {
    const layout = read('src/app/AppLayout.tsx');
    expect(layout).toContain('BOTTOM_NAV_PAGES.map');
    expect(layout).not.toContain('useSwipeNavigation');
    expect(layout).not.toContain('swipeDx');
    expect(layout).not.toContain('swipe-nav-indicator');
  });

  it('keeps the six home tools in a compact two-column grid and prevents sideways page overflow', () => {
    const css = read('src/App.css');
    expect(css).toContain('TAKEHOMECALC PROFESSIONAL UX REVAMP');
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(css).toContain('overflow-x: clip');
    expect(css).toContain('.nw-chart-card');
    expect(css).toContain('overflow: clip');
  });

  it('uses an example salary affordance and keeps tax-region controls compact', () => {
    const page = read('src/pages/TakeHomePayPage.tsx');
    expect(page).toContain('salary: 0');
    expect(page).toContain('placeholder="e.g. 35,000"');
    const css = read('src/App.css');
    expect(css).toContain('.thp-region-toggle');
    expect(css).toContain('flex-direction: row !important');
  });

  it('does not render a custom expense badge', () => {
    expect(read('src/components/calculator/ExpensesSection.tsx')).not.toContain('expense-custom-badge');
  });

  it('keeps net-worth report structure professional and snapshot-column free', () => {
    const page = read('src/pages/NetWorthPage.tsx');
    const pdf = read('src/utils/exportPdf.ts');
    expect(page).toContain('Net Worth Report');
    expect(page).not.toContain('# Snapshots');
    expect(page).not.toContain('>Snapshots<');
    expect(pdf).toContain("doc.setFillColor(255, 255, 255)");
    expect(pdf).toContain("'Net Worth Report — continued' : 'Net Worth'");
    expect(pdf).toContain("drawItems('Assets'");
    expect(pdf).toContain("drawItems('Liabilities'");
  });

  it('routes generated report downloads through Blob/Object URLs instead of opening data URLs', () => {
    const helper = read('src/utils/downloadFile.ts');
    expect(helper).toContain('URL.createObjectURL(blob)');
    expect(helper).not.toContain("window.open(dataUrl");
    for (const page of ['CalculatorPage.tsx', 'TakeHomePayPage.tsx', 'NetWorthPage.tsx']) {
      const source = read(`src/pages/${page}`);
      expect(source).toContain("from '../utils/downloadFile'");
      expect(source).not.toContain('function downloadDataUrlMobileSafe');
    }
  });
});
