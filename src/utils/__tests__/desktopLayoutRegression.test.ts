import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('desktop readable layout contract', () => {
  const css = read('src/App.css');
  const marker = 'TAKEHOMECALC DESKTOP READABILITY PASS';
  const markerIndex = css.indexOf(marker);
  const desktopCss = markerIndex >= 0 ? css.slice(markerIndex) : '';

  it('defines one centered desktop shell with healthy margins', () => {
    expect(markerIndex).toBeGreaterThan(-1);
    expect(desktopCss).toContain('@media (min-width: 769px)');
    expect(desktopCss).toContain('.app-main,');
    expect(desktopCss).toContain('.header-inner');
    expect(desktopCss).toContain('max-width: 1180px');
    expect(desktopCss).toContain('padding-left: clamp(28px, 3vw, 48px)');
    expect(desktopCss).toContain('padding-right: clamp(28px, 3vw, 48px)');
    expect(desktopCss).toContain('margin-inline: auto');
  });

  it('covers the root wrappers used by all seven desktop product pages', () => {
    const pageRoots: Array<[string, string]> = [
      ['src/pages/TakeHomePayPage.tsx', 'className="page-container"'],
      ['src/pages/CalculatorPage.tsx', 'className="calculator-page"'],
      ['src/pages/CompoundInterestPage.tsx', 'className="ci-page"'],
      ['src/pages/NetWorthPage.tsx', 'className="page-container"'],
      ['src/pages/PortfolioSimulatorPage.tsx', 'className="ps-page"'],
      ['src/pages/ReportsPage.tsx', 'className="page-container"'],
      ['src/pages/SettingsPage.tsx', 'className="settings-page"'],
    ];

    for (const [path, rootClass] of pageRoots) {
      expect(read(path)).toContain(rootClass);
    }

    for (const selector of ['.page-container', '.calculator-page', '.ci-page', '.ps-page', '.settings-page']) {
      expect(desktopCss).toContain(selector);
    }
  });

  it('keeps readable text measure and removes common desktop AI-style chrome', () => {
    expect(desktopCss).toContain('max-width: 680px');
    expect(desktopCss).toContain('background-image: none !important');
    expect(desktopCss).toContain('transform: none !important');
    expect(desktopCss).toContain('.thp-mode-icon');
    expect(desktopCss).toContain('.rp-section-icon');
    expect(desktopCss).toContain('.rp-format-icon');
    expect(desktopCss).toContain('display: none !important');
  });

  it('scopes the new visual pass to desktop instead of changing mobile rules', () => {
    const beforeMarker = css.slice(0, markerIndex);
    expect(beforeMarker).toContain('@media (max-width: 768px)');
    expect(desktopCss.indexOf('@media (min-width: 769px)')).toBeGreaterThan(-1);
    expect(desktopCss).not.toContain('@media (max-width: 768px)');
  });
});
