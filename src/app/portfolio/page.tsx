'use client';

import { useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
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
  Camera,
  Loader2,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInvestmentData } from '@/hooks/use-financial-data';
import { Skeleton } from '@/components/skeleton';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function PortfolioPage() {
  const { investments, loading, refresh } = useInvestmentData();
  const [search, setSearch] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const portfolioGroups = useMemo(() => {
    const groups: Record<string, typeof investments> = {};
    investments.forEach((inv) => {
      const p = inv.portfolio || 'Naše';
      if (!groups[p]) groups[p] = [];
      groups[p].push(inv);
    });

    return Object.keys(groups)
      .sort((a, b) => (a === 'Naše' ? -1 : 1))
      .map((name) => {
        const groupInvestments = groups[name];
        const totalValue = groupInvestments.reduce(
          (sum, inv) => sum + inv.shares * inv.current_price,
          0
        );
        const totalCost = groupInvestments.reduce(
          (sum, inv) => sum + inv.shares * inv.avg_price,
          0
        );
        const totalProfit = totalValue - totalCost;
        const profitPercentage =
          totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

        return {
          name,
          investments: groupInvestments,
          totalValue,
          totalProfit,
          profitPercentage,
        };
      });
  }, [investments]);

  const filteredGroups = useMemo(() => {
    return portfolioGroups.map((group) => ({
      ...group,
      investments: group.investments.filter(
        (inv) =>
          inv.name.toLowerCase().includes(search.toLowerCase()) ||
          inv.ticker?.toLowerCase().includes(search.toLowerCase())
      ),
    }));
  }, [portfolioGroups, search]);

  const totalStats = useMemo(() => {
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

  const handleScreenshotUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdating(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result as string;
      try {
        const response = await fetch('/api/portfolio-ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        if (data.investments) {
          // Update each investment in Supabase
          const updates = data.investments.map(async (newInv: any) => {
            // Find existing investment by ticker or name
            const existing = investments.find(
              (i) => i.ticker === newInv.ticker || i.name === newInv.name
            );

            if (existing) {
              return supabase
                .from('investments')
                .update({
                  current_price: newInv.current_price,
                  shares: newInv.shares || existing.shares,
                  avg_price: newInv.avg_price || existing.avg_price,
                })
                .eq('id', existing.id);
            }
          });

          await Promise.all(updates);
          await refresh();
          toast.success('Portfólio bolo úspešne aktualizované');
        }
      } catch (error: any) {
        console.error('Update error:', error);
        toast.error(error.message || 'Chyba pri aktualizácii portfólia');
      } finally {
        setIsUpdating(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Moje obchody</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Calendar size={12} />
              <span className="text-[10px] font-bold uppercase tracking-tight">
                Aktualizované:{' '}
                {new Date().toLocaleDateString('sk-SK', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
          <p className="text-slate-500">
            Prehľad tvojho investičného portfólia v akciách a ETF.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleScreenshotUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUpdating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-200 dark:shadow-none font-bold disabled:opacity-50"
          >
            {isUpdating ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Camera size={20} />
            )}
            <span>
              {isUpdating ? 'Spracovávam...' : 'Aktualizovať cez screenshot'}
            </span>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-200 dark:shadow-none font-bold">
            <Plus size={20} />
            <span>Pridať nový inštrument</span>
          </button>
        </div>
      </div>

      {/* Main Stats Card - Total across all portfolios */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Briefcase size={120} />
        </div>

        <div className="relative z-10 text-center space-y-6">
          <div>
            <p className="text-slate-400 text-sm uppercase tracking-[0.2em] font-black mb-2">
              Celková hodnota (všetky portfóliá)
            </p>
            <h2 className="text-5xl font-black tracking-tight">
              {loading ? (
                <Skeleton className="h-12 w-64 mx-auto bg-slate-800" />
              ) : (
                formatCurrency(totalStats.totalValue)
              )}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 max-w-md mx-auto pt-6 border-t border-slate-800">
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">
                Celkový zisk
              </p>
              <div
                className={`flex items-center justify-center gap-1 text-lg font-bold ${totalStats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {totalStats.totalProfit >= 0 ? '+' : ''}
                {formatCurrency(totalStats.totalProfit)}
                <span className="text-xs">
                  ({totalStats.profitPercentage.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Portfolio List */}
        <div className="lg:col-span-8 space-y-12">
          <div className="relative mb-4 px-2">
            <Search
              className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Hľadať vo všetkých portfóliách..."
              className="bg-white dark:bg-slate-900 border rounded-full pl-12 pr-6 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            [1, 2].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-8 w-48 rounded-lg" />
                <Skeleton className="h-48 w-full rounded-[32px]" />
              </div>
            ))
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-[32px] border border-dashed">
              Žiadne inštrumenty nenájdené.
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.name} className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-800 dark:text-white">
                    <div className="w-1.5 h-8 bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.4)]" />
                    Portfólio: {group.name}
                  </h2>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">
                      Hodnota sekcie
                    </p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {formatCurrency(group.totalValue)}
                    </p>
                    <div
                      className={`text-[11px] font-bold mt-1 ${group.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                    >
                      {group.totalProfit >= 0 ? '+' : ''}
                      {formatCurrency(group.totalProfit)} (
                      {group.profitPercentage.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {group.investments.map((inv, idx) => {
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
                            {inv.ticker ||
                              inv.name.substring(0, 4).toUpperCase()}
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
            ))
          )}
        </div>

        {/* Portfolio Stats & Charts */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <PieIcon size={20} className="text-blue-600" />
              <h3 className="font-bold">Celkové rozdelenie</h3>
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
              {pieData.slice(0, 6).map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold">
                    {((item.value / totalStats.totalValue) * 100).toFixed(1)}%
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
                  Celková hodnota tvojich investícií (vrátane Markusika) je{' '}
                  <span className="font-bold">
                    {formatCurrency(totalStats.totalValue)}
                  </span>
                  . Markusik tvorí{' '}
                  <span className="font-bold">
                    {(
                      ((portfolioGroups.find((g) => g.name === 'Markusik')
                        ?.totalValue || 0) /
                        totalStats.totalValue) *
                      100
                    ).toFixed(1)}
                    %
                  </span>{' '}
                  celkového portfólia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
