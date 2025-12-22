'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Plus, TrendingUp, Calendar, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function IncomePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Adding state
  const [isAdding, setIsAdding] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().toISOString().substring(0, 7) + "-01");
  const [newRecords, setNewRecords] = useState<Record<string, { amount: string, currency: string }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: categoriesData } = await supabase
        .from('income_categories')
        .select('*')
        .order('name');

      const { data: incomeData } = await supabase
        .from('income_records')
        .select('*, income_categories(name)')
        .order('record_month', { ascending: false });

      if (categoriesData && incomeData) {
        setCategories(categoriesData);
        setRecords(incomeData);

        // Prepare chart data (last 12 months)
        const monthlyData: any = {};
        incomeData.forEach(r => {
          const month = r.record_month.substring(0, 7);
          if (!monthlyData[month]) monthlyData[month] = { month, total: 0 };
          monthlyData[month].total += Number(r.amount_eur);
        });

        const formattedChartData = Object.values(monthlyData)
          .sort((a: any, b: any) => a.month.localeCompare(b.month))
          .slice(-12)
          .map((item: any) => ({
            name: new Date(item.month).toLocaleDateString('sk-SK', { month: 'short' }),
            total: item.total
          }));
        
        setChartData(formattedChartData);

        // Initialize new records state
        const initialRecords: Record<string, { amount: string, currency: string }> = {};
        categoriesData.forEach(cat => {
          initialRecords[cat.id] = { amount: '', currency: 'CZK' };
        });
        setNewRecords(initialRecords);
      }
    } catch (error) {
      console.error('Error fetching income:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddIncome(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const inserts = Object.entries(newRecords)
        .filter(([_, data]) => data.amount !== '' && Number(data.amount) !== 0)
        .map(([categoryId, data]) => {
          const amount = Number(data.amount);
          // Simple conversion for now, ideally fetch current rates
          const amountEur = data.currency === 'CZK' ? amount / 25 : amount; 
          
          return {
            category_id: categoryId,
            record_month: newMonth,
            amount: amount,
            currency: data.currency,
            amount_eur: amountEur
          };
        });

      if (inserts.length === 0) {
        alert('Prosím zadajte aspoň jeden príjem');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('income_records')
        .insert(inserts);

      if (error) throw error;

      setIsAdding(false);
      await fetchData();
      alert('Príjmy boli úspešne uložené');
    } catch (error) {
      console.error('Error saving income:', error);
      alert('Chyba pri ukladaní príjmov');
    } finally {
      setSaving(false);
    }
  }

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const latestMonth = records.length > 0 ? records[0].record_month : null;
  const currentMonthIncome = records
    .filter(r => r.record_month === latestMonth)
    .reduce((sum, r) => sum + Number(r.amount_eur), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Príjmy</h1>
          <p className="text-slate-500">Sleduj svoje mesačné prítoky financií.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            <Plus size={20} />
            <span>Pridať príjem</span>
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
              <h3 className="text-lg font-bold">Zadať príjmy za mesiac</h3>
              <div className="flex items-center gap-4">
                <input 
                  type="month"
                  className="bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  value={newMonth.substring(0, 7)}
                  onChange={e => setNewMonth(e.target.value + "-01")}
                />
                <button 
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddIncome} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(category => (
                  <div key={category.id} className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">{category.name}</label>
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        step="0.01"
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newRecords[category.id]?.amount || ''}
                        onChange={e => setNewRecords({
                          ...newRecords, 
                          [category.id]: { ...newRecords[category.id], amount: e.target.value }
                        })}
                        placeholder="0.00"
                      />
                      <select 
                        className="bg-slate-50 dark:bg-slate-800 border rounded-xl px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newRecords[category.id]?.currency || 'CZK'}
                        onChange={e => setNewRecords({
                          ...newRecords, 
                          [category.id]: { ...newRecords[category.id], currency: e.target.value }
                        })}
                      >
                        <option value="CZK">CZK</option>
                        <option value="EUR">EUR</option>
                      </select>
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
                  className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Uložiť príjmy
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border col-span-1 md:col-span-2">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" />
            Trend príjmov (12 mesiacov)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Príjem']}
                />
                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-200 dark:shadow-none flex flex-col justify-center">
          <Calendar size={32} className="mb-4 opacity-50" />
          <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Tento mesiac</p>
          <h2 className="text-4xl font-bold mb-1">{formatCurrency(currentMonthIncome)}</h2>
          <p className="text-emerald-100 text-xs mt-2">
            Zatiahnuté z {new Set(records.filter(r => r.record_month === latestMonth).map(r => r.category_id)).size} zdrojov
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold">História príjmov</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Mesiac</th>
                <th className="px-6 py-4 font-semibold">Kategória</th>
                <th className="px-6 py-4 font-semibold">Čiastka (pôvodná)</th>
                <th className="px-6 py-4 font-semibold text-right">Čiastka (EUR)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.slice(0, 20).map(record => (
                <motion.tr 
                  key={record.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium">
                    {new Date(record.record_month).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {record.income_categories?.name}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {record.amount} {record.currency}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                    {formatCurrency(record.amount_eur)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
