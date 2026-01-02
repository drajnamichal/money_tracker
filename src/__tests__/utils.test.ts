import { formatCurrency, cn } from '../lib/utils';

describe('formatCurrency', () => {
  // ... existing tests ...
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
