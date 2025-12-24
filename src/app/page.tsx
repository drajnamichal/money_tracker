'use client';

import { useEffect, useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
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
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/skeleton';
import {
  useWealthData,
  useIncomeData,
  useExpenseData,
} from '@/hooks/use-financial-data';
import {
  calculatePercentageChange,
  aggregateMonthlyData,
  calculateWealthGrowth,
  generateSpendingInsight,
} from '@/lib/calculations';

export default function Dashboard() {
  const { records: wealthData, loading: wealthLoading } = useWealthData();
  const { records: incomeData, loading: incomeLoading } = useIncomeData();
  const { records: expenseData, loading: expenseLoading } = useExpenseData();

  const loading = wealthLoading || incomeLoading || expenseLoading;

  const stats = useMemo(() => {
    const { totalAssets, growth } = calculateWealthGrowth(wealthData);
    const combinedMonthlyData = aggregateMonthlyData(incomeData, expenseData);

    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let incomeChange = 0;
    let expenseChange = 0;
    let savingsChange = 0;
    let insight = null;

    const latestMonth = combinedMonthlyData[combinedMonthlyData.length - 1];
    const prevMonth = combinedMonthlyData[combinedMonthlyData.length - 2];

    if (latestMonth) {
      monthlyIncome = latestMonth.income;
      monthlyExpenses = latestMonth.expenses;

      if (prevMonth) {
        incomeChange = calculatePercentageChange(
          latestMonth.income,
          prevMonth.income
        );
        expenseChange = calculatePercentageChange(
          latestMonth.expenses,
          prevMonth.expenses
        );

        const latestSavings = latestMonth.income - latestMonth.expenses;
        const prevSavings = prevMonth.income - prevMonth.expenses;
        savingsChange = calculatePercentageChange(latestSavings, prevSavings);

        insight = generateSpendingInsight(latestMonth, prevMonth);
      }
    }

    return {
      totalAssets,
      growth,
      monthlyIncome,
      monthlyExpenses,
      incomeChange,
      expenseChange,
      savingsChange,
      insight,
    };
  }, [wealthData, incomeData, expenseData]);

  const assetsHistory = useMemo(() => {
    if (!wealthData || wealthData.length === 0) return [];
    const totalsByDate = wealthData.reduce((acc: any, curr: any) => {
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

  const incomeVsExpensesChartData = useMemo(() => {
    return aggregateMonthlyData(incomeData, expenseData).map((item) => ({
      name: new Date(item.month).toLocaleDateString('sk-SK', {
        month: 'short',
        year: '2-digit',
      }),
      income: item.income,
      expenses: item.expenses,
    }));
  }, [incomeData, expenseData]);

  return (
    <div className="space-y-8">
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
          <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 flex items-center gap-4">
            <Wallet size={24} />
            <div>
              <p className="text-xs opacity-80 uppercase font-bold tracking-wider">
                Celkový Majetok
              </p>
              <p className="text-xl font-bold">
                {formatCurrency(stats.totalAssets)}
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
              reverse
            />
            <StatCard
              title="Mesačná Úspora"
              value={formatCurrency(
                stats.monthlyIncome - stats.monthlyExpenses
              )}
              change={stats.savingsChange}
              icon={<TrendingUp className="text-blue-500" />}
              color="blue"
            />
          </>
        )}
      </div>

      <AnimatePresence>
        {!loading && stats.insight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border flex items-start gap-4 ${
              stats.insight.type === 'warning'
                ? 'bg-amber-50 border-amber-100 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-200'
                : stats.insight.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-200'
                  : 'bg-blue-50 border-blue-100 text-blue-900 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-200'
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                stats.insight.type === 'warning'
                  ? 'bg-amber-100 dark:bg-amber-900/40'
                  : stats.insight.type === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40'
                    : 'bg-blue-100 dark:bg-blue-900/40'
              }`}
            >
              <Lightbulb size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Inteligentný postreh</p>
              <p className="text-sm opacity-90">{stats.insight.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
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
                <BarChart data={incomeVsExpensesChartData}>
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
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
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

function StatCard({ title, value, change, icon, color, reverse }: any) {
  const isPositive = change > 0;
  const isGood = reverse ? !isPositive : isPositive;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border flex items-center gap-6 relative overflow-hidden"
    >
      <div className={`p-4 rounded-xl bg-${color}-50 dark:bg-${color}-950/30`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold">{value}</h3>
          {change !== 0 && (
            <div
              className={`flex items-center text-xs font-bold ${isGood ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {isPositive ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              <span>
                {Math.abs(change).toFixed(1)}%
                <span className="text-[10px] opacity-60 ml-1 font-normal">
                  vs min. m.
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
