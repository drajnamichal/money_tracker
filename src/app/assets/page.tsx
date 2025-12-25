'use client';

import { useState, Fragment, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { mergeAssetItems } from '@/lib/calculations';
import { Loader2, Plus, ArrowRight, Save, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/skeleton';
import { useWealthData } from '@/hooks/use-financial-data';

const assetSchema = z.object({
  recordDate: z.string().min(1, 'Dátum je povinný'),
  items: z
    .array(
      z.object({
        accountName: z.string().min(1, 'Názov je povinný'),
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
    .min(1, 'Pridajte aspoň jeden záznam'),
});

type AssetFormValues = z.infer<typeof assetSchema>;

export default function AssetsPage() {
  const {
    records: wealthData,
    accounts,
    exchangeRate,
    loading,
    refresh,
  } = useWealthData();
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      recordDate: new Date().toISOString().split('T')[0],
      items: [{ accountName: '', amount: '', currency: 'EUR' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const { dates, recordMap } = useMemo(() => {
    const uniqueDates = Array.from(
      new Set(wealthData.map((r) => r.record_date))
    )
      .sort()
      .reverse();

    const map: any = {};
    wealthData.forEach((r) => {
      if (!map[r.record_date]) map[r.record_date] = {};
      map[r.record_date][r.account_id] = r.amount_eur;
    });

    return { dates: uniqueDates, recordMap: map };
  }, [wealthData]);

  const onSave = async (data: AssetFormValues) => {
    setSaving(true);
    try {
      const inserts = [];
      const mergedItems = mergeAssetItems(data.items);
      const localAccountsMap = new Map<string, string>();

      // Pre-fill local map with existing accounts
      accounts.forEach((acc) => {
        localAccountsMap.set(acc.name.toLowerCase(), acc.id);
      });

      for (const item of mergedItems) {
        let accountId;
        const normalizedName = item.accountName.trim().toLowerCase();

        if (localAccountsMap.has(normalizedName)) {
          accountId = localAccountsMap.get(normalizedName);
        } else {
          // Create new account if it doesn't exist
          const { data: newAccount, error: accError } = await supabase
            .from('asset_accounts')
            .insert({
              name: item.accountName.trim(),
              type: 'other',
              currency: item.currency as 'EUR' | 'CZK',
            })
            .select()
            .single();

          if (accError) throw accError;
          accountId = newAccount.id;
          localAccountsMap.set(normalizedName, accountId);
        }

        const amount = Number(item.amount);
        const amountEur =
          item.currency === 'CZK' ? amount / exchangeRate : amount;

        inserts.push({
          account_id: accountId,
          record_date: data.recordDate,
          amount: amount,
          amount_eur: amountEur,
        });
      }

      // Use upsert to prevent unique constraint errors if record already exists for this date
      const { error } = await supabase.from('wealth_records').upsert(inserts, {
        onConflict: 'account_id,record_date',
      });

      if (error) throw error;

      setIsAdding(false);
      reset({
        recordDate: new Date().toISOString().split('T')[0],
        items: [{ accountName: '', amount: '', currency: 'EUR' }],
      });
      await refresh();
      toast.success('Záznamy boli úspešne uložené');
    } catch (error) {
      console.error('Error saving records:', error);
      toast.error('Chyba pri ukladaní záznamov');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Majetok</h1>
          <p className="text-slate-500">
            Detailný prehľad tvojich finančných aktív.
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
                <div className="flex flex-col">
                  <input
                    type="date"
                    className={`bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.recordDate ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                    {...register('recordDate')}
                  />
                  {errors.recordDate && (
                    <span className="text-[10px] text-rose-500 font-medium mt-0.5">
                      {errors.recordDate.message}
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
                  <div key={field.id} className="flex gap-3 items-start">
                    <div className="flex-[3] space-y-1">
                      <input
                        {...register(`items.${index}.accountName`)}
                        placeholder="Názov účtu / investície (napr. Tatra Banka)"
                        className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.items?.[index]?.accountName ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                      />
                      {errors.items?.[index]?.accountName && (
                        <p className="text-[10px] text-rose-500 font-medium">
                          {errors.items[index]?.accountName?.message}
                        </p>
                      )}
                    </div>
                    <div className="flex-[2] space-y-1">
                      <div className="flex border rounded-xl bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
                        <input
                          type="number"
                          step="0.01"
                          className={`flex-1 bg-transparent px-4 py-2 text-sm outline-none ${errors.items?.[index]?.amount ? 'border-rose-500' : ''}`}
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
                        className="text-slate-400 hover:text-rose-500 p-2 mt-0.5 shrink-0"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    append({ accountName: '', amount: '', currency: 'EUR' })
                  }
                  className="flex items-center gap-2 text-blue-600 font-bold py-2 hover:opacity-80 transition-opacity"
                >
                  <Plus size={20} />
                  <span>Pridať ďalší účet</span>
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
                  className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Save size={20} />
                  )}
                  Uložiť záznamy
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-900 dark:text-white sticky left-0 bg-slate-50 dark:bg-slate-800">
                    Účet / Inštitúcia
                  </th>
                  {dates.slice(0, 5).map((date) => (
                    <th key={date} className="px-6 py-4 font-semibold">
                      {new Date(date).toLocaleDateString('sk-SK', {
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric',
                      })}
                    </th>
                  ))}
                  <th className="px-6 py-4 font-semibold text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {accounts.map((account) => {
                  const latestAmount = recordMap[dates[0]]?.[account.id] || 0;
                  const prevAmount = recordMap[dates[1]]?.[account.id] || 0;
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
                          <span className="text-xs text-slate-400 capitalize">
                            {account.type}
                          </span>
                        </div>
                      </td>
                      {dates.slice(0, 5).map((date) => (
                        <td key={date} className="px-6 py-4">
                          {formatCurrency(recordMap[date]?.[account.id] || 0)}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-right">
                        <div
                          className={`flex items-center justify-end gap-1 font-medium ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                        >
                          {diff !== 0 &&
                            (diff > 0 ? (
                              <ArrowRight size={14} className="-rotate-45" />
                            ) : (
                              <ArrowRight size={14} className="rotate-45" />
                            ))}
                          {formatCurrency(Math.abs(diff))}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t">
                <tr>
                  <td className="px-6 py-4 sticky left-0 bg-slate-50 dark:bg-slate-800 border-r text-blue-600">
                    CELKOM
                  </td>
                  {dates.slice(0, 5).map((date) => {
                    const total = accounts.reduce(
                      (sum, acc) => sum + (recordMap[date]?.[acc.id] || 0),
                      0
                    );
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
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Rozloženie portfólia</h3>
          <div className="space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : (
              accounts
                .map((acc) => ({
                  ...acc,
                  amount: recordMap[dates[0]]?.[acc.id] || 0,
                }))
                .filter((acc) => acc.amount > 0)
                .sort((a, b) => b.amount - a.amount)
                .map((acc) => {
                  const total = accounts.reduce(
                    (sum, a) => sum + (recordMap[dates[0]]?.[a.id] || 0),
                    0
                  );
                  const percentage = (acc.amount / total) * 100;
                  return (
                    <div key={acc.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{acc.name}</span>
                        <span className="text-slate-500">
                          {percentage.toFixed(1)}%
                        </span>
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
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
