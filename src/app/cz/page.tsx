'use client';

import { useState, useMemo } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  Home, 
  CheckCircle2, 
  AlertCircle, 
  Calculator,
  ArrowUpRight,
  Landmark,
  Building2,
  PieChart as PieIcon,
  AlertTriangle,
  TrendingDown,
  ShieldAlert
} from 'lucide-react';
import { TOOLTIP_STYLE } from '@/lib/constants';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';

export default function CZPage() {
  const [propertyPrice, setPropertyPrice] = useState(12000000);

  const accounts = [
    { name: 'Air Bank', balance: 663081.11 },
    { name: 'Moneta', balance: 931485.70 },
    { name: 'Raiffeisenbank', balance: 985459.04 }
  ];

  const totalCZK = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), []);
  
  const ltv80 = useMemo(() => propertyPrice * 0.8, [propertyPrice]);
  const requiredDownPayment = useMemo(() => propertyPrice * 0.2, [propertyPrice]);
  const hasEnoughForDownPayment = totalCZK >= requiredDownPayment;
  const surplus = totalCZK - requiredDownPayment;

  // Realistické úrokové sadzby v ČR (začiatok 2026)
  const mortgageRates = [
    { bank: 'Česká spořitelna', rate: 5.19 },
    { bank: 'ČSOB', rate: 4.99 },
    { bank: 'Komerční banka', rate: 5.29 },
    { bank: 'Air Bank', rate: 4.89 },
    { bank: 'Moneta', rate: 4.94 },
    { bank: 'Fio banka', rate: 4.79 }
  ].sort((a, b) => a.rate - b.rate);

  const lowestRate = mortgageRates[0].rate;

  const calculateMonthlyPayment = (principal: number, annualRate: number, years: number = 30) => {
    const monthlyRate = (annualRate / 100) / 12;
    const numberOfPayments = years * 12;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  };

  const monthlyPayment = useMemo(() => 
    calculateMonthlyPayment(ltv80, lowestRate),
  [ltv80, lowestRate]);

  const formatCZK = (val: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatEUR = (val: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Currency risk calculations
  const currentRate = 25.2;
  const currentValueEUR = totalCZK / currentRate;
  
  // Historical CZK/EUR range (last 5 years approximately)
  const rateScenarios = [
    { name: 'Pesimistický', rate: 27.0, description: 'CZK oslabí' },
    { name: 'Aktuálny', rate: currentRate, description: 'Súčasný kurz' },
    { name: 'Optimistický', rate: 24.0, description: 'CZK posilní' },
  ];

  const worstCaseEUR = totalCZK / 27.0;
  const bestCaseEUR = totalCZK / 24.0;
  const potentialLoss = currentValueEUR - worstCaseEUR;
  const potentialGain = bestCaseEUR - currentValueEUR;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Landmark className="text-blue-600" size={32} />
            České Portfólio & Reality
          </h1>
          <p className="text-slate-500">
            Prehľad majetku v ČR a analýza dostupnosti bývania.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Celkový majetok v CZK
          </p>
          <p className="text-2xl font-black text-blue-600">
            {formatCZK(totalCZK)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Assets List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <CreditCard className="text-blue-600" size={20} />
              Bankové účty
            </h3>
            <div className="space-y-4">
              {accounts.map((acc, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">{acc.name}</span>
                  <span className="font-black text-slate-900 dark:text-white">{formatCZK(acc.balance)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-blue-100 text-xs font-black uppercase tracking-widest mb-2">Prepočet na EUR</p>
              <h2 className="text-4xl font-black mb-4">~ {formatEUR(currentValueEUR)}</h2>
              <p className="text-sm text-blue-100/80 italic">
                *Pri kurze 1 EUR = {currentRate} CZK
              </p>
            </div>
            <ArrowUpRight className="absolute -bottom-4 -right-4 text-white/10 w-32 h-32" />
          </div>
        </div>

        {/* Real Estate Analysis */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                <Building2 className="text-blue-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Analýza kúpy bytu v ČR</h3>
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label htmlFor="prop-price" className="text-sm font-bold text-slate-500 whitespace-nowrap">Cena nehnuteľnosti:</label>
                  <div className="relative w-full sm:max-w-[200px]">
                    <input
                      id="prop-price"
                      type="number"
                      value={propertyPrice}
                      onChange={(e) => setPropertyPrice(Number(e.target.value))}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-4 pr-12 py-2.5 text-base font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">CZK</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">80% Hypotéka (LTV 80)</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{formatCZK(ltv80)}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Potrebná hotovosť (20%)</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{formatCZK(requiredDownPayment)}</p>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border-2 flex flex-col justify-center items-center text-center space-y-3 ${
                hasEnoughForDownPayment ? 'border-emerald-100 bg-emerald-50/30 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'border-rose-100 bg-rose-50/30 dark:bg-rose-900/10 dark:border-rose-900/30'
              }`}>
                {hasEnoughForDownPayment ? (
                  <>
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <CheckCircle2 size={24} />
                    </div>
                    <h4 className="font-bold text-emerald-600 dark:text-emerald-400">Máte dostatok hotovosti</h4>
                    <p className="text-sm text-slate-500">
                      Po zaplatení 20% akontácie vám zostane ešte <span className="font-bold">{formatCZK(surplus)}</span>.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white">
                      <AlertCircle size={24} />
                    </div>
                    <h4 className="font-bold text-rose-600 dark:text-rose-400">Chýba vám hotovosť</h4>
                    <p className="text-sm text-slate-500">
                      Na 20% akontáciu vám ešte chýba <span className="font-bold">{formatCZK(Math.abs(surplus))}</span>.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-900 dark:bg-slate-950 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/10 rounded-2xl">
                  <Calculator size={24} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Mesačná splátka</p>
                  <p className="text-3xl font-black">{formatCZK(monthlyPayment)}</p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-xs text-slate-400">Počítané pri úroku</p>
                <p className="text-xl font-bold text-emerald-400">{lowestRate.toFixed(2)} % <span className="text-xs font-normal text-slate-500">(p.a.)</span></p>
                <p className="text-[10px] text-slate-500 mt-1 italic">*Doba splácania 30 rokov</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm">
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} />
              Aktuálne sadzby hypoték v ČR
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mortgageRates} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 6]} hide />
                  <YAxis 
                    dataKey="bank" 
                    type="category" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val: number) => [`${val.toFixed(2)} %`, 'Úrok']}
                  />
                  <Bar dataKey="rate" radius={[0, 8, 8, 0]} barSize={20}>
                    {mortgageRates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#2563eb'} />
                    ))}
                    <LabelList 
                      dataKey="rate" 
                      position="right" 
                      formatter={(val: number) => `${val.toFixed(2)} %`}
                      style={{ fontSize: '11px', fontWeight: 'bold', fill: '#64748b' }}
                      offset={10}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Currency Risk Section - Full Width at Bottom */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <ShieldAlert className="text-amber-500" size={24} />
          Riziko kurzových strát
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Risk Scenarios */}
          <div>
            <p className="text-sm font-bold text-slate-500 mb-4">Scenáre vývoja kurzu CZK/EUR</p>
            <div className="grid grid-cols-3 gap-4">
              {rateScenarios.map((scenario, idx) => {
                const valueEUR = totalCZK / scenario.rate;
                const diff = valueEUR - currentValueEUR;
                const isNegative = diff < 0;
                const isCurrent = scenario.rate === currentRate;
                
                return (
                  <motion.div
                    key={scenario.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-5 rounded-2xl text-center ${
                      isCurrent 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800' 
                        : isNegative 
                          ? 'bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30'
                          : 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30'
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      {scenario.name}
                    </p>
                    <p className="text-sm text-slate-400 mb-3">
                      1 EUR = {scenario.rate} CZK
                    </p>
                    <p className={`text-2xl font-black ${
                      isCurrent 
                        ? 'text-blue-600 dark:text-blue-400'
                        : isNegative 
                          ? 'text-rose-600 dark:text-rose-400' 
                          : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {formatEUR(valueEUR)}
                    </p>
                    {!isCurrent && (
                      <p className={`text-sm font-bold mt-2 ${
                        isNegative ? 'text-rose-500' : 'text-emerald-500'
                      }`}>
                        {isNegative ? '' : '+'}{formatEUR(diff)}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Risk Summary */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-500 mb-4">Analýza rizika</p>
            
            <div className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-900/30">
              <div className="flex items-start gap-4">
                <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={24} />
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-200 mb-2">
                    Kurzové riziko vášho CZK majetku
                  </p>
                  <p className="text-amber-700 dark:text-amber-300/80">
                    Pri oslabení CZK na 27.00 za EUR môžete stratiť až{' '}
                    <span className="font-bold text-rose-600">{formatEUR(potentialLoss)}</span>.
                    Naopak, pri posilnení na 24.00 môžete získať{' '}
                    <span className="font-bold text-emerald-600">{formatEUR(potentialGain)}</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-center">
                <TrendingDown size={24} className="text-rose-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 mb-1">Maximálna strata</p>
                <p className="text-xl font-black text-rose-600">{formatEUR(potentialLoss)}</p>
                <p className="text-sm text-rose-500 font-bold">-{((potentialLoss / currentValueEUR) * 100).toFixed(1)}%</p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                <TrendingUp size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 mb-1">Maximálny zisk</p>
                <p className="text-xl font-black text-emerald-600">{formatEUR(potentialGain)}</p>
                <p className="text-sm text-emerald-500 font-bold">+{((potentialGain / currentValueEUR) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

