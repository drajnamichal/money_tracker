'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Plus, Receipt, PieChart as PieChartIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function ExpensesPage() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    category: '',
    amount: '',
    record_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('expense_records')
        .select('*')
        .order('record_date', { ascending: false });
      if (data) setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('expense_records').insert([{
        ...newExpense,
        amount: Number(newExpense.amount),
        amount_eur: Number(newExpense.amount), // For now assume EUR
        currency: 'EUR'
      }]);

      if (error) throw error;
      
      setNewExpense({
        description: '',
        category: '',
        amount: '',
        record_date: new Date().toISOString().split('T')[0]
      });
      setIsAdding(false);
      fetchExpenses();
    } catch (error) {
      alert('Chyba pri pridávaní výdavku');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj chcete vymazať tento výdavok?')) return;
    try {
      await supabase.from('expense_records').delete().eq('id', id);
      fetchExpenses();
    } catch (error) {
      alert('Chyba pri mazaní');
    }
  }

  const categoryData = expenses.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += Number(curr.amount_eur);
    } else {
      acc.push({ name: curr.category || 'Ostatné', value: Number(curr.amount_eur) });
    }
    return acc;
  }, []);

  if (loading && expenses.length === 0) {
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
          <h1 className="text-3xl font-bold">Výdavky</h1>
          <p className="text-slate-500">Sleduj a spravuj svoje mesačné výdavky.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          <span>Pridať výdavok</span>
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 border shadow-sm overflow-hidden"
          >
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Popis</label>
                <input 
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                  value={newExpense.description}
                  onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  placeholder="napr. Nákup potravín"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategória</label>
                <select 
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                  value={newExpense.category}
                  onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                >
                  <option value="">Vybrať...</option>
                  <option value="Bývanie">Bývanie</option>
                  <option value="Strava">Strava</option>
                  <option value="Doprava">Doprava</option>
                  <option value="Voľný čas">Voľný čas</option>
                  <option value="Zdravie">Zdravie</option>
                  <option value="Ostatné">Ostatné</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Čiastka (€)</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-rose-600 text-white rounded-lg py-2 font-medium hover:bg-rose-700 transition-colors">
                  Uložiť
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Zrušiť
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b flex items-center gap-2">
            <Receipt size={20} className="text-rose-500" />
            <h3 className="font-semibold">Posledné výdavky</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Dátum</th>
                  <th className="px-6 py-4 font-semibold">Popis</th>
                  <th className="px-6 py-4 font-semibold">Kategória</th>
                  <th className="px-6 py-4 font-semibold text-right">Suma</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Žiadne výdavky nenájdené. Začni pridaním prvého.</td>
                  </tr>
                ) : (
                  expenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(expense.record_date).toLocaleDateString('sk-SK')}
                      </td>
                      <td className="px-6 py-4 font-medium">{expense.description}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-rose-500">
                        -{formatCurrency(expense.amount_eur)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border h-fit">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <PieChartIcon size={20} className="text-rose-500" />
            Rozdelenie výdavkov
          </h3>
          <div className="h-[250px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                Pridaj výdavky pre zobrazenie grafu
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

