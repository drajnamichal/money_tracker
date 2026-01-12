'use client';

import { useState, useMemo } from 'react';
import {
  Gem,
  TrendingUp,
  Clock,
  CheckCircle2,
  DollarSign,
  Calendar,
  ArrowUpRight,
  Lock,
  Unlock,
  Info,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export default function BloomreachPage() {
  // RSU Data from Bloomreach
  const stockPrice = 10.93; // USD as of June 30, 2025
  const priceDate = 'June 30, 2025';
  
  const rsuData = {
    vested: 2560,
    unvested: 5634,
  };
  
  const total = rsuData.vested + rsuData.unvested;
  const vestedPercentage = ((rsuData.vested / total) * 100).toFixed(1);
  const unvestedPercentage = ((rsuData.unvested / total) * 100).toFixed(1);
  
  const vestedValue = rsuData.vested * stockPrice;
  const unvestedValue = rsuData.unvested * stockPrice;
  const totalValue = total * stockPrice;

  // EUR conversion (approximate rate)
  const usdToEur = 0.92;
  const totalValueEur = totalValue * usdToEur;
  const vestedValueEur = vestedValue * usdToEur;

  // Vesting schedule simulation (quarterly vesting over 4 years)
  const vestingSchedule = useMemo(() => {
    const schedule = [];
    const quarterlyVest = Math.floor(total / 16); // 4 years * 4 quarters
    let cumulative = 0;
    
    for (let i = 1; i <= 16; i++) {
      cumulative += quarterlyVest;
      const quarter = ((i - 1) % 4) + 1;
      const year = Math.floor((i - 1) / 4) + 1;
      schedule.push({
        period: `Y${year}Q${quarter}`,
        vested: Math.min(cumulative, total),
        value: Math.min(cumulative, total) * stockPrice,
      });
    }
    return schedule;
  }, [total, stockPrice]);

  const pieData = [
    { name: 'Vested', value: rsuData.vested, color: '#10b981' },
    { name: 'Unvested', value: rsuData.unvested, color: '#6366f1' },
  ];

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const formatEUR = (val: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(val);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
              <Gem size={28} />
            </div>
            Bloomreach RSU
          </h1>
          <p className="text-slate-500 mt-1">
            Restricted Stock Units z nástupu do spoločnosti Bloomreach.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">
          <DollarSign size={16} className="text-emerald-500" />
          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
            {formatUSD(stockPrice)} / share
          </span>
          <span className="text-[10px] text-slate-400 ml-1">
            as of {priceDate}
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Value Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden col-span-1 md:col-span-2"
        >
          <div className="relative z-10">
            <p className="text-indigo-100 text-xs font-black uppercase tracking-[0.2em] mb-2">
              Celková hodnota RSU
            </p>
            <h2 className="text-5xl font-black mb-2">{formatUSD(totalValue)}</h2>
            <p className="text-indigo-200 text-lg font-medium">
              ≈ {formatEUR(totalValueEur)}
            </p>
            <div className="mt-6 flex items-center gap-6">
              <div>
                <p className="text-indigo-200 text-[10px] uppercase tracking-widest font-bold">
                  Celkom akcií
                </p>
                <p className="text-2xl font-black">{total.toLocaleString()}</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-indigo-200 text-[10px] uppercase tracking-widest font-bold">
                  Vested %
                </p>
                <p className="text-2xl font-black">{vestedPercentage}%</p>
              </div>
            </div>
          </div>
          <ArrowUpRight className="absolute -bottom-8 -right-8 text-white/10 w-48 h-48" />
        </motion.div>

        {/* Pie Chart Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border shadow-sm"
        >
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
            Rozdelenie
          </h3>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Akcií']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Vested</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Unvested</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Vested / Unvested Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vested Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
              <Unlock className="text-emerald-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Vested</h3>
              <p className="text-xs text-slate-400">K dispozícii na predaj</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Počet akcií
              </p>
              <p className="text-4xl font-black text-emerald-600">
                {rsuData.vested.toLocaleString()}
              </p>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-800" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Aktuálna hodnota
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {formatUSD(vestedValue)}
              </p>
              <p className="text-sm text-slate-500">
                ≈ {formatEUR(vestedValueEur)}
              </p>
            </div>
          </div>
          
          <CheckCircle2 className="absolute -bottom-4 -right-4 text-emerald-500/10 w-32 h-32" />
        </motion.div>

        {/* Unvested Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
              <Lock className="text-indigo-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Unvested</h3>
              <p className="text-xs text-slate-400">Čaká na vesting</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Počet akcií
              </p>
              <p className="text-4xl font-black text-indigo-600">
                {rsuData.unvested.toLocaleString()}
              </p>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-800" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Budúca hodnota
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {formatUSD(unvestedValue)}
              </p>
              <p className="text-sm text-slate-500">
                ≈ {formatEUR(unvestedValue * usdToEur)}
              </p>
            </div>
          </div>
          
          <Clock className="absolute -bottom-4 -right-4 text-indigo-500/10 w-32 h-32" />
        </motion.div>
      </div>

      {/* Vesting Schedule Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border shadow-sm"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-2xl">
              <Calendar className="text-violet-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Simulácia vestingu
              </h3>
              <p className="text-xs text-slate-400">
                Štandardný 4-ročný vesting s kvartálnym vestovaním
              </p>
            </div>
          </div>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={vestingSchedule}>
              <defs>
                <linearGradient id="colorVested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                }}
                formatter={(value: number, name: string) => [
                  name === 'vested' ? value.toLocaleString() + ' akcií' : formatUSD(value),
                  name === 'vested' ? 'Vested' : 'Hodnota',
                ]}
              />
              <Area
                type="monotone"
                dataKey="vested"
                stroke="#8b5cf6"
                strokeWidth={3}
                fill="url(#colorVested)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Info Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 p-6 rounded-2xl"
      >
        <div className="flex gap-3">
          <Info className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-1">
              Poznámka k RSU
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300/80">
              Hodnota RSU sa mení s cenou akcie Bloomreach. Zobrazená cena akcie ({formatUSD(stockPrice)}) je z {priceDate}. 
              Pri vesting evente budete musieť zaplatiť daň z príjmu z hodnoty vestovaných akcií.
              Vesting harmonogram je ilustratívny a môže sa líšiť od vášho skutočného plánu.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
