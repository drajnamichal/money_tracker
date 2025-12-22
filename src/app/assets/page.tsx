'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Plus, ArrowRight, Download, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AssetsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [records, setRecords] = useState<any>({});
  
  // Adding state
  const [isAdding, setIsAdding] = useState(false);
  const [newRecordDate, setNewRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAmounts, setNewAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: accountsData } = await supabase
        .from('asset_accounts')
        .select('*')
        .order('name');

      const { data: wealthData } = await supabase
        .from('wealth_records')
        .select('*')
        .order('record_date', { ascending: false });

      if (accountsData && wealthData) {
        setAccounts(accountsData);
        
        const uniqueDates = Array.from(new Set(wealthData.map(r => r.record_date))).sort().reverse();
        setDates(uniqueDates);

        const recordMap: any = {};
        wealthData.forEach(r => {
          if (!recordMap[r.record_date]) recordMap[r.record_date] = {};
          recordMap[r.record_date][r.account_id] = r.amount_eur;
        });
        setRecords(recordMap);

        // Pre-fill new amounts with latest values
        if (uniqueDates.length > 0) {
          const latest = recordMap[uniqueDates[0]];
          const initialAmounts: Record<string, string> = {};
          accountsData.forEach(acc => {
            initialAmounts[acc.id] = latest[acc.id]?.toString() || '0';
          });
          setNewAmounts(initialAmounts);
        }
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRecords(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const inserts = Object.entries(newAmounts)
        .filter(([_, amount]) => amount !== '')
        .map(([accountId, amount]) => ({
          account_id: accountId,
          record_date: newRecordDate,
          amount: Number(amount),
          amount_eur: Number(amount), // Assuming EUR for now
        }));

      const { error } = await supabase
        .from('wealth_records')
        .insert(inserts);

      if (error) throw error;

      setIsAdding(false);
      await fetchData();
      alert('Záznamy boli úspešne uložené');
    } catch (error) {
      console.error('Error saving records:', error);
      alert('Chyba pri ukladaní záznamov');
    } finally {
      setSaving(false);
    }
  }

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Majetok</h1>
          <p className="text-slate-500">Detailný prehľad tvojich finančných aktív.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
          >
            <Plus size={20} />
            <span>Pridať záznam</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 border shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-bold">Nový záznam k dátumu</h3>
              <div className="flex items-center gap-4">
                <input 
                  type="date"
                  className="bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={newRecordDate}
                  onChange={e => setNewRecordDate(e.target.value)}
                />
                <button 
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddRecords} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(account => (
                  <div key={account.id} className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">{account.name}</label>
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.01"
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                        value={newAmounts[account.id] || ''}
                        onChange={e => setNewAmounts({...newAmounts, [account.id]: e.target.value})}
                        placeholder="0.00"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
                >
                  Zrušiť
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Uložiť všetko
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-900 dark:text-white sticky left-0 bg-slate-50 dark:bg-slate-800">Účet / Inštitúcia</th>
                {dates.slice(0, 5).map(date => (
                  <th key={date} className="px-6 py-4 font-semibold">
                    {new Date(date).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                  </th>
                ))}
                <th className="px-6 py-4 font-semibold text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {accounts.map(account => {
                const latestAmount = records[dates[0]]?.[account.id] || 0;
                const prevAmount = records[dates[1]]?.[account.id] || 0;
                const diff = latestAmount - prevAmount;

                return (
                  <motion.tr 
                    key={account.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <td className="px-6 py-4 sticky left-0 bg-white dark:bg-slate-900 font-medium border-r">
                      <div className="flex flex-col">
                        <span>{account.name}</span>
                        <span className="text-xs text-slate-400 capitalize">{account.type}</span>
                      </div>
                    </td>
                    {dates.slice(0, 5).map(date => (
                      <td key={date} className="px-6 py-4">
                        {formatCurrency(records[date]?.[account.id] || 0)}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <div className={`flex items-center justify-end gap-1 font-medium ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {diff !== 0 && (diff > 0 ? <ArrowRight size={14} className="-rotate-45" /> : <ArrowRight size={14} className="rotate-45" />)}
                        {formatCurrency(Math.abs(diff))}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t">
              <tr>
                <td className="px-6 py-4 sticky left-0 bg-slate-50 dark:bg-slate-800 border-r text-blue-600">CELKOM</td>
                {dates.slice(0, 5).map(date => {
                  const total = accounts.reduce((sum, acc) => sum + (records[date]?.[acc.id] || 0), 0);
                  return (
                    <td key={date} className="px-6 py-4 text-blue-600">
                      {formatCurrency(total)}
                    </td>
                  );
                })}
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Rozloženie portfólia</h3>
          <div className="space-y-4">
            {accounts
              .map(acc => ({ ...acc, amount: records[dates[0]]?.[acc.id] || 0 }))
              .filter(acc => acc.amount > 0)
              .sort((a, b) => b.amount - a.amount)
              .map(acc => {
                const total = accounts.reduce((sum, a) => sum + (records[dates[0]]?.[a.id] || 0), 0);
                const percentage = (acc.amount / total) * 100;
                return (
                  <div key={acc.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{acc.name}</span>
                      <span className="text-slate-500">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-blue-600"
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        
        <div className="bg-blue-600 p-8 rounded-2xl text-white shadow-xl shadow-blue-200 dark:shadow-none flex flex-col justify-center items-center text-center">
          <Download size={48} className="mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">Exportuj svoje dáta</h3>
          <p className="text-blue-100 mb-6 max-w-xs text-sm">Stiahni si kompletný prehľad vo formáte Excel alebo CSV pre vlastnú analýzu.</p>
          <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors">
            Stiahnuť report
          </button>
        </div>
      </div>
    </div>
  );
}
