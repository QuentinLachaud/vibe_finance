import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Sector,
} from 'recharts';
import { useCurrency } from '../state/CurrencyContext';
import { formatCurrency } from '../utils/currency';
import { usePersistedState } from '../hooks/usePersistedState';
import { useAuth } from '../state/AuthContext';
import { loadNetWorth, saveNetWorth } from '../services/userDataService';
import { TrashIcon } from '../components/Icons';
import { ConfirmDialog } from '../components/calculator/ConfirmDialog';
import { LoadingCoin } from '../components/LoadingCoin';
import { exportNetWorthPdf } from '../utils/exportPdf';
import { useSavedReports } from '../hooks/useSavedReports';
import type { CurrencyCode } from '../types';

// ── Types ──

export interface AssetSnapshot {
  date: string; // "YYYY-MM-DD"
  value: number; // positive = asset, negative = liability
}

export interface Asset {
  id: string;
  emoji: string;
  name: string;
  type: string;
  snapshots: AssetSnapshot[];
  createdAt: string;
  updatedAt: string;
}

/** Versioned JSON blob — designed for DB/S3 persistence per user */
export interface NetWorthData {
  version: 1;
  assets: Asset[];
  customTypes: string[];
  lastModified: string; // ISO-8601
}

// ── Constants ──

const EMOJI_OPTIONS = [
  '🏠', '🚗', '💰', '📈', '🏦', '💎', '🪙', '🏢',
  '💼', '🎨', '⌚', '🏝️', '🔑', '📱', '🖥️', '🎵',
  '🏘️', '💳', '🏗️', '🎓', '🏥', '📦',
];

const DEFAULT_ASSET_TYPES = [
  'Property', 'Cash & Savings', 'Investments', 'Pension',
  'Vehicle', 'Crypto', 'Collectibles', 'Business',
];

const DEFAULT_DEBT_TYPES = [
  'Mortgage', 'Student Loan', 'Car Loan', 'Credit Card',
  'Personal Loan', 'Other Debt',
];

const DEFAULT_TYPES = [...DEFAULT_ASSET_TYPES, ...DEFAULT_DEBT_TYPES];

const DEBT_TYPE_SET = new Set(DEFAULT_DEBT_TYPES);

/** Returns true if the given type is a known debt/liability type */
function isDebtType(type: string): boolean {
  return DEBT_TYPE_SET.has(type);
}

type SortMode = 'type' | 'class' | 'value';

const ASSET_COLORS = [
  '#22d3ee', '#8b5cf6', '#10b981', '#f59e0b',
  '#3b82f6', '#ec4899', '#ef4444', '#06b6d4',
  '#a855f7', '#14b8a6', '#f97316', '#6366f1',
];

// ── Example assets shown when user has no data ──
const EXAMPLE_ASSETS: Asset[] = [
  {
    id: 'example-1', emoji: '🏠', name: 'Primary Residence', type: 'Property',
    snapshots: [
      { date: '2023-01-15', value: 280000 },
      { date: '2023-07-01', value: 290000 },
      { date: '2024-01-15', value: 305000 },
      { date: '2024-07-01', value: 315000 },
      { date: '2025-01-15', value: 330000 },
    ],
    createdAt: '', updatedAt: '',
  },
  {
    id: 'example-2', emoji: '📈', name: 'ISA Portfolio', type: 'Investments',
    snapshots: [
      { date: '2023-01-15', value: 18000 },
      { date: '2023-07-01', value: 22000 },
      { date: '2024-01-15', value: 28000 },
      { date: '2024-07-01', value: 34000 },
      { date: '2025-01-15', value: 41000 },
    ],
    createdAt: '', updatedAt: '',
  },
  {
    id: 'example-3', emoji: '💰', name: 'Emergency Fund', type: 'Cash & Savings',
    snapshots: [
      { date: '2023-01-15', value: 5000 },
      { date: '2023-07-01', value: 7500 },
      { date: '2024-01-15', value: 10000 },
      { date: '2024-07-01', value: 10000 },
      { date: '2025-01-15', value: 12000 },
    ],
    createdAt: '', updatedAt: '',
  },
  {
    id: 'example-4', emoji: '🏦', name: 'Workplace Pension', type: 'Pension',
    snapshots: [
      { date: '2023-01-15', value: 14000 },
      { date: '2023-07-01', value: 18000 },
      { date: '2024-01-15', value: 23000 },
      { date: '2024-07-01', value: 27000 },
      { date: '2025-01-15', value: 32000 },
    ],
    createdAt: '', updatedAt: '',
  },
  {
    id: 'example-5', emoji: '💳', name: 'Credit Card', type: 'Credit Card',
    snapshots: [
      { date: '2023-01-15', value: -3200 },
      { date: '2023-07-01', value: -2800 },
      { date: '2024-01-15', value: -1900 },
      { date: '2024-07-01', value: -1200 },
      { date: '2025-01-15', value: -800 },
    ],
    createdAt: '', updatedAt: '',
  },
];

