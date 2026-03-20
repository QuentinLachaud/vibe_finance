import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { TAX_YEAR_LABEL } from '../config/seo';
import { useSeoMeta } from '../hooks/useSeoMeta';
import { buildSalaryLandingData, buildSalaryPath, parseSalarySlug, POPULAR_SALARY_AMOUNTS } from '../utils/salaryLanding';

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="salary-landing-summary-card">
      <span className="salary-landing-summary-label">{label}</span>
      <strong className="salary-landing-summary-value">{value}</strong>
      <span className="salary-landing-summary-detail">{detail}</span>
    </div>
  );
}

export function SalaryLandingPage() {
  const { amountSlug } = useParams();
  const navigate = useNavigate();
  const parsedAmount = parseSalarySlug(amountSlug);
  const landing = parsedAmount ? buildSalaryLandingData(parsedAmount) : null;

  useEffect(() => {
    if (!landing || amountSlug === undefined) return;

    const canonicalSlug = landing.canonicalPath.split('/').pop();
    if (canonicalSlug && canonicalSlug !== amountSlug) {
      navigate(landing.canonicalPath, { replace: true });
    }
  }, [amountSlug, landing?.canonicalPath, navigate]);

  useSeoMeta({
    title: landing?.title ?? 'Take Home Pay Calculator | TakeHomeCalc',
    description: landing?.description ?? 'Calculate your UK take-home pay after tax and National Insurance.',
    canonicalPath: landing?.canonicalPath ?? '/take-home-pay',
    keywords: landing
      ? [
        `${landing.amount.toLocaleString('en-GB')} after tax uk`,
        `${landing.amount.toLocaleString('en-GB')} net uk`,
        `${landing.amount.toLocaleString('en-GB')} take home pay uk`,
        'uk salary calculator',
        'take home pay calculator',
      ]
      : undefined,
    robots: landing ? undefined : 'noindex,follow',
  });

  if (!landing) {
    return <Navigate to="/take-home-pay" replace />;
  }

  const structuredData = {
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

  return (
    <div className="salary-landing-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <nav className="salary-landing-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/take-home-pay">Take Home Pay</Link>
        <span>/</span>
        <span>{landing.amountLabel}</span>
      </nav>

      <section className="salary-landing-hero">
        <div className="salary-landing-eyebrow">Indexed salary landing page</div>
        <h1 className="salary-landing-title">{landing.headline}</h1>
        <p className="salary-landing-intro">{landing.intro}</p>
        <div className="salary-landing-actions">
          <Link
            className="salary-landing-primary"
            to={`/take-home-pay?salary=${landing.amount}&period=annual&region=england`}
          >
            Open interactive calculator
          </Link>
          <Link className="salary-landing-secondary" to="/take-home-pay">
            Try another salary
          </Link>
        </div>
      </section>

      <section className="salary-landing-summary-grid">
        <SummaryCard
          label="Monthly take-home"
          value={`£${landing.england.netMonthly.toLocaleString('en-GB')}`}
          detail="England tax bands"
        />
        <SummaryCard
          label="Annual take-home"
          value={`£${landing.england.netAnnual.toLocaleString('en-GB')}`}
          detail={`${TAX_YEAR_LABEL} estimate`}
        />
        <SummaryCard
          label="Income Tax + NI"
          value={`£${landing.england.totalDeductions.toLocaleString('en-GB')}`}
          detail={`${landing.england.effectiveRate}% effective rate`}
        />
      </section>

      <section className="salary-landing-content-grid">
        <article className="salary-landing-article">
          <div className="salary-landing-section">
            <h2>What {landing.amountLabel} looks like after tax</h2>
            <p>{landing.monthlySummary}</p>
            <p>{landing.taxSummary}</p>
            <p>{landing.scotlandSummary}</p>
          </div>

          <div className="salary-landing-section">
            <h2>{landing.amountLabel} monthly, weekly and yearly net pay</h2>
            <div className="salary-landing-table-wrap">
              <table className="salary-landing-table">
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
                    <td>£{landing.england.netMonthly.toLocaleString('en-GB')}</td>
                    <td>£{landing.england.netWeekly.toLocaleString('en-GB')}</td>
                    <td>£{landing.england.netAnnual.toLocaleString('en-GB')}</td>
                  </tr>
                  <tr>
                    <td>Scotland</td>
                    <td>£{landing.scotland.netMonthly.toLocaleString('en-GB')}</td>
                    <td>£{landing.scotland.netWeekly.toLocaleString('en-GB')}</td>
                    <td>£{landing.scotland.netAnnual.toLocaleString('en-GB')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="salary-landing-section">
            <h2>Frequently asked questions</h2>
            <div className="salary-landing-faq-list">
              {landing.faq.map((item) => (
                <div key={item.question} className="salary-landing-faq-item">
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <aside className="salary-landing-sidebar">
          <div className="salary-landing-sidecard">
            <h2>Use the full calculator</h2>
            <p>Adjust pension salary sacrifice, compare Scotland, or switch to monthly and weekly inputs.</p>
            <Link
              className="salary-landing-primary salary-landing-primary--full"
              to={`/take-home-pay?salary=${landing.amount}&period=annual&region=england`}
            >
              Calculate {landing.amountLabel}
            </Link>
          </div>

          <div className="salary-landing-sidecard">
            <h2>Nearby salary searches</h2>
            <div className="salary-landing-link-list">
              {landing.relatedAmounts.map((amount) => (
                <Link key={amount} to={buildSalaryPath(amount)}>
                  {`£${amount.toLocaleString('en-GB')} after tax in the UK`}
                </Link>
              ))}
            </div>
          </div>

          <div className="salary-landing-sidecard">
            <h2>Popular salary pages</h2>
            <div className="salary-landing-link-list">
              {POPULAR_SALARY_AMOUNTS.slice(0, 8).map((amount) => (
                <Link key={amount} to={buildSalaryPath(amount)}>
                  {`£${amount.toLocaleString('en-GB')} net UK`}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
