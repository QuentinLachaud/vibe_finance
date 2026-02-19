import { NavLink } from 'react-router-dom';
import { useTheme } from '../state/ThemeContext';
import { useCurrency } from '../state/CurrencyContext';
import { NAV_ITEMS } from '../router/navigation';
import type { CurrencyCode } from '../types';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Logo */}
        <div className="header-logo">
          <span className="logo-icon">💰</span>
          <span className="logo-text">Savings Calculator</span>
        </div>

        {/* Navigation */}
        <nav className="header-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

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
        </div>
      </div>
    </header>
  );
}
