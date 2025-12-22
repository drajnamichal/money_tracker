import { formatCurrency } from '../lib/utils';

describe('formatCurrency', () => {
  test('formats number as EUR currency', () => {
    // Note: Use regular space for tests if needed, but Intl often uses non-breaking space
    const result = formatCurrency(100);
    expect(result).toMatch(/100,00/);
    expect(result).toMatch(/€/);
  });

  test('formats number as CZK currency', () => {
    const result = formatCurrency(100, 'CZK');
    expect(result).toMatch(/100,00/);
    expect(result).toMatch(/(CZK|Kč)/);
  });

  test('handles decimals correctly', () => {
    const result = formatCurrency(1234.56);
    expect(result).toMatch(/1/);
    expect(result).toMatch(/234,56/);
  });
});
