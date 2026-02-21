import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { useCurrency } from '../state/CurrencyContext';
import { formatCurrency } from '../utils/currency';
import { usePersistedState } from '../hooks/usePersistedState';
import type { CurrencyCode } from '../types';

// ── Types ──

interface AssetSnapshot {
  date: string; // "YYYY-MM-DD"
  value: number;
}

interface Asset {
  id: string;
  emoji: string;
  name: string;
  type: string;
  snapshots: AssetSnapshot[];
}

// ── Constants ──

const EMOJI_OPTIONS = [
  '🏠', '🚗', '💰', '📈', '🏦', '💎', '🪙', '🏢',
  '💼', '🎨', '⌚', '🏝️', '🔑', '📱', '🖥️', '🎵',
];

const DEFAULT_TYPES = [
  'Property', 'Cash & Savings', 'Investments', 'Pension',
  'Vehicle', 'Crypto', 'Collectibles', 'Business',
];

const ASSET_COLORS = [
  '#22d3ee', '#8b5cf6', '#10b981', '#f59e0b',
  '#3b82f6', '#ec4899', '#ef4444', '#06b6d4',
  '#a855f7', '#14b8a6', '#f97316', '#6366f1',
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function latestValue(asset: Asset): number {
  if (!asset.snapshots.length) return 0;
  const sorted = [...asset.snapshots].sort((a, b) => a.date.localeCompare(b.date));
  return sorted[sorted.length - 1].value;
}

// ── Sub-components ──

function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="nw-emoji-picker" ref={ref}>
      <button className="nw-emoji-btn" onClick={() => setOpen(!open)} type="button" title="Choose icon">
        {value}
      </button>
      {open && (
        <div className="nw-emoji-dropdown">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              className={`nw-emoji-option ${e === value ? 'nw-emoji-option--active' : ''}`}
              onClick={() => { onChange(e); setOpen(false); }}
              type="button"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeSelector({
  value,
  onChange,
  customTypes,
}: {
  value: string;
  onChange: (type: string) => void;
  customTypes: string[];
}) {
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const allTypes = useMemo(() => {
    const set = new Set([...customTypes, ...DEFAULT_TYPES]);
    return Array.from(set);
  }, [customTypes]);

  return (
    <div className="nw-type-selector">
      {!showCustom ? (
        <>
          <select
            className="nw-select"
            value={value}
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                setShowCustom(true);
              } else {
                onChange(e.target.value);
              }
            }}
          >
            <option value="__custom__">+ Custom Type</option>
            {allTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </>
      ) : (
        <div className="nw-custom-type-row">
          <input
            className="nw-input"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Enter custom type…"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customInput.trim()) {
                onChange(customInput.trim());
                setShowCustom(false);
                setCustomInput('');
              } else if (e.key === 'Escape') {
                setShowCustom(false);
              }
            }}
          />
          <button
            className="nw-btn-sm"
            onClick={() => {
              if (customInput.trim()) { onChange(customInput.trim()); setShowCustom(false); setCustomInput(''); }
            }}
            type="button"
          >
            Add
          </button>
          <button className="nw-btn-sm nw-btn-sm--muted" onClick={() => setShowCustom(false)} type="button">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/** Asset form — used for both creation and editing. */
function AssetForm({
  initial,
  customTypes,
  onSave,
  onCancel,
  onNewCustomType,
}: {
  initial?: Asset;
  customTypes: string[];
  onSave: (asset: Asset) => void;
  onCancel: () => void;
  onNewCustomType: (t: string) => void;
}) {
  const [emoji, setEmoji] = useState(initial?.emoji || '💰');
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || DEFAULT_TYPES[0]);
  const [value, setValue] = useState(initial ? String(latestValue(initial)) : '');
  const [date, setDate] = useState(
    initial?.snapshots.length
      ? [...initial.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0].date
      : todayStr(),
  );
  const { currency } = useCurrency();

  const handleTypeChange = useCallback((t: string) => {
    setType(t);
    if (!DEFAULT_TYPES.includes(t)) {
      onNewCustomType(t);
    }
  }, [onNewCustomType]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const parsed = Number(value.replace(/,/g, ''));
    if (isNaN(parsed)) return;

    const existing = initial
      ? initial.snapshots.filter(s => s.date !== date)
      : [];

    const asset: Asset = {
      id: initial?.id || generateId(),
      emoji,
      name: name.trim(),
      type,
      snapshots: [...existing, { date, value: parsed }].sort((a, b) => a.date.localeCompare(b.date)),
    };
    onSave(asset);
  };

  return (
    <div className="nw-form">
      <div className="nw-form-row">
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <input
          className="nw-input nw-input--name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Asset name"
          autoFocus
        />
      </div>

      <div className="nw-form-row">
        <label className="nw-form-label">Type</label>
        <TypeSelector value={type} onChange={handleTypeChange} customTypes={customTypes} />
      </div>

      <div className="nw-form-row">
        <label className="nw-form-label">Value</label>
        <div className="nw-value-row">
          <span className="nw-currency-prefix">{currency.symbol}</span>
          <input
            className="nw-input nw-input--value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            inputMode="numeric"
          />
          <span className="nw-form-label" style={{ marginLeft: 12 }}>as of</span>
          <input
            className="nw-input nw-input--date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="nw-form-actions">
        <button className="ps-btn ps-btn--primary" onClick={handleSubmit} type="button">
          {initial ? 'Save Changes' : 'Add Asset'}
        </button>
        <button className="ps-btn ps-btn--secondary" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** A single asset card row. */
function AssetCard({
  asset,
  color,
  currencyCode,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  color: string;
  currencyCode: CurrencyCode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const val = latestValue(asset);
  const latestDate = asset.snapshots.length
    ? [...asset.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0].date
    : '';

  return (
    <div className="nw-asset-card">
      <div className="nw-asset-left">
        <span className="nw-asset-emoji" style={{ background: `${color}18` }}>{asset.emoji}</span>
        <div className="nw-asset-info">
          <span className="nw-asset-name">{asset.name}</span>
          <span className="nw-asset-type">{asset.type}</span>
        </div>
      </div>
      <div className="nw-asset-right">
        <div className="nw-asset-value-col">
          <span className="nw-asset-value">{formatCurrency(val, currencyCode)}</span>
          {latestDate && <span className="nw-asset-date">as of {formatDateShort(latestDate)}</span>}
        </div>
        <div className="nw-asset-actions">
          <button className="nw-action-btn" onClick={onEdit} title="Update">
            Update
          </button>
          <button className="nw-action-btn nw-action-btn--del" onClick={onDelete} title="Remove">
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

/** Individual asset value-over-time chart */
function AssetHistoryChart({ asset, currencyCode, color }: { asset: Asset; currencyCode: CurrencyCode; color: string }) {
  if (asset.snapshots.length < 2) return null;

  const data = [...asset.snapshots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ date: formatDateShort(s.date), value: s.value }));

  return (
    <div className="nw-asset-chart">
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
            formatter={(v: number | undefined) => v != null ? formatCurrency(v, currencyCode) : ''}
            labelStyle={{ color: 'var(--text-muted)' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${asset.id})`}
            dot={{ fill: color, r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Net worth over time chart (all assets aggregated) */
function NetWorthChart({ assets, currencyCode }: { assets: Asset[]; currencyCode: CurrencyCode }) {
  // Gather all unique dates across all assets
  const dateSet = new Set<string>();
  for (const a of assets) {
    for (const s of a.snapshots) dateSet.add(s.date);
  }
  const allDates = Array.from(dateSet).sort();
  if (allDates.length < 2) return null;

  // For each date, carry forward each asset's latest known value
  const data = allDates.map((date) => {
    let total = 0;
    for (const a of assets) {
      const sorted = [...a.snapshots].sort((x, y) => x.date.localeCompare(y.date));
      let val = 0;
      for (const s of sorted) {
        if (s.date <= date) val = s.value;
      }
      total += val;
    }
    return { date: formatDateShort(date), total };
  });

  return (
    <div className="nw-net-chart-wrap">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-color)' }}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)
            }
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
            formatter={(v: number | undefined) => v != null ? formatCurrency(v, currencyCode) : ''}
            labelStyle={{ color: 'var(--text-muted)' }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#22d3ee"
            strokeWidth={2.5}
            fill="url(#nwGrad)"
            name="Net Worth"
            dot={{ fill: '#22d3ee', r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main Page ──

export function NetWorthPage() {
  const { currency } = useCurrency();
  const [assets, setAssets] = usePersistedState<Asset[]>('vf-net-worth-assets', []);
  const [customTypes, setCustomTypes] = usePersistedState<string[]>('vf-net-worth-custom-types', []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(true);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  const totalNetWorth = useMemo(() => assets.reduce((sum, a) => sum + latestValue(a), 0), [assets]);

  // Group by type
  const groupedByType = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const a of assets) {
      if (!map.has(a.type)) map.set(a.type, []);
      map.get(a.type)!.push(a);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const aTotal = a[1].reduce((s, x) => s + latestValue(x), 0);
      const bTotal = b[1].reduce((s, x) => s + latestValue(x), 0);
      return bTotal - aTotal;
    });
  }, [assets]);

  const handleSave = useCallback((asset: Asset) => {
    setAssets((prev) => {
      const idx = prev.findIndex((a) => a.id === asset.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = asset;
        return next;
      }
      return [...prev, asset];
    });
    setShowForm(false);
    setEditingId(null);
  }, [setAssets]);

  const handleDelete = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, [setAssets]);

  const handleNewCustomType = useCallback((t: string) => {
    setCustomTypes((prev) => {
      if (prev.includes(t)) return prev;
      return [...prev, t];
    });
  }, [setCustomTypes]);

  const editingAsset = editingId ? assets.find((a) => a.id === editingId) : undefined;

  // Has enough data for a net worth chart?
  const hasChartData = useMemo(() => {
    const dateSet = new Set<string>();
    for (const a of assets) for (const s of a.snapshots) dateSet.add(s.date);
    return dateSet.size >= 2;
  }, [assets]);

  return (
    <div className="page-container">
      <div className="ps-page">
        <div className="nw-header">
          <div>
            <h1 className="ps-page-title">Net Worth</h1>
            <p className="nw-subtitle">Track your assets and watch your wealth grow over time.</p>
          </div>
          <div className="nw-total-card">
            <span className="nw-total-label">Total Net Worth</span>
            <span className="nw-total-value">{formatCurrency(totalNetWorth, currency.code)}</span>
          </div>
        </div>

        {/* Net worth over time chart */}
        {hasChartData && (
          <div className="ps-card nw-chart-card">
            <div className="nw-chart-header">
              <h2 className="ps-card-title">Net Worth Over Time</h2>
              <button
                className="nw-toggle-btn"
                onClick={() => setShowChart(!showChart)}
              >
                {showChart ? 'Hide Chart' : 'Show Chart'}
              </button>
            </div>
            {showChart && (
              <NetWorthChart assets={assets} currencyCode={currency.code} />
            )}
          </div>
        )}

        {/* Asset list */}
        <div className="ps-card nw-assets-card">
          <div className="nw-assets-header">
            <h2 className="ps-card-title">Assets</h2>
            {!showForm && !editingId && (
              <button
                className="nw-add-btn"
                onClick={() => setShowForm(true)}
                title="Add Asset"
              >
                <span className="nw-add-icon">+</span>
              </button>
            )}
          </div>

          {/* Create form */}
          {showForm && !editingId && (
            <AssetForm
              customTypes={customTypes}
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
              onNewCustomType={handleNewCustomType}
            />
          )}

          {/* Edit form */}
          {editingId && editingAsset && (
            <AssetForm
              initial={editingAsset}
              customTypes={customTypes}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
              onNewCustomType={handleNewCustomType}
            />
          )}

          {assets.length === 0 && !showForm && (
            <div className="nw-empty">
              <p>No assets yet. Add your first asset to start tracking your net worth.</p>
              <button
                className="nw-add-btn nw-add-btn--large"
                onClick={() => setShowForm(true)}
              >
                <span className="nw-add-icon">+</span>
                <span>Add Asset</span>
              </button>
            </div>
          )}

          {/* Grouped asset list */}
          {groupedByType.map(([typeName, typeAssets]) => {
            const typeTotal = typeAssets.reduce((s, a) => s + latestValue(a), 0);
            return (
              <div key={typeName} className="nw-type-group">
                <div className="nw-type-group-header">
                  <span className="nw-type-group-name">{typeName}</span>
                  <span className="nw-type-group-total">{formatCurrency(typeTotal, currency.code)}</span>
                </div>
                {typeAssets.map((asset) => (
                  <div key={asset.id}>
                    <div onClick={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)} style={{ cursor: asset.snapshots.length >= 2 ? 'pointer' : 'default' }}>
                      <AssetCard
                        asset={asset}
                        color={ASSET_COLORS[assets.indexOf(asset) % ASSET_COLORS.length]}
                        currencyCode={currency.code}
                        onEdit={() => setEditingId(asset.id)}
                        onDelete={() => handleDelete(asset.id)}
                      />
                    </div>
                    {expandedAsset === asset.id && (
                      <AssetHistoryChart
                        asset={asset}
                        currencyCode={currency.code}
                        color={ASSET_COLORS[assets.indexOf(asset) % ASSET_COLORS.length]}
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
