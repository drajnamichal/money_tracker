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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInvestmentData } from '@/hooks/use-financial-data';
import { Skeleton } from '@/components/skeleton';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
    <div className="space-y-12 pb-12">
      <section>
        <PortfolioSection
          title="Moje obchody"
          description="Prehľad tvojho investičného portfólia v akciách a ETF."
          investments={defaultInvestments}
          portfolioId="default"
          loading={loading}
          refresh={refresh}
          search={search}
          setSearch={setSearch}
          onAddClick={() => handleOpenModal('default')}
        />
      </section>

      <div className="border-t border-slate-200 dark:border-slate-800 my-12" />

      <section>
        <PortfolioSection
          title="Portfolio Markusik"
          description="Samostatné portfólio pre Markusika."
          investments={markusikInvestments}
          portfolioId="markusik"
          loading={loading}
          refresh={refresh}
          search={search}
          setSearch={setSearch}
          onAddClick={() => handleOpenModal('markusik')}
          isCompact
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

interface PortfolioSectionProps {
  title: string;
  description: string;
  investments: Investment[];
  portfolioId: 'default' | 'markusik';
  loading: boolean;
  refresh: () => Promise<void>;
  search: string;
  setSearch: (val: string) => void;
  onAddClick: () => void;
  isCompact?: boolean;
}

function PortfolioSection({
  title,
  description,
  investments,
  portfolioId,
  loading,
  refresh,
  search,
  setSearch,
  onAddClick,
  isCompact,
}: PortfolioSectionProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);

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

    const lastUpdated =
      investments.length > 0
        ? new Date(
            Math.max(
              ...investments.map((i) =>
                new Date(i.updated_at || i.created_at || 0).getTime()
              )
            )
          )
        : null;

    return { totalValue, totalProfit, profitPercentage, lastUpdated };
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
              // Add new investment for this portfolio
              return supabase.from('investments').insert([
                {
                  ...newInv,
                  portfolio_id: portfolioId,
                  user_id: (await supabase.auth.getUser()).data.user?.id,
                },
              ]);
            }
          });

          await Promise.all(updates);
          await refresh();
          toast.success(`Portfólio ${title} bolo úspešne aktualizované`);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">{title}</h2>
            {portfolioId === 'default' && (
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
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          <p className="text-slate-500">{description}</p>
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
            className={`flex items-center gap-2 transition-all font-bold disabled:opacity-50 ${
              portfolioId === 'markusik'
                ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
            } text-white px-6 py-3 rounded-2xl shadow-lg dark:shadow-none`}
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
          <button
            onClick={onAddClick}
            className={`${
              portfolioId === 'markusik'
                ? 'bg-purple-500 hover:bg-purple-600 shadow-purple-100'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            } text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg dark:shadow-none font-bold`}
          >
            <Plus size={20} />
            <span>Pridať nový inštrument</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-8"
          >
            {/* Main Stats Card */}
            <div
              className={`${
                portfolioId === 'markusik'
                  ? 'bg-slate-800 dark:bg-slate-900'
                  : 'bg-slate-900 dark:bg-slate-950'
              } text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden group`}
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
                        stats.totalProfit >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
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
                    ? [1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                      ))
                    : filteredInvestments.map((inv, idx) => {
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
                                className={`flex items-center justify-end gap-1 text-xs font-bold ${
                                  profit >= 0
                                    ? 'text-emerald-500'
                                    : 'text-rose-500'
                                }`}
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
                  {!loading && filteredInvestments.length === 0 && (
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
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs font-bold">
                          {(
                            (item.value / (stats.totalValue || 1)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {portfolioId === 'default' && (
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
                            ((pieData.find((d) => d.name.includes('S&P'))
                              ?.value || 0) /
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
          </motion.div>
        )}
      </AnimatePresence>
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
