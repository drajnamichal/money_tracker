'use client';

import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  BrainCircuit,
  Zap,
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
} from 'recharts';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/skeleton';
import { cn } from '@/lib/utils';
import { TOOLTIP_STYLE } from '@/lib/constants';
import type { ReactNode } from 'react';
import {
  useWealthData,
  useIncomeData,
  useExpenseData,
  useInvestmentData,
  useMortgageData,
  useRecurringPaymentsData,
} from '@/hooks/use-financial-data';

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

export default function Dashboard() {
  const { records: wealthData, loading: wealthLoading } = useWealthData();
  const { records: incomeData, loading: incomeLoading } = useIncomeData();
  const { records: expenseData, loading: expenseLoading } = useExpenseData();
  const { investments, loading: investmentLoading } = useInvestmentData();
  const { mortgage, loading: mortgageLoading } = useMortgageData();
  const { records: recurringPayments, loading: recurringLoading } =
    useRecurringPaymentsData();

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

    const investmentValue = investments
      .filter((inv) => !inv.portfolio_id || inv.portfolio_id === 'default')
      .reduce((sum, inv) => sum + inv.shares * inv.current_price, 0);

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
      const previousAssetsTotal =
        totalsByDate[previousDate] || latestAssetsTotal;

      totalAssets = latestAssetsTotal;
      growth =
        previousAssetsTotal !== 0
          ? ((latestAssetsTotal - previousAssetsTotal) / previousAssetsTotal) *
            100
          : 0;
    } else {
      totalAssets = investmentValue;
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
    };
  }, [wealthData, incomeData, expenseData, investments, mortgage]);

  const aiInsights = useMemo(() => {
    if (loading) return [];

    const insights = [];

    // Action 1: Investable Amount (Prioritized)
    const monthlySaving = stats.monthlyIncome - stats.monthlyExpenses;
    if (monthlySaving > 0) {
      insights.push({
        icon: <TrendingUp className="text-emerald-500" size={18} />,
        text: (
          <span>
            Tento mesiac môžeš investovať{' '}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(monthlySaving)}
            </span>{' '}
            bez rizika pre tvoj cashflow.
          </span>
        ),
        color: 'emerald',
        priority: 1,
      });
    }

    // Action 2: Subscriptions Analysis
    const subs = recurringPayments.filter(
      (p) =>
        p.frequency === 'monthly' &&
        (p.name.toLowerCase().includes('netflix') ||
          p.name.toLowerCase().includes('spotify') ||
          p.name.toLowerCase().includes('hbo') ||
          p.name.toLowerCase().includes('disney') ||
          p.name.toLowerCase().includes('youtube') ||
          p.amount < 20)
    );

    if (subs.length >= 2) {
      const totalSubsAmount = subs.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      insights.push({
        icon: <TrendingDown className="text-rose-500" size={18} />,
        text: (
          <span>
            Zváž zrušenie týchto {subs.length} predplatných – ušetríš{' '}
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(totalSubsAmount)}
            </span>{' '}
            mesačne.
          </span>
        ),
        color: 'rose',
        priority: 2,
      });
    }

    // Action 3: Emergency Fund check (if not enough)
    const emergencyFundGoal = stats.monthlyExpenses * 6;
    if (stats.totalAssets < emergencyFundGoal) {
      const missing = emergencyFundGoal - stats.totalAssets;
      insights.push({
        icon: <BrainCircuit className="text-indigo-500" size={18} />,
        text: (
          <span>
            Doplnenie rezervy: Potrebuješ ešte{' '}
            <span className="font-bold">{formatCurrency(missing)}</span> na
            dosiahnutie bezpečného vankúša (6 mesiacov).
          </span>
        ),
        color: 'indigo',
        priority: 3,
      });
    }

    // Sort by priority and take only top 2
    return insights.sort((a, b) => a.priority - b.priority).slice(0, 2);
  }, [stats, loading, recurringPayments]);

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
          <Skeleton className="h-16 w-48 rounded-2xl" />
        ) : (
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-4 border border-slate-800">
            <Wallet size={24} className="text-slate-400" />
            <div>
              <p className="text-xs opacity-60 uppercase font-bold tracking-wider">
                Čistý Majetok
              </p>
              <p className="text-xl font-bold">
                {formatCurrency(stats.netWorth)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        ) : (
          <>
            <StatCard
              title="Mesačný Príjem"
              value={formatCurrency(stats.monthlyIncome)}
              change={stats.incomeChange}
              icon={<TrendingUp className="text-emerald-500" />}
              color="emerald"
            />
            <StatCard
              title="Mesačné Výdavky"
              value={formatCurrency(stats.monthlyExpenses)}
              change={stats.expenseChange}
              icon={<TrendingDown className="text-rose-500" />}
              color="rose"
            />
            <StatCard
              title="Mesačná Úspora"
              value={formatCurrency(
                stats.monthlyIncome - stats.monthlyExpenses
              )}
              change={stats.savingChange}
              icon={<TrendingUp className="text-blue-500" />}
              color="blue"
            />
          </>
        )}
      </div>

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

      {/* AI Financial Coach Section */}
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
              <h2 className="text-lg font-bold">AI Finančný kouč</h2>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                Akcie na tento mesiac
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <>
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </>
            ) : (
              <>
                {aiInsights.map((insight, idx) => (
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
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                      {insight.text}
                    </div>
                  </motion.div>
                ))}
                {aiInsights.length === 0 && (
                  <p className="text-sm text-slate-500 italic p-4">
                    Zatiaľ nemám dostatok dát na analýzu. Pridaj viac záznamov o
                    majetku a výdavkoch.
                  </p>
                )}
              </>
            )}
          </div>

          {!loading && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition-colors group">
                Detailná analýza{' '}
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          )}
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
                    formatter={(value: number) => [
                      formatCurrency(value),
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
                    formatter={(value: number) => formatCurrency(value)}
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
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: ReactNode;
  color: string;
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
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
          <h3 className="text-2xl font-bold">{value}</h3>
          {change !== 0 && (
            <span
              className={`text-xs font-bold ${change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
