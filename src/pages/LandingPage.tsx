import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { LoginModal } from '../components/LoginModal';

// ── Animated feature cards data ──

const FEATURES = [
  {
    icon: '💰',
    title: 'Take Home Pay',
    desc: 'See exactly what lands in your account after tax, NI, and deductions.',
    path: '/take-home-pay',
  },
  {
    icon: '📊',
    title: 'Savings Calculator',
    desc: 'Track your expenses and discover your true savings rate.',
    path: '/calculator',
  },
  {
    icon: '📈',
    title: 'Compound Interest',
    desc: 'Visualise how your investments grow over decades.',
    path: '/compound-interest',
  },
  {
    icon: '🏦',
    title: 'Net Worth Tracker',
    desc: 'Monitor assets, liabilities, and net worth over time.',
    path: '/net-worth',
  },
  {
    icon: '🎯',
    title: 'Portfolio Simulator',
    desc: 'Run Monte Carlo simulations on your investment strategy.',
    path: '/portfolio',
  },
  {
    icon: '📑',
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
  icon: string;
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
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <span className="landing-feature-icon">{icon}</span>
      <h3 className="landing-feature-title">{title}</h3>
      <p className="landing-feature-desc">{desc}</p>
      <span className="landing-feature-arrow">→</span>
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
          {!loading && user ? (
            <>
              <div className="landing-welcome">
                <span className="landing-welcome-dot" />
                Signed in as <strong>{user.displayName || user.email}</strong>
              </div>
              <button
                className="landing-cta-primary"
                onClick={() => navigate('/calculator')}
              >
                Open Dashboard
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
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
        {!loading && !user && (
          <button
            className="landing-cta-primary"
            onClick={() => setShowLogin(true)}
          >
            Sign in and keep your progress
          </button>
        )}
        {!loading && user && (
          <button
            className="landing-cta-primary"
            onClick={() => navigate('/calculator')}
          >
            Open Dashboard
          </button>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>TakeHomeCalc.co.uk</span>
        <span className="landing-footer-dot">·</span>
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