const TYPE_COLORS: Record<string, string> = {
  Property: '#22d3ee',
  'Cash & Savings': '#10b981',
  Investments: '#8b5cf6',
  Pension: '#f59e0b',
  Vehicle: '#3b82f6',
  Crypto: '#ec4899',
  Collectibles: '#ef4444',
  Business: '#06b6d4',
  Mortgage: '#f97316',
  'Student Loan': '#a855f7',
  'Car Loan': '#6366f1',
  'Credit Card': '#ef4444',
  'Personal Loan': '#f59e0b',
  'Other Debt': '#71717a',
};

function colorForType(type: string, idx: number): string {
  return TYPE_COLORS[type] || ASSET_COLORS[idx % ASSET_COLORS.length];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function nowISO(): string {
  return new Date().toISOString();
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

const defaultData: NetWorthData = {
  version: 1,
  assets: [],
  customTypes: [],
  lastModified: nowISO(),
};

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
  onRemoveCustomType,
}: {
  value: string;
  onChange: (type: string) => void;
  customTypes: string[];
  onRemoveCustomType?: (type: string) => void;
}) {
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const customOnlyTypes = useMemo(
    () => customTypes.filter(t => !DEFAULT_ASSET_TYPES.includes(t) && !DEFAULT_DEBT_TYPES.includes(t)),
    [customTypes],
  );
  const allAssetTypes = useMemo(() => [...DEFAULT_ASSET_TYPES, ...customOnlyTypes], [customOnlyTypes]);

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
            <optgroup label="Assets">
              {allAssetTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
            <optgroup label="Liabilities">
              {DEFAULT_DEBT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
            <option value="__custom__">+ Custom Type</option>
          </select>
          {onRemoveCustomType && customOnlyTypes.length > 0 && (
            <div className="nw-custom-types-list">
              {customOnlyTypes.map(t => (
                <span key={t} className="nw-custom-type-chip">
                  {t}
                  <button
                    className="nw-custom-type-remove"
                    onClick={(e) => { e.stopPropagation(); onRemoveCustomType(t); }}
                    title={`Remove "${t}" type`}
                    type="button"
                  >
                    <TrashIcon size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
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
  onRemoveCustomType,
}: {
  initial?: Asset;
  customTypes: string[];
  onSave: (asset: Asset) => void;
  onCancel: () => void;
  onNewCustomType: (t: string) => void;
  onRemoveCustomType: (t: string) => void;
}) {
  const [emoji, setEmoji] = useState(initial?.emoji || '💰');
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || DEFAULT_ASSET_TYPES[0]);
  const [value, setValue] = useState(initial ? String(Math.abs(latestValue(initial))) : '');
  const [date, setDate] = useState(
    initial?.snapshots.length
      ? [...initial.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0].date
      : todayStr(),
  );
  const { currency } = useCurrency();
  const debt = isDebtType(type);

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

    // Debt types are always stored as negative
    const finalValue = debt ? -Math.abs(parsed) : Math.abs(parsed);

    const existing = initial
      ? initial.snapshots.filter(s => s.date !== date)
      : [];

    const now = nowISO();
    const asset: Asset = {
      id: initial?.id || generateId(),
      emoji,
      name: name.trim(),
      type,
      snapshots: [...existing, { date, value: finalValue }].sort((a, b) => a.date.localeCompare(b.date)),
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    };
    onSave(asset);
  };

  return (
    <div className={`nw-form${debt ? ' nw-form--debt' : ''}`}>
      {debt && (
        <div className="nw-form-debt-badge">Liability</div>
      )}
      <div className="nw-form-row">
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <input
          className="nw-input nw-input--name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={debt ? 'Liability name' : 'Asset name'}
          autoFocus
        />
      </div>

      <div className="nw-form-row">
        <label className="nw-form-label">Type</label>
        <TypeSelector value={type} onChange={handleTypeChange} customTypes={customTypes} onRemoveCustomType={onRemoveCustomType} />
      </div>

      <div className="nw-form-row">
        <label className="nw-form-label">{debt ? 'Owed' : 'Value'}</label>
        <div className="nw-value-row">
          {debt && <span className="nw-debt-prefix">−</span>}
          <span className="nw-currency-prefix">{currency.symbol}</span>
          <input
            className={`nw-input nw-input--value${debt ? ' nw-input--debt' : ''}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
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
          {initial ? 'Save Changes' : debt ? 'Add Liability' : 'Add Asset'}
        </button>
        <button className="ps-btn ps-btn--secondary" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── History Popup ──

function HistoryPopup({
  asset,
  currencyCode,
  onDelete,
  onClose,
}: {
  asset: Asset;
  currencyCode: CurrencyCode;
  onDelete: (assetId: string, date: string) => void;
  onClose: () => void;
}) {
  const [confirmDate, setConfirmDate] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const sorted = [...asset.snapshots].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="nw-history-overlay">
      <div className="nw-history-popup" ref={popupRef}>
        <div className="nw-history-header">
          <span className="nw-history-title">{asset.emoji} {asset.name} — History</span>
          <button className="nw-history-close" onClick={onClose}>×</button>
        </div>
        <div className="nw-history-list">
          {sorted.length === 0 && <div className="nw-history-empty">No entries yet.</div>}
          {sorted.map((snap) => (
            <div className="nw-history-row" key={snap.date}>
              <span className="nw-history-date">{formatDateShort(snap.date)}</span>
              <span className={`nw-history-value${snap.value < 0 ? ' nw-history-value--neg' : ''}`}>
                {formatCurrency(snap.value, currencyCode)}
              </span>
              {confirmDate === snap.date ? (
                <div className="nw-history-confirm">
                  <span className="nw-history-confirm-text">Permanent. Delete?</span>
                  <button
                    className="nw-history-confirm-yes"
                    onClick={(e) => { e.stopPropagation(); onDelete(asset.id, snap.date); setConfirmDate(null); }}
                  >
                    Yes
                  </button>
                  <button
                    className="nw-history-confirm-no"
                    onClick={(e) => { e.stopPropagation(); setConfirmDate(null); }}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  className="nw-history-del"
                  onClick={(e) => { e.stopPropagation(); setConfirmDate(snap.date); }}
                  title="Remove entry"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
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
  onShowHistory,
}: {
  asset: Asset;
  color: string;
  currencyCode: CurrencyCode;
  onEdit: () => void;
  onDelete: () => void;
  onShowHistory: () => void;
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
          <span className={`nw-asset-value${val < 0 ? ' nw-asset-value--neg' : ''}`}>
            {formatCurrency(val, currencyCode)}
          </span>
          {latestDate && <span className="nw-asset-date">as of {formatDateShort(latestDate)}</span>}
        </div>
        <div className="nw-asset-actions">
          <button className="nw-action-btn" onClick={(e) => { e.stopPropagation(); onShowHistory(); }} title="Show history">
            History
          </button>
          <button className="nw-action-btn" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Update">
            Update
          </button>
          <button className="nw-action-btn nw-action-btn--del" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Remove">
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

/** Individual asset value-over-time chart */
function AssetHistoryChart({ asset, currencyCode, color }: { asset: Asset; currencyCode: CurrencyCode; color: string }) {
  if (asset.snapshots.length === 0) return null;

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
  if (allDates.length < 1) return null;

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

// ── Donut Breakdown (back face of flip card) ──

type DonutMode = 'type' | 'debt';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 14}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

// Stable reference — never changes so Pie won't re-mount on hover.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stableActiveShape = (props: any) => renderActiveShape(props);

function DonutBreakdown({ assets, currencyCode }: { assets: Asset[]; currencyCode: CurrencyCode }) {
  const [mode, setMode] = useState<DonutMode>('type');
  const [activeIdx, setActiveIdx] = useState<number | undefined>(undefined);

  // Type-based data
  const typeData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; items: { name: string; value: number }[] }>();
    for (const a of assets) {
      const v = latestValue(a);
      if (!map.has(a.type)) map.set(a.type, { name: a.type, value: 0, items: [] });
      const entry = map.get(a.type)!;
      entry.value += Math.abs(v);
      entry.items.push({ name: a.name, value: v });
    }
    return Array.from(map.values()).filter(d => d.value > 0);
  }, [assets]);

  const typeColors = useMemo(() => typeData.map((d, i) => colorForType(d.name, i)), [typeData]);

  // Debt vs Asset data
  const debtData = useMemo(() => {
    let assetsTotal = 0, debtsTotal = 0;
    const assetItems: { name: string; value: number }[] = [];
    const debtItems: { name: string; value: number }[] = [];
    for (const a of assets) {
      const v = latestValue(a);
      if (v >= 0) { assetsTotal += v; assetItems.push({ name: a.name, value: v }); }
      else { debtsTotal += Math.abs(v); debtItems.push({ name: a.name, value: v }); }
    }
    return {
      slices: [
        { name: 'Assets', value: assetsTotal, items: assetItems },
        ...(debtsTotal > 0 ? [{ name: 'Liabilities', value: debtsTotal, items: debtItems }] : []),
      ],
      debtPct: assetsTotal + debtsTotal > 0 ? (debtsTotal / (assetsTotal + debtsTotal)) * 100 : 0,
    };
  }, [assets]);

  const debtColors = ['#22d3ee', '#ef4444'];
  const chartData = mode === 'type' ? typeData : debtData.slices;
  const chartColors = mode === 'type' ? typeColors : debtColors;
  const activeSlice = activeIdx != null ? chartData[activeIdx] : null;
  const total = chartData.reduce((s, d) => s + d.value, 0);

  // Strip `items` for Recharts (it only wants { name, value })
  const pieData = useMemo(() => chartData.map(({ name, value }) => ({ name, value })), [chartData]);

  return (
    <div className="nw-donut-view">
      <div className="nw-donut-header">
        <span className="nw-donut-title">Portfolio Breakdown</span>
        <div className="nw-donut-toggle">
          <button className={`nw-donut-toggle-btn${mode === 'type' ? ' nw-donut-toggle-btn--active' : ''}`}
            onClick={() => { setMode('type'); setActiveIdx(undefined); }}>By Type</button>
          <button className={`nw-donut-toggle-btn${mode === 'debt' ? ' nw-donut-toggle-btn--active' : ''}`}
            onClick={() => { setMode('debt'); setActiveIdx(undefined); }}>Assets vs Debts</button>
        </div>
      </div>

      {mode === 'debt' && debtData.debtPct > 0 && (
        <div className="nw-debt-note">
          <span className="nw-debt-note-pct">{debtData.debtPct.toFixed(1)}%</span>
          <span className="nw-debt-note-label"> liabilities</span>
        </div>
      )}

      <div className="nw-donut-chart-area">
        <div className="nw-donut-chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={70} outerRadius={115} paddingAngle={2}
                {...{ activeIndex: activeIdx, activeShape: stableActiveShape } as any}
                onMouseEnter={(_: unknown, index: number) => setActiveIdx(index)}
                onMouseLeave={() => setActiveIdx(undefined)}>
                {pieData.map((_entry, i) => (
                  <Cell key={i} fill={chartColors[i % chartColors.length]} stroke="transparent" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="nw-donut-center-label">
            {activeSlice ? (
              <>
                <span className="nw-donut-center-value" style={{ color: chartColors[activeIdx!] }}>
                  {total > 0 ? `${((activeSlice.value / total) * 100).toFixed(0)}%` : '—'}
                </span>
                <span className="nw-donut-center-name">{activeSlice.name}</span>
              </>
            ) : (
              <>
                <span className="nw-donut-center-value">{formatCurrency(total, currencyCode)}</span>
                <span className="nw-donut-center-name">Total</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hover detail card — always rendered, fades in/out */}
      <div className={`nw-donut-tooltip${activeSlice ? ' nw-donut-tooltip--visible' : ''}`}>
        {activeSlice && (
          <>
            <div className="nw-donut-tooltip-header">
              <span className="nw-donut-tooltip-swatch" style={{ background: chartColors[activeIdx!] }} />
              <span className="nw-donut-tooltip-title">{activeSlice.name}</span>
              <span className="nw-donut-tooltip-total">{formatCurrency(activeSlice.value, currencyCode)}</span>
            </div>
            <div className="nw-donut-tooltip-body">
              {activeSlice.items.map((item, i) => (
                <div className="nw-donut-tooltip-row" key={i}>
                  <span className="nw-donut-tooltip-item-name">{item.name}</span>
                  <span className={`nw-donut-tooltip-item-value${item.value < 0 ? ' nw-donut-tooltip-item-value--neg' : ''}`}>
                    {formatCurrency(item.value, currencyCode)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="nw-donut-legend">
        {chartData.map((d, i) => (
          <div className="nw-donut-legend-item" key={d.name}>
            <span className="nw-donut-legend-swatch" style={{ background: chartColors[i % chartColors.length] }} />
            <span className="nw-donut-legend-label">{d.name}</span>
            <span className="nw-donut-legend-value">{formatCurrency(d.value, currencyCode)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Net Worth Report Generation ──

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type NWReportFormat = 'html' | 'csv' | 'pdf' | 'pdf-native';

function generateNWCSV(assets: Asset[], code: CurrencyCode): string {
  const fmt = (v: number) => formatCurrency(v, code);
  const lines: string[] = [];

  lines.push('Net Worth Report');
  lines.push(`Generated,${new Date().toLocaleDateString('en-GB')}`);
  lines.push('');

  // Summary
  const totalAssets = assets.filter(a => latestValue(a) >= 0).reduce((s, a) => s + latestValue(a), 0);
  const totalDebts = assets.filter(a => latestValue(a) < 0).reduce((s, a) => s + Math.abs(latestValue(a)), 0);
  const netWorth = totalAssets - totalDebts;
  lines.push('Summary');
  lines.push(`Total Assets,${fmt(totalAssets)}`);
  lines.push(`Total Debts,${fmt(totalDebts)}`);
  lines.push(`Net Worth,${fmt(netWorth)}`);
  lines.push('');

  // Asset details
  lines.push('Assets & Liabilities');
  lines.push('Name,Type,Latest Value,# Snapshots,Last Updated');
  for (const a of assets) {
    const latest = latestValue(a);
    const lastSnap = a.snapshots.length ? [...a.snapshots].sort((x, y) => x.date.localeCompare(y.date)).pop()!.date : '';
    lines.push(`"${a.name}",${a.type},${latest},${a.snapshots.length},${lastSnap}`);
  }
  lines.push('');

  // History per asset
  for (const a of assets) {
    const sorted = [...a.snapshots].sort((x, y) => x.date.localeCompare(y.date));
    lines.push(`History: ${a.name}`);
    lines.push('Date,Value');
    for (const s of sorted) {
      lines.push(`${s.date},${s.value}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateNWHTML(assets: Asset[], code: CurrencyCode): string {
  const fmt = (v: number) => formatCurrency(v, code);
  const now = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  const totalAssets = assets.filter(a => latestValue(a) >= 0).reduce((s, a) => s + latestValue(a), 0);
  const totalDebts = assets.filter(a => latestValue(a) < 0).reduce((s, a) => s + Math.abs(latestValue(a)), 0);
  const netWorth = totalAssets - totalDebts;

  // Group by type
  const byType = new Map<string, Asset[]>();
  for (const a of assets) {
    if (!byType.has(a.type)) byType.set(a.type, []);
    byType.get(a.type)!.push(a);
  }

  const groupRows = Array.from(byType.entries()).map(([type, group]) => {
    const gTotal = group.reduce((s, a) => s + latestValue(a), 0);
    const assetRows = group.map(a => `
      <tr>
        <td>${a.emoji} ${a.name}</td>
        <td class="num">${fmt(latestValue(a))}</td>
        <td class="num">${a.snapshots.length}</td>
      </tr>`).join('');
    return `
      <tr class="group-header"><td colspan="3">${type} — ${fmt(gTotal)}</td></tr>
      ${assetRows}`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Net Worth Report</title>
<style>
  @page { size: A4; margin: 20mm; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0b1120; color: #e2e8f0; line-height: 1.6; padding: 40px; }
  .report-header { text-align: center; margin-bottom: 32px; }
  .brand { font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: #d4a843; margin-bottom: 4px; }
  h1 { font-size: 26px; font-weight: 700; margin-bottom: 4px; }
  .date { font-size: 12px; color: #94a3b8; }
  .kpi-row { display: flex; gap: 16px; justify-content: center; margin: 24px 0; flex-wrap: wrap; }
  .kpi { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px 24px; text-align: center; min-width: 140px; }
  .kpi-value { font-size: 22px; font-weight: 700; display: block; }
  .kpi-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px; display: block; }
  .section { margin-top: 32px; }
  .section-badge { display: inline-block; background: rgba(212,168,67,0.15); color: #d4a843; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { text-align: left; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  td { padding: 8px 10px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .group-header td { font-weight: 700; font-size: 14px; color: #d4a843; padding-top: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .neg { color: #ef4444; }
  .pos { color: #10b981; }
  .report-footer { text-align: center; margin-top: 40px; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; }
  @media print { body { background: white; color: #1e293b; } .kpi { border-color: #e2e8f0; } th { color: #64748b; border-color: #e2e8f0; } td { border-color: #f1f5f9; } .group-header td { color: #92400e; border-color: #e2e8f0; } .report-footer { color: #94a3b8; border-color: #e2e8f0; } }
</style></head>
<body>
  <div class="report-header">
    <div class="brand">TakeHomeCalc</div>
    <h1>Net Worth Report</h1>
    <div class="date">Generated ${now}</div>
  </div>

  <div class="kpi-row">
    <div class="kpi">
      <span class="kpi-value pos">${fmt(totalAssets)}</span>
      <span class="kpi-label">Total Assets</span>
    </div>
    <div class="kpi">
      <span class="kpi-value neg">${fmt(totalDebts)}</span>
      <span class="kpi-label">Total Debts</span>
    </div>
    <div class="kpi">
      <span class="kpi-value" style="color:${netWorth >= 0 ? '#22d3ee' : '#ef4444'}">${fmt(netWorth)}</span>
      <span class="kpi-label">Net Worth</span>
    </div>
  </div>

  <div class="section">
    <div class="section-badge">Breakdown</div>
    <table>
      <thead><tr><th>Asset / Liability</th><th class="num">Value</th><th class="num">Snapshots</th></tr></thead>
      <tbody>${groupRows}</tbody>
    </table>
  </div>

  <div class="report-footer">
    TakeHomeCalc &middot; Net Worth Report &middot; ${assets.length} item${assets.length !== 1 ? 's' : ''}
  </div>
</body></html>`;
}

// ── Main Page ──

export function NetWorthPage() {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { addReport } = useSavedReports();
  const [data, setData] = usePersistedState<NetWorthData>('vf-net-worth-data', defaultData);

  // Load from Firestore on first login
  const firestoreLoaded = useRef(false);
  useEffect(() => {
    if (!user || firestoreLoaded.current) return;
    firestoreLoaded.current = true;
    loadNetWorth(user.uid).then((remote) => {
      if (remote) setData(remote as NetWorthData);
    }).catch((e) => console.error('[net-worth] load failed:', e));
  }, [user, setData]);

  const assets = data.assets;
  const customTypes = data.customTypes;

  const updateData = useCallback((fn: (prev: NetWorthData) => NetWorthData) => {
    setData((prev) => {
      const next = fn(prev);
      const updated = { ...next, lastModified: nowISO() };
      // Sync to Firestore in the background
      if (user) {
        saveNetWorth(user.uid, updated).catch((e) =>
          console.error('[net-worth] save failed:', e),
        );
      }
      return updated;
    });
  }, [setData, user]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(true);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [historyAssetId, setHistoryAssetId] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['__all__'])); // sentinel to default-collapse all
  // When __all__ sentinel is present, all groups start collapsed; once user interacts, remove it
  const isGroupCollapsed = useCallback((groupName: string) => {
    return collapsedGroups.has('__all__') || collapsedGroups.has(groupName);
  }, [collapsedGroups]);
  const toggleGroup = useCallback((groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      // First interaction removes the __all__ sentinel and expands only this group
      if (next.has('__all__')) {
        next.delete('__all__');
        // Collapse all known groups except the one clicked
        for (const [gn] of sortedGroupsRef.current) {
          if (gn !== groupName) next.add(gn);
        }
        return next;
      }
      if (next.has(groupName)) next.delete(groupName); else next.add(groupName);
      return next;
    });
  }, []);
  // Keep a ref so toggle can reference current groups without stale closure
  const sortedGroupsRef = useRef<[string, Asset[]][]>([]);

  // Report state
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const handleGenerateReport = useCallback((format: NWReportFormat) => {
    setGeneratingReport(true);
    setShowReportPicker(false);
    setTimeout(() => {
      try {
        const timestamp = new Date().toISOString().slice(0, 10);
        if (format === 'csv') {
          downloadBlob(new Blob([generateNWCSV(assets, currency.code)], { type: 'text/csv' }), `net-worth-report-${timestamp}.csv`);
        } else if (format === 'html') {
          downloadBlob(new Blob([generateNWHTML(assets, currency.code)], { type: 'text/html' }), `net-worth-report-${timestamp}.html`);
        } else if (format === 'pdf') {
          const html = generateNWHTML(assets, currency.code);
          const win = window.open('', '_blank');
          if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
        } else if (format === 'pdf-native') {
          const totalAssets = assets.filter(a => latestValue(a) >= 0).reduce((s, a) => s + latestValue(a), 0);
          const totalDebts = assets.filter(a => latestValue(a) < 0).reduce((s, a) => s + Math.abs(latestValue(a)), 0);
          const nw = totalAssets - totalDebts;
          const pdfData = {
            assets: assets.map(a => ({ name: a.name, type: a.type, value: latestValue(a) })),
            totalAssets,
            totalDebts,
            netWorth: nw,
          };
          const sym = currency.code === 'GBP' ? '\u00A3' : currency.code === 'EUR' ? '\u20AC' : '$';
          const dataUrl = exportNetWorthPdf(pdfData, sym);
          addReport({
            name: `Net Worth — ${timestamp}`,
            category: 'net-worth',
            dataUrl,
            summary: `Net Worth: ${sym}${Math.abs(nw).toLocaleString('en-GB', { maximumFractionDigits: 0 })} | ${assets.length} items`,
          });
        }
      } catch (e) {
        console.error('Net worth report generation failed', e);
      }
      setGeneratingReport(false);
    }, 100);
  }, [assets, currency.code, addReport]);

  const totalNetWorth = useMemo(() => assets.reduce((sum, a) => sum + latestValue(a), 0), [assets]);

  const handleSave = useCallback((asset: Asset) => {
    updateData((prev) => {
      const idx = prev.assets.findIndex((a) => a.id === asset.id);
      if (idx >= 0) {
        const next = [...prev.assets];
        next[idx] = asset;
        return { ...prev, assets: next };
      }
      return { ...prev, assets: [...prev.assets, asset] };
    });
    setShowForm(false);
    setEditingId(null);
  }, [updateData]);

  const handleDelete = useCallback((id: string) => {
    updateData((prev) => ({ ...prev, assets: prev.assets.filter((a) => a.id !== id) }));
  }, [updateData]);

  const handleDeleteEntry = useCallback((assetId: string, date: string) => {
    updateData((prev) => {
      const idx = prev.assets.findIndex((a) => a.id === assetId);
      if (idx < 0) return prev;
      const asset = prev.assets[idx];
      const remaining = asset.snapshots.filter((s) => s.date !== date);
      if (remaining.length === 0) {
        return { ...prev, assets: prev.assets.filter((a) => a.id !== assetId) };
      }
      const next = [...prev.assets];
      next[idx] = { ...asset, snapshots: remaining, updatedAt: nowISO() };
      return { ...prev, assets: next };
    });
  }, [updateData]);

  const handleNewCustomType = useCallback((t: string) => {
    updateData((prev) => {
      if (prev.customTypes.includes(t)) return prev;
      return { ...prev, customTypes: [...prev.customTypes, t] };
    });
  }, [updateData]);

  const handleRemoveCustomType = useCallback((t: string) => {
    updateData((prev) => ({
      ...prev,
      customTypes: prev.customTypes.filter((ct) => ct !== t),
    }));
  }, [updateData]);

  const editingAsset = editingId ? assets.find((a) => a.id === editingId) : undefined;
  const historyAsset = historyAssetId ? assets.find((a) => a.id === historyAssetId) : undefined;

  const [sortMode, setSortMode] = usePersistedState<SortMode>('vf-nw-sort', 'type');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deleteAsset = deleteConfirmId ? assets.find(a => a.id === deleteConfirmId) : null;

  // Has enough data for a chart
  const hasChartData = useMemo(() => {
    return assets.some(a => a.snapshots.length >= 1);
  }, [assets]);

  // Sorted/grouped asset list
  const sortedGroups = useMemo(() => {
    if (sortMode === 'type') {
      const map = new Map<string, Asset[]>();
      for (const a of assets) {
        if (!map.has(a.type)) map.set(a.type, []);
        map.get(a.type)!.push(a);
      }
      return Array.from(map.entries()).sort((a, b) => {
        const aTotal = a[1].reduce((s, x) => s + Math.abs(latestValue(x)), 0);
        const bTotal = b[1].reduce((s, x) => s + Math.abs(latestValue(x)), 0);
        return bTotal - aTotal;
      });
    }
    if (sortMode === 'class') {
      const assetList = assets.filter(a => latestValue(a) >= 0);
      const debtList = assets.filter(a => latestValue(a) < 0);
      const groups: [string, Asset[]][] = [];
      if (assetList.length) groups.push(['Assets', assetList]);
      if (debtList.length) groups.push(['Liabilities', debtList]);
      return groups;
    }
    // sortMode === 'value'
    const sorted = [...assets].sort((a, b) => Math.abs(latestValue(b)) - Math.abs(latestValue(a)));
    return [['All Items', sorted]] as [string, Asset[]][];
  }, [assets, sortMode]);

  // Keep ref in sync for toggle closure
  sortedGroupsRef.current = sortedGroups;

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
            <span className={`nw-total-value${totalNetWorth < 0 ? ' nw-total-value--neg' : ''}`}>
              {formatCurrency(totalNetWorth, currency.code)}
            </span>
          </div>
        </div>

        {/* History popup */}
        {historyAsset && (
          <HistoryPopup
            asset={historyAsset}
            currencyCode={currency.code}
            onDelete={handleDeleteEntry}
            onClose={() => setHistoryAssetId(null)}
          />
        )}

        {/* Net worth over time — flip card */}
        {hasChartData && (
          <div className="ps-card nw-chart-card">
            <div className="nw-chart-header">
              <h2 className="ps-card-title">{flipped ? 'Portfolio Breakdown' : 'Net Worth Over Time'}</h2>
              <div className="nw-chart-header-actions">
                <button
                  className={`nw-view-toggle-btn${!flipped ? ' nw-view-toggle-btn--active' : ''}`}
                  onClick={() => setFlipped(false)}
                  title="Line chart view"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2,12 5,8 9,10 14,4" />
                  </svg>
                  Chart
                </button>
                <button
                  className={`nw-view-toggle-btn${flipped ? ' nw-view-toggle-btn--active' : ''}`}
                  onClick={() => setFlipped(true)}
                  title="Donut breakdown"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="8" cy="8" r="6" />
                    <circle cx="8" cy="8" r="2.5" />
                  </svg>
                  Breakdown
                </button>
              </div>
            </div>
            <div className={`nw-flip-container${flipped ? ' nw-flip-container--flipped' : ''}`}>
              <div className="nw-flip-face nw-flip-face--front">
                {showChart && <NetWorthChart assets={assets} currencyCode={currency.code} />}
              </div>
              <div className="nw-flip-face nw-flip-face--back">
                <DonutBreakdown assets={assets} currencyCode={currency.code} />
              </div>
            </div>
          </div>
        )}

        {/* Asset list */}
        <div className="ps-card nw-assets-card">
          <div className="nw-assets-header">
            <h2 className="ps-card-title">Assets & Liabilities</h2>
            {!showForm && !editingId && (
              <button
                className="nw-add-btn"
                onClick={() => setShowForm(true)}
                title="Add Asset or Liability"
              >
                <span className="nw-add-icon">+</span>
              </button>
            )}
          </div>

          {/* Sort / group buttons */}
          {assets.length > 0 && (
            <div className="nw-sort-bar">
              <span className="nw-sort-label">Group by</span>
              <div className="nw-sort-btns">
                <button
                  className={`nw-sort-btn${sortMode === 'type' ? ' nw-sort-btn--active' : ''}`}
                  onClick={() => setSortMode('type')}
                >
                  Type
                </button>
                <button
                  className={`nw-sort-btn${sortMode === 'class' ? ' nw-sort-btn--active' : ''}`}
                  onClick={() => setSortMode('class')}
                >
                  Asset / Liability
                </button>
                <button
                  className={`nw-sort-btn${sortMode === 'value' ? ' nw-sort-btn--active' : ''}`}
                  onClick={() => setSortMode('value')}
                >
                  Value
                </button>
              </div>
            </div>
          )}

          {/* Create form */}
          {showForm && !editingId && (
            <AssetForm
              customTypes={customTypes}
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
              onNewCustomType={handleNewCustomType}
              onRemoveCustomType={handleRemoveCustomType}
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
              onRemoveCustomType={handleRemoveCustomType}
            />
          )}

          {assets.length === 0 && !showForm && (
            <div className="nw-empty nw-empty--showcase">
              <p className="nw-empty-intro">Here's what your Net Worth dashboard could look like:</p>

              {/* Example chart preview (blurred overlay) */}
              <div className="nw-example-preview">
                <NetWorthChart assets={EXAMPLE_ASSETS} currencyCode={currency.code} />
                <div className="nw-example-overlay" />
              </div>

              {/* Example asset cards */}
              <div className="nw-example-assets">
                {EXAMPLE_ASSETS.map((asset, i) => (
                  <div key={asset.id} className="nw-example-asset-card">
                    <span className="nw-asset-emoji" style={{ background: `${ASSET_COLORS[i]}18` }}>{asset.emoji}</span>
                    <div className="nw-asset-info">
                      <span className="nw-asset-name">{asset.name}</span>
                      <span className="nw-asset-type">{asset.type}</span>
                    </div>
                    <span className="nw-asset-value">{formatCurrency(asset.snapshots[asset.snapshots.length - 1].value, currency.code)}</span>
                  </div>
                ))}
                <div className="nw-example-overlay nw-example-overlay--assets" />
              </div>

              <p className="nw-empty-prompt">Add your first asset to get started!</p>

              {/* Animated add button */}
              <div className="nw-add-pulse-wrapper">
                <div className="nw-add-pulse-ring" />
                <button
                  className="nw-add-btn nw-add-btn--large nw-add-btn--animated"
                  onClick={() => setShowForm(true)}
                >
                  <span className="nw-add-icon">+</span>
                  <span>Add Your First Asset</span>
                </button>
              </div>
            </div>
          )}

          {/* Sorted/grouped asset list */}
          {sortedGroups.map(([groupName, groupAssets]) => {
            const groupTotal = groupAssets.reduce((s, a) => s + latestValue(a), 0);
            const collapsed = isGroupCollapsed(groupName);
            return (
              <div key={groupName} className="nw-type-group">
                <div
                  className={`nw-type-group-header nw-type-group-header--clickable${collapsed ? '' : ' nw-type-group-header--open'}`}
                  onClick={() => toggleGroup(groupName)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(groupName); } }}
                >
                  <span className="nw-group-chevron" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="5,3 9,7 5,11" />
                    </svg>
                  </span>
                  <span className="nw-type-group-name">{groupName}</span>
                  <span className="nw-type-group-count">{groupAssets.length}</span>
                  <span className={`nw-type-group-total${groupTotal < 0 ? ' nw-type-group-total--neg' : ''}`}>
                    {formatCurrency(groupTotal, currency.code)}
                  </span>
                </div>
                {!collapsed && groupAssets.map((asset) => (
                  <div key={asset.id}>
                    <div onClick={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)} style={{ cursor: asset.snapshots.length >= 1 ? 'pointer' : 'default' }}>
                      <AssetCard
                        asset={asset}
                        color={ASSET_COLORS[assets.indexOf(asset) % ASSET_COLORS.length]}
                        currencyCode={currency.code}
                        onEdit={() => setEditingId(asset.id)}
                        onDelete={() => setDeleteConfirmId(asset.id)}
                        onShowHistory={() => setHistoryAssetId(asset.id)}
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

        {/* Generate Report button */}
        {assets.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 8px' }}>
            <button
              className="ps-btn ps-btn--primary"
              disabled={generatingReport}
              onClick={() => setShowReportPicker(true)}
            >
              📄 Generate Net Worth Report
            </button>
          </div>
        )}

        {/* Report format picker */}
        {showReportPicker && (
          <div className="report-overlay" onClick={() => setShowReportPicker(false)}>
            <div className="rp-format-picker" onClick={(e) => e.stopPropagation()}>
              <h3 className="rp-format-title">Choose Report Format</h3>
              <div className="rp-format-options">
                <button className="rp-format-btn" onClick={() => handleGenerateReport('pdf-native')}>
                  <span className="rp-format-icon">📄</span>
                  <div><span className="rp-format-label">PDF Snapshot</span><span className="rp-format-desc">Visual 1-page net worth report saved to Reports</span></div>
                </button>
                <button className="rp-format-btn" onClick={() => handleGenerateReport('html')}>
                  <span className="rp-format-icon">🌐</span>
                  <div><span className="rp-format-label">HTML</span><span className="rp-format-desc">Rich styled report, viewable in any browser</span></div>
                </button>
                <button className="rp-format-btn" onClick={() => handleGenerateReport('pdf')}>
                  <span className="rp-format-icon">🖨️</span>
                  <div><span className="rp-format-label">Print PDF</span><span className="rp-format-desc">Print-ready via browser print dialog</span></div>
                </button>
                <button className="rp-format-btn" onClick={() => handleGenerateReport('csv')}>
                  <span className="rp-format-icon">📊</span>
                  <div><span className="rp-format-label">CSV</span><span className="rp-format-desc">Opens in Excel, Google Sheets, etc.</span></div>
                </button>
              </div>
              <button className="rp-format-cancel" onClick={() => setShowReportPicker(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {generatingReport && (
          <div className="report-overlay">
            <LoadingCoin text="Generating report…" />
          </div>
        )}

        {/* Delete confirmation */}
        {deleteConfirmId && deleteAsset && (
          <ConfirmDialog
            message={`Remove "${deleteAsset.name}"? All history will be permanently deleted.`}
            onCancel={() => setDeleteConfirmId(null)}
            onConfirm={() => {
              handleDelete(deleteConfirmId);
              setDeleteConfirmId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
