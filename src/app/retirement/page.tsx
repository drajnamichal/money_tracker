'use client';

import { useState, useMemo } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Palmtree,
  TrendingUp,
  Calendar,
  Wallet,
  Plus,
  ArrowUpRight,
  Info,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRetirementData } from '@/hooks/use-financial-data';
import { Skeleton } from '@/components/skeleton';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { RetirementRecord } from '@/types/financial';

export default function RetirementPage() {
  const { records, loading, refresh } = useRetirementData();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [editValues, setEditValues] = useState({
    total_value: '',
    total_contributions: '',
    record_date: new Date().toISOString().split('T')[0],
  });

  const latestRecordsByAccount = useMemo(() => {
    const latest: Record<string, RetirementRecord> = {};
    records.forEach((record) => {
      if (!latest[record.account_name]) {
        latest[record.account_name] = record;
      } else {
        const currentLatest = new Date(latest[record.account_name].record_date);
        const recordDate = new Date(record.record_date);
        if (recordDate > currentLatest) {
          latest[record.account_name] = record;
        }
      }
    });
    return Object.values(latest);
  }, [records]);

  const totalStats = useMemo(() => {
    if (latestRecordsByAccount.length === 0) return null;
    const totalValue = latestRecordsByAccount.reduce(
      (sum, r) => sum + Number(r.total_value),
      0
    );
    const totalContributions = latestRecordsByAccount.reduce(
      (sum, r) => sum + Number(r.total_contributions),
      0
    );
    const profit = totalValue - totalContributions;
    const profitPct =
      totalContributions > 0 ? (profit / totalContributions) * 100 : 0;

    const latestDate = latestRecordsByAccount.reduce(
      (max, r) => (r.record_date > max ? r.record_date : max),
      latestRecordsByAccount[0].record_date
    );

    return { totalValue, totalContributions, profit, profitPct, latestDate };
  }, [latestRecordsByAccount]);

  const handleAddRecord = async () => {
    if (!selectedAccount) {
      toast.error('Vyber si účet pre aktualizáciu');
      return;
    }

    try {
      const val = parseFloat(editValues.total_value);
      const contrib = parseFloat(editValues.total_contributions) || 0;
      const profit = val - contrib;
      const profitPct = contrib > 0 ? (profit / contrib) * 100 : 0;

      const account = latestRecordsByAccount.find(
        (a) => a.account_name === selectedAccount
      );

      const { error } = await supabase.from('retirement_records').insert([
        {
          account_name: selectedAccount,
          account_number: account?.account_number || null,
          total_value: val,
          total_contributions: contrib,
          profit: profit,
          profit_percentage: profitPct,
          record_date: editValues.record_date,
        },
      ]);

      if (error) throw error;

      toast.success(`Dáta pre ${selectedAccount} boli aktualizované`);
      await refresh();
      setIsAdding(false);
      setEditValues({
        total_value: '',
        total_contributions: '',
        record_date: new Date().toISOString().split('T')[0],
      });
    } catch (error: any) {
      toast.error('Chyba pri ukladaní: ' + error.message);
    }
  };

  const handleEditClick = (record: RetirementRecord) => {
    setSelectedAccount(record.account_name);
    setEditValues({
      total_value: record.total_value.toString(),
      total_contributions: record.total_contributions.toString(),
      record_date: new Date().toISOString().split('T')[0],
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Palmtree size={32} className="text-orange-500" />
            <h1 className="text-3xl font-bold">Dôchodok</h1>
            {totalStats && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full border border-orange-100 dark:border-orange-800/50 shadow-sm">
                <Calendar size={12} />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  Posledná aktualizácia:{' '}
                  {new Date(totalStats.latestDate).toLocaleDateString('sk-SK')}
                </span>
              </div>
            )}
          </div>
          <p className="text-slate-500 mt-1">
            Prehľad tvojich dôchodkových pilierov (Finax PEPP, II. a III. pilier
            od UNIQA).
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-orange-200 dark:shadow-none font-bold"
        >
          {isAdding ? <X size={20} /> : <Plus size={20} />}
          <span>{isAdding ? 'Zrušiť' : 'Pridať/Upraviť záznam'}</span>
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
            <h3 className="text-lg font-bold mb-4">Aktualizovať údaje</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Účet
                </label>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 transition-all text-slate-900 dark:text-white"
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                >
                  <option value="">Vyber účet...</option>
                  {latestRecordsByAccount.map((acc) => (
                    <option key={acc.id} value={acc.account_name}>
                      {acc.account_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Aktuálna hodnota (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 transition-all text-slate-900 dark:text-white"
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 transition-all text-slate-900 dark:text-white"
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
                  Dátum
                </label>
                <input
                  type="date"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 transition-all text-slate-900 dark:text-white"
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
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-orange-200 dark:shadow-none"
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
      ) : totalStats ? (
        <div className="space-y-12">
          {/* Súhrnné štatistiky */}
          <div className="max-w-md">
            <RetirementStatCard
              title="Celková hodnota pilierov"
              value={formatCurrency(totalStats.totalValue)}
              icon={<Wallet className="text-orange-500" />}
              color="orange"
            />
          </div>

          {/* Zoznam účtov */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold px-2">Jednotlivé účty</h2>
            <div className="grid grid-cols-1 gap-4">
              {latestRecordsByAccount.map((record) => (
                <motion.div
                  key={record.id}
                  layout
                  className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-2xl ${
                          record.account_name.includes('Finax')
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                        }`}
                      >
                        <Wallet size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                          {record.account_name}
                        </h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          {record.account_number || 'Bez čísla zmluvy'}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 flex justify-end md:pr-8">
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                          Hodnota
                        </p>
                        <p className="font-black text-2xl text-slate-900 dark:text-white">
                          {formatCurrency(record.total_value)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditClick(record)}
                        className="p-3 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-xl transition-all"
                        title="Upraviť"
                      >
                        <Edit2 size={18} />
                      </button>
                      <a
                        href={
                          record.account_name.includes('Finax')
                            ? 'https://www.finax.eu/sk/login'
                            : 'https://moja.uniqa.sk/login'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all"
                        title="Prihlásiť sa"
                      >
                        <ExternalLink size={18} />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Poznámka */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[32px] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Palmtree size={120} />
            </div>
            <div className="relative z-10 flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Info size={24} className="text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">
                  Prečo nie sú tieto peniaze započítané v celkovom majetku?
                </h3>
                <p className="text-slate-300 leading-relaxed max-w-2xl">
                  Dôchodkové piliere (PEPP, II. a III. pilier) sú viazané
                  úspory, ku ktorým budeš mať prístup až v dôchodkovom veku.
                  Zobrazujeme ich tu pre tvoj prehľad o budúcom zabezpečení, ale
                  nepočítame ich do aktuálneho likvidného majetku.
                </p>
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

const retirementStatIconBg: Record<string, string> = {
  orange: 'bg-orange-50 dark:bg-orange-950/50',
  emerald: 'bg-emerald-50 dark:bg-emerald-950/50',
  blue: 'bg-blue-50 dark:bg-blue-950/50',
  indigo: 'bg-indigo-50 dark:bg-indigo-950/50',
};

function RetirementStatCard({ title, value, percentage, icon, color }: any) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4 group transition-all"
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'p-3 rounded-2xl group-hover:scale-110 transition-transform',
            retirementStatIconBg[color]
          )}
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
