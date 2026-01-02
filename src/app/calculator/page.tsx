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

  const [investmentHorizon, setInvestmentHorizon] = useState(20);
  const expectedReturn = 10; // 10% for S&P 500

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

          // If we have latest month income, prioritize it, otherwise use saved setting
          if (latestMonthIncome > 0) {
            setSalary(Math.round(latestMonthIncome));
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

    if (!incomeLoading) {
      fetchSettings();
    }
  }, [incomeLoading, latestMonthIncome]);

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
      name: 'Fixné náklady (Domácnosť, účty)',
      percent: split.fixed_costs,
      color: 'blue',
    },
    {
      name: 'Zábava a radosť',
      percent: split.fun,
      color: 'rose',
    },
    {
      name: 'Investície (ETF, Akcie)',
      percent: split.investments,
      color: 'emerald',
    },
    {
      name: 'Rezerva (udržiavacia)',
      percent: split.savings,
      color: 'amber',
    },
  ];

  const totalPercent = Object.values(split).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold">Kalkulačka mzdy</h1>
        <p className="text-slate-500">
          Optimalizácia rozdelenia príjmu a simulácia bohatstva.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border space-y-6 h-fit">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Mesačný príjem (€)
              </label>
              {latestMonthIncome > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-900/50">
                  <TrendingUp size={10} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">
                    Automaticky z{' '}
                    {new Date(
                      incomeRecords[0]?.record_month
                    ).toLocaleDateString('sk-SK', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <input
                type="number"
                className="w-full text-3xl font-bold bg-transparent border-b-2 border-slate-100 dark:border-slate-800 focus:border-blue-600 outline-none pb-2 transition-colors"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
              />
            )}
          </div>

          <div className="space-y-4">
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">
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
              <>
                {Object.entries(split).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm capitalize">
                      <span>{key.replace('_', ' ')}</span>
                      <span className="font-bold">{value}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      value={value}
                      onChange={(e) =>
                        setSplit({ ...split, [key]: Number(e.target.value) })
                      }
                    />
                  </div>
                ))}

                <div
                  className={`text-xs font-bold text-right ${totalPercent === 100 ? 'text-emerald-500' : 'text-rose-500'}`}
                >
                  Spolu: {totalPercent}%{' '}
                  {totalPercent !== 100 && '(musí byť 100%)'}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={loading || saving || totalPercent !== 100}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            Uložiť nastavenia
          </button>
        </div>

        {/* Right Columns: Results & Projections */}
        <div className="lg:col-span-2 space-y-8">
          {/* Current Split Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <>
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </>
            ) : (
              <>
                {results.map((item, index) => {
                  const amount = (salary * item.percent) / 100;
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border flex justify-between items-center group hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl bg-${item.color}-50 dark:bg-${item.color}-950/50 flex items-center justify-center text-${item.color}-600 dark:text-${item.color}-400 font-bold text-sm`}
                        >
                          {item.percent}%
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">{item.name}</p>
                          <h4 className="text-lg font-bold">
                            {formatCurrency(amount)}
                          </h4>
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
