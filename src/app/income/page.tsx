'use client';

import { useState, Fragment, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { mergeIncomeItems } from '@/lib/calculations';
import {
  Loader2,
  Plus,
  TrendingUp,
  Calendar,
  Save,
  X,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/skeleton';
import { useIncomeData } from '@/hooks/use-financial-data';
import { IncomeRecord } from '@/types/financial';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const incomeSchema = z.object({
  recordMonth: z.string().min(1, 'Mesiac je povinný'),
  items: z
    .array(
      z.object({
        categoryName: z.string().min(1, 'Názov je povinný'),
        amount: z
          .string()
          .refine(
            (val) => val !== '' && !isNaN(Number(val)) && Number(val) >= 0,
            {
              message: 'Suma musí byť kladné číslo',
            }
          ),
        currency: z.string().min(1),
      })
    )
    .min(1, 'Pridajte aspoň jeden príjem'),
});

type IncomeFormValues = z.infer<typeof incomeSchema>;

export default function IncomePage() {
  const { records, categories, exchangeRate, loading, refresh } =
    useIncomeData();
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      recordMonth: new Date().toISOString().substring(0, 7),
      items: [{ categoryName: '', amount: '', currency: 'EUR' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const chartData = useMemo(() => {
    const monthlyData: Record<string, { month: string; total: number }> = {};
    records.forEach((r) => {
      const month = r.record_month.substring(0, 7);
      if (!monthlyData[month]) monthlyData[month] = { month, total: 0 };
      monthlyData[month].total += Number(r.amount_eur);
    });

    return Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)
      .map((item) => ({
        name: new Date(item.month).toLocaleDateString('sk-SK', {
          month: 'short',
        }),
        total: item.total,
      }));
  }, [records]);

  const onSave = async (data: IncomeFormValues) => {
    setSaving(true);
    try {
      const inserts = [];
      const mergedItems = mergeIncomeItems(data.items);
      const localCategoriesMap = new Map<string, string>();

      // Pre-fill local map with existing categories
      categories.forEach((cat) => {
        localCategoriesMap.set(cat.name.toLowerCase(), cat.id);
      });

      for (const item of mergedItems) {
        let categoryId;
        const normalizedName = item.categoryName.trim().toLowerCase();

        if (localCategoriesMap.has(normalizedName)) {
          categoryId = localCategoriesMap.get(normalizedName);
        } else {
          // Create new category if it doesn't exist
          const { data: newCat, error: catError } = await supabase
            .from('income_categories')
            .insert({ name: item.categoryName.trim() })
            .select()
            .single();

          if (catError) throw catError;
          categoryId = newCat.id;
          localCategoriesMap.set(normalizedName, categoryId);
        }

        const amount = Number(item.amount);
        const amountEur =
          item.currency === 'CZK' ? amount / exchangeRate : amount;

        inserts.push({
          category_id: categoryId,
          record_month: data.recordMonth + '-01',
          amount: amount,
          currency: item.currency,
          amount_eur: amountEur,
        });
      }

      // Use upsert to handle cases where user might be updating a month
      const { error } = await supabase.from('income_records').upsert(inserts, {
        onConflict: 'category_id,record_month',
      });

      if (error) throw error;

      setIsAdding(false);
      reset({
        recordMonth: new Date().toISOString().substring(0, 7),
        items: [{ categoryName: '', amount: '', currency: 'EUR' }],
      });
      await refresh();
      toast.success('Príjmy boli úspešne uložené');
    } catch (error) {
      console.error('Error saving income:', error);
      toast.error('Chyba pri ukladaní príjmov');
    } finally {
      setSaving(false);
    }
  };

  const latestMonth = records.length > 0 ? records[0].record_month : null;
  const currentMonthIncome = records
    .filter((r) => r.record_month === latestMonth)
    .reduce((sum, r) => sum + Number(r.amount_eur), 0);

  const groupedRecords = useMemo(() => {
    return records.reduce((acc: Record<string, IncomeRecord[]>, record) => {
      const month = record.record_month;
      if (!acc[month]) acc[month] = [];
      acc[month].push(record);
      return acc;
    }, {});
  }, [records]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Príjmy</h1>
          <p className="text-slate-500">
            Sleduj svoje mesačné prítoky financií.
          </p>
          {!loading && exchangeRate && (
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">
              Aktuálny kurz: 1 EUR = {exchangeRate.toFixed(2)} CZK
            </p>
          )}
        </div>
        {!isAdding && !loading && (
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
                <div className="flex flex-col">
                  <input
                    type="month"
                    className={`bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${errors.recordMonth ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                    {...register('recordMonth')}
                  />
                  {errors.recordMonth && (
                    <span className="text-[10px] text-rose-500 font-medium mt-0.5">
                      {errors.recordMonth.message}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="group relative flex flex-col sm:flex-row gap-3 items-start bg-slate-50/50 dark:bg-slate-800/50 sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:rounded-none border sm:border-0 border-slate-100 dark:border-slate-800">
                    <div className="w-full sm:flex-[3] space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block sm:hidden">
                        Zdroj príjmu
                      </label>
                      <input
                        {...register(`items.${index}.categoryName`)}
                        placeholder="Odkiaľ je príjem (napr. Výplata)"
                        className={`w-full bg-white sm:bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2.5 sm:py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${errors.items?.[index]?.categoryName ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                      />
                      {errors.items?.[index]?.categoryName && (
                        <p className="text-[10px] text-rose-500 font-medium">
                          {errors.items[index]?.categoryName?.message}
                        </p>
                      )}
                    </div>
                    <div className="w-full sm:flex-[2] space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block sm:hidden">
                        Suma a mena
                      </label>
                      <div className="flex border rounded-xl bg-white sm:bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-emerald-500 overflow-hidden">
                        <input
                          type="number"
                          step="0.01"
                          className={`flex-1 bg-transparent px-4 py-2.5 sm:py-2 text-sm outline-none ${errors.items?.[index]?.amount ? 'border-rose-500' : ''}`}
                          {...register(`items.${index}.amount`)}
                          placeholder="0.00"
                        />
                        <select
                          className="bg-slate-100 dark:bg-slate-700 px-3 py-2 text-xs outline-none border-l dark:border-slate-600 font-bold"
                          {...register(`items.${index}.currency`)}
                        >
                          <option value="EUR">EUR</option>
                          <option value="CZK">CZK</option>
                        </select>
                      </div>
                      {errors.items?.[index]?.amount && (
                        <p className="text-[10px] text-rose-500 font-medium">
                          {errors.items[index]?.amount?.message}
                        </p>
                      )}
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="absolute top-2 right-2 sm:static text-slate-400 hover:text-rose-500 p-2 sm:mt-0.5 shrink-0 transition-colors"
                        title="Odstrániť"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    append({ categoryName: '', amount: '', currency: 'EUR' })
                  }
                  className="flex items-center gap-2 text-emerald-600 font-bold py-2 hover:opacity-80 transition-opacity"
                >
                  <Plus size={20} />
                  <span>Pridať ďalší príjem</span>
                </button>
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
                  {saving ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Save size={20} />
                  )}
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
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number | undefined) => [
                      formatCurrency(value || 0),
                      'Príjem',
                    ]}
                  />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-full rounded-2xl" />
        ) : (
          <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-200 dark:shadow-none flex flex-col justify-center">
            <Calendar size={32} className="mb-4 opacity-50" />
            <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">
              Tento mesiac
            </p>
            <h2 className="text-4xl font-bold mb-1">
              {formatCurrency(currentMonthIncome)}
            </h2>
            <p className="text-emerald-100 text-xs mt-2">
              Zatiahnuté z{' '}
              {
                new Set(
                  records
                    .filter((r) => r.record_month === latestMonth)
                    .map((r) => r.category_id)
                ).size
              }{' '}
              zdrojov
            </p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold">História príjmov</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Kategória</th>
                  <th className="px-6 py-4 font-semibold">Čiastka (pôvodná)</th>
                  <th className="px-6 py-4 font-semibold text-right">
                    Čiastka (EUR)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(groupedRecords).map(
                  ([month, monthRecords]: [string, IncomeRecord[]]) => (
                    <Fragment key={month}>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                        <td
                          colSpan={3}
                          className="px-6 py-3 text-left font-bold text-blue-600 uppercase text-xs tracking-wider border-y border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex justify-between items-center">
                            <span>
                              {new Date(month).toLocaleDateString('sk-SK', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-slate-500 font-semibold">
                              Celkom:{' '}
                              {formatCurrency(
                                monthRecords.reduce(
                                  (sum, r) =>
                                    sum + Number(r.amount_eur),
                                  0
                                )
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {monthRecords.map((record) => (
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {record.income_categories?.name}
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {record.amount} {record.currency}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                            {formatCurrency(record.amount_eur)}
                          </td>
                        </motion.tr>
                      ))}
                    </Fragment>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
