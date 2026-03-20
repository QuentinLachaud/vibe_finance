import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, TAX_YEAR_LABEL } from '../../src/config/seo';
import { buildSalaryLandingData, buildSalaryPath, parseSalarySlug, POPULAR_SALARY_AMOUNTS } from '../../src/utils/salaryLanding';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPage(pathname: string) {
  const amount = parseSalarySlug(pathname.split('/').pop());
  if (!amount) {
    return null;
  }

  const landing = buildSalaryLandingData(amount);
  const currentPath = pathname.replace(/\/$/, '') || pathname;

  if (currentPath !== landing.canonicalPath) {
    return Response.redirect(landing.canonicalUrl, 301);
  }

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: landing.title,
        description: landing.description,
        url: landing.canonicalUrl,
      },
      {
        '@type': 'FAQPage',
        mainEntity: landing.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };

  const relatedLinks = landing.relatedAmounts
    .map((relatedAmount) => `<a href="${buildSalaryPath(relatedAmount)}">£${relatedAmount.toLocaleString('en-GB')} after tax UK</a>`)
    .join('');

  const popularLinks = POPULAR_SALARY_AMOUNTS
    .map((popularAmount) => `<a href="${buildSalaryPath(popularAmount)}">£${popularAmount.toLocaleString('en-GB')} net UK</a>`)
    .join('');

  const html = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(landing.title)}</title>
    <meta name="description" content="${escapeHtml(landing.description)}" />
    <meta name="robots" content="index,follow" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${landing.canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(landing.title)}" />
    <meta property="og:description" content="${escapeHtml(landing.description)}" />
    <meta property="og:image" content="${SITE_URL}${DEFAULT_OG_IMAGE}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(landing.title)}" />
    <meta name="twitter:description" content="${escapeHtml(landing.description)}" />
    <meta name="twitter:image" content="${SITE_URL}${DEFAULT_OG_IMAGE}" />
    <link rel="canonical" href="${landing.canonicalUrl}" />
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b1120;
        --card: #111827;
        --card-alt: #162032;
        --border: #243041;
        --text: #f1f5f9;
        --muted: #94a3b8;
        --accent: #22d3ee;
        --accent-soft: rgba(34, 211, 238, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
        background:
          radial-gradient(circle at top, rgba(34, 211, 238, 0.15), transparent 28%),
          linear-gradient(180deg, #0b1120 0%, #08101b 100%);
        color: var(--text);
      }
      a { color: var(--accent); text-decoration: none; }
      .wrap { max-width: 1140px; margin: 0 auto; padding: 28px 20px 64px; }
      .breadcrumbs, .link-grid { display: flex; flex-wrap: wrap; gap: 10px 14px; }
      .breadcrumbs { color: var(--muted); font-size: 14px; margin-bottom: 24px; }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
        gap: 24px;
        align-items: start;
      }
      .hero-card, .side-card, .summary-card, .content-card {
        background: rgba(17, 24, 39, 0.88);
        border: 1px solid var(--border);
        border-radius: 20px;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
      }
      .hero-card { padding: 30px; }
      .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: 0.12em; font-size: 12px; font-weight: 700; }
      h1 { margin: 10px 0 14px; font-size: clamp(34px, 6vw, 54px); line-height: 0.98; }
      p { color: var(--muted); font-size: 17px; line-height: 1.7; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 13px 18px;
        border-radius: 12px;
        font-weight: 700;
      }
      .button-primary { background: var(--accent); color: #04131a; }
      .button-secondary { border: 1px solid var(--border); color: var(--text); }
      .side-card { padding: 24px; }
      .side-card h2 { margin: 0 0 10px; font-size: 21px; }
      .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 22px 0 26px; }
      .summary-card { padding: 20px; }
      .summary-label { display: block; color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; }
      .summary-value { display: block; margin-top: 10px; font-size: 30px; font-weight: 800; }
      .summary-detail { display: block; margin-top: 8px; color: var(--muted); font-size: 14px; }
      .content-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(260px, 1fr); gap: 22px; }
      .content-card { padding: 26px; }
      .content-card + .content-card { margin-top: 18px; }
      h2 { margin: 0 0 12px; font-size: 24px; }
      table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 14px; }
      th, td { text-align: left; padding: 14px 16px; border-bottom: 1px solid var(--border); }
      th { color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; }
      tr:last-child td { border-bottom: none; }
      .faq-item + .faq-item { margin-top: 18px; }
      .faq-item h3 { margin: 0 0 8px; font-size: 18px; }
      .link-grid a {
        padding: 10px 12px;
        border-radius: 12px;
        background: var(--accent-soft);
        color: var(--text);
        border: 1px solid rgba(34, 211, 238, 0.15);
      }
      .footer-note { margin-top: 22px; font-size: 14px; color: var(--muted); }
      @media (max-width: 900px) {
        .hero, .content-grid, .summary-grid { grid-template-columns: 1fr; }
        .wrap { padding: 20px 16px 54px; }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span>/</span>
        <a href="/take-home-pay">Take Home Pay</a>
        <span>/</span>
        <span>${escapeHtml(landing.amountLabel)}</span>
      </nav>

      <section class="hero">
        <article class="hero-card">
          <div class="eyebrow">${SITE_NAME} salary landing page</div>
          <h1>${escapeHtml(landing.headline)}</h1>
          <p>${escapeHtml(landing.intro)}</p>
          <div class="actions">
            <a class="button button-primary" href="/take-home-pay?salary=${landing.amount}&period=annual&region=england">Open interactive calculator</a>
            <a class="button button-secondary" href="/take-home-pay">Try another salary</a>
          </div>
        </article>

        <aside class="side-card">
          <h2>Quick answer</h2>
          <p><strong>${escapeHtml(landing.amountLabel)}</strong> after tax is about <strong>£${landing.england.netMonthly.toLocaleString('en-GB')}</strong> per month in England for ${TAX_YEAR_LABEL}.</p>
          <p class="footer-note">Scottish take-home pay on the same salary is about £${landing.scotland.netMonthly.toLocaleString('en-GB')} per month.</p>
        </aside>
      </section>

      <section class="summary-grid">
        <div class="summary-card">
          <span class="summary-label">Monthly take-home</span>
          <strong class="summary-value">£${landing.england.netMonthly.toLocaleString('en-GB')}</strong>
          <span class="summary-detail">England / Wales / NI</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Annual take-home</span>
          <strong class="summary-value">£${landing.england.netAnnual.toLocaleString('en-GB')}</strong>
          <span class="summary-detail">${TAX_YEAR_LABEL} estimate</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Income Tax + NI</span>
          <strong class="summary-value">£${landing.england.totalDeductions.toLocaleString('en-GB')}</strong>
          <span class="summary-detail">${landing.england.effectiveRate}% effective rate</span>
        </div>
      </section>

      <section class="content-grid">
        <div>
          <article class="content-card">
            <h2>What ${escapeHtml(landing.amountLabel)} looks like after tax</h2>
            <p>${escapeHtml(landing.monthlySummary)}</p>
            <p>${escapeHtml(landing.taxSummary)}</p>
            <p>${escapeHtml(landing.scotlandSummary)}</p>
          </article>

          <article class="content-card">
            <h2>${escapeHtml(landing.amountLabel)} monthly, weekly and yearly net pay</h2>
            <table>
              <thead>
                <tr>
                  <th>Region</th>
                  <th>Monthly</th>
                  <th>Weekly</th>
                  <th>Annual</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>England / Wales / NI</td>
                  <td>£${landing.england.netMonthly.toLocaleString('en-GB')}</td>
                  <td>£${landing.england.netWeekly.toLocaleString('en-GB')}</td>
                  <td>£${landing.england.netAnnual.toLocaleString('en-GB')}</td>
                </tr>
                <tr>
                  <td>Scotland</td>
                  <td>£${landing.scotland.netMonthly.toLocaleString('en-GB')}</td>
                  <td>£${landing.scotland.netWeekly.toLocaleString('en-GB')}</td>
                  <td>£${landing.scotland.netAnnual.toLocaleString('en-GB')}</td>
                </tr>
              </tbody>
            </table>
          </article>

          <article class="content-card">
            <h2>Frequently asked questions</h2>
            ${landing.faq.map((item) => `
              <div class="faq-item">
                <h3>${escapeHtml(item.question)}</h3>
                <p>${escapeHtml(item.answer)}</p>
              </div>
            `).join('')}
          </article>
        </div>

        <aside>
          <div class="content-card">
            <h2>Nearby salary searches</h2>
            <div class="link-grid">${relatedLinks}</div>
          </div>
          <div class="content-card">
            <h2>Popular salary pages</h2>
            <div class="link-grid">${popularLinks}</div>
          </div>
        </aside>
      </section>
    </main>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const { pathname } = new URL(request.url);
  const response = renderPage(pathname);

  if (!response) {
    return Response.redirect(`${SITE_URL}/take-home-pay`, 302);
  }

  return response;
};
