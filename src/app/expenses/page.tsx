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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/skeleton';
import { useExpenseData } from '@/hooks/use-financial-data';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
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
                <label className="text-sm font-medium">Popis</label>
                <input
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
                <label className="text-sm font-medium">Kategória</label>
                <select
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 outline-none ${errors.category ? 'border-rose-500' : ''}`}
                  {...register('category')}
                >
                  <option value="">Vybrať...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-xs text-rose-500">
                    {errors.category.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Čiastka (€)</label>
                <input
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
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b flex items-center gap-2">
            <Receipt size={20} className="text-rose-500" />
            <h3 className="font-semibold">Posledné výdavky</h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
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
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        Žiadne výdavky nenájdené. Začni pridaním prvého.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${expense.isOptimistic ? 'opacity-50' : ''}`}
                      >
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(expense.record_date).toLocaleDateString(
                            'sk-SK'
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {expense.description}
                          {expense.isOptimistic && (
                            <span className="ml-2 text-[10px] text-slate-400 italic">
                              (Ukladám...)
                            </span>
                          )}
                        </td>
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
                            disabled={expense.isOptimistic}
                            onClick={() => handleDelete(expense.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
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
