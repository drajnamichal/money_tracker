import { formatCurrency, cn } from '../lib/utils';

describe('formatCurrency', () => {
  it('formats EUR amount with Slovak locale', () => {
    const result = formatCurrency(1234.56);
    // Slovak locale uses non-breaking space and € sign
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('56');
    expect(result).toContain('€');
  });

  it('defaults to EUR when no currency specified', () => {
    const result = formatCurrency(100);
    expect(result).toContain('€');
  });

  it('formats CZK amounts correctly', () => {
    const result = formatCurrency(5000, 'CZK');
    expect(result).toContain('5');
    expect(result).toContain('000');
    // Slovak locale may use "CZK" or "Kč" depending on ICU data
    expect(result).toMatch(/CZK|Kč/);
  });

  it('formats USD amounts correctly', () => {
    const result = formatCurrency(99.99, 'USD');
    expect(result).toContain('99');
    // Slovak locale may use "USD" or "$" depending on ICU data
    expect(result).toMatch(/USD|\$/);
  });

  it('handles zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
    expect(result).toContain('€');
  });

  it('handles negative amounts', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500');
    expect(result).toContain('€');
  });

  it('handles large amounts with thousand separators', () => {
    const result = formatCurrency(1000000);
    // Slovak locale uses space as thousand separator
    expect(result).toContain('000');
    expect(result).toContain('€');
  });

  it('rounds to 2 decimal places', () => {
    const result = formatCurrency(10.999);
    // Intl.NumberFormat rounds to 2 decimals
    expect(result).toContain('11');
  });
});

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    expect(cn('class1', true && 'class2', false && 'class3')).toBe(
      'class1 class2'
    );
  });

  it('handles undefined and null', () => {
    expect(cn('class1', undefined, null)).toBe('class1');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-2', 'px-4')).toBe('py-2 px-4');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });
});
