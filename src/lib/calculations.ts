export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  categories: Record<string, number>;
}

export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function aggregateMonthlyData(
  incomeData: { record_month: string; amount_eur: number }[],
  expenseData: { record_date: string; amount_eur: number; category?: string }[]
): MonthlyData[] {
  const monthlyData: Record<string, MonthlyData> = {};

  incomeData.forEach((item) => {
    const month = item.record_month.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { month, income: 0, expenses: 0, categories: {} };
    }
    monthlyData[month].income += Number(item.amount_eur);
  });

  expenseData.forEach((item) => {
    const month = item.record_date.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { month, income: 0, expenses: 0, categories: {} };
    }
    monthlyData[month].expenses += Number(item.amount_eur);

    const cat = item.category || 'Ostatné';
    if (!monthlyData[month].categories[cat]) {
      monthlyData[month].categories[cat] = 0;
    }
    monthlyData[month].categories[cat] += Number(item.amount_eur);
  });

  return Object.values(monthlyData).sort((a, b) =>
    a.month.localeCompare(b.month)
  );
}

export function calculateWealthGrowth(
  wealthData: { record_date: string; amount_eur: number }[]
): {
  totalAssets: number;
  growth: number;
} {
  if (!wealthData || wealthData.length === 0) {
    return { totalAssets: 0, growth: 0 };
  }

  const totalsByDate = wealthData.reduce<Record<string, number>>((acc, curr) => {
    acc[curr.record_date] =
      (acc[curr.record_date] || 0) + Number(curr.amount_eur);
    return acc;
  }, {});

  const sortedDates = Object.keys(totalsByDate).sort();
  const latestDate = sortedDates[sortedDates.length - 1];
  const previousDate = sortedDates[sortedDates.length - 2];

  const totalAssets = totalsByDate[latestDate];
  const previousTotal = totalsByDate[previousDate] || totalAssets;
  const growth = calculatePercentageChange(totalAssets, previousTotal);

  return { totalAssets, growth };
}

export function generateSpendingInsight(
  latestMonth: MonthlyData,
  prevMonth: MonthlyData
): { text: string; type: 'warning' | 'success' | 'info' } | null {
  const categoryInsights: string[] = [];

  Object.entries(latestMonth.categories).forEach(([cat, amount]) => {
    const prevAmount = prevMonth.categories[cat] || 0;
    if (prevAmount > 0) {
      const diff = calculatePercentageChange(amount, prevAmount);
      if (diff > 20) {
        categoryInsights.push(
          `Tento mesiac míňaš o ${diff.toFixed(0)}% viac na ${cat.toLowerCase()} ako minulý mesiac.`
        );
      }
    }
  });

  if (categoryInsights.length > 0) {
    return { text: categoryInsights[0], type: 'warning' };
  }

  const latestSavings = latestMonth.income - latestMonth.expenses;
  const prevSavings = prevMonth.income - prevMonth.expenses;
  const savingsChange = calculatePercentageChange(latestSavings, prevSavings);

  const expenseChange = calculatePercentageChange(
    latestMonth.expenses,
    prevMonth.expenses
  );

  if (savingsChange > 10) {
    return {
      text: `Skvelá práca! Tento mesiac si ušetril o ${savingsChange.toFixed(0)}% viac ako naposledy.`,
      type: 'success',
    };
  }

  if (expenseChange < -10) {
    return {
      text: `Tvoje výdavky klesli o ${Math.abs(expenseChange).toFixed(0)}%. Len tak ďalej!`,
      type: 'success',
    };
  }

  return null;
}

export interface SalarySplit {
  fixed_costs: number;
  investments: number;
  savings: number;
  fun: number;
}

export function calculateSalaryResults(
  salary: number,
  split: SalarySplit
): { name: string; percent: number; amount: number; color: string }[] {
  return [
    {
      name: 'Fixné náklady (Domácnosť, účty)',
      percent: split.fixed_costs,
      amount: (salary * split.fixed_costs) / 100,
      color: 'blue',
    },
    {
      name: 'Investície (ETF, Akcie)',
      percent: split.investments,
      amount: (salary * split.investments) / 100,
      color: 'emerald',
    },
    {
      name: 'Krátkodobé sporenie (Rezerva)',
      percent: split.savings,
      amount: (salary * split.savings) / 100,
      color: 'amber',
    },
    {
      name: 'Zábava a radosť',
      percent: split.fun,
      amount: (salary * split.fun) / 100,
      color: 'rose',
    },
  ];
}

export interface AssetItem {
  accountName: string;
  amount: string;
  currency: string;
}

export function mergeAssetItems(items: AssetItem[]): {
  accountName: string;
  amount: number;
  currency: string;
}[] {
  const merged: Record<string, { amount: number; currency: string }> = {};

  items.forEach((item) => {
    const name = item.accountName.trim();
    if (!name) return;

    const amount = Number(item.amount) || 0;
    if (!merged[name]) {
      merged[name] = { amount: 0, currency: item.currency };
    }
    merged[name].amount += amount;
  });

  return Object.entries(merged).map(([accountName, data]) => ({
    accountName,
    ...data,
  }));
}

export interface IncomeItem {
  categoryName: string;
  amount: string;
  currency: string;
}

export function mergeIncomeItems(items: IncomeItem[]): {
  categoryName: string;
  amount: number;
  currency: string;
}[] {
  const merged: Record<string, { amount: number; currency: string }> = {};

  items.forEach((item) => {
    const name = item.categoryName.trim();
    if (!name) return;

    const amount = Number(item.amount) || 0;
    if (!merged[name]) {
      merged[name] = { amount: 0, currency: item.currency };
    }
    merged[name].amount += amount;
  });

  return Object.entries(merged).map(([categoryName, data]) => ({
    categoryName,
    ...data,
  }));
}

export function calculateFireTarget(
  monthlyExpenses: number,
  swr: number = 4
): number {
  if (monthlyExpenses <= 0 || swr <= 0) return 0;
  return (monthlyExpenses * 12) / (swr / 100);
}

export function calculateMonthsToFire(
  currentNetWorth: number,
  monthlySavings: number,
  monthlyReturnRate: number,
  targetAmount: number
): number {
  if (currentNetWorth >= targetAmount) return 0;
  if (monthlySavings <= 0 && monthlyReturnRate <= 0) return Infinity;

  let months = 0;
  let netWorth = currentNetWorth;
  const maxMonths = 1200; // 100 years

  while (netWorth < targetAmount && months < maxMonths) {
    netWorth = (netWorth + monthlySavings) * (1 + monthlyReturnRate);
    months++;
  }

  return months;
}
