export interface NetWorthValueItem {
  name: string;
  type: string;
  value: number;
}

export function splitNetWorthItems<T extends NetWorthValueItem>(items: readonly T[]): {
  assets: T[];
  liabilities: T[];
} {
  const stableSort = (a: T, b: T) =>
    a.type.localeCompare(b.type) || a.name.localeCompare(b.name) || Math.abs(b.value) - Math.abs(a.value);

  return {
    assets: items.filter((item) => item.value >= 0).slice().sort(stableSort),
    liabilities: items.filter((item) => item.value < 0).slice().sort(stableSort),
  };
}

export function signedTypeBreakdown<T extends NetWorthValueItem>(items: readonly T[]): Array<{
  type: string;
  value: number;
  items: T[];
}> {
  const grouped = new Map<string, { type: string; value: number; items: T[] }>();
  for (const item of items) {
    const entry = grouped.get(item.type) ?? { type: item.type, value: 0, items: [] };
    entry.value += item.value;
    entry.items.push(item);
    grouped.set(item.type, entry);
  }
  return Array.from(grouped.values())
    .filter((entry) => entry.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.type.localeCompare(b.type));
}
