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
  mergeIncomeItems,
  calculateFireTarget,
  calculateMonthsToFire,
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

    it('handles empty input arrays', () => {
      const result = aggregateMonthlyData([], []);
      expect(result).toEqual([]);
    });

    it('handles only income data', () => {
      const income = [{ record_month: '2023-01-01', amount_eur: 1000 }];
      const result = aggregateMonthlyData(income, []);
      expect(result).toHaveLength(1);
      expect(result[0].income).toBe(1000);
      expect(result[0].expenses).toBe(0);
    });

    it('handles only expense data', () => {
      const expenses = [
        { record_date: '2023-01-01', amount_eur: 500, category: 'Strava' },
      ];
      const result = aggregateMonthlyData([], expenses);
      expect(result).toHaveLength(1);
      expect(result[0].income).toBe(0);
      expect(result[0].expenses).toBe(500);
    });

    it('sorts months correctly across different years', () => {
      const income = [
        { record_month: '2024-01-01', amount_eur: 1000 },
        { record_month: '2023-12-01', amount_eur: 1000 },
      ];
      const result = aggregateMonthlyData(income, []);
      expect(result[0].month).toBe('2023-12');
      expect(result[1].month).toBe('2024-01');
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

    it('trims account names', () => {
      const items: AssetItem[] = [
        { accountName: ' Tatra Banka ', amount: '100', currency: 'EUR' },
        { accountName: 'Tatra Banka', amount: '200', currency: 'EUR' },
      ];

      const merged = mergeAssetItems(items);
      expect(merged).toHaveLength(1);
      expect(merged[0].amount).toBe(300);
    });
  });

  describe('mergeIncomeItems', () => {
    it('merges multiple items with the same category name', () => {
      const items = [
        { categoryName: 'Práca', amount: '1500', currency: 'EUR' },
        { categoryName: 'Práca', amount: '200', currency: 'EUR' },
        { categoryName: 'Bonus', amount: '300', currency: 'EUR' },
      ];

      const merged = mergeIncomeItems(items);

      expect(merged).toHaveLength(2);
      expect(merged.find((m) => m.categoryName === 'Práca')?.amount).toBe(1700);
      expect(merged.find((m) => m.categoryName === 'Bonus')?.amount).toBe(300);
    });

    it('trims category names', () => {
      const items = [
        { categoryName: ' Dividendy ', amount: '100', currency: 'EUR' },
        { categoryName: 'Dividendy', amount: '50', currency: 'EUR' },
      ];

      const merged = mergeIncomeItems(items);
      expect(merged).toHaveLength(1);
      expect(merged[0].amount).toBe(150);
    });

    it('handles empty category names', () => {
      const items = [
        { categoryName: '', amount: '100', currency: 'EUR' },
        { categoryName: '  ', amount: '200', currency: 'EUR' },
      ];

      const merged = mergeIncomeItems(items);
      expect(merged).toHaveLength(0);
    });
  });

  describe('calculateFireTarget', () => {
    it('calculates target correctly for 4% SWR', () => {
      expect(calculateFireTarget(1000, 4)).toBe(300000);
    });

    it('handles zero expenses', () => {
      expect(calculateFireTarget(0, 4)).toBe(0);
    });
  });

  describe('calculateMonthsToFire', () => {
    it('returns 0 if already at target', () => {
      expect(calculateMonthsToFire(100, 10, 0.01, 50)).toBe(0);
    });

    it('calculates months correctly without growth', () => {
      expect(calculateMonthsToFire(0, 100, 0, 1000)).toBe(10);
    });

    it('handles growth correctly', () => {
      // 0 + 100 * 1.1 = 110 (1 month)
      // 110 + 100 * 1.1 = 231 (2 months)
      expect(calculateMonthsToFire(0, 100, 0.1, 200)).toBe(2);
    });
  });
});
