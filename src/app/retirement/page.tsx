'use client';

import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  Palmtree,
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
  Plus,
  ArrowUpRight,
  Info,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRetirementData } from '@/hooks/use-financial-data';
import { Skeleton } from '@/components/skeleton';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function RetirementPage() {
  const { records, loading, refresh } = useRetirementData();
  const [isAdding, setIsAdding] = useState(false);
  const [editValues, setEditValues] = useState({
    total_value: '',
    total_contributions: '',
    record_date: new Date().toISOString().split('T')[0],
  });

  const latestRecord = records[0];

  const stats = useMemo(() => {
    if (!latestRecord) return null;
    const profit = latestRecord.total_value - latestRecord.total_contributions;
    const profitPct = (profit / latestRecord.total_contributions) * 100;
    return {
      value: latestRecord.total_value,
      contributions: latestRecord.total_contributions,
      profit,
      profitPct,
      date: latestRecord.record_date,
    };
  }, [latestRecord]);

  const handleAddRecord = async () => {
    try {
      const val = parseFloat(editValues.total_value);
      const contrib = parseFloat(editValues.total_contributions);
      const profit = val - contrib;
      const profitPct = (profit / contrib) * 100;

      const { error } = await supabase.from('retirement_records').insert([
        {
          account_name: 'Európsky dôchodok',
          account_number: '2321351501',
          total_value: val,
          total_contributions: contrib,
          profit: profit,
          profit_percentage: profitPct,
          record_date: editValues.record_date,
        },
      ]);

      if (error) throw error;

      toast.success('Dáta o dôchodku boli aktualizované');
      await refresh();
      setIsAdding(false);
    } catch (error: any) {
      toast.error('Chyba pri ukladaní: ' + error.message);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Palmtree size={32} className="text-orange-500" />
            <h1 className="text-3xl font-bold">Dôchodok</h1>
            {stats && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full border border-orange-100 dark:border-orange-800/50 shadow-sm">
                <Calendar size={12} />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  Aktualizované:{' '}
                  {new Date(stats.date).toLocaleDateString('sk-SK')}
                </span>
              </div>
            )}
          </div>
          <p className="text-slate-500 mt-1">
            Prehľad tvojho dôchodkového sporenia (Finax PEPP).
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-orange-200 dark:shadow-none font-bold"
        >
          {isAdding ? <X size={20} /> : <Edit2 size={20} />}
          <span>{isAdding ? 'Zrušiť' : 'Aktualizovať údaje'}</span>
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-orange-100 dark:border-orange-900/30 shadow-sm"
          >
            <h3 className="text-lg font-bold mb-4">
              Aktualizovať hodnotu účtu
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Aktuálna hodnota (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  value={editValues.total_value}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      total_value: e.target.value,
                    })
                  }
                  placeholder="napr. 1017"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Celkové vklady (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  value={editValues.total_contributions}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      total_contributions: e.target.value,
                    })
                  }
                  placeholder="napr. 960"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Dátum aktualizácie
                </label>
                <input
                  type="date"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  value={editValues.record_date}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      record_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleAddRecord}
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold"
              >
                <Check size={20} />
                Uložiť zmeny
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-[32px]" />
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RetirementStatCard
              title="Aktuálna hodnota"
              value={formatCurrency(stats.value)}
              icon={<Wallet className="text-orange-500" />}
              color="orange"
            />
            <RetirementStatCard
              title="Celkové vklady"
              value={formatCurrency(stats.contributions)}
              icon={<TrendingUp className="text-emerald-500" />}
              color="emerald"
            />
            <RetirementStatCard
              title="Celkový zisk"
              value={formatCurrency(stats.profit)}
              percentage={stats.profitPct}
              icon={<TrendingUp className="text-blue-500" />}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-bold mb-6">Detaily účtu</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800/50">
                  <span className="text-slate-500 font-medium">Názov účtu</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    Európsky dôchodok (PEPP)
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800/50">
                  <span className="text-slate-500 font-medium">Číslo účtu</span>
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    2321351501
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800/50">
                  <span className="text-slate-500 font-medium">Stratégia</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase rounded-md tracking-widest">
                      Akcie 100%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-slate-500 font-medium">
                    Investičný horizont
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    29 rokov
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-[32px] text-white shadow-xl shadow-orange-200 dark:shadow-none relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Palmtree size={160} />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Info size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Poznámka k majetku</h3>
                  <p className="text-orange-50 leading-relaxed mt-2 text-lg">
                    Tento účet sa nezapočítava do celkového majetku na
                    Dashboarde, pretože ide o dlhodobé sporenie na dôchodok,
                    ktoré nie je možné predčasne vybrať bez sankcií.
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-2 text-sm font-bold text-orange-100 uppercase tracking-widest">
                  <ArrowUpRight size={16} />
                  Zabezpečenie na budúcnosť
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-slate-400 font-medium italic">
            Žiadne údaje o dôchodku nenájdené. Pridaj prvé dáta.
          </p>
        </div>
      )}
    </div>
  );
}

function RetirementStatCard({ title, value, percentage, icon, color }: any) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4 group transition-all"
    >
      <div className="flex items-center justify-between">
        <div
          className={`p-3 rounded-2xl bg-${color}-50 dark:bg-${color}-950/50 group-hover:scale-110 transition-transform`}
        >
          {icon}
        </div>
        {percentage !== undefined && (
          <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black">
            <TrendingUp size={14} />
            {percentage.toFixed(2)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-black uppercase tracking-widest mb-1">
          {title}
        </p>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {value}
        </h3>
      </div>
    </motion.div>
  );
}
