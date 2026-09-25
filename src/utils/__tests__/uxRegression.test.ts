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

  it('keeps all primary tool routes in the main bundle instead of fragile lazy chunks', () => {
    const router = read('src/router/index.tsx');
    expect(router).not.toContain('lazyWithReload');
    expect(router).not.toContain('LazyRouteBoundary');
    expect(router).not.toContain('Suspense');
    expect(router).not.toContain('lazy(');

    const pages = [
      ['CompoundInterestPage', 'compound-interest'],
      ['NetWorthPage', 'net-worth'],
      ['PortfolioSimulatorPage', 'portfolio'],
      ['ReportsPage', 'reports'],
      ['SettingsPage', 'settings'],
    ] as const;

    for (const [component, route] of pages) {
      expect(router).toContain(`import { ${component} } from '../pages/${component}';`);
      expect(router).toContain(`{ path: '/${route}', element: <${component} /> }`);
    }
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
  it('keeps landing content visible without legacy reveal-state classes', () => {
    const landing = read('src/pages/LandingPage.tsx');
    const css = read('src/App.css');


    expect(landing).not.toContain('landing-hero--visible');
    expect(landing).not.toContain('landing-tools-header--visible');
    expect(landing).not.toContain('landing-feature-card--visible');


    expect(css).not.toMatch(/\.landing-hero\s*\{[^}]*opacity:\s*0/s);
    expect(css).not.toMatch(/\.landing-tools-header\s*\{[^}]*opacity:\s*0/s);
    expect(css).not.toMatch(/\.landing-feature-card\s*\{[^}]*opacity:\s*0/s);
    expect(css).not.toContain('.landing-hero--visible');
    expect(css).not.toContain('.landing-tools-header--visible');
    expect(css).not.toContain('.landing-feature-card--visible');
  });


  it('keeps display preferences in Settings instead of the global header', () => {
    const header = read('src/components/Header.tsx');
    const settings = read('src/pages/SettingsPage.tsx');


    expect(header).not.toContain('useTheme');
    expect(header).not.toContain('useCurrency');
    expect(header).not.toContain('theme-toggle');
    expect(header).not.toContain('currency-select');
    expect(header).not.toContain('nav-link--gold');


    expect(settings).toContain('useTheme');
    expect(settings).toContain('useCurrency');
    expect(settings).toContain('settings-currency');
  });

  it('uses a restrained Apple-style colour system in both themes', () => {
    const css = read('src/App.css');


    expect(css).toContain('TAKEHOMECALC SERIOUS IOS PALETTE');
    expect(css).toContain('--bg-primary: #0b0b0c');
    expect(css).toContain('--accent-primary: #0a84ff');
    expect(css).toContain('--bg-primary: #f5f5f7');
    expect(css).toContain('--text-primary: #1d1d1f');
    expect(css).toContain('--accent-primary: #007aff');
    expect(css).toContain('.landing-salary-searches,');
    expect(css).toContain('background-image: none !important');
    expect(css).toContain('.ps-btn--gold');
    expect(css).toContain('background: var(--accent-primary) !important');
  });

  it('keeps typography on a compact system-font product scale', () => {
    const css = read('src/App.css');

    expect(css).toMatch(/--font-family:\s*-apple-system,\s*BlinkMacSystemFont/);
    expect(css).not.toContain("--font-family: 'Inter'");
    for (const token of [
      '--type-caption: 11px',
      '--type-body: 15px',
      '--type-control: 16px',
      '--type-section: 18px',
      '--type-page-title: 30px',
      '--weight-semibold: 600',
      '--weight-bold: 700',
    ]) {
      expect(css).toContain(token);
    }

    expect(css).toMatch(/\.page-title\s*\{[^}]*font-size:\s*var\(--type-page-title\)/s);
    expect(css).toMatch(/\.landing-hero-title\s*\{[^}]*font-size:\s*var\(--type-page-title\)/s);
    expect(css).not.toMatch(/font-size:\s*clamp\([^;]*56px/);
    expect(css).not.toMatch(/font-weight:\s*(?:800|900)/);
  });

  it('uses shared control and chart typography, including on mobile', () => {
    const css = read('src/App.css');
    const compoundInterest = read('src/pages/CompoundInterestPage.tsx');
    const netWorth = read('src/pages/NetWorthPage.tsx');
    const monteCarlo = read('src/components/portfolio/MonteCarloChart.tsx');

    expect(css).toMatch(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*input,[\s\S]*font-size:\s*var\(--type-control\)\s*!important/s);
    expect(css).toMatch(/\.ci-label\s*\{[^}]*font-size:\s*var\(--type-label\)/s);
    expect(css).toMatch(/\.rp-format-label\s*\{[^}]*font-size:\s*var\(--type-body\)/s);
    expect(compoundInterest).toContain("fontSize: 'var(--type-chart-tick)'");
    expect(netWorth).toContain("fontSize: 'var(--type-chart-label)'");
    expect(monteCarlo).toContain('fontSize="var(--type-chart-tick)"');
  });

});
