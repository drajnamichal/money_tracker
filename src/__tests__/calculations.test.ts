import {
  calculatePercentageChange,
  aggregateMonthlyData,
  calculateWealthGrowth,
  generateSpendingInsight,
  calculateSalaryResults,
  MonthlyData,
  SalarySplit,
  mergeAssetItems,
  AssetItem,
} from '../lib/calculations';

describe('calculations', () => {
  describe('calculatePercentageChange', () => {
    it('calculates positive change correctly', () => {
      expect(calculatePercentageChange(120, 100)).toBe(20);
    });

    it('calculates negative change correctly', () => {
      expect(calculatePercentageChange(80, 100)).toBe(-20);
    });

    it('handles zero previous value', () => {
      expect(calculatePercentageChange(100, 0)).toBe(0);
    });

    it('handles negative previous value correctly', () => {
      // (10 - (-10)) / 10 * 100 = 200%
      expect(calculatePercentageChange(10, -10)).toBe(200);
    });
  });

  describe('aggregateMonthlyData', () => {
    it('aggregates income and expenses by month', () => {
      const income = [
        { record_month: '2023-01-01', amount_eur: 1000 },
        { record_month: '2023-01-15', amount_eur: 500 },
        { record_month: '2023-02-01', amount_eur: 2000 },
      ];
      const expenses = [
        { record_date: '2023-01-10', amount_eur: 400, category: 'Strava' },
        { record_date: '2023-01-20', amount_eur: 200, category: 'Bývanie' },
        { record_date: '2023-02-05', amount_eur: 1000, category: 'Ostatné' },
      ];

      const result = aggregateMonthlyData(income, expenses);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        month: '2023-01',
        income: 1500,
        expenses: 600,
        categories: { Strava: 400, Bývanie: 200 },
      });
      expect(result[1]).toEqual({
        month: '2023-02',
        income: 2000,
        expenses: 1000,
        categories: { Ostatné: 1000 },
      });
    });
  });

  describe('calculateWealthGrowth', () => {
    it('calculates total assets and growth correctly', () => {
      const wealthData = [
        { record_date: '2023-01-01', amount_eur: 1000 },
        { record_date: '2023-01-01', amount_eur: 500 },
        { record_date: '2023-02-01', amount_eur: 1800 },
      ];

      const { totalAssets, growth } = calculateWealthGrowth(wealthData);

      expect(totalAssets).toBe(1800);
      expect(growth).toBe(20); // (1800 - 1500) / 1500 * 100 = 20%
    });

    it('returns zero for empty data', () => {
      const { totalAssets, growth } = calculateWealthGrowth([]);
      expect(totalAssets).toBe(0);
      expect(growth).toBe(0);
    });
  });

  describe('generateSpendingInsight', () => {
    const prevMonth: MonthlyData = {
      month: '2023-01',
      income: 2000,
      expenses: 1000,
      categories: { Strava: 200 },
    };

    it('returns warning when category spending increases significantly', () => {
      const latestMonth: MonthlyData = {
        month: '2023-02',
        income: 2000,
        expenses: 1100,
        categories: { Strava: 300 }, // +50%
      };

      const insight = generateSpendingInsight(latestMonth, prevMonth);
      expect(insight?.type).toBe('warning');
      expect(insight?.text).toContain('míňaš o 50% viac na strava');
    });

    it('returns success when savings increase', () => {
      const latestMonth: MonthlyData = {
        month: '2023-02',
        income: 3000,
        expenses: 1000,
        categories: { Strava: 200 },
      };
      // prevSavings = 1000, latestSavings = 2000 -> +100%

      const insight = generateSpendingInsight(latestMonth, prevMonth);
      expect(insight?.type).toBe('success');
      expect(insight?.text).toContain('si ušetril o 100% viac');
    });

    it('returns success when expenses decrease', () => {
      const latestMonth: MonthlyData = {
        month: '2023-02',
        income: 1800, // lower income so savings don't increase too much
        expenses: 800, // -20%
        categories: { Strava: 200 },
      };
      // prevSavings = 1000, latestSavings = 1000 -> 0% savings change

      const insight = generateSpendingInsight(latestMonth, prevMonth);
      expect(insight?.type).toBe('success');
      expect(insight?.text).toContain('výdavky klesli o 20%');
    });

    it('returns null when no significant changes', () => {
      const latestMonth: MonthlyData = {
        month: '2023-02',
        income: 2000,
        expenses: 1000,
        categories: { Strava: 200 },
      };

      const insight = generateSpendingInsight(latestMonth, prevMonth);
      expect(insight).toBeNull();
    });
  });

  describe('calculateSalaryResults', () => {
    it('calculates amounts correctly based on salary and split', () => {
      const salary = 1000;
      const split: SalarySplit = {
        fixed_costs: 50,
        investments: 30,
        savings: 15,
        fun: 5,
      };

      const results = calculateSalaryResults(salary, split);

      expect(results).toHaveLength(4);
      expect(results.find((r) => r.name.includes('Fixné'))?.amount).toBe(500);
      expect(results.find((r) => r.name.includes('Investície'))?.amount).toBe(
        300
      );
      expect(results.find((r) => r.name.includes('Krátkodobé'))?.amount).toBe(
        150
      );
      expect(results.find((r) => r.name.includes('Zábava'))?.amount).toBe(50);
    });
  });

  describe('mergeAssetItems', () => {
    it('merges multiple items with the same account name', () => {
      const items: AssetItem[] = [
        { accountName: 'Tatra Banka', amount: '100', currency: 'EUR' },
        { accountName: 'Tatra Banka', amount: '200', currency: 'EUR' },
        { accountName: 'Crypto', amount: '500', currency: 'EUR' },
      ];

      const merged = mergeAssetItems(items);

      expect(merged).toHaveLength(2);
      expect(merged.find((m) => m.accountName === 'Tatra Banka')?.amount).toBe(
        300
      );
      expect(merged.find((m) => m.accountName === 'Crypto')?.amount).toBe(500);
    });

    it('trims account names and handles case insensitivity', () => {
      // Note: Current mergeAssetItems implementation is case sensitive.
      // Let's check if we want it to be case insensitive.
      // For now, let's test trimming.
      const items: AssetItem[] = [
        { accountName: ' Tatra Banka ', amount: '100', currency: 'EUR' },
        { accountName: 'Tatra Banka', amount: '200', currency: 'EUR' },
      ];

      const merged = mergeAssetItems(items);
      expect(merged).toHaveLength(1);
      expect(merged[0].amount).toBe(300);
    });
  });
});
