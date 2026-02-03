'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useIncomeData } from '@/hooks/use-financial-data';
import {
  Loader2,
  Calculator,
  Save,
  RefreshCw,
  TrendingUp,
  LineChart,
  ArrowUpRight,
  Target,
  Clock,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
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

export default function CalculatorPage() {
  const { records: incomeRecords, loading: incomeLoading } = useIncomeData();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salary, setSalary] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [split, setSplit] = useState({
    fixed_costs: 50,
    investments: 25,
    savings: 5,
    fun: 20,
  });

  const SPLIT_LABELS: Record<string, string> = {
    fixed_costs: 'Fixné náklady',
    investments: 'Investície',
    savings: 'Rezerva',
    fun: 'Zábava',
  };

  const SPLIT_COLORS: Record<string, string> = {
    fixed_costs: 'blue',
    investments: 'emerald',
    savings: 'amber',
    fun: 'rose',
  };

  const [investmentHorizon, setInvestmentHorizon] = useState(20);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const expectedReturn = 10; // 10% for S&P 500

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper to format month string to readable label
  const formatMonthLabel = (monthStr: string): string => {
    if (!monthStr) return monthStr;
    
    try {
      // Handle different formats: "2026-01", "2026-01-01", "January 2026", etc.
      let date: Date;
      
      // If it's in YYYY-MM format
      if (/^\d{4}-\d{2}$/.test(monthStr)) {
        date = new Date(monthStr + '-15'); // Use 15th to avoid timezone issues
      } 
      // If it's in YYYY-MM-DD format
      else if (/^\d{4}-\d{2}-\d{2}$/.test(monthStr)) {
        date = new Date(monthStr);
      }
      // Try direct parsing
      else {
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
      .sort((a, b) => b.month.localeCompare(a.month)); // Newest first
  }, [incomeRecords]);

  // Calculate latest month total income
  const latestMonthIncome = useMemo(() => {
    if (!incomeRecords || incomeRecords.length === 0) return 0;

    // Find the latest month
    const months = incomeRecords.map((r) => r.record_month);
    const latestMonth = months.reduce((a, b) => (a > b ? a : b));

    // Sum all records for that month
    return incomeRecords
      .filter((r) => r.record_month === latestMonth)
      .reduce((sum, r) => sum + (r.amount_eur || 0), 0);
  }, [incomeRecords]);

  // Handle month selection
  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    const monthData = availableMonths.find((m) => m.month === month);
    if (monthData) {
      setSalary(monthData.total);
    }
  };

  // Investment projection data
  const projectionData = useMemo(() => {
    const monthlyInvestment = (salary * split.investments) / 100;
    const data = [];
    let total = 0;
    const monthlyRate = expectedReturn / 100 / 12;

    for (let year = 0; year <= investmentHorizon; year++) {
      if (year > 0) {
        for (let month = 0; month < 12; month++) {
          total = (total + monthlyInvestment) * (1 + monthlyRate);
        }
      }
      data.push({
        year: `Rok ${year}`,
        value: Math.round(total),
        invested: monthlyInvestment * 12 * year,
      });
    }
    return data;
  }, [salary, split.investments, investmentHorizon]);

  const finalAmount = projectionData[projectionData.length - 1].value;
  const totalInvested = projectionData[projectionData.length - 1].invested;
  const profit = finalAmount - totalInvested;

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data } = await supabase.from('settings').select('*');
        if (data) {
          const splitSetting = data.find((s) => s.key === 'salary_split');
          const salarySetting = data.find((s) => s.key === 'base_salary');

          if (splitSetting) setSplit(splitSetting.value);

          // If we have available months, select the latest one
          if (availableMonths.length > 0) {
            const latestMonth = availableMonths[0];
            setSelectedMonth(latestMonth.month);
            setSalary(latestMonth.total);
          } else if (salarySetting) {
            setSalary(salarySetting.value.amount);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!incomeLoading && availableMonths.length >= 0) {
      fetchSettings();
    }
  }, [incomeLoading, availableMonths]);

  async function handleSave() {
    setSaving(true);
    try {
      await supabase.from('settings').upsert([
        { key: 'salary_split', value: split },
        { key: 'base_salary', value: { amount: salary, currency: 'EUR' } },
      ]);
      toast.success('Nastavenia boli uložené');
    } catch (error) {
      toast.error('Chyba pri ukladaní');
    } finally {
      setSaving(false);
    }
  }

  const results = [
    {
      key: 'fixed_costs',
      name: 'Fixné náklady',
      desc: 'Domácnosť, bývanie, strava',
    },
    {
      key: 'investments',
      name: 'Investície',
      desc: 'S&P 500, ETF, Budovanie bohatstva',
    },
    {
      key: 'fun',
      name: 'Zábava a radosť',
      desc: 'Zážitky, hobby, voľný čas',
    },
    {
      key: 'savings',
      name: 'Rezerva',
      desc: 'Udržiavacia rezerva 6-12 mes.',
    },
  ] as const;

  const totalPercent = Object.values(split).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold">Kalkulačka mzdy</h1>
        <p className="text-slate-500 text-sm">
          Optimalizácia rozdelenia príjmu a simulácia bohatstva.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border space-y-8 h-fit">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Mesačný príjem (€)
              </label>
            </div>

            {/* Month Selector */}
            {availableMonths.length > 0 && (
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthSelect(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all capitalize"
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
              <Skeleton className="h-12 w-full rounded-xl" />
            ) : (
              <div className="relative group">
                <input
                  type="number"
                  className="w-full text-4xl font-black bg-transparent border-none focus:ring-0 outline-none p-0 transition-colors"
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                />
                <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-2 group-focus-within:bg-blue-600 transition-colors" />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
              Rozdelenie (%)
            </label>
            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-5">
                {(
                  ['fixed_costs', 'investments', 'savings', 'fun'] as const
                ).map((key) => (
                  <div key={key} className="space-y-2 group">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                        {SPLIT_LABELS[key]}
                      </span>
                      <span
                        className={`font-black text-${SPLIT_COLORS[key]}-600`}
                      >
                        {split[key]}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      className={`w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-${SPLIT_COLORS[key]}-600`}
                      value={split[key]}
                      onChange={(e) =>
                        setSplit({ ...split, [key]: Number(e.target.value) })
                      }
                    />
                  </div>
                ))}

                <div
                  className={`text-[10px] font-black text-right pt-2 tracking-widest uppercase ${totalPercent === 100 ? 'text-emerald-500' : 'text-rose-500'}`}
                >
                  Spolu: {totalPercent}%{' '}
                  {totalPercent !== 100 && '(musí byť 100%)'}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={loading || saving || totalPercent !== 100}
            className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-widest hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            Uložiť nastavenia
          </button>
        </div>

        {/* Right Columns: Results & Projections */}
        <div className="lg:col-span-8 space-y-8">
          {/* Current Split Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <>
                <Skeleton className="h-28 w-full rounded-3xl" />
                <Skeleton className="h-28 w-full rounded-3xl" />
                <Skeleton className="h-28 w-full rounded-3xl" />
                <Skeleton className="h-28 w-full rounded-3xl" />
              </>
            ) : (
              <>
                {results.map((item, index) => {
                  const amount = (salary * split[item.key]) / 100;
                  const color = SPLIT_COLORS[item.key];
                  return (
                    <motion.div
                      key={item.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                    >
                      <div className="flex items-center gap-5">
                        <div
                          className={`w-14 h-14 rounded-2xl bg-${color}-50 dark:bg-${color}-950/30 flex items-center justify-center text-${color}-600 dark:text-${color}-400 font-black text-lg shadow-inner`}
                        >
                          {split[item.key]}%
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            {item.name}
                          </p>
                          <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                            {formatCurrency(amount)}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </>
            )}
          </div>

          {/* S&P 500 Simulation */}
          <AnimatePresence>
            {!loading && salary > 0 && split.investments > 0 && (
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
                        Simulácia investovania (S&P 500)
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
                        Cieľová suma
                      </p>
                      <h4 className="text-2xl font-black text-emerald-600">
                        {formatCurrency(finalAmount)}
                      </h4>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase font-semibold">
                        Tvoje vklady
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
                                return (
                                  <div className="bg-white dark:bg-slate-900 p-4 border rounded-xl shadow-xl">
                                    <p className="text-sm font-bold mb-2">
                                      {payload[0].payload.year}
                                    </p>
                                    <div className="space-y-1">
                                      <p className="text-xs flex justify-between gap-4">
                                        <span className="text-slate-500">
                                          Hodnota:
                                        </span>
                                        <span className="font-bold text-emerald-600">
                                          {formatCurrency(
                                            payload[0].value as number
                                          )}
                                        </span>
                                      </p>
                                      <p className="text-xs flex justify-between gap-4">
                                        <span className="text-slate-500">
                                          Vklady:
                                        </span>
                                        <span className="font-bold">
                                          {formatCurrency(
                                            payload[0].payload.invested
                                          )}
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
                    <Target className="text-emerald-600 mt-1" size={20} />
                    <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Pri mesačnej investícii{' '}
                      <span className="font-bold">
                        {formatCurrency((salary * split.investments) / 100)}
                      </span>{' '}
                      do indexu S&P 500, môže tvoj majetok o {investmentHorizon}{' '}
                      rokov dosiahnuť hranicu{' '}
                      <strong>{formatCurrency(finalAmount)}</strong>. Viac ako
                      polovicu tejto sumy (
                      <span className="font-bold">
                        {Math.round((profit / finalAmount) * 100)}%
                      </span>
                      ) tvorí čistý zisk zo zloženého úročenia.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Strategy Card */}
          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-200 dark:shadow-none relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <TrendingUp size={160} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp size={24} className="opacity-70" />
                <h3 className="font-bold">Konzervatívna optimalizácia</h3>
              </div>
              <p className="text-blue-100 text-sm leading-relaxed max-w-xl">
                Keďže už máš vybudovanú základnú rezervu, sústredíme sa na
                maximálnu kvalitu života (20% zábava) pri zachovaní silného
                investičného tempa (25%). Rezerva sa už len udržiava na úrovni
                5%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
