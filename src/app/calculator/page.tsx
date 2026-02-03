'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useIncomeData, useInvestmentData } from '@/hooks/use-financial-data';
import {
  Loader2,
  TrendingUp,
  ArrowUpRight,
  Target,
  Clock,
  ChevronDown,
  Wallet,
  PiggyBank,
  Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const INVESTMENT_PERCENTAGES = [0, 5, 10, 15, 20, 25, 30];

export default function CalculatorPage() {
  const { records: incomeRecords, loading: incomeLoading } = useIncomeData();
  const { investments, loading: investmentsLoading } = useInvestmentData();
  const [loading, setLoading] = useState(true);
  const [salary, setSalary] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [investmentPercent, setInvestmentPercent] = useState(10);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [investmentHorizon, setInvestmentHorizon] = useState(20);
  
  const expectedReturn = 10; // 10% for S&P 500

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate current portfolio value
  const currentPortfolioValue = useMemo(() => {
    if (!investments || investments.length === 0) return 0;
    return investments.reduce(
      (sum, inv) => sum + inv.shares * inv.current_price,
      0
    );
  }, [investments]);

  // Helper to format month string to readable label
  const formatMonthLabel = (monthStr: string): string => {
    if (!monthStr) return monthStr;
    
    try {
      let date: Date;
      
      if (/^\d{4}-\d{2}$/.test(monthStr)) {
        date = new Date(monthStr + '-15');
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(monthStr)) {
        date = new Date(monthStr);
      } else {
        date = new Date(monthStr);
      }
      
      if (isNaN(date.getTime())) {
        return monthStr;
      }
      
      return date.toLocaleDateString('sk-SK', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return monthStr;
    }
  };

  // Get available months with their totals
  const availableMonths = useMemo(() => {
    if (!incomeRecords || incomeRecords.length === 0) return [];

    const monthTotals: Record<string, number> = {};
    
    incomeRecords.forEach((record) => {
      const month = record.record_month;
      if (!month) return;
      if (!monthTotals[month]) {
        monthTotals[month] = 0;
      }
      monthTotals[month] += record.amount_eur || 0;
    });

    return Object.entries(monthTotals)
      .map(([month, total]) => ({
        month,
        total: Math.round(total),
        label: formatMonthLabel(month),
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [incomeRecords]);

  // Handle month selection
  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    const monthData = availableMonths.find((m) => m.month === month);
    if (monthData) {
      setSalary(monthData.total);
    }
  };

  // Monthly investment amount
  const monthlyInvestment = useMemo(() => {
    return Math.round((salary * investmentPercent) / 100);
  }, [salary, investmentPercent]);

  // Investment projection data - starting from current portfolio
  const projectionData = useMemo(() => {
    const data = [];
    let total = currentPortfolioValue;
    const monthlyRate = expectedReturn / 100 / 12;
    const startingValue = currentPortfolioValue;

    for (let year = 0; year <= investmentHorizon; year++) {
      if (year > 0) {
        for (let month = 0; month < 12; month++) {
          total = (total + monthlyInvestment) * (1 + monthlyRate);
        }
      }
      data.push({
        year: `Rok ${year}`,
        value: Math.round(total),
        invested: startingValue + monthlyInvestment * 12 * year,
        startingPortfolio: startingValue,
      });
    }
    return data;
  }, [currentPortfolioValue, monthlyInvestment, investmentHorizon]);

  const finalAmount = projectionData[projectionData.length - 1]?.value || 0;
  const totalInvested = projectionData[projectionData.length - 1]?.invested || 0;
  const profit = finalAmount - totalInvested;

  useEffect(() => {
    if (!incomeLoading && !investmentsLoading) {
      if (availableMonths.length > 0) {
        const latestMonth = availableMonths[0];
        setSelectedMonth(latestMonth.month);
        setSalary(latestMonth.total);
      }
      setLoading(false);
    }
  }, [incomeLoading, investmentsLoading, availableMonths]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold">Investičná kalkulačka</h1>
        <p className="text-slate-500 text-sm">
          Koľko investovať z príjmu a simulácia rastu portfólia.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-4 space-y-6">
          {/* Current Portfolio Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-3xl text-white shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            <div className="flex items-center gap-3 mb-3">
              <Briefcase size={20} className="opacity-80" />
              <span className="text-sm font-medium opacity-90">Aktuálne portfólio</span>
            </div>
            {loading ? (
              <Skeleton className="h-10 w-40 bg-white/20" />
            ) : (
              <h2 className="text-3xl font-black">
                {formatCurrency(currentPortfolioValue)}
              </h2>
            )}
            <p className="text-emerald-100 text-xs mt-2">
              Štartovacia hodnota pre simuláciu
            </p>
          </motion.div>

          {/* Income & Investment Selection */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border space-y-6">
            {/* Month Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Wallet size={12} />
                Príjem za mesiac
              </label>
              {availableMonths.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleMonthSelect(e.target.value)}
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all capitalize"
                  >
                    {availableMonths.map((m) => (
                      <option key={m.month} value={m.month} className="capitalize">
                        {m.label} — {formatCurrency(m.total)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown size={18} className="text-slate-400" />
                  </div>
                </div>
              )}
              {loading ? (
                <Skeleton className="h-14 w-full rounded-xl" />
              ) : (
                <div className="text-center py-2">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(salary)}
                  </span>
                </div>
              )}
            </div>

            {/* Investment Percentage Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <PiggyBank size={12} />
                Percento na investície
              </label>
              <div className="grid grid-cols-4 gap-2">
                {INVESTMENT_PERCENTAGES.map((percent) => (
                  <button
                    key={percent}
                    onClick={() => setInvestmentPercent(percent)}
                    className={`py-3 px-2 rounded-xl text-sm font-bold transition-all ${
                      investmentPercent === percent
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {percent}%
                  </button>
                ))}
              </div>
            </div>

            {/* Result */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Mesačná investícia</span>
                <span className="text-xs text-slate-400">
                  {investmentPercent}% z {formatCurrency(salary)}
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-600">
                {formatCurrency(monthlyInvestment)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Simulation */}
        <div className="lg:col-span-8 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                Štart
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {loading ? <Skeleton className="h-6 w-20" /> : formatCurrency(currentPortfolioValue)}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                Mesačne
              </p>
              <p className="text-lg font-black text-emerald-600">
                {loading ? <Skeleton className="h-6 w-20" /> : `+${formatCurrency(monthlyInvestment)}`}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                Ročne
              </p>
              <p className="text-lg font-black text-blue-600">
                {loading ? <Skeleton className="h-6 w-20" /> : `+${formatCurrency(monthlyInvestment * 12)}`}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                Za {investmentHorizon} rokov
              </p>
              <p className="text-lg font-black text-purple-600">
                {loading ? <Skeleton className="h-6 w-20" /> : formatCurrency(totalInvested)}
              </p>
            </motion.div>
          </div>

          {/* S&P 500 Simulation */}
          <AnimatePresence>
            {!loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                      <ArrowUpRight size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">
                        Simulácia rastu portfólia (S&P 500)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Očakávaný ročný výnos:{' '}
                        <span className="text-emerald-600 font-semibold">
                          {expectedReturn}%
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-xl border">
                    <div className="flex items-center gap-2 px-2">
                      <Clock size={16} className="text-slate-400" />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {investmentHorizon} rokov
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      step="5"
                      className="w-24 md:w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      value={investmentHorizon}
                      onChange={(e) =>
                        setInvestmentHorizon(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase font-semibold">
                        Cieľová hodnota
                      </p>
                      <h4 className="text-2xl font-black text-emerald-600">
                        {formatCurrency(finalAmount)}
                      </h4>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase font-semibold">
                        Celkové vklady
                      </p>
                      <h4 className="text-2xl font-black">
                        {formatCurrency(totalInvested)}
                      </h4>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase font-semibold">
                        Zložený úrok
                      </p>
                      <h4 className="text-2xl font-black text-blue-600">
                        +{formatCurrency(profit)}
                      </h4>
                    </div>
                  </div>

                  <div className="h-[300px] w-full mt-4">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projectionData}>
                          <defs>
                            <linearGradient
                              id="colorValue"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#10b981"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#10b981"
                                stopOpacity={0}
                              />
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
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            dy={10}
                          />
                          <YAxis hide domain={[0, 'auto']} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white dark:bg-slate-900 p-4 border rounded-xl shadow-xl">
                                    <p className="text-sm font-bold mb-2">
                                      {data.year}
                                    </p>
                                    <div className="space-y-1">
                                      <p className="text-xs flex justify-between gap-4">
                                        <span className="text-slate-500">
                                          Hodnota portfólia:
                                        </span>
                                        <span className="font-bold text-emerald-600">
                                          {formatCurrency(data.value)}
                                        </span>
                                      </p>
                                      <p className="text-xs flex justify-between gap-4">
                                        <span className="text-slate-500">
                                          Investované:
                                        </span>
                                        <span className="font-bold">
                                          {formatCurrency(data.invested)}
                                        </span>
                                      </p>
                                      <p className="text-xs flex justify-between gap-4">
                                        <span className="text-slate-500">
                                          Zisk:
                                        </span>
                                        <span className="font-bold text-blue-600">
                                          +{formatCurrency(data.value - data.invested)}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                          />
                          <Area
                            type="monotone"
                            dataKey="invested"
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fill="transparent"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <Skeleton className="w-full h-full" />
                    )}
                  </div>

                  <div className="mt-6 flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                    <Target className="text-emerald-600 mt-1 flex-shrink-0" size={20} />
                    <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      S aktuálnym portfóliom{' '}
                      <span className="font-bold">
                        {formatCurrency(currentPortfolioValue)}
                      </span>{' '}
                      a mesačnou investíciou{' '}
                      <span className="font-bold">
                        {formatCurrency(monthlyInvestment)}
                      </span>{' '}
                      ({investmentPercent}% z príjmu) môže tvoje portfólio za {investmentHorizon}{' '}
                      rokov dosiahnuť{' '}
                      <strong>{formatCurrency(finalAmount)}</strong>.{' '}
                      {profit > 0 && (
                        <>
                          Z toho{' '}
                          <span className="font-bold">
                            {formatCurrency(profit)}
                          </span>{' '}
                          ({Math.round((profit / finalAmount) * 100)}%) tvorí zisk zo zloženého úročenia.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Comparison */}
          {!loading && monthlyInvestment > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border">
              <h4 className="font-bold text-sm mb-4">Porovnanie scenárov</h4>
              <div className="space-y-3">
                {[5, 10, 15, 20].map((pct) => {
                  const monthlyAmt = Math.round((salary * pct) / 100);
                  let futureValue = currentPortfolioValue;
                  const monthlyRate = expectedReturn / 100 / 12;
                  
                  for (let year = 0; year < investmentHorizon; year++) {
                    for (let month = 0; month < 12; month++) {
                      futureValue = (futureValue + monthlyAmt) * (1 + monthlyRate);
                    }
                  }
                  
                  return (
                    <div
                      key={pct}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        pct === investmentPercent
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500'
                          : 'bg-white dark:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-black ${pct === investmentPercent ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {pct}%
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {formatCurrency(monthlyAmt)}/mes
                        </span>
                      </div>
                      <span className={`font-bold ${pct === investmentPercent ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                        → {formatCurrency(Math.round(futureValue))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
