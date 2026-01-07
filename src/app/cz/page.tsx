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
  PieChart as PieIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function CZPage() {
  const accounts = [
    { name: 'Česká spořitelna', balance: 663081.11 },
    { name: 'Komerční banka', balance: 931485.70 },
    { name: 'Raiffeisenbank', balance: 985459.04 }
  ];

  const totalCZK = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), []);
  
  const propertyPrice = 12000000;
  const ltv80 = propertyPrice * 0.8;
  const requiredDownPayment = propertyPrice * 0.2;
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

  const monthlyPayment = calculateMonthlyPayment(ltv80, lowestRate);

  const formatCZK = (val: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0
    }).format(val);
  };

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
              <h2 className="text-4xl font-black mb-4">~ {(totalCZK / 25.2).toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</h2>
              <p className="text-sm text-blue-100/80 italic">
                *Pri kurze 1 EUR = 25.20 CZK
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
              <div>
                <h3 className="text-xl font-black">Analýza kúpy bytu v ČR</h3>
                <p className="text-sm text-slate-500">Cieľová nehnuteľnosť: {formatCZK(propertyPrice)}</p>
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
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val: number) => [`${val.toFixed(2)} %`, 'Úrok']}
                  />
                  <Bar dataKey="rate" radius={[0, 8, 8, 0]} barSize={20}>
                    {mortgageRates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#2563eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

