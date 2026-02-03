'use client';

import { useState, useMemo, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  ArrowUpRight,
  Info,
  Calendar,
  Wallet,
  Building2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  useWealthData,
  useIncomeData,
  useExpenseData,
  useInvestmentData,
  useMortgageData,
} from '@/hooks/use-financial-data';
import { Skeleton } from '@/components/skeleton';

export default function FireCalculatorPage() {
  const { records: wealthData, loading: wealthLoading } = useWealthData();
  const { records: incomeData, loading: incomeLoading } = useIncomeData();
  const { records: expenseData, loading: expenseLoading } = useExpenseData();
  const { investments, loading: investmentLoading } = useInvestmentData();
  const { mortgage, loading: mortgageLoading } = useMortgageData();

  const loading =
    wealthLoading ||
    incomeLoading ||
    expenseLoading ||
    investmentLoading ||
    mortgageLoading;

  // Manual overrides for simulation
  const [swr, setSwr] = useState(4); // Safe Withdrawal Rate (%)
  const [expectedReturn, setExpectedReturn] = useState(7); // Annual Return (%)
  const [customMonthlySavings, setCustomMonthlySavings] = useState<
    number | null
  >(null);
  const [customMonthlyExpenses, setCustomMonthlyExpenses] = useState<
    number | null
  >(null);

  const baseStats = useMemo(() => {
    if (loading) return null;

    // 1. Current Assets (Wealth + Investments)
    const investmentValue = investments.reduce(
      (sum, inv) => sum + inv.shares * inv.current_price,
      0
    );

    let cashValue = 0;
    if (wealthData && wealthData.length > 0) {
      const totalsByAccount: Record<string, number> = {};
      wealthData.forEach((r) => {
        const date = r.record_date;
        if (
          !totalsByAccount[r.account_id] ||
          date >
            wealthData.find(
              (w) => w.account_id === r.account_id && w.record_date > date
            )?.record_date!
        ) {
          // This is simplified, let's just get the latest per account
        }
      });

      // Better way to get latest wealth per account
      const latestDates: Record<string, string> = {};
      wealthData.forEach((r) => {
        if (
          !latestDates[r.account_id] ||
          r.record_date > latestDates[r.account_id]
        ) {
          latestDates[r.account_id] = r.record_date;
        }
      });

      cashValue = wealthData
        .filter((r) => r.record_date === latestDates[r.account_id])
        .reduce((sum, r) => sum + Number(r.amount_eur), 0);
    }

    const totalAssets = investmentValue + cashValue;
    const totalDebt = mortgage?.current_principal || 0;
    const netWorth = totalAssets - totalDebt;

    // 2. Income and Expenses (Latest month or average)
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    const monthlyIncomeData: Record<string, number> = {};
    incomeData.forEach((item) => {
      const month = item.record_month.substring(0, 7);
      monthlyIncomeData[month] =
        (monthlyIncomeData[month] || 0) + Number(item.amount_eur);
    });

    const monthlyExpenseData: Record<string, number> = {};
    expenseData.forEach((item) => {
      const month = item.record_date.substring(0, 7);
      monthlyExpenseData[month] =
        (monthlyExpenseData[month] || 0) + Number(item.amount_eur);
    });

    const sortedIncomeMonths = Object.keys(monthlyIncomeData).sort();
    const sortedExpenseMonths = Object.keys(monthlyExpenseData).sort();

    const latestIncomeMonth = sortedIncomeMonths[sortedIncomeMonths.length - 1];
    const latestExpenseMonth =
      sortedExpenseMonths[sortedExpenseMonths.length - 1];

    monthlyIncome = monthlyIncomeData[latestIncomeMonth] || 0;
    monthlyExpenses = monthlyExpenseData[latestExpenseMonth] || 0;

    return {
      totalAssets,
      totalDebt,
      netWorth,
      monthlyIncome,
      monthlyExpenses,
      cashValue,
      investmentValue,
    };
  }, [loading, wealthData, incomeData, expenseData, investments, mortgage]);

  const simulation = useMemo(() => {
    if (!baseStats) return null;

    const expenses = customMonthlyExpenses ?? baseStats.monthlyExpenses;
    const income = baseStats.monthlyIncome;
    const savings = customMonthlySavings ?? income - expenses;

    const annualExpenses = expenses * 12;
    const fireTarget = annualExpenses / (swr / 100);

    // Projection
    const data = [];
    let currentNetWorth = baseStats.netWorth;
    const monthlyRate = expectedReturn / 100 / 12;

    let monthsToFire = 0;
    const maxYears = 50;

    for (let month = 0; month <= maxYears * 12; month++) {
      if (month % 12 === 0) {
        data.push({
          year: month / 12,
          netWorth: Math.max(0, currentNetWorth),
          target: fireTarget,
        });
      }

      if (currentNetWorth < fireTarget) {
        monthsToFire++;
      } else if (monthsToFire === 0) {
        // Already at FIRE
      }

      currentNetWorth =
        (currentNetWorth + (savings > 0 ? savings : 0)) * (1 + monthlyRate);
    }

    return {
      fireTarget,
      annualExpenses,
      monthsToFire: monthsToFire > maxYears * 12 ? null : monthsToFire,
      projection: data,
      currentSavings: savings,
    };
  }, [
    baseStats,
    swr,
    expectedReturn,
    customMonthlySavings,
    customMonthlyExpenses,
  ]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <Skeleton className="h-[400px] rounded-3xl" />
      </div>
    );
  }

  if (!baseStats || !simulation) return null;

  const yearsToFire = simulation.monthsToFire
    ? Math.floor(simulation.monthsToFire / 12)
    : null;
  const remainingMonths = simulation.monthsToFire
    ? simulation.monthsToFire % 12
    : null;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Flame className="text-orange-500 fill-orange-500" />
            FIRE Kalkulačka
          </h1>
          <p className="text-slate-500 mt-1">
            Cesta k tvojej finančnej nezávislosti a skorému dôchodku.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Key Stats and Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border shadow-sm space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Target size={14} className="text-blue-500" />
                Cieľová suma (FIRE Number)
              </h3>
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(simulation.fireTarget)}
                </h2>
                <p className="text-xs text-slate-500">
                  Pri ročných výdavkoch{' '}
                  {formatCurrency(simulation.annualExpenses)} a {swr}% výbere.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Aktuálny stav
                </h3>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                  {((baseStats.netWorth / simulation.fireTarget) * 100).toFixed(
                    1
                  )}
                  % hotovo
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Čistý majetok</span>
                  <span className="font-bold">
                    {formatCurrency(baseStats.netWorth)}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min((baseStats.netWorth / simulation.fireTarget) * 100, 100)}%`,
                    }}
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border shadow-sm space-y-8">
            <h3 className="text-sm font-bold">Parametre simulácie</h3>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Ročný výnos (%)
                  </label>
                  <span className="text-sm font-black text-blue-600">
                    {expectedReturn}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Miera výberu (SWR %)
                  </label>
                  <span className="text-sm font-black text-blue-600">
                    {swr}%
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="7"
                  step="0.1"
                  value={swr}
                  onChange={(e) => setSwr(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Mesačná úspora (€)
                  </label>
                  <span className="text-sm font-black text-emerald-600">
                    {formatCurrency(
                      customMonthlySavings ??
                        baseStats.monthlyIncome - baseStats.monthlyExpenses
                    )}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(5000, baseStats.monthlyIncome)}
                  step="50"
                  value={
                    customMonthlySavings ??
                    baseStats.monthlyIncome - baseStats.monthlyExpenses
                  }
                  onChange={(e) =>
                    setCustomMonthlySavings(Number(e.target.value))
                  }
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <button
                  onClick={() => setCustomMonthlySavings(null)}
                  className="text-[10px] text-blue-600 font-bold hover:underline"
                >
                  Použiť reálne dáta
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Mesačné výdavky (€)
                  </label>
                  <span className="text-sm font-black text-rose-600">
                    {formatCurrency(
                      customMonthlyExpenses ?? baseStats.monthlyExpenses
                    )}
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max={Math.max(5000, baseStats.monthlyExpenses * 2)}
                  step="50"
                  value={customMonthlyExpenses ?? baseStats.monthlyExpenses}
                  onChange={(e) =>
                    setCustomMonthlyExpenses(Number(e.target.value))
                  }
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <button
                  onClick={() => setCustomMonthlyExpenses(null)}
                  className="text-[10px] text-blue-600 font-bold hover:underline"
                >
                  Použiť reálne dáta
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Projection Chart and Insights */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  Projekcia k finančnej slobode
                </h3>
                <p className="text-sm text-slate-500">
                  Vývoj tvojho čistého majetku v čase.
                </p>
              </div>
              {simulation.monthsToFire ? (
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                    Zostáva
                  </p>
                  <p className="text-2xl font-black text-blue-600">
                    {yearsToFire}r {remainingMonths}m
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-2xl font-black text-sm border border-emerald-100 dark:border-emerald-900/50">
                  SI FINANČNE NEZÁVISLÝ! 🥳
                </div>
              )}
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulation.projection}>
                  <defs>
                    <linearGradient
                      id="colorNetWorth"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
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
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(val) => `Rok ${val}`}
                  />
                  <YAxis
                    hide
                    domain={[
                      0,
                      (dataMax: number) =>
                        Math.max(dataMax, simulation.fireTarget * 1.2),
                    ]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-slate-900 p-4 border rounded-2xl shadow-xl">
                            <p className="text-sm font-bold mb-2">
                              Rok {payload[0].payload.year}
                            </p>
                            <p className="text-xs flex justify-between gap-4">
                              <span className="text-slate-500">Majetok:</span>
                              <span className="font-bold text-blue-600">
                                {formatCurrency(payload[0].value as number)}
                              </span>
                            </p>
                            <p className="text-xs flex justify-between gap-4 mt-1">
                              <span className="text-slate-500">Cieľ:</span>
                              <span className="font-bold text-slate-400">
                                {formatCurrency(payload[0].payload.target)}
                              </span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    stroke="#2563eb"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorNetWorth)"
                  />
                  <Area
                    type="monotone"
                    dataKey="target"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="10 10"
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Clock size={80} />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Analýza úspor</h3>
                  <p className="text-blue-100 text-xs leading-relaxed mt-1">
                    Pri tvojej miere úspor{' '}
                    {(
                      (simulation.currentSavings / baseStats.monthlyIncome) *
                      100
                    ).toFixed(1)}
                    % a investovaní prebytku, dosiahneš FIRE o
                    <strong> {yearsToFire} rokov</strong>. Každých 100€, ktoré
                    ušetríš navyše mesačne, skráti tvoju cestu o niekoľko
                    mesiacov.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 shrink-0">
                <Info size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold">Pravidlo 4%</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  FIRE číslo je založené na historických dátach akciového trhu.
                  Predpokladá, že ak budeš vyberať 4% zo svojho portfólia ročne,
                  tvoj majetok by mal vydržať minimálne 30 rokov (aj po
                  započítaní inflácie).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

