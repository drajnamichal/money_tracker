'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useMortgageData } from '@/hooks/use-financial-data';
import {
  Home,
  Calendar,
  Percent,
  TrendingDown,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  Zap,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export default function MortgagePage() {
  const { mortgage, payments, loading, refresh } = useMortgageData();
  const [updating, setUpdating] = useState(false);
  const [overpayment, setOverpayment] = useState<string>('5000');
  const [marketRates, setMarketRates] = useState<
    { bank: string; rate: string }[]
  >([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    async function fetchMarketRates() {
      try {
        const res = await fetch('/api/mortgage-rates');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMarketRates(data);
          setRatesError(null);
        } else if (data.error) {
          setRatesError(data.error);
        } else {
          setRatesError('Žiadne dáta');
        }
      } catch (error) {
        console.error('Error fetching market rates:', error);
        setRatesError('Chyba spojenia');
      } finally {
        setLoadingRates(false);
      }
    }
    fetchMarketRates();
  }, []);

  const analysis = useMemo(() => {
    if (!mortgage) return null;

    const r = mortgage.interest_rate / 100 / 12;
    const P = mortgage.original_amount;
    const M = mortgage.monthly_payment;

    // Total original months
    const nTotal = Math.round(Math.log(M / (M - P * r)) / Math.log(1 + r));
    const totalPaid = M * nTotal;
    const totalInterest = totalPaid - P;

    // Remaining months without overpayment
    const Pcurr = mortgage.current_principal;
    const nRemOld = Math.log(M / (M - Pcurr * r)) / Math.log(1 + r);

    // With overpayment
    const X = Number(overpayment) || 0;
    let nRemNew = nRemOld;
    let interestSaved = 0;
    let monthsSaved = 0;

    if (X > 0 && X < Pcurr) {
      const Pnew = Pcurr - X;
      nRemNew = Math.log(M / (M - Pnew * r)) / Math.log(1 + r);
      monthsSaved = Math.max(0, nRemOld - nRemNew);
      interestSaved = Math.max(0, M * monthsSaved);
    }

    return {
      totalInterest,
      totalPaid,
      monthsSaved: Math.floor(monthsSaved),
      interestSaved,
    };
  }, [mortgage, overpayment]);

  // Auto-update logic: if current date is past next payment date and no payment recorded for this month
  useEffect(() => {
    if (!mortgage || loading) return;

    async function checkAutoUpdate() {
      const lastPayment = payments[0];
      const today = new Date();
      const currentMonth = today.toISOString().substring(0, 7);

      // Payment day is usually fixed (e.g. 26th based on next payment 26.01.2026)
      const paymentDay = 26;

      if (today.getDate() >= paymentDay) {
        const lastPaymentMonth = lastPayment
          ? lastPayment.payment_date.substring(0, 7)
          : '';

        if (lastPaymentMonth < currentMonth) {
          // Trigger update
          await handleProcessMonthlyPayment();
        }
      }
    }

    checkAutoUpdate();
  }, [mortgage, payments, loading]);

  const handleProcessMonthlyPayment = async () => {
    if (!mortgage) return;
    setUpdating(true);

    try {
      const today = new Date();
      const paymentDate = new Date(today.getFullYear(), today.getMonth(), 26)
        .toISOString()
        .split('T')[0];

      // Basic amortization calculation
      const monthlyRate = mortgage.interest_rate / 100 / 12;
      const interestPaid = mortgage.current_principal * monthlyRate;
      const principalPaid = mortgage.monthly_payment - interestPaid;
      const newPrincipal = mortgage.current_principal - principalPaid;

      // 1. Record payment
      const { error: paymentError } = await supabase
        .from('mortgage_payments')
        .insert({
          mortgage_id: mortgage.id,
          payment_date: paymentDate,
          amount: mortgage.monthly_payment,
          principal_paid: principalPaid,
          interest_paid: interestPaid,
          remaining_principal: newPrincipal,
        });

      if (paymentError) throw paymentError;

      // 2. Update mortgage current balance
      const { error: mortgageError } = await supabase
        .from('mortgages')
        .update({ current_principal: newPrincipal })
        .eq('id', mortgage.id);

      if (mortgageError) throw mortgageError;

      await refresh();
      toast.success('Mesačná splátka bola úspešne spracovaná');
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Chyba pri spracovaní splátky');
    } finally {
      setUpdating(false);
    }
  };

  const chartData = useMemo(() => {
    if (!mortgage) return [];
    return [
      {
        name: 'Splatené',
        value: mortgage.original_amount - mortgage.current_principal,
        color: '#10b981',
      },
      { name: 'Zostáva', value: mortgage.current_principal, color: '#e2e8f0' },
    ];
  }, [mortgage]);

  const progressPercentage = mortgage
    ? ((mortgage.original_amount - mortgage.current_principal) /
        mortgage.original_amount) *
      100
    : 0;

  if (loading && !mortgage) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!mortgage) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
          <Home size={40} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold">
          Nenašli sa žiadne údaje o hypotéke
        </h2>
        <p className="text-slate-500 max-w-md">
          Momentálne nemáte v systéme zaevidovanú žiadnu hypotéku.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Live Interest Rate Ticker */}
      {!loadingRates && marketRates.length > 0 && (
        <div className="relative overflow-hidden bg-blue-600/5 dark:bg-blue-400/5 border-y border-blue-100/50 dark:border-blue-900/30 py-2 -mx-4 md:-mx-8 mb-4">
          <motion.div
            animate={{
              x: [0, -1035], // Adjust based on content width
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 30,
                ease: 'linear',
              },
            }}
            className="flex gap-12 whitespace-nowrap w-max px-4"
          >
            {[...marketRates, ...marketRates].map((rate, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {rate.bank}
                </span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {rate.rate}
                </span>
                <TrendingUp size={12} className="text-emerald-500" />
              </div>
            ))}
          </motion.div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Home className="text-blue-600" />
            Hypotéka
          </h1>
          <p className="text-slate-500 mt-1">
            Detailný prehľad o tvojom úvere č. {mortgage.loan_number}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
              Úrok
            </p>
            <p className="text-lg font-bold">{mortgage.interest_rate}% p.a.</p>
          </div>
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
              Splátka
            </p>
            <p className="text-lg font-bold">
              {formatCurrency(mortgage.monthly_payment)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm col-span-1 md:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
                Zostatok istiny
              </p>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white">
                {formatCurrency(mortgage.current_principal)}
              </h2>
            </div>
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <TrendingDown size={24} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">
                Splatených{' '}
                {formatCurrency(
                  mortgage.original_amount - mortgage.current_principal
                )}
              </span>
              <span className="font-bold text-blue-600">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"
              />
            </div>
            <p className="text-xs text-slate-400 text-right">
              Pôvodná výška úveru: {formatCurrency(mortgage.original_amount)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Clock size={16} />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Zostávajúci čas
              </p>
            </div>
            <h3 className="text-2xl font-bold">
              {Math.floor(
                (new Date(mortgage.maturity_date).getTime() -
                  new Date().getTime()) /
                  (1000 * 60 * 60 * 24 * 365)
              )}{' '}
              rokov
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              do {new Date(mortgage.maturity_date).toLocaleDateString('sk-SK')}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <span className="text-xs text-slate-500">Fixácia do:</span>
            <span className="text-xs font-bold text-blue-600">
              {new Date(mortgage.fixation_until).toLocaleDateString('sk-SK')}
            </span>
          </div>
        </div>

        <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-200 dark:shadow-none flex flex-col justify-between overflow-hidden relative">
          <CheckCircle2 className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
          <div>
            <div className="flex items-center gap-2 text-emerald-100 mb-2">
              <Calendar size={16} />
              <p className="text-xs font-bold uppercase tracking-wider">
                Nasledujúca splátka
              </p>
            </div>
            <h3 className="text-2xl font-bold">26. 01. 2026</h3>
            <p className="text-sm text-emerald-100/80 mt-1">
              automaticky spracované
            </p>
          </div>
          <button
            disabled={updating}
            onClick={handleProcessMonthlyPayment}
            className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors backdrop-blur-sm"
          >
            {updating ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Aktualizovať stav teraz
          </button>
        </div>
      </div>

      {/* History / Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h4 className="font-bold flex items-center gap-2">
            <TrendingDown size={18} className="text-blue-500" />
            História splácania
          </h4>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span>Istina</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Úrok</span>
            </div>
          </div>
        </div>

        <div className="h-[250px] w-full">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payments.slice(0, 6).reverse()}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="payment_date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) =>
                    new Date(val).toLocaleDateString('sk-SK', {
                      month: 'short',
                    })
                  }
                />
                <YAxis hide />
                <RechartsTooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar
                  dataKey="principal_paid"
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="interest_paid"
                  stackId="a"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border">
          <Info size={14} className="shrink-0" />
          <p>
            Údaje o úrokoch a istine sú odhadované na základe anuitného
            splácania a môžu sa mierne líšiť od skutočnosti v banke.
          </p>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h4 className="font-bold">Zoznam splátok</h4>
          <span className="text-xs font-medium text-slate-500">
            {payments.length} záznamov
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Dátum</th>
                <th className="px-6 py-4">Suma</th>
                <th className="px-6 py-4">Z toho istina</th>
                <th className="px-6 py-4">Z toho úrok</th>
                <th className="px-6 py-4 text-right">Zostatok</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium">
                    {new Date(p.payment_date).toLocaleDateString('sk-SK')}
                  </td>
                  <td className="px-6 py-4">{formatCurrency(p.amount)}</td>
                  <td className="px-6 py-4 text-emerald-600 font-semibold">
                    +{formatCurrency(p.principal_paid)}
                  </td>
                  <td className="px-6 py-4 text-blue-600">
                    -{formatCurrency(p.interest_paid)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold">
                    {formatCurrency(p.remaining_principal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis & Simulation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Cost Analysis */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm">
          <h4 className="font-bold mb-6 flex items-center gap-2">
            <PieChart size={18} className="text-blue-500" />
            Celková bilancia úveru
          </h4>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[180px] w-[180px] shrink-0">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Istina', value: mortgage.original_amount },
                        {
                          name: 'Úrok',
                          value: analysis?.totalInterest || 0,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Celkovo zaplatíte
                </p>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(analysis?.totalPaid || 0)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    Istina
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <p className="text-sm font-bold">
                      {formatCurrency(mortgage.original_amount)}
                    </p>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    Úrok
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-rose-500 rounded-full" />
                    <p className="text-sm font-bold text-rose-500">
                      {formatCurrency(analysis?.totalInterest || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overpayment Simulator */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold flex items-center gap-2">
              <Zap size={18} className="text-amber-500 fill-amber-500" />
              Simulátor mimoriadnej splátky
            </h4>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Suma mimoriadnej splátky
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={overpayment}
                  onChange={(e) => setOverpayment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="0.00"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  €
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <motion.div
                key={analysis?.monthsSaved}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50"
              >
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Ušetrený čas
                  </span>
                </div>
                <p className="text-xl font-black">
                  {analysis?.monthsSaved}{' '}
                  <span className="text-xs font-bold">mesiacov</span>
                </p>
                <p className="text-[10px] text-blue-600/60 font-medium mt-1">
                  ≈ {(Number(analysis?.monthsSaved || 0) / 12).toFixed(1)} rokov
                </p>
              </motion.div>

              <motion.div
                key={analysis?.interestSaved}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50"
              >
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                  <TrendingUp size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Ušetrený úrok
                  </span>
                </div>
                <p className="text-xl font-black text-emerald-600">
                  {formatCurrency(analysis?.interestSaved || 0)}
                </p>
                <p className="text-[10px] text-emerald-600/60 font-medium mt-1">
                  čistá úspora na úrokoch
                </p>
              </motion.div>
            </div>

            <p className="text-[10px] text-slate-400 text-center italic">
              * Simulácia predpokladá zachovanie výšky mesačnej splátky a
              skrátenie doby splácania.
            </p>
          </div>
        </div>
      </div>

      {/* Market Rates Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent size={18} className="text-blue-500" />
            <h4 className="font-bold">Aktuálne trhové sadzby</h4>
          </div>
          <a
            href="https://www.financnahitparada.sk/hypoteky"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-400 hover:text-blue-500 flex items-center gap-1 transition-colors font-bold uppercase tracking-wider"
          >
            Zdroj: FinancnaHitparada.sk
            <ExternalLink size={12} />
          </a>
        </div>
        <div className="p-6">
          {loadingRates ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : ratesError ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <AlertCircle size={32} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">Momentálne nedostupné</p>
              <p className="text-[10px] uppercase tracking-widest mt-1 opacity-50">
                {ratesError}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {marketRates.map((rate, index) => (
                <motion.div
                  key={rate.bank}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center text-center group hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors"
                >
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-1 truncate w-full">
                    {rate.bank}
                  </p>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {rate.rate}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {!loadingRates && !ratesError && (
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Pre ďalšie porovnanie:
              </p>
              <div className="flex items-center gap-6">
                <a
                  href="https://www.financnykompas.sk/hypoteka"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  FinancnyKompas.sk
                  <ExternalLink size={10} />
                </a>
                <a
                  href="https://www.financnahitparada.sk/hypoteky"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  FinancnaHitparada.sk
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
