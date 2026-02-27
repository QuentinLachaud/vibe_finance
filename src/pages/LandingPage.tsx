import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { LoginModal } from '../components/LoginModal';

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

// ── Feature card with staggered entrance ──

function FeatureCard({
  icon,
  title,
  desc,
  path,
  index,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  path: string;
  index: number;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      to={path}
      className={`landing-feature-card ${visible ? 'landing-feature-card--visible' : ''}`}
      style={{ transitionDelay: `${index * 80}ms` }}
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

export function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  // Trigger hero entrance
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const isLoggedIn = !loading && !!user;

  // ── Logged-in: clean tools-only view ──
  if (isLoggedIn) {
    return (
      <div className="landing-page landing-page--authed">
        <section className={`landing-tools-header ${heroVisible ? 'landing-tools-header--visible' : ''}`}>
          <h1 className="landing-tools-greeting">
            Welcome back{user.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}.
          </h1>
          <p className="landing-tools-subtitle">Your tools</p>
        </section>

        <section className="landing-features landing-features--authed">
          <div className="landing-features-grid">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.path} {...f} index={i} />
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
      <section className={`landing-hero ${heroVisible ? 'landing-hero--visible' : ''}`}>
        <div className="landing-hero-glow" />
        <h1 className="landing-hero-title">
          Understand your money,
          <br />
          <span className="landing-hero-accent">step by step.</span>
        </h1>
        <p className="landing-hero-subtitle">
          TakeHomeCalc helps you with what you take home,
          how much you save, how your investments can grow, and where you are headed.
        </p>
        <p className="landing-hero-note">
          Plan for the future you want
        </p>

        <div className="landing-hero-actions">
          <button
            className="landing-cta-primary"
            onClick={() => setShowLogin(true)}
          >
            Sign in and save your data
          </button>
          <button
            className="landing-cta-secondary"
            onClick={() => navigate('/calculator')}
          >
            Try the tools now
          </button>
        </div>
      </section>

      {/* ── Stats ribbon ── */}
      <section className="landing-stats">
        <div className="landing-stat">
          <span className="landing-stat-number">6</span>
          <span className="landing-stat-label">Core planning tools</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-number">Tax + NI</span>
          <span className="landing-stat-label">Included in pay estimates</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-number">PDF</span>
          <span className="landing-stat-label">Reports when you need them</span>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="landing-features">
        <h2 className="landing-section-title">What you can do here</h2>
        <p className="landing-section-subtitle">
          Pick a tool based on the question you need to answer right now.
        </p>
        <div className="landing-features-grid">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.path} {...f} index={i} />
          ))}
        </div>
      </section>

      {/* ── CTA bottom ── */}
      <section className="landing-bottom-cta">
        <h2 className="landing-bottom-title">Start with one question</h2>
        <p className="landing-bottom-subtitle">
          Start with take-home pay or savings, then build a full plan from there.
        </p>
        <button
          className="landing-cta-primary"
          onClick={() => setShowLogin(true)}
        >
          Sign in and keep your progress
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>TakeHomeCalc.co.uk</span>
        <span className="landing-footer-dot">&middot;</span>
        <span>Built in the UK</span>
      </footer>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            navigate('/calculator');
          }}
        />
      )}
    </div>
  );
}
