'use client';

import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  PieChart as PieIcon,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInvestmentData } from '@/hooks/use-financial-data';
import { Skeleton } from '@/components/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function PortfolioPage() {
  const { investments, loading } = useInvestmentData();
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const totalValue = investments.reduce(
      (sum, inv) => sum + inv.shares * inv.current_price,
      0
    );
    const totalCost = investments.reduce(
      (sum, inv) => sum + inv.shares * inv.avg_price,
      0
    );
    const totalProfit = totalValue - totalCost;
    const profitPercentage =
      totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return { totalValue, totalProfit, profitPercentage };
  }, [investments]);

  const filteredInvestments = investments.filter(
    (inv) =>
      inv.name.toLowerCase().includes(search.toLowerCase()) ||
      inv.ticker?.toLowerCase().includes(search.toLowerCase())
  );

  const pieData = useMemo(() => {
    return investments
      .map((inv) => ({
        name: inv.name,
        value: inv.shares * inv.current_price,
      }))
      .sort((a, b) => b.value - a.value);
  }, [investments]);

  const COLORS = [
    '#2563eb',
    '#10b981',
    '#f59e0b',
    '#f43f5e',
    '#8b5cf6',
    '#06b6d4',
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Moje obchody</h1>
          <p className="text-slate-500">
            Prehľad tvojho investičného portfólia v akciách a ETF.
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-200 dark:shadow-none font-bold">
          <Plus size={20} />
          <span>Pridať nový inštrument</span>
        </button>
      </div>

      {/* Main Stats Card */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Briefcase size={120} />
        </div>

        <div className="relative z-10 text-center space-y-6">
          <div>
            <p className="text-slate-400 text-sm uppercase tracking-[0.2em] font-black mb-2">
              Celková hodnota
            </p>
            <h2 className="text-5xl font-black tracking-tight">
              {loading ? (
                <Skeleton className="h-12 w-64 mx-auto bg-slate-800" />
              ) : (
                formatCurrency(stats.totalValue)
              )}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-8 max-w-md mx-auto pt-6 border-t border-slate-800">
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">
                Voľné prostriedky
              </p>
              <p className="text-lg font-bold">4.42 €</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">
                Celkový zisk
              </p>
              <div
                className={`flex items-center justify-center gap-1 text-lg font-bold ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {stats.totalProfit >= 0 ? '+' : ''}
                {formatCurrency(stats.totalProfit)}
                <span className="text-xs">
                  ({stats.profitPercentage.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Portfolio List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="flex items-center gap-4">
              <button className="text-sm font-bold border-b-2 border-blue-600 pb-1">
                Otvorené
              </button>
              <button className="text-sm font-bold text-slate-400 pb-1 hover:text-slate-600 transition-colors">
                Čakajúce
              </button>
              <button className="text-sm font-bold text-slate-400 pb-1 hover:text-slate-600 transition-colors">
                Uzavreté
              </button>
            </div>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Hľadať..."
                className="bg-white dark:bg-slate-900 border rounded-full pl-10 pr-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-48 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {loading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))
              : filteredInvestments.map((inv, idx) => {
                  const value = inv.shares * inv.current_price;
                  const cost = inv.shares * inv.avg_price;
                  const profit = value - cost;
                  const profitPct = (profit / cost) * 100;

                  return (
                    <motion.div
                      key={inv.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-600 dark:text-slate-400 shadow-inner group-hover:scale-110 transition-transform">
                          {inv.ticker || inv.name.substring(0, 4).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100">
                              {inv.name}
                            </h4>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-tighter">
                              {inv.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">
                            {inv.shares} @ {inv.avg_price}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
                          {formatCurrency(value)}
                        </h4>
                        <div
                          className={`flex items-center justify-end gap-1 text-xs font-bold ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                        >
                          {profit >= 0 ? (
                            <ArrowUpRight size={12} />
                          ) : (
                            <ArrowDownRight size={12} />
                          )}
                          {formatCurrency(Math.abs(profit))} (
                          {profitPct.toFixed(2)}%)
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
          </div>
        </div>

        {/* Portfolio Stats & Charts */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <PieIcon size={20} className="text-blue-600" />
              <h3 className="font-bold">Rozdelenie</h3>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3 mt-4">
              {pieData.slice(0, 4).map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold">
                    {((item.value / stats.totalValue) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[32px] text-white shadow-xl shadow-blue-200 dark:shadow-none relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Investičný tip</h3>
                <p className="text-blue-100 text-xs leading-relaxed mt-1">
                  Tvoje portfólio je silne koncentrované v S&P 500 (
                  {(
                    ((pieData.find((d) => d.name.includes('S&P'))?.value || 0) /
                      stats.totalValue) *
                    100
                  ).toFixed(1)}
                  %). Zváž diverzifikáciu do iných regiónov pre lepšie
                  rozloženie rizika.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
