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
  ChevronDown,
  ChevronUp,
  X,
  BrainCircuit,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInvestmentData } from '@/hooks/use-financial-data';
import { Skeleton } from '@/components/skeleton';
import { toast } from 'sonner';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Investment } from '@/types/financial';

export default function PortfolioPage() {
  const { investments, loading, refresh } = useInvestmentData();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePortfolio, setActivePortfolio] = useState<
    'default' | 'markusik'
  >('default');

  const defaultInvestments = useMemo(
    () =>
      investments.filter(
        (inv) => !inv.portfolio_id || inv.portfolio_id === 'default'
      ),
    [investments]
  );

  const markusikInvestments = useMemo(
    () => investments.filter((inv) => inv.portfolio_id === 'markusik'),
    [investments]
  );

  const handleOpenModal = (pId: 'default' | 'markusik') => {
    setActivePortfolio(pId);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-16 pb-24">
      {/* Portfólio 1: Moje obchody */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                Moje obchody
              </h2>
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
            <p className="text-slate-500 mt-1">
              Prehľad tvojho investičného portfólia v akciách a ETF.
            </p>
          </div>
          <PortfolioActions
            portfolioId="default"
            onAddClick={() => handleOpenModal('default')}
            onRefresh={refresh}
            investments={defaultInvestments}
          />
        </div>

        <PortfolioContent
          investments={defaultInvestments}
          portfolioId="default"
          loading={loading}
          search={search}
          setSearch={setSearch}
        />
      </section>

      {/* Oddelovač */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-slate-50 dark:bg-slate-950 text-slate-400">
            <Briefcase size={20} />
          </span>
        </div>
      </div>

      {/* Portfólio 2: Portfolio Markusik */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                Portfolio Markusik
              </h2>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase rounded-md tracking-widest">
                Samostatné
              </span>
            </div>
            <p className="text-slate-500 mt-1">
              Samostatné portfólio pre Markusika.
            </p>
          </div>
          <PortfolioActions
            portfolioId="markusik"
            onAddClick={() => handleOpenModal('markusik')}
            onRefresh={refresh}
            investments={markusikInvestments}
          />
        </div>

        <PortfolioContent
          investments={markusikInvestments}
          portfolioId="markusik"
          loading={loading}
          search={search}
          setSearch={setSearch}
        />
      </section>

      <AddInstrumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        portfolioId={activePortfolio}
        onSuccess={refresh}
      />
    </div>
  );
}

function PortfolioActions({
  portfolioId,
  onAddClick,
  onRefresh,
  investments,
}: {
  portfolioId: 'default' | 'markusik';
  onAddClick: () => void;
  onRefresh: () => Promise<void>;
  investments: Investment[];
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          const updates = data.investments.map(async (newInv: any) => {
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
            } else {
              const { data: userData } = await supabase.auth.getUser();
              return supabase.from('investments').insert([
                {
                  ...newInv,
                  portfolio_id: portfolioId,
                  user_id: userData.user?.id,
                },
              ]);
            }
          });

          await Promise.all(updates);
          await onRefresh();
          toast.success(`Portfólio bolo úspešne aktualizované`);
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

  return (
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
        className={`flex items-center gap-2 transition-all font-bold disabled:opacity-50 ${
          portfolioId === 'markusik'
            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
        } text-white px-6 py-3 rounded-2xl shadow-lg dark:shadow-none`}
      >
        {isUpdating ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <Camera size={20} />
        )}
        <span>{isUpdating ? 'Spracovávam...' : 'Screenshot'}</span>
      </button>
      <button
        onClick={onAddClick}
        className={`${
          portfolioId === 'markusik'
            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
        } text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg dark:shadow-none font-bold`}
      >
        <Plus size={20} />
        <span>Pridať</span>
      </button>
    </div>
  );
}

function PortfolioContent({
  investments,
  portfolioId,
  loading,
  search,
  setSearch,
}: {
  investments: Investment[];
  portfolioId: 'default' | 'markusik';
  loading: boolean;
  search: string;
  setSearch: (val: string) => void;
}) {
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
    <div className="space-y-8">
      {/* Main Stats Card */}
      <div
        className={`${
          portfolioId === 'markusik'
            ? 'bg-emerald-900 dark:bg-emerald-950 border-emerald-500/20'
            : 'bg-slate-900 dark:bg-slate-950 border-blue-500/20'
        } text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden group border`}
      >
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
              <p className="text-lg font-bold">0.00 €</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">
                Celkový zisk
              </p>
              <div
                className={`flex items-center justify-center gap-1 text-lg font-bold ${
                  stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
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
            {loading ? (
              [1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))
            ) : filteredInvestments.length > 0 ? (
              filteredInvestments.map((inv, idx) => {
                const value = inv.shares * inv.current_price;
                const cost = inv.shares * inv.avg_price;
                const profit = value - cost;
                const profitPct = cost > 0 ? (profit / cost) * 100 : 0;

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
                        className={`flex items-center justify-end gap-1 text-xs font-bold ${
                          profit >= 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {profit >= 0 ? (
                          <ArrowUpRight size={12} />
                        ) : (
                          <ArrowDownRight size={12} />
                        )}
                        {formatCurrency(Math.abs(profit))} (
                        {profitPct.toFixed(2)}
                        %)
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 font-medium italic">
                  Žiadne inštrumenty nenájdené
                </p>
              </div>
            )}
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
                      style={{
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 text-ellipsis overflow-hidden whitespace-nowrap max-w-[120px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold">
                    {((item.value / (stats.totalValue || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analýza */}
          <PortfolioAIAnalysis investments={investments} />

          {/* Benchmark Comparison */}
          <BenchmarkComparison portfolioReturn={stats.profitPercentage} />

          {portfolioId === 'default' && pieData.length > 0 && (
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
                      ((pieData.find((d) => d.name.includes('S&P'))?.value ||
                        0) /
                        (stats.totalValue || 1)) *
                      100
                    ).toFixed(1)}
                    %). Zváž diverzifikáciu do iných regiónov pre lepšie
                    rozloženie rizika.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PortfolioAIAnalysis({ investments }: { investments: Investment[] }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    diversification: 'Nízka' | 'Stredná' | 'Vysoká';
    riskProfile: 'Konzervatívny' | 'Vyvážený' | 'Agresívny';
    score: number;
    recommendation: string;
  } | null>(null);

  const runAnalysis = () => {
    setIsAnalyzing(true);
    // Simulate AI processing
    setTimeout(() => {
      const totalValue = investments.reduce(
        (sum, inv) => sum + inv.shares * inv.current_price,
        0
      );
      const cryptoValue = investments
        .filter((inv) => inv.type === 'crypto')
        .reduce((sum, inv) => sum + inv.shares * inv.current_price, 0);
      const cryptoRatio = totalValue > 0 ? cryptoValue / totalValue : 0;

      const tickers = investments.length;

      let div: any = 'Nízka';
      if (tickers > 3) div = 'Stredná';
      if (tickers > 7) div = 'Vysoká';

      let risk: any = 'Konzervatívny';
      if (cryptoRatio > 0.1 || tickers > 5) risk = 'Vyvážený';
      if (cryptoRatio > 0.3) risk = 'Agresívny';

      setAnalysis({
        diversification: div,
        riskProfile: risk,
        score: Math.min(100, Math.floor(tickers * 10 + (1 - cryptoRatio) * 30)),
        recommendation:
          cryptoRatio > 0.2
            ? 'Tvoje portfólio má vysoký podiel kryptomien. Zváž zvýšenie podielu široko diverzifikovaných ETF pre stabilitu.'
            : tickers < 5
              ? 'Máš malý počet inštrumentov. Pre lepšie rozloženie rizika by bolo vhodné pridať aspoň 2-3 ďalšie tituly z rôznych sektorov.'
              : 'Tvoje portfólio vyzerá zdravo diverzifikované. Pokračuj v pravidelnom rebalansovaní.',
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BrainCircuit size={20} className="text-purple-600" />
          <h3 className="font-bold">AI Analýza</h3>
        </div>
        {!analysis && !isAnalyzing && (
          <button
            onClick={runAnalysis}
            className="text-[10px] font-black uppercase tracking-widest bg-purple-600 text-white px-3 py-1.5 rounded-full hover:bg-purple-700 transition-colors"
          >
            Spustiť
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isAnalyzing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8 text-center space-y-3"
          >
            <Loader2
              className="animate-spin mx-auto text-purple-600"
              size={32}
            />
            <p className="text-sm font-medium text-slate-500 animate-pulse">
              Analyzujem dáta a trhové trendy...
            </p>
          </motion.div>
        ) : analysis ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Diverzifikácia
                  </span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {analysis.diversification}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Riziko
                  </span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {analysis.riskProfile}
                </p>
              </div>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30">
              <p className="text-xs text-purple-900 dark:text-purple-300 leading-relaxed italic">
                "{analysis.recommendation}"
              </p>
            </div>

            <button
              onClick={() => setAnalysis(null)}
              className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-purple-600 transition-colors"
            >
              Resetovať analýzu
            </button>
          </motion.div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-400 italic">
              Klikni na tlačidlo pre AI zhodnotenie tvojho portfólia.
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BenchmarkComparison({ portfolioReturn }: { portfolioReturn: number }) {
  const data = [
    { name: 'Tvoje', value: portfolioReturn, color: '#2563eb' },
    { name: 'S&P 500', value: 24.2, color: '#10b981' },
    { name: 'MSCI World', value: 18.5, color: '#f59e0b' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={20} className="text-blue-600" />
        <h3 className="font-bold">Vs. Benchmark (YTD)</h3>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                fontSize: '12px',
                fontWeight: 700,
              }}
              formatter={(value: number) => [`${value.toFixed(2)}%`, 'Výnos']}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-slate-400 text-center mt-4 font-medium italic">
        *Benchmarky sú odhadované ročné výnosy pre rok 2024.
      </p>
    </div>
  );
}

function AddInstrumentModal({
  isOpen,
  onClose,
  portfolioId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: 'default' | 'markusik';
  onSuccess: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ticker: '',
    type: 'etf' as const,
    shares: '',
    avg_price: '',
    current_price: '',
    currency: 'EUR' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from('investments').insert([
        {
          name: formData.name,
          ticker: formData.ticker.toUpperCase(),
          type: formData.type,
          shares: parseFloat(formData.shares),
          avg_price: parseFloat(formData.avg_price),
          current_price: parseFloat(formData.current_price),
          currency: formData.currency,
          portfolio_id: portfolioId,
          user_id: userData.user?.id,
        },
      ]);

      if (error) throw error;

      toast.success('Inštrument bol pridaný');
      await onSuccess();
      onClose();
      setFormData({
        name: '',
        ticker: '',
        type: 'etf',
        shares: '',
        avg_price: '',
        current_price: '',
        currency: 'EUR',
      });
    } catch (error: any) {
      toast.error(error.message || 'Chyba pri pridávaní inštrumentu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-md shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <h3 className="text-2xl font-bold mb-6">
          Pridať do {portfolioId === 'markusik' ? 'Markusik' : 'Moje obchody'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
              Názov
            </label>
            <input
              required
              type="text"
              placeholder="napr. S&P 500 ETF"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Ticker
              </label>
              <input
                type="text"
                placeholder="napr. VUSA"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.ticker}
                onChange={(e) =>
                  setFormData({ ...formData, ticker: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Typ
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as any,
                  })
                }
              >
                <option value="etf">ETF</option>
                <option value="stock">Akcia</option>
                <option value="crypto">Krypto</option>
                <option value="other">Iné</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Počet kusov
              </label>
              <input
                required
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.shares}
                onChange={(e) =>
                  setFormData({ ...formData, shares: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Mena
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currency: e.target.value as any,
                  })
                }
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Nákupná cena
              </label>
              <input
                required
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.avg_price}
                onChange={(e) =>
                  setFormData({ ...formData, avg_price: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Aktuálna cena
              </label>
              <input
                required
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.current_price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_price: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none transition-all mt-4 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" size={24} />
            ) : (
              'Uložiť inštrument'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
