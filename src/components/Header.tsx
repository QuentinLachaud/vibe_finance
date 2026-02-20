import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../state/ThemeContext';
import { useCurrency } from '../state/CurrencyContext';
import { useAuth } from '../state/AuthContext';
import { NAV_ITEMS } from '../router/navigation';
import { LoginModal } from './LoginModal';
import type { CurrencyCode } from '../types';
import type { User } from 'firebase/auth';

function UserMenu({ user, onClose }: { user: User; onClose: () => void }) {
  const { logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="user-menu">
      <div className="user-menu-name">{user.displayName || 'User'}</div>
      <div className="user-menu-email">{user.email}</div>
      <button className="user-menu-signout" onClick={handleSignOut}>
        Sign Out
      </button>
    </div>
  );
}

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Logo */}
        <div className="header-logo">
          <span className="logo-icon">💰</span>
          <span className="logo-text">Finance is Fun</span>
        </div>

        {/* Navigation */}
        <nav className="header-nav">
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

        {/* Settings (gear icon, far right of nav) */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `nav-link nav-link--settings ${isActive ? 'nav-link--active' : ''}`
          }
          aria-label="Settings"
        >
          ⚙️
        </NavLink>

        {/* Right controls */}
        <div className="header-controls">
          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
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
                  <UserMenu user={user} onClose={() => setShowMenu(false)} />
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
