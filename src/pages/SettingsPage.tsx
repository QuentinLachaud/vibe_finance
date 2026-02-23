import { useMemo, useState } from 'react';
import { useTheme } from '../state/ThemeContext';
import { useCurrency } from '../state/CurrencyContext';
import { useAuth } from '../state/AuthContext';
import { usePersistedState } from '../hooks/usePersistedState';
import type { CurrencyCode } from '../types';
import type { ThemeMode } from '../types';

type PathDisplay = 'quartiles' | 'all' | 'both';

const SIM_YEARS_KEY = 'vibe-finance-sim-default-years';

function getSavedSimulationYears(): number {
  try {
    const raw = localStorage.getItem(SIM_YEARS_KEY);
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      return Math.min(60, Math.max(5, Math.round(parsed)));
    }
  } catch {
    // ignore storage issues
  }
  return 30;
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { user, logout } = useAuth();

  const [simulationYears, setSimulationYears] = useState<number>(getSavedSimulationYears);
  const [numPaths, setNumPaths] = usePersistedState<number>('vf-ps-num-paths', 500);
  const [chartDisplay, setChartDisplay] = usePersistedState<PathDisplay>('vf-ps-show-all-paths', 'quartiles');
  const [status, setStatus] = useState<string>('');

  const accountLabel = useMemo(() => {
    if (!user) return 'Not signed in';
    return user.displayName || user.email || 'Signed in';
  }, [user]);

  const saveSimulationYears = () => {
    const normalized = Math.min(60, Math.max(5, Math.round(simulationYears)));
    setSimulationYears(normalized);
    localStorage.setItem(SIM_YEARS_KEY, String(normalized));
    setStatus('Simulation defaults saved.');
  };

  const exportPreferences = () => {
    const payload = {
      theme,
      currency: currency.code,
      simulationYears,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vibe-finance-preferences.json';
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Preferences exported.');
  };

  const resetPreferences = () => {
    const confirmed = window.confirm('Reset theme, currency, and simulation defaults?');
    if (!confirmed) return;

    const defaultTheme: ThemeMode = 'dark';
    const defaultCurrency: CurrencyCode = 'GBP';
    const defaultSimulationYears = 30;

    setTheme(defaultTheme);
    setCurrency(defaultCurrency);
    setSimulationYears(defaultSimulationYears);
    localStorage.setItem(SIM_YEARS_KEY, String(defaultSimulationYears));
    setStatus('Preferences reset to defaults.');
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Personalize your workspace and defaults.</p>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <h2 className="settings-card-title">Account</h2>
          <p className="settings-text">{accountLabel}</p>
          {user && (
            <button className="settings-btn settings-btn--secondary" onClick={logout}>
              Sign out
            </button>
          )}
        </section>

        <section className="settings-card">
          <h2 className="settings-card-title">Display</h2>
          <div className="settings-field">
            <label className="settings-label">Theme</label>
            <div className="settings-segmented">
              <button
                className={`settings-segment ${theme === 'dark' ? 'settings-segment--active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
              <button
                className={`settings-segment ${theme === 'light' ? 'settings-segment--active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
            </div>
          </div>

          <div className="settings-field">
            <label className="settings-label" htmlFor="settings-currency">Default currency</label>
            <select
              id="settings-currency"
              className="settings-select"
              value={currency.code}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            >
              <option value="GBP">£ GBP</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
            </select>
          </div>
        </section>

        <section className="settings-card">
          <h2 className="settings-card-title">Portfolio defaults</h2>
          <div className="settings-field">
            <label className="settings-label" htmlFor="settings-sim-years">Default simulation horizon</label>
            <div className="settings-inline">
              <input
                id="settings-sim-years"
                className="settings-input"
                type="number"
                min={5}
                max={60}
                step={1}
                value={simulationYears}
                onChange={(e) => setSimulationYears(Number(e.target.value || 30))}
              />
              <span className="settings-suffix">years</span>
              <button className="settings-btn settings-btn--primary" onClick={saveSimulationYears}>
                Save
              </button>
            </div>
          </div>
          <p className="settings-note">Used as the default end date in Portfolio Simulator.</p>
        </section>

        <section className="settings-card">
          <h2 className="settings-card-title">Advanced Simulation</h2>

          <div className="settings-field">
            <label className="settings-label">Simulation Paths</label>
            <p className="settings-note" style={{ marginBottom: 8 }}>More paths = smoother results but slower.</p>
            <div className="settings-segmented">
              <button
                className={`settings-segment ${numPaths === 500 ? 'settings-segment--active' : ''}`}
                onClick={() => setNumPaths(500)}
              >
                500
              </button>
              <button
                className={`settings-segment ${numPaths === 2000 ? 'settings-segment--active' : ''}`}
                onClick={() => setNumPaths(2000)}
              >
                2,000
              </button>
            </div>
          </div>

          <div className="settings-field">
            <label className="settings-label">Chart Display</label>
            <p className="settings-note" style={{ marginBottom: 8 }}>Choose how Monte Carlo results are visualised.</p>
            <div className="settings-segmented">
              <button
                className={`settings-segment ${chartDisplay === 'quartiles' ? 'settings-segment--active' : ''}`}
                onClick={() => setChartDisplay('quartiles')}
              >
                Quartiles
              </button>
              <button
                className={`settings-segment ${chartDisplay === 'all' ? 'settings-segment--active' : ''}`}
                onClick={() => setChartDisplay('all')}
              >
                All Paths
              </button>
              <button
                className={`settings-segment ${chartDisplay === 'both' ? 'settings-segment--active' : ''}`}
                onClick={() => setChartDisplay('both')}
              >
                Both
              </button>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <h2 className="settings-card-title">Data</h2>
          <div className="settings-actions">
            <button className="settings-btn settings-btn--secondary" onClick={exportPreferences}>
              Export preferences
            </button>
            <button className="settings-btn settings-btn--secondary" onClick={resetPreferences}>
              Reset to defaults
            </button>
          </div>
          {status && <p className="settings-status">{status}</p>}
        </section>
      </div>
    </div>
  );
}
