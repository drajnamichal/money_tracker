'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Calculator, Save, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/skeleton';
import { calculateSalaryResults } from '@/lib/calculations';

export default function CalculatorPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salary, setSalary] = useState(7000);
  const [split, setSplit] = useState({
    fixed_costs: 55,
    investments: 25,
    savings: 15,
    fun: 5,
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data } = await supabase.from('settings').select('*');
        if (data) {
          const splitSetting = data.find((s) => s.key === 'salary_split');
          const salarySetting = data.find((s) => s.key === 'base_salary');

          if (splitSetting) setSplit(splitSetting.value);
          if (salarySetting) setSalary(salarySetting.value.amount);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await supabase.from('settings').upsert([
        { key: 'salary_split', value: split },
        { key: 'base_salary', value: { amount: salary, currency: 'EUR' } },
      ]);
      toast.success('Nastavenia boli uložené');
    } catch (error) {
      toast.error('Chyba pri ukladaní');
    } finally {
      setSaving(false);
    }
  }

  const results = calculateSalaryResults(salary, split);
  const totalPercent = Object.values(split).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Kalkulačka mzdy</h1>
        <p className="text-slate-500">
          Rozdelenie príjmu podľa nastavených percent.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Mesačný príjem (€)
            </label>
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <input
                type="number"
                className="w-full text-3xl font-bold bg-transparent border-b-2 border-slate-100 dark:border-slate-800 focus:border-blue-600 outline-none pb-2 transition-colors"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
              />
            )}
          </div>

          <div className="space-y-4">
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">
              Rozdelenie (%)
            </label>
            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                {Object.entries(split).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm capitalize">
                      <span>{key.replace('_', ' ')}</span>
                      <span className="font-bold">{value}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      value={value}
                      onChange={(e) =>
                        setSplit({ ...split, [key]: Number(e.target.value) })
                      }
                    />
                  </div>
                ))}

                <div
                  className={`text-xs font-bold text-right ${totalPercent === 100 ? 'text-emerald-500' : 'text-rose-500'}`}
                >
                  Spolu: {totalPercent}%{' '}
                  {totalPercent !== 100 && '(musí byť 100%)'}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={loading || saving || totalPercent !== 100}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            Uložiť nastavenia
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </>
          ) : (
            <>
              {results.map((item, index) => {
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border flex justify-between items-center group hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-${item.color}-50 dark:bg-${item.color}-950 flex items-center justify-center text-${item.color}-600 dark:text-${item.color}-400 font-bold`}
                      >
                        {item.percent}%
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">{item.name}</p>
                        <h4 className="text-xl font-bold">
                          {formatCurrency(item.amount)}
                        </h4>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                      <RefreshCw size={16} className="text-slate-400" />
                    </div>
                  </motion.div>
                );
              })}

              <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
                <div className="flex items-center gap-3 mb-4">
                  <Calculator size={24} className="opacity-70" />
                  <h3 className="font-bold">Rýchly tip</h3>
                </div>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Pravidlo 50/30/20 je dobrý štart, ale tvoje nastavenie (
                  {split.fixed_costs}/{split.investments + split.savings}/
                  {split.fun}) je ešte ambicióznejšie pre budovanie bohatstva!
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
