'use client';

import { useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  Loader2,
  Plus,
  Receipt,
  PieChart as PieChartIcon,
  Trash2,
  Settings2,
  X,
  Scan,
  Edit2,
  Check,
  Calendar,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/skeleton';
import { useExpenseData } from '@/hooks/use-financial-data';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

const expenseSchema = z.object({
  description: z.string().min(1, 'Popis je povinný'),
  category: z.string().min(1, 'Kategória je povinná'),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Suma musí byť kladné číslo',
  }),
  record_date: z.string().min(1, 'Dátum je povinný'),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface CategoryTotal {
  name: string;
  value: number;
  [key: string]: string | number;
}

function MonthlyAISummary({ 
  month, 
  expenses, 
  total 
}: { 
  month: string; 
  expenses: any[]; 
  total: number 
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/expense-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, expenses, total }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Server error');
      setSummary(data.summary);
    } catch (error: any) {
      toast.error(error.message || 'Nepodarilo sa vygenerovať AI zhrnutie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
      {!summary ? (
        <button
          onClick={generateSummary}
          disabled={loading}
          className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {loading ? 'Analyzujem...' : 'AI Analýza mesiaca'}
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
        >
          <Sparkles size={14} className="text-indigo-500 shrink-0 mt-0.5" />
          <p>{summary}</p>
        </motion.div>
      )}
    </div>
  );
}

export default function ExpensesPage() {
  const {
    records: expenses,
    categories,
    loading,
    refresh,
    refreshCategories,
  } = useExpenseData();
  const [isAdding, setIsAdding] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      category: '',
      amount: '',
      record_date: new Date().toISOString().split('T')[0],
    },
  });

  const groupedCategories = useMemo(() => {
    const main = categories.filter((c) => !c.parent_id);
    return main.map((m) => ({
      ...m,
      subcategories: categories.filter((c) => c.parent_id === m.id),
    }));
  }, [categories]);

  const onAddExpense = async (values: ExpenseFormValues) => {
    setIsAdding(false);
    reset();

    try {
      const { error } = await supabase.from('expense_records').insert([
        {
          description: values.description,
          category: values.category,
          amount: Number(values.amount),
          amount_eur: Number(values.amount),
          record_date: values.record_date,
          currency: 'EUR',
        },
      ]);

      if (error) throw error;

      await refresh();
      toast.success('Výdavok úspešne pridaný');
    } catch (err: unknown) {
      console.error('Error adding expense:', err);
      toast.error('Chyba pri pridávaní výdavku');
    }
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setIsAdding(true); // Open the form if it's closed

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const base64Image = await base64Promise;

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      if (data.description) setValue('description', data.description);
      if (data.amount) setValue('amount', data.amount.toString());
      if (data.category) {
        const exists = categories.some((c) => c.name === data.category);
        if (exists) {
          setValue('category', data.category);
        } else {
          setValue('category', 'Ostatné');
        }
      }

      toast.success('Bloček úspešne naskenovaný!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Neznáma chyba';
      console.error('OCR Error:', err);
      toast.error('Chyba pri skenovaní bločku: ' + errorMessage);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const { error } = await supabase
        .from('expense_categories')
        .insert([{ name: newCategoryName.trim() }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('Táto kategória už existuje');
        } else {
          throw error;
        }
        return;
      }

      setNewCategoryName('');
      await refreshCategories();
      toast.success('Kategória pridaná');
    } catch (err: unknown) {
      console.error('Error adding category:', err);
      toast.error('Chyba pri pridávaní kategórie');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Naozaj chcete vymazať kategóriu "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await refreshCategories();
      toast.success('Kategória vymazaná');
    } catch (err: unknown) {
      console.error('Error deleting category:', err);
      toast.error('Chyba pri mazaní kategórie');
    }
  };

  async function handleDelete(id: string) {
    if (!confirm('Naozaj chcete vymazať tento výdavok?')) return;

    try {
      const { error } = await supabase
        .from('expense_records')
        .delete()
        .eq('id', id);
      if (error) throw error;

      await refresh();
      toast.success('Výdavok bol vymazaný');
    } catch (err: unknown) {
      console.error('Error deleting expense:', err);
      toast.error('Chyba pri mazaní');
    }
  }

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, any[]> = {};
    expenses.forEach((expense) => {
      const date = new Date(expense.record_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(expense);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const records = groups[key].sort((a, b) =>
          b.record_date.localeCompare(a.record_date)
        );
        const total = records.reduce((sum, r) => sum + Number(r.amount_eur), 0);

        const catData = records.reduce((acc: CategoryTotal[], curr) => {
          const categoryName = curr.category || 'Ostatné';
          const existing = acc.find((item) => item.name === categoryName);
          if (existing) {
            existing.value += Number(curr.amount_eur);
          } else {
            acc.push({
              name: categoryName,
              value: Number(curr.amount_eur),
            });
          }
          return acc;
        }, []);

        return {
          month: key,
          records,
          total,
          categoryData: catData.sort((a, b) => b.value - a.value),
        };
      });
  }, [expenses]);

  const handleEdit = (expense: any) => {
    setEditingId(expense.id);
    setEditValues({
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      record_date: expense.record_date,
    });
  };

  const handleUpdate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expense_records')
        .update({
          description: editValues.description,
          category: editValues.category,
          amount: Number(editValues.amount),
          amount_eur: Number(editValues.amount),
          record_date: editValues.record_date,
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      await refresh();
      toast.success('Výdavok aktualizovaný');
    } catch (err) {
      console.error('Error updating expense:', err);
      toast.error('Chyba pri aktualizácii');
    }
  };

  const categoryData = useMemo(() => {
    return expenses.reduce((acc: CategoryTotal[], curr) => {
      const existing = acc.find((item) => item.name === curr.category);
      if (existing) {
        existing.value += Number(curr.amount_eur);
      } else {
        acc.push({
          name: curr.category || 'Ostatné',
          value: Number(curr.amount_eur),
        });
      }
      return acc;
    }, []);
  }, [expenses]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Výdavky</h1>
          <p className="text-slate-500">
            Sleduj a spravuj svoje mesačné výdavky.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleScanReceipt}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors border border-blue-100 dark:border-blue-900/30 flex items-center gap-2 px-4"
            title="Skenovať bloček"
          >
            {isScanning ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Scan size={20} />
            )}
            <span className="text-sm font-medium">Skenovať</span>
          </button>

          <button
            onClick={() => setIsManagingCategories(!isManagingCategories)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Spravovať kategórie"
          >
            <Settings2 size={24} />
          </button>
          {!loading && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              <span>Pridať výdavok</span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isManagingCategories && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 border shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Spravovať kategórie</h3>
              <button
                onClick={() => setIsManagingCategories(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nová kategória..."
                className="flex-1 bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                onClick={handleAddCategory}
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Pridať
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full group"
                >
                  <span className="text-sm">{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 border shadow-sm overflow-hidden"
          >
            <form
              onSubmit={handleSubmit(onAddExpense)}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            >
              <div className="space-y-2">
                <label htmlFor="expense-description" className="text-sm font-medium">Popis</label>
                <input
                  id="expense-description"
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 outline-none ${errors.description ? 'border-rose-500' : ''}`}
                  {...register('description')}
                  placeholder="napr. Nákup potravín"
                />
                {errors.description && (
                  <p className="text-xs text-rose-500">
                    {errors.description.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="expense-category" className="text-sm font-medium">Kategória</label>
                <select
                  id="expense-category"
                  data-testid="expense-category-select"
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 outline-none ${errors.category ? 'border-rose-500' : ''}`}
                  {...register('category')}
                >
                  <option value="">Vybrať...</option>
                  {groupedCategories.length === 0 && (
                    <option value="Ostatné: nezaradené">Ostatné: nezaradené</option>
                  )}
                  {groupedCategories.map((group) => (
                    <optgroup key={group.id} label={group.name}>
                      {group.subcategories.map((sub) => (
                        <option
                          key={sub.id}
                          value={`${group.name}: ${sub.name}`}
                        >
                          {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-xs text-rose-500">
                    {errors.category.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="expense-amount" className="text-sm font-medium">Čiastka (€)</label>
                <input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 outline-none ${errors.amount ? 'border-rose-500' : ''}`}
                  {...register('amount')}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-xs text-rose-500">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  data-testid="expense-submit-button"
                  className="flex-1 bg-rose-600 text-white rounded-lg py-2 font-medium hover:bg-rose-700 transition-colors"
                >
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
        <div className="md:col-span-2 space-y-6">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : groupedExpenses.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-12 text-center text-slate-400">
              Žiadne výdavky nenájdené. Začni pridaním prvého.
            </div>
          ) : (
            groupedExpenses.map((group) => (
              <div
                key={group.month}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden"
              >
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-rose-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white capitalize">
                      {new Date(group.month).toLocaleDateString('sk-SK', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </h3>
                  </div>
                  <div className="text-sm font-black text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/50">
                    Spolu: {formatCurrency(group.total)}
                  </div>
                </div>

                {/* Monthly Chart */}
                <div className="px-6 py-4 bg-slate-50/30 dark:bg-slate-800/10 border-b">
                  <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={group.categoryData}
                        layout="vertical"
                        margin={{ left: -20, right: 20, top: 0, bottom: 0 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          hide
                          width={100}
                        />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Bar
                          dataKey="value"
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                        >
                          {group.categoryData.map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {group.categoryData.slice(0, 5).map((cat, idx) => (
                      <div key={cat.name} className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                          {cat.name}: {formatCurrency(cat.value)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <MonthlyAISummary
                    month={group.month}
                    expenses={group.records}
                    total={group.total}
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b bg-slate-50/30 dark:bg-slate-800/20">
                      <tr>
                        <th className="px-6 py-3">Dátum</th>
                        <th className="px-6 py-3">Popis</th>
                        <th className="px-6 py-3">Kategória</th>
                        <th className="px-6 py-3 text-right">Suma</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {group.records.map((expense) => (
                        <tr
                          key={expense.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group ${expense.isOptimistic ? 'opacity-50' : ''}`}
                        >
                          {editingId === expense.id ? (
                            <>
                              <td className="px-4 py-2">
                                <input
                                  type="date"
                                  value={editValues.record_date}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      record_date: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={editValues.description}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      description: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  value={editValues.category}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      category: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500"
                                >
                                  {groupedCategories.map((group) => (
                                    <optgroup key={group.id} label={group.name}>
                                      {group.subcategories.map((sub) => (
                                        <option
                                          key={sub.id}
                                          value={`${group.name}: ${sub.name}`}
                                        >
                                          {sub.name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editValues.amount}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      amount: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 text-right outline-none focus:ring-1 focus:ring-rose-500 font-bold"
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => handleUpdate(expense.id)}
                                    className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md hover:bg-emerald-200 transition-colors"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4 text-slate-500 font-medium">
                                {new Date(
                                  expense.record_date
                                ).toLocaleDateString('sk-SK', {
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                {expense.description}
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                  {expense.category}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-rose-600">
                                -{formatCurrency(expense.amount_eur)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    disabled={expense.isOptimistic}
                                    onClick={() => handleEdit(expense)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-all"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    disabled={expense.isOptimistic}
                                    onClick={() => handleDelete(expense.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border h-fit">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <PieChartIcon size={20} className="text-rose-500" />
            Rozdelenie výdavkov
          </h3>
          <div className="h-[250px]">
            {loading ? (
              <Skeleton className="w-full h-full rounded-full" />
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: string | number | undefined) =>
                      formatCurrency(Number(value) || 0)
                    }
                  />
                  <Legend verticalAlign="bottom" height={36} />
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
