import { type ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { buildSalaryPath, POPULAR_SALARY_AMOUNTS } from '../utils/salaryLanding';

// ── SVG icons (thin line, no emojis) ──

const IconTakeHome = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 14h4" />
  </svg>
);

const IconSavings = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const IconCompound = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconNetWorth = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);

const IconPortfolio = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a10 10 0 0 1 10 10h-10V2z" />
  </svg>
);

const IconReports = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

// ── Feature data ──

const FEATURES: { icon: ReactNode; title: string; desc: string; path: string }[] = [
  {
    icon: <IconTakeHome />,
    title: 'Take Home Pay',
    desc: 'See exactly what lands in your account after tax, NI, and deductions.',
    path: '/take-home-pay',
  },
  {
    icon: <IconSavings />,
    title: 'Savings Calculator',
    desc: 'Track your expenses and discover your true savings rate.',
    path: '/calculator',
  },
  {
    icon: <IconCompound />,
    title: 'Compound Interest',
    desc: 'Visualise how your investments grow over decades.',
    path: '/compound-interest',
  },
  {
    icon: <IconNetWorth />,
    title: 'Net Worth Tracker',
    desc: 'Monitor assets, liabilities, and net worth over time.',
    path: '/net-worth',
  },
  {
    icon: <IconPortfolio />,
    title: 'Portfolio Simulator',
    desc: 'Run Monte Carlo simulations on your investment strategy.',
    path: '/portfolio',
  },
  {
    icon: <IconReports />,
    title: 'Reports',
    desc: 'Export your financial data as professional PDF reports.',
    path: '/reports',
  },
];

function FeatureCard({
  icon,
  title,
  desc,
  path,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  path: string;
}) {
  return (
    <Link
      to={path}
      className="landing-feature-card"
    >
      <span className="landing-feature-icon">{icon}</span>
      <h3 className="landing-feature-title">{title}</h3>
      <p className="landing-feature-desc">{desc}</p>
      <span className="landing-feature-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>
    </Link>
  );
}

// ── Landing Page ──

import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function LandingPage() {
  useDocumentTitle('TakeHomeCalc - Your Personal Finance Dashboard');
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const isLoggedIn = !loading && !!user;

  // ── Logged-in: clean tools-only view ──
  if (isLoggedIn) {
    return (
      <div className="landing-page landing-page--authed">
        <section className="landing-tools-header">
          <h1 className="landing-tools-greeting">
            Welcome back{user.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}.
          </h1>
          <p className="landing-tools-subtitle">Your tools</p>
        </section>

        <section className="landing-features landing-features--authed">
          <div className="landing-features-grid">
            {FEATURES.map((f) => (
              <FeatureCard key={f.path} {...f} />
            ))}
          </div>
        </section>

        <section className="landing-salary-searches">
          <div className="landing-salary-searches__header">
            <h2 className="landing-section-title">Popular salary landing pages</h2>
            <p className="landing-section-subtitle">Quick links to the salary pages people search for most often.</p>
          </div>
          <div className="landing-salary-searches__grid">
            {POPULAR_SALARY_AMOUNTS.slice(0, 8).map((amount) => (
              <Link key={amount} className="landing-salary-pill" to={buildSalaryPath(amount)}>
                {`£${amount.toLocaleString('en-GB')} after tax UK`}
              </Link>
            ))}
          </div>
        </section>

        <footer className="landing-footer">
          <span>TakeHomeCalc.co.uk</span>
          <span className="landing-footer-dot">&middot;</span>
          <span>Built in the UK</span>
        </footer>
      </div>
    );
  }

  // ── Logged-out: full marketing page ──
  return (
    <div className="landing-page">
      {/* ── Hero ── */}
      <section className="landing-hero">
        <h1 className="landing-hero-title">
          Understand your money,
          <br />
          <span className="landing-hero-accent">step by step.</span>
        </h1>
        <p className="landing-hero-subtitle">
          TakeHomeCalc helps you with what you take home,
          how much you save, how your investments can grow, and where you are headed.
        </p>
        <div className="landing-hero-actions">
          <button
            className="landing-cta-primary"
            onClick={() => navigate('/take-home-pay')}
          >
            Calculate take-home pay
          </button>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="landing-tools-grid" className="landing-features">
        <h2 className="landing-section-title">What you can do here</h2>
        <p className="landing-section-subtitle">
          Pick a tool based on the question you need to answer right now.
        </p>
        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <FeatureCard key={f.path} {...f} />
          ))}
        </div>
      </section>

      <section className="landing-salary-searches">
        <div className="landing-salary-searches__header">
          <h2 className="landing-section-title">Popular UK salary searches</h2>
          <p className="landing-section-subtitle">
            These salary pages answer common searches like “50,000 after tax UK” and “60,000 net UK”.
          </p>
        </div>
        <div className="landing-salary-searches__grid">
          {POPULAR_SALARY_AMOUNTS.map((amount) => (
            <Link key={amount} className="landing-salary-pill" to={buildSalaryPath(amount)}>
              {`£${amount.toLocaleString('en-GB')} after tax UK`}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>TakeHomeCalc.co.uk</span>
        <span className="landing-footer-dot">&middot;</span>
        <span>Built in the UK</span>
      </footer>

    </div>
  );
}
