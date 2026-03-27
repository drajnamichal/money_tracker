'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  BrainCircuit,
  Zap,
  Plus,
  Receipt,
  AlertTriangle,
  House,
  PiggyBank,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Sankey,
} from 'recharts';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/skeleton';
import { cn } from '@/lib/utils';
import { TOOLTIP_STYLE } from '@/lib/constants';
import type { ReactNode } from 'react';
import { AnimatedNumber } from '@/components/animated-number';
import {
  useWealthData,
  useIncomeData,
  useExpenseData,
  useInvestmentData,
  useMortgageData,
  useRecurringPaymentsData,
} from '@/hooks/use-financial-data';
import type {
  WealthRecord,
  IncomeRecord,
  ExpenseRecord,
  Investment,
  Mortgage,
  RecurringPayment,
} from '@/types/financial';

export interface DashboardClientProps {
  initialWealth: WealthRecord[];
  initialIncome: IncomeRecord[];
  initialExpenses: ExpenseRecord[];
  initialInvestments: Investment[];
  initialMortgages: Mortgage[];
  initialRecurringPayments: RecurringPayment[];
}

const insightCardStyles: Record<string, { wrapper: string; iconBg: string }> = {
  emerald: {
    wrapper:
      'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-900/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  rose: {
    wrapper:
      'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100/50 dark:border-rose-900/20',
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
  },
  indigo: {
    wrapper:
      'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100/50 dark:border-indigo-900/20',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
};

const statCardIconBg: Record<string, string> = {
  emerald: 'bg-emerald-50 dark:bg-emerald-950',
  rose: 'bg-rose-50 dark:bg-rose-950',
  blue: 'bg-blue-50 dark:bg-blue-950',
};

export function DashboardClient({
  initialWealth,
  initialIncome,
  initialExpenses,
  initialInvestments,
  initialMortgages,
  initialRecurringPayments,
}: DashboardClientProps) {
  const { records: wealthData, loading: wealthLoading } = useWealthData({
    initialRecords: initialWealth,
  });
  const { records: incomeData, loading: incomeLoading } = useIncomeData({
    initialRecords: initialIncome,
  });
  const { records: expenseData, loading: expenseLoading } = useExpenseData({
    initialRecords: initialExpenses,
  });
  const { investments, loading: investmentLoading } = useInvestmentData({
    initialInvestments,
  });
  const { mortgage, loading: mortgageLoading } = useMortgageData();
  const { records: recurringPayments, loading: recurringLoading } =
    useRecurringPaymentsData({ initialRecords: initialRecurringPayments });

  const loading =
    wealthLoading ||
    incomeLoading ||
    expenseLoading ||
    investmentLoading ||
    mortgageLoading ||
    recurringLoading;

  const stats = useMemo(() => {
    let totalAssets = 0;
    let growth = 0;
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let savingsRate = 0;
    let prevMonthIncome = 0;
    let prevMonthExpenses = 0;
    let prevMonthName = '';
    let previousAssetsTotal = 0;

    const investmentValue = investments
      .filter((inv) => !inv.portfolio_id || inv.portfolio_id === 'default')
      .reduce((sum, inv) => sum + inv.shares * inv.current_price, 0);
    const investmentCostBasis = investments
      .filter((inv) => !inv.portfolio_id || inv.portfolio_id === 'default')
      .reduce((sum, inv) => sum + inv.shares * inv.avg_price, 0);

    if (wealthData && wealthData.length > 0) {
      // Get the single latest date from all wealth records
      const allDates = wealthData.map((r) => r.record_date);
      const latestDate = allDates.reduce((a, b) => (a > b ? a : b));

      // This is the number from the Assets page "CELKOM" for the latest period
      const latestAssetsTotal = wealthData
        .filter((r) => r.record_date === latestDate)
        .reduce((sum, r) => sum + Number(r.amount_eur), 0);

      const totalsByDate = wealthData.reduce<Record<string, number>>((acc, curr) => {
        acc[curr.record_date] =
          (acc[curr.record_date] || 0) + Number(curr.amount_eur);
        return acc;
      }, {});

      const sortedDates = Object.keys(totalsByDate).sort();
      const previousDate = sortedDates[sortedDates.length - 2];
      previousAssetsTotal = totalsByDate[previousDate] || latestAssetsTotal;

      totalAssets = latestAssetsTotal;
      growth =
        previousAssetsTotal !== 0
          ? ((latestAssetsTotal - previousAssetsTotal) / previousAssetsTotal) *
            100
          : 0;
    } else {
      totalAssets = investmentValue;
      previousAssetsTotal = investmentValue;
    }

    // The user specifically wants "Čistý majetok" to match the Assets page total (snapshot)
    const netWorth = totalAssets;

    interface MonthlyBucket {
      month: string;
      income: number;
      expenses: number;
    }

    const monthlyData: Record<string, MonthlyBucket> = {};
    if (incomeData) {
      incomeData.forEach((item) => {
        const month = item.record_month.substring(0, 7);
        if (!monthlyData[month])
          monthlyData[month] = { month, income: 0, expenses: 0 };
        monthlyData[month].income += Number(item.amount_eur);
      });
    }

    if (expenseData) {
      expenseData.forEach((item) => {
        const month = item.record_date.substring(0, 7);
        if (!monthlyData[month])
          monthlyData[month] = { month, income: 0, expenses: 0 };
        monthlyData[month].expenses += Number(item.amount_eur);
      });
    }

    const combinedSorted = Object.values(monthlyData).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    const latestMonth = combinedSorted[combinedSorted.length - 1] as MonthlyBucket | undefined;
    if (latestMonth) {
      monthlyIncome = latestMonth.income;
      monthlyExpenses = latestMonth.expenses;
      savingsRate =
        monthlyIncome > 0
          ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
          : 0;
    }

    // Previous month data
    const prevMonth = combinedSorted[combinedSorted.length - 2] as MonthlyBucket | undefined;
    if (prevMonth) {
      prevMonthIncome = prevMonth.income;
      prevMonthExpenses = prevMonth.expenses;
      prevMonthName = new Date(prevMonth.month + '-01').toLocaleDateString('sk-SK', {
        month: 'long',
        year: 'numeric',
      });
    }

    // Month-over-month change percentages
    const incomeChange =
      prevMonthIncome > 0
        ? ((monthlyIncome - prevMonthIncome) / prevMonthIncome) * 100
        : 0;
    const expenseChange =
      prevMonthExpenses > 0
        ? ((monthlyExpenses - prevMonthExpenses) / prevMonthExpenses) * 100
        : 0;
    const monthlySaving = monthlyIncome - monthlyExpenses;
    const prevMonthlySaving = prevMonthIncome - prevMonthExpenses;
    const savingChange =
      prevMonthlySaving !== 0
        ? ((monthlySaving - prevMonthlySaving) / Math.abs(prevMonthlySaving)) * 100
        : 0;
    const investmentChange =
      investmentCostBasis > 0
        ? ((investmentValue - investmentCostBasis) / investmentCostBasis) * 100
        : 0;

    return {
      totalAssets,
      growth,
      monthlyIncome,
      monthlyExpenses,
      savingsRate,
      netWorth,
      prevMonthIncome,
      prevMonthExpenses,
      prevMonthName,
      incomeChange,
      expenseChange,
      savingChange,
      investmentValue,
      investmentCostBasis,
      investmentChange,
      monthlySaving,
      previousAssetsTotal,
      netWorthDeltaAmount: totalAssets - previousAssetsTotal,
      monthlySeries: combinedSorted,
    };
  }, [wealthData, incomeData, expenseData, investments, mortgage]);

  const whatToNoticeInsights = useMemo(() => {
    if (loading) return [];

    const insights: Array<{
      icon: ReactNode;
      title: string;
      text: ReactNode;
      color: keyof typeof insightCardStyles;
      priority: number;
    }> = [];

    if (stats.monthlySaving < 0) {
      insights.push({
        icon: <AlertTriangle className="text-rose-500" size={18} />,
        title: 'Cashflow je tento mesiac záporný',
        text: (
          <span>
            Výdavky sú vyššie než príjmy o{' '}
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(Math.abs(stats.monthlySaving))}
            </span>{' '}
            a rozpočet je pod tlakom.
          </span>
        ),
        color: 'rose',
        priority: 1,
      });
    }

    const expenseIncreaseStreak = getExpenseIncreaseStreak(stats.monthlySeries);
    if (expenseIncreaseStreak >= 2) {
      insights.push({
        icon: <Receipt className="text-rose-500" size={18} />,
        title: `Výdavky rastú už ${expenseIncreaseStreak} mesiace po sebe`,
        text: (
          <span>
            Aktuálny mesiac je na úrovni{' '}
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(stats.monthlyExpenses)}
            </span>{' '}
            a trend je stále rastúci.
          </span>
        ),
        color: 'rose',
        priority: 2,
      });
    }

    const mortgageProgress = mortgage
      ? getMortgageProgressInsight(mortgage)
      : null;
    if (mortgageProgress) {
      insights.push({
        icon:
          mortgageProgress.status === 'ahead' ? (
            <House className="text-emerald-500" size={18} />
          ) : mortgageProgress.status === 'behind' ? (
            <House className="text-rose-500" size={18} />
          ) : (
            <House className="text-indigo-500" size={18} />
          ),
        title:
          mortgageProgress.status === 'ahead'
            ? 'Hypotéka je rýchlejšie splácaná než plán'
            : mortgageProgress.status === 'behind'
              ? 'Hypotéka zaostáva za plánom'
              : 'Hypotéka ide podľa plánu',
        text: (
          <span>
            {mortgageProgress.message}
          </span>
        ),
        color:
          mortgageProgress.status === 'ahead'
            ? 'emerald'
            : mortgageProgress.status === 'behind'
              ? 'rose'
              : 'indigo',
        priority: 3,
      });
    }

    const recurringPriceIncreases = recurringPayments.filter(
      (payment) =>
        payment.last_amount !== null &&
        payment.last_amount !== undefined &&
        Number(payment.amount) > Number(payment.last_amount)
    );
    if (recurringPriceIncreases.length > 0) {
      const totalMonthlyIncrease = recurringPriceIncreases.reduce((sum, payment) => {
        const diff = Number(payment.amount) - Number(payment.last_amount ?? 0);
        return sum + (payment.frequency === 'yearly' ? diff / 12 : diff);
      }, 0);

      insights.push({
        icon: <Zap className="text-indigo-500" size={18} />,
        title: 'Niektoré pravidelné platby zdraželi',
        text: (
          <span>
            {recurringPriceIncreases.length} platieb pridáva asi{' '}
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(totalMonthlyIncrease)}
            </span>{' '}
            k mesačnému zaťaženiu.
          </span>
        ),
        color: 'indigo',
        priority: 4,
      });
    }

    if (stats.monthlySaving > 0) {
      insights.push({
        icon: <PiggyBank className="text-emerald-500" size={18} />,
        title: 'Tento mesiac vytváraš pozitívny priestor',
        text: (
          <span>
            Po odpočítaní výdavkov ti zostáva{' '}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(stats.monthlySaving)}
            </span>{' '}
            na rezervu alebo investície.
          </span>
        ),
        color: 'emerald',
        priority: 5,
      });
    }

    if (insights.length === 0) {
      insights.push({
        icon: <BrainCircuit className="text-indigo-500" size={18} />,
        title: 'Zatiaľ zbierame dáta',
        text: (
          <span>
            Keď pribudne viac mesačných záznamov, zobrazia sa tu najdôležitejšie
            finančné signály a odchýlky.
          </span>
        ),
        color: 'indigo',
        priority: 99,
      });
    }

    return insights.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [stats, loading, recurringPayments, mortgage]);

  const assetsHistory = useMemo(() => {
    if (!wealthData || wealthData.length === 0) return [];
    const totalsByDate = wealthData.reduce<Record<string, number>>((acc, curr) => {
      acc[curr.record_date] =
        (acc[curr.record_date] || 0) + Number(curr.amount_eur);
      return acc;
    }, {});

    return Object.keys(totalsByDate)
      .sort()
      .map((date) => ({
        date: new Date(date).toLocaleDateString('sk-SK', {
          month: 'short',
          year: '2-digit',
        }),
        total: totalsByDate[date],
      }));
  }, [wealthData]);

  const incomeVsExpenses = useMemo(() => {
    interface ChartBucket {
      month: string;
      income: number;
      expenses: number;
    }

    const monthlyData: Record<string, ChartBucket> = {};
    if (incomeData) {
      incomeData.forEach((item) => {
        const month = item.record_month.substring(0, 7);
        if (!monthlyData[month])
          monthlyData[month] = { month, income: 0, expenses: 0 };
        monthlyData[month].income += Number(item.amount_eur);
      });
    }

    if (expenseData) {
      expenseData.forEach((item) => {
        const month = item.record_date.substring(0, 7);
        if (!monthlyData[month])
          monthlyData[month] = { month, income: 0, expenses: 0 };
        monthlyData[month].expenses += Number(item.amount_eur);
      });
    }

    return Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({
        name: new Date(item.month).toLocaleDateString('sk-SK', {
          month: 'short',
          year: '2-digit',
        }),
        income: item.income,
        expenses: item.expenses,
      }));
  }, [incomeData, expenseData]);

  const recentTransactions = useMemo(() => {
    interface Transaction {
      id: string;
      type: 'expense' | 'income';
      description: string;
      amount: number;
      date: string;
      category?: string;
    }

    const transactions: Transaction[] = [];

    expenseData?.slice(0, 15).forEach((e) => {
      transactions.push({
        id: e.id,
        type: 'expense',
        description: e.description || '',
        amount: e.amount_eur,
        date: e.record_date,
        category: e.category,
      });
    });

    incomeData?.slice(0, 15).forEach((i) => {
      transactions.push({
        id: i.id,
        type: 'income',
        description: i.income_categories?.name || i.description || '',
        amount: i.amount_eur,
        date: i.record_month,
        category: i.income_categories?.name,
      });
    });

    return transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [expenseData, incomeData]);

  const cashFlowSankey = useMemo(() => {
    if (!stats.monthlyIncome || stats.monthlyIncome === 0) return null;

    // Build top expense categories for the current month
    const catTotals: Record<string, number> = {};
    const latestMonthKey = incomeData?.[0]?.record_month?.substring(0, 7);
    if (latestMonthKey) {
      expenseData
        ?.filter((e) => e.record_date.startsWith(latestMonthKey))
        .forEach((e) => {
          const cat = (e.category || 'Ostatné').split(':')[0].trim();
          catTotals[cat] = (catTotals[cat] || 0) + Number(e.amount_eur);
        });
    }

    const topCats = Object.entries(catTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const saving = Math.max(0, stats.monthlyIncome - stats.monthlyExpenses);

    // Nodes: 0=Príjem, 1..N=categories, N+1=Úspora
    const nodes = [
      { name: `Príjem (${formatCurrency(stats.monthlyIncome)})` },
      ...topCats.map(([cat, val]) => ({ name: `${cat} (${formatCurrency(val)})` })),
      ...(saving > 0 ? [{ name: `Úspora (${formatCurrency(saving)})` }] : []),
    ];

    const links = [
      ...topCats.map(([, val], idx) => ({
        source: 0,
        target: idx + 1,
        value: val,
      })),
      ...(saving > 0
        ? [{ source: 0, target: topCats.length + 1, value: saving }]
        : []),
    ];

    if (links.length === 0) return null;
    return { nodes, links };
  }, [stats, expenseData, incomeData]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ahoj! 👋</h1>
          <p className="text-slate-500">
            Tu je prehľad tvojich rodinných financií.
          </p>
        </div>
        {loading ? (
          <Skeleton className="h-20 w-60 rounded-2xl" />
        ) : (
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-4 border border-slate-800">
            <Wallet size={24} className="text-slate-400" />
            <div>
              <p className="text-xs opacity-60 uppercase font-bold tracking-wider">
                Čistý Majetok
              </p>
              <div className="flex items-center gap-3 mt-1">
                <AnimatedNumber
                  value={stats.netWorth}
                  format={formatCurrency}
                  className="text-xl font-bold"
                />
                <ChangeBadge
                  change={stats.growth}
                  label="vs posledný snapshot"
                  positiveDirection="up"
                  compact
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        ) : (
          <>
            <StatCard
              title="Mesačný Príjem"
              rawValue={stats.monthlyIncome}
              change={stats.incomeChange}
              icon={<TrendingUp className="text-emerald-500" />}
              color="emerald"
              changeLabel="vs minulý mesiac"
              positiveDirection="up"
            />
            <StatCard
              title="Mesačné Výdavky"
              rawValue={stats.monthlyExpenses}
              change={stats.expenseChange}
              icon={<TrendingDown className="text-rose-500" />}
              color="rose"
              changeLabel="vs minulý mesiac"
              positiveDirection="down"
            />
            <StatCard
              title="Investície"
              rawValue={stats.investmentValue}
              change={stats.investmentChange}
              icon={<TrendingUp className="text-blue-500" />}
              color="blue"
              changeLabel="vs nákupná cena"
              positiveDirection="up"
            />
            <StatCard
              title="Čistý Majetok"
              rawValue={stats.netWorth}
              change={stats.growth}
              icon={<Wallet className="text-indigo-500" />}
              color="blue"
              changeLabel="vs posledný snapshot"
              positiveDirection="up"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      {!loading && (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          <Link
            href="/expenses?action=add"
            className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-rose-200 dark:shadow-none whitespace-nowrap text-sm"
          >
            <Plus size={18} />
            Pridať výdavok
          </Link>
          <Link
            href="/income"
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-emerald-200 dark:shadow-none whitespace-nowrap text-sm"
          >
            <Plus size={18} />
            Pridať príjem
          </Link>
          <Link
            href="/assets"
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-200 dark:shadow-none whitespace-nowrap text-sm"
          >
            <Plus size={18} />
            Zaznamenať majetok
          </Link>
        </div>
      )}

      {/* Recent Transactions */}
      {!loading && recentTransactions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <h3 className="font-semibold">Posledné transakcie</h3>
            <Link
              href="/expenses"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              Všetky <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y">
            {recentTransactions.map((tx) => (
              <div
                key={`${tx.type}-${tx.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    tx.type === 'expense'
                      ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {tx.type === 'expense' ? (
                    <Receipt size={16} />
                  ) : (
                    <TrendingUp size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {tx.description}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(tx.date).toLocaleDateString('sk-SK', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {tx.category && ` · ${tx.category}`}
                  </p>
                </div>
                <p
                  className={cn(
                    'text-sm font-bold shrink-0',
                    tx.type === 'expense'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {tx.type === 'expense' ? '-' : '+'}
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous Month Summary */}
      {!loading && stats.prevMonthName && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl p-6 border"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                Predchádzajúci mesiac
              </p>
              <p className="text-lg font-bold capitalize">{stats.prevMonthName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Príjmy</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(stats.prevMonthIncome)}
                </p>
              </div>
              <div className="text-2xl text-slate-300 dark:text-slate-600">−</div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Výdavky</p>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(stats.prevMonthExpenses)}
                </p>
              </div>
              <div className="text-2xl text-slate-300 dark:text-slate-600">=</div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Bilancia</p>
                <p className={`text-xl font-black ${
                  stats.prevMonthIncome - stats.prevMonthExpenses >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {stats.prevMonthIncome - stats.prevMonthExpenses >= 0 ? '+' : ''}
                  {formatCurrency(stats.prevMonthIncome - stats.prevMonthExpenses)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* What To Notice Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-1 shadow-xl shadow-blue-200 dark:shadow-none overflow-hidden"
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[22px] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              <Zap size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Čo si všimnúť</h2>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                3 najdôležitejšie signály
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {loading ? (
              <>
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </>
            ) : (
              <>
                {whatToNoticeInsights.map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-2xl border',
                      insightCardStyles[insight.color]?.wrapper
                    )}
                  >
                    <div
                      className={cn(
                        'mt-1 p-2 rounded-lg',
                        insightCardStyles[insight.color]?.iconBg
                      )}
                    >
                      {insight.icon}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {insight.title}
                      </p>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {insight.text}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-6">Vývoj Majetku</h3>
          <div className="h-[300px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={assetsHistory}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => [
                      formatCurrency(Number(value ?? 0)),
                      'Majetok',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-6">Príjmy vs Výdavky</h3>
          <div className="h-[300px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeVsExpenses}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                  />
                  <Legend iconType="circle" />
                  <Bar
                    dataKey="income"
                    name="Príjem"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Výdavky"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Cash Flow Sankey */}
      {!loading && cashFlowSankey && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-6">Tok peňazí tento mesiac</h3>
          <div className="h-[250px]" style={{ minWidth: 300, minHeight: 200 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
              <Sankey
                data={cashFlowSankey}
                nodePadding={30}
                nodeWidth={8}
                linkCurvature={0.5}
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                link={{ stroke: 'hsl(var(--foreground))', strokeOpacity: 0.15 }}
                node={{
                  fill: '#2563eb',
                  stroke: 'none',
                }}
              >
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                />
              </Sankey>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  rawValue: number;
  change: number;
  icon: ReactNode;
  color: string;
  changeLabel: string;
  positiveDirection: 'up' | 'down';
}

function StatCard({
  title,
  rawValue,
  change,
  icon,
  color,
  changeLabel,
  positiveDirection,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border flex items-center gap-6"
    >
      <div className={cn('p-4 rounded-xl', statCardIconBg[color])}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <div className="flex items-baseline gap-2">
          <AnimatedNumber
            value={rawValue}
            format={formatCurrency}
            className="text-2xl font-bold"
          />
        </div>
        <div className="mt-2">
          <ChangeBadge
            change={change}
            label={changeLabel}
            positiveDirection={positiveDirection}
          />
        </div>
      </div>
    </motion.div>
  );
}

interface ChangeBadgeProps {
  change: number;
  label: string;
  positiveDirection: 'up' | 'down';
  compact?: boolean;
}

function ChangeBadge({
  change,
  label,
  positiveDirection,
  compact = false,
}: ChangeBadgeProps) {
  const isPositive =
    positiveDirection === 'up' ? change > 0 : change < 0;
  const isNeutral = Math.abs(change) < 0.1;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold',
        compact ? 'px-2.5 py-1 text-[10px]' : 'px-2.5 py-1 text-xs',
        isNeutral
          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          : isPositive
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
      )}
    >
      {isNeutral ? '0.0%' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`} {label}
    </span>
  );
}

function getExpenseIncreaseStreak(
  monthlySeries: Array<{ month: string; income: number; expenses: number }>
) {
  if (monthlySeries.length < 2) return 0;

  let streak = 0;
  for (let index = monthlySeries.length - 1; index > 0; index -= 1) {
    if (monthlySeries[index].expenses > monthlySeries[index - 1].expenses) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function getMortgageProgressInsight(mortgage: Mortgage) {
  const now = new Date();
  const start = new Date(mortgage.start_date);
  const maturity = new Date(mortgage.maturity_date);
  const totalDuration = maturity.getTime() - start.getTime();

  if (Number.isNaN(totalDuration) || totalDuration <= 0) {
    return null;
  }

  const elapsed = Math.min(
    Math.max(now.getTime() - start.getTime(), 0),
    totalDuration
  );
  const elapsedRatio = elapsed / totalDuration;
  const expectedRemainingPrincipal =
    mortgage.original_amount * (1 - elapsedRatio);
  const delta = expectedRemainingPrincipal - mortgage.current_principal;
  const threshold = mortgage.monthly_payment;

  if (Math.abs(delta) < threshold * 0.5) {
    return {
      status: 'on-track' as const,
      message: 'Aktuálny zostatok zodpovedá približne očakávanému priebehu splácania.',
    };
  }

  if (delta > 0) {
    return {
      status: 'ahead' as const,
      message: `Zostatok istiny je približne o ${formatCurrency(delta)} nižší než lineárny plán.`,
    };
  }

  return {
    status: 'behind' as const,
    message: `Zostatok istiny je približne o ${formatCurrency(Math.abs(delta))} vyšší než lineárny plán.`,
  };
}
