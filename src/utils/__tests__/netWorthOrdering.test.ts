import { describe, expect, it } from 'vitest';
import { signedTypeBreakdown, splitNetWorthItems } from '../netWorthOrdering';

describe('net worth ordering and signed breakdown', () => {
  const items = [
    { name: 'Home', type: 'Property', value: 300000 },
    { name: 'Mortgage', type: 'Property', value: -180000 },
    { name: 'ISA', type: 'Investments', value: 50000 },
    { name: 'Card', type: 'Credit Card', value: -2000 },
  ];

  it('nets same-type positive and negative values rather than summing absolutes', () => {
    const property = signedTypeBreakdown(items).find((entry) => entry.type === 'Property');
    expect(property?.value).toBe(120000);
  });

  it('orders report content into assets first and liabilities second with stable type/name ordering', () => {
    const split = splitNetWorthItems(items);
    expect(split.assets.map((x) => x.name)).toEqual(['ISA', 'Home']);
    expect(split.liabilities.map((x) => x.name)).toEqual(['Card', 'Mortgage']);
  });
});
