import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../state/ThemeContext';
import { useCurrency } from '../state/CurrencyContext';
import { useAuth } from '../state/AuthContext';
import { NAV_ITEMS } from '../router/navigation';
import { LoginModal } from './LoginModal';
import type { CurrencyCode } from '../types';
import type { User } from 'firebase/auth';

function UserMenu({ user, onClose, onSignOut }: { user: User; onClose: () => void; onSignOut: () => void }) {
  const handleSignOut = async () => {
    onSignOut();
    onClose();
  };

  return (
    <div className="user-menu">
      <div className="user-menu-name">{user.displayName || 'User'}</div>
      <div className="user-menu-email">{user.email}</div>
      <NavLink
        to="/settings"
        className="user-menu-settings-link"
        onClick={onClose}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        Settings
      </NavLink>
      <button className="user-menu-signout" onClick={handleSignOut}>
        Sign Out
      </button>
    </div>
  );
}

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close user menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const isHomePage = location.pathname === '/';

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Logo — shows "Home" on mobile when not on home page */}
        <Link to="/" className="header-logo">
          <span className="logo-text logo-text--full">TakeHomeCalc<span className="logo-tld">.co.uk</span></span>
          {!isHomePage && <span className="logo-text logo-text--short">Home</span>}
        </Link>

        {/* Desktop Navigation */}
        <nav className="header-nav header-nav--desktop">
          {NAV_ITEMS.filter((item) => !item.isSettings).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link--active' : ''}${item.isGold ? ' nav-link--gold' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right controls (always visible) */}
        <div className="header-controls">
          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg className="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg className="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Currency selector */}
          <select
            className="currency-select"
            value={currency.code}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            aria-label="Select currency"
          >
            <option value="GBP">£ GBP</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>

          {/* Auth */}
          {!loading && (
            user ? (
              <div className="user-avatar-wrapper" ref={menuRef}>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="user-avatar"
                    onClick={() => setShowMenu((v) => !v)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <button
                    className="auth-btn"
                    onClick={() => setShowMenu((v) => !v)}
                  >
                    {(user.displayName || user.email || 'U').charAt(0)}
                  </button>
                )}
                {showMenu && (
                  <UserMenu
                    user={user}
                    onClose={() => setShowMenu(false)}
                    onSignOut={async () => {
                      await logout();
                      navigate('/');
                    }}
                  />
                )}
              </div>
            ) : (
              <button className="auth-btn" onClick={() => setShowLogin(true)}>
                Sign In
              </button>
            )
          )}
        </div>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </header>
  );
}
