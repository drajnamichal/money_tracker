'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  Loader2,
  Plus,
  ArrowRight,
  Save,
  X,
  RotateCcw,
  Trash2,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/skeleton';
import { useWealthData } from '@/hooks/use-financial-data';
import { assertSuccess, showError } from '@/lib/error-handling';
import type { WealthRecord, AssetAccount } from '@/types/financial';

export interface AssetsClientProps {
  initialRecords: WealthRecord[];
  initialAccounts: AssetAccount[];
  initialExchangeRate: number;
}

const assetSchema = z.object({
  recordDate: z.string().min(1, 'Dátum je povinný'),
  amounts: z.record(
    z.string(),
    z
      .string()
      .refine(
        (val) => val === '' || (!isNaN(Number(val)) && Number(val) >= 0),
        {
          message: 'Suma musí byť kladné číslo',
        }
      )
  ),
});

type AssetFormValues = z.infer<typeof assetSchema>;

// Locally-tracked drafts for brand-new accounts the user wants to create
// at the same time as saving the wealth record. Each draft becomes a new
// row in `asset_accounts` plus a corresponding row in `wealth_records`.
// `type` values must match the DB CHECK constraint on `asset_accounts.type`.
type AccountType = 'bank' | 'investment' | 'cash' | 'other';

interface NewAccountDraft {
  tempId: string;
  name: string;
  type: AccountType;
  currency: 'EUR' | 'CZK';
  amount: string;
}

const ACCOUNT_TYPE_OPTIONS: ReadonlyArray<{ value: AccountType; label: string }> =
  [
    { value: 'bank', label: 'Banka' },
    { value: 'investment', label: 'Investícia' },
    { value: 'cash', label: 'Hotovosť' },
    { value: 'other', label: 'Iné' },
  ];

function createEmptyDraft(): NewAccountDraft {
  return {
    tempId:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    name: '',
    type: 'bank',
    currency: 'EUR',
    amount: '',
  };
}

export function AssetsClient({
  initialRecords,
  initialAccounts,
  initialExchangeRate,
}: AssetsClientProps) {
  const {
    records: wealthData,
    accounts,
    exchangeRate,
    loading,
    refresh,
  } = useWealthData({
    initialRecords,
    initialAccounts,
    initialExchangeRate,
  });
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newAccountDrafts, setNewAccountDrafts] = useState<NewAccountDraft[]>(
    []
  );
  // Per-account "include in total" toggles. Held only in component state so a
  // page refresh restores the default (all accounts counted) — exactly the
  // behaviour requested by the user.
  const [excludedAccountIds, setExcludedAccountIds] = useState<Set<string>>(
    () => new Set()
  );

  // Count how many wealth_records reference each account. Used to decide
  // whether we offer "delete permanently" (only safe when count = 0).
  const recordCountByAccount = useMemo(() => {
    const counts: Record<string, number> = {};
    wealthData.forEach((r) => {
      counts[r.account_id] = (counts[r.account_id] ?? 0) + 1;
    });
    return counts;
  }, [wealthData]);

  // Active = not archived. Form inputs only render for active accounts so
  // archived ones don't clutter the "new wealth record" UI, but the main
  // table still shows them (greyed out) for historical context.
  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.archived_at),
    [accounts]
  );

  const addNewAccountDraft = useCallback(() => {
    setNewAccountDrafts((current) => [...current, createEmptyDraft()]);
  }, []);

  const removeNewAccountDraft = useCallback((tempId: string) => {
    setNewAccountDrafts((current) =>
      current.filter((draft) => draft.tempId !== tempId)
    );
  }, []);

  const updateNewAccountDraft = useCallback(
    <K extends keyof NewAccountDraft>(
      tempId: string,
      field: K,
      value: NewAccountDraft[K]
    ) => {
      setNewAccountDrafts((current) =>
        current.map((draft) =>
          draft.tempId === tempId ? { ...draft, [field]: value } : draft
        )
      );
    },
    []
  );

  const toggleIncluded = useCallback((id: string) => {
    setExcludedAccountIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const resetIncluded = useCallback(() => {
    setExcludedAccountIds(new Set());
  }, []);

  const archiveAccount = useCallback(
    async (account: AssetAccount) => {
      const confirmed = window.confirm(
        `Archivovať účet „${account.name}"?\n\n` +
          'Historické záznamy zostanú zachované, len sa účet prestane ' +
          'zobrazovať vo formulári pre nový záznam majetku. ' +
          'Kedykoľvek ho môžeš obnoviť späť.'
      );
      if (!confirmed) return;

      try {
        const { error } = await supabase
          .from('asset_accounts')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', account.id);
        assertSuccess(error, `Archivácia účtu „${account.name}"`);
        await refresh();
        toast.success(`Účet „${account.name}" bol archivovaný`, {
          action: {
            label: 'Vrátiť späť',
            onClick: async () => {
              try {
                const { error: undoError } = await supabase
                  .from('asset_accounts')
                  .update({ archived_at: null })
                  .eq('id', account.id);
                assertSuccess(undoError, 'Obnovenie účtu');
                await refresh();
                toast.success(`Účet „${account.name}" bol obnovený`);
              } catch (err) {
                showError(err, 'Chyba pri obnovení účtu');
              }
            },
          },
        });
      } catch (err) {
        showError(err, 'Chyba pri archivácii účtu');
      }
    },
    [refresh]
  );

  const unarchiveAccount = useCallback(
    async (account: AssetAccount) => {
      try {
        const { error } = await supabase
          .from('asset_accounts')
          .update({ archived_at: null })
          .eq('id', account.id);
        assertSuccess(error, `Obnovenie účtu „${account.name}"`);
        await refresh();
        toast.success(`Účet „${account.name}" bol obnovený`);
      } catch (err) {
        showError(err, 'Chyba pri obnovení účtu');
      }
    },
    [refresh]
  );

  const purgeAccount = useCallback(
    async (account: AssetAccount) => {
      // Defence in depth — UI only offers this for accounts with no
      // historical records, but double-check before the destructive call.
      if ((recordCountByAccount[account.id] ?? 0) > 0) {
        toast.error(
          `Účet „${account.name}" má historické záznamy, najprv ich treba archivovať`
        );
        return;
      }
      const confirmed = window.confirm(
        `Zmazať účet „${account.name}" natrvalo?\n\n` +
          'Účet nemá žiadne historické záznamy, takže táto akcia je ' +
          'bezpečná — ale je nezvratná.'
      );
      if (!confirmed) return;

      try {
        const { error } = await supabase
          .from('asset_accounts')
          .delete()
          .eq('id', account.id);
        assertSuccess(error, `Zmazanie účtu „${account.name}"`);
        await refresh();
        toast.success(`Účet „${account.name}" bol zmazaný`);
      } catch (err) {
        showError(err, 'Chyba pri mazaní účtu');
      }
    },
    [recordCountByAccount, refresh]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      recordDate: new Date().toISOString().split('T')[0],
      amounts: {},
    },
  });

  const { dates, recordMap } = useMemo(() => {
    const uniqueDates = Array.from(
      new Set(wealthData.map((r) => r.record_date))
    )
      .sort()
      .reverse();

    const map: Record<string, Record<string, number>> = {};
    wealthData.forEach((r) => {
      if (!map[r.record_date]) map[r.record_date] = {};
      map[r.record_date][r.account_id] = r.amount_eur;
    });

    return { dates: uniqueDates, recordMap: map };
  }, [wealthData]);

  useEffect(() => {
    if (dates.length > 0 && activeAccounts.length > 0) {
      const latest = recordMap[dates[0]] ?? {};
      const initialAmounts: Record<string, string> = {};
      activeAccounts.forEach((acc) => {
        initialAmounts[acc.id] = latest[acc.id]?.toString() || '0';
      });
      reset({
        recordDate: new Date().toISOString().split('T')[0],
        amounts: initialAmounts,
      });
    }
  }, [dates, activeAccounts, recordMap, reset]);

  const onSave = async (data: AssetFormValues) => {
    setSaving(true);
    try {
      // 1) Validate brand-new account drafts (name required; can't clash with
      //    existing names or with each other; amount must parse).
      const trimmedDrafts = newAccountDrafts.map((draft) => ({
        ...draft,
        name: draft.name.trim(),
      }));

      const draftsWithContent = trimmedDrafts.filter(
        (draft) => draft.name !== '' || draft.amount !== ''
      );

      const missingName = draftsWithContent.find((draft) => draft.name === '');
      if (missingName) {
        toast.error('Nový účet musí mať názov');
        return;
      }

      const accountByLowerName = new Map<string, AssetAccount>();
      accounts.forEach((acc) => {
        accountByLowerName.set(acc.name.toLowerCase(), acc);
      });
      const seenDraftNamesLower = new Set<string>();
      for (const draft of draftsWithContent) {
        const lower = draft.name.toLowerCase();
        const existing = accountByLowerName.get(lower);
        if (existing) {
          if (existing.archived_at) {
            // Name clash with an archived account — offer to unarchive
            // instead of failing with the UNIQUE constraint.
            toast.error(
              `Účet „${existing.name}" existuje archivovaný`,
              {
                action: {
                  label: 'Obnoviť účet',
                  onClick: () => unarchiveAccount(existing),
                },
              }
            );
          } else {
            toast.error(`Účet „${existing.name}" už existuje`);
          }
          return;
        }
        if (seenDraftNamesLower.has(lower)) {
          toast.error(`Účet „${draft.name}" je zadaný dvakrát`);
          return;
        }
        seenDraftNamesLower.add(lower);
        if (draft.amount !== '' && Number.isNaN(Number(draft.amount))) {
          toast.error(`Suma pre „${draft.name}" nie je platné číslo`);
          return;
        }
      }

      // 2) Insert new accounts first so we get their server-generated IDs,
      //    then map drafts to those IDs for the wealth_records insert.
      let draftIdMap: Record<string, string> = {};
      if (draftsWithContent.length > 0) {
        const accountRows = draftsWithContent.map((draft) => ({
          name: draft.name,
          type: draft.type,
          currency: draft.currency,
        }));
        const { data: insertedAccounts, error: accountsError } = await supabase
          .from('asset_accounts')
          .insert(accountRows)
          .select('id, name');

        assertSuccess(accountsError, 'Pridanie nového účtu');

        const byName = new Map<string, string>();
        (insertedAccounts ?? []).forEach((row: { id: string; name: string }) => {
          byName.set(row.name, row.id);
        });
        draftIdMap = draftsWithContent.reduce<Record<string, string>>(
          (acc, draft) => {
            const newId = byName.get(draft.name);
            if (newId) acc[draft.tempId] = newId;
            return acc;
          },
          {}
        );
      }

      // 3) Build wealth_records inserts for existing accounts + new ones.
      const existingInserts = Object.entries(data.amounts)
        .filter(([, amount]) => amount !== '')
        .map(([accountId, amount]) => {
          const account = accounts.find((a) => a.id === accountId);
          const numAmount = Number(amount);
          const amountEur =
            account?.currency === 'CZK' ? numAmount / exchangeRate : numAmount;

          return {
            account_id: accountId,
            record_date: data.recordDate,
            amount: numAmount,
            amount_eur: amountEur,
          };
        });

      const newAccountInserts = draftsWithContent
        .filter((draft) => draft.amount !== '' && draftIdMap[draft.tempId])
        .map((draft) => {
          const numAmount = Number(draft.amount);
          const amountEur =
            draft.currency === 'CZK' ? numAmount / exchangeRate : numAmount;
          return {
            account_id: draftIdMap[draft.tempId],
            record_date: data.recordDate,
            amount: numAmount,
            amount_eur: amountEur,
          };
        });

      const inserts = [...existingInserts, ...newAccountInserts];

      if (inserts.length === 0 && draftsWithContent.length === 0) {
        toast.error('Prosím zadajte aspoň jednu sumu');
        return;
      }

      if (inserts.length > 0) {
        const { error } = await supabase
          .from('wealth_records')
          .insert(inserts);
        assertSuccess(error, 'Uloženie záznamov majetku');
      }

      setIsAdding(false);
      setNewAccountDrafts([]);
      await refresh();
      toast.success('Záznamy boli úspešne uložené');
    } catch (err) {
      showError(err, 'Chyba pri ukladaní záznamov');
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
                  onClick={() => {
                    setIsAdding(false);
                    setNewAccountDrafts([]);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAccounts.map((account) => (
                  <div key={account.id} className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      {account.name}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 pr-12 ${errors.amounts?.[account.id] ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                        {...register(`amounts.${account.id}`)}
                        placeholder="0.00"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        {account.currency === 'CZK' ? 'Kč' : '€'}
                      </span>
                    </div>
                    {errors.amounts?.[account.id] && (
                      <p className="text-[10px] text-rose-500 font-medium">
                        {errors.amounts[account.id]?.message}
                      </p>
                    )}
                  </div>
                ))}

                {newAccountDrafts.map((draft) => (
                  <div
                    key={draft.tempId}
                    className="space-y-1.5 rounded-xl border border-dashed border-blue-300 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) =>
                          updateNewAccountDraft(
                            draft.tempId,
                            'name',
                            e.target.value
                          )
                        }
                        placeholder="Názov nového účtu"
                        className="w-full bg-white dark:bg-slate-800 border rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => removeNewAccountDraft(draft.tempId)}
                        className="shrink-0 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
                        title="Odstrániť tento účet"
                        aria-label="Odstrániť tento účet"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.01"
                          value={draft.amount}
                          onChange={(e) =>
                            updateNewAccountDraft(
                              draft.tempId,
                              'amount',
                              e.target.value
                            )
                          }
                          className="w-full bg-white dark:bg-slate-800 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                          placeholder="0.00"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                          {draft.currency === 'CZK' ? 'Kč' : '€'}
                        </span>
                      </div>
                      <select
                        value={draft.currency}
                        onChange={(e) =>
                          updateNewAccountDraft(
                            draft.tempId,
                            'currency',
                            e.target.value as 'EUR' | 'CZK'
                          )
                        }
                        className="bg-white dark:bg-slate-800 border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Mena"
                      >
                        <option value="EUR">EUR</option>
                        <option value="CZK">CZK</option>
                      </select>
                    </div>
                    <select
                      value={draft.type}
                      onChange={(e) =>
                        updateNewAccountDraft(
                          draft.tempId,
                          'type',
                          e.target.value as AccountType
                        )
                      }
                      className="w-full bg-white dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Typ účtu"
                    >
                      {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addNewAccountDraft}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors min-h-[88px] p-3"
                >
                  <Plus size={20} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Pridať nový
                  </span>
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewAccountDrafts([]);
                  }}
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
                  Uložiť všetko
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
                  <th
                    className="px-3 py-4 text-center font-bold text-slate-900 dark:text-white sticky left-0 bg-slate-50 dark:bg-slate-800"
                    title="Započítať do celkového majetku"
                  >
                    ✓
                  </th>
                  <th className="px-6 py-4 font-bold text-slate-900 dark:text-white sticky left-12 bg-slate-50 dark:bg-slate-800">
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
                  <th className="px-3 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {accounts.map((account) => {
                  const latestAmount = recordMap[dates[0]]?.[account.id] || 0;
                  const prevAmount = recordMap[dates[1]]?.[account.id] || 0;
                  const diff = latestAmount - prevAmount;
                  const isIncluded = !excludedAccountIds.has(account.id);
                  const isArchived = !!account.archived_at;
                  const recordCount = recordCountByAccount[account.id] ?? 0;
                  const canPurge = recordCount === 0;

                  return (
                    <motion.tr
                      key={account.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors ${
                        isArchived
                          ? 'opacity-60 italic bg-slate-50/30 dark:bg-slate-800/10'
                          : !isIncluded
                            ? 'opacity-60 bg-slate-50/40 dark:bg-slate-800/20'
                            : ''
                      }`}
                    >
                      <td className="px-3 py-4 text-center sticky left-0 bg-white dark:bg-slate-900">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isIncluded}
                            onChange={() => toggleIncluded(account.id)}
                            aria-label={
                              isIncluded
                                ? `Vyradiť ${account.name} z celkového majetku`
                                : `Pridať ${account.name} do celkového majetku`
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer accent-blue-600"
                          />
                        </label>
                      </td>
                      <td className="px-6 py-4 sticky left-12 bg-white dark:bg-slate-900 font-medium border-r">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5">
                            {isArchived && (
                              <Archive
                                size={12}
                                className="text-slate-400"
                                aria-label="Archivovaný účet"
                              />
                            )}
                            {account.name}
                          </span>
                          <span className="text-xs text-slate-400 capitalize">
                            {account.type}
                            {isArchived && ' · archivovaný'}
                          </span>
                        </div>
                      </td>
                      {dates.slice(0, 5).map((date) => (
                        <td
                          key={date}
                          className={`px-6 py-4 ${
                            !isIncluded
                              ? 'text-slate-400 line-through'
                              : isArchived
                                ? 'text-slate-400'
                                : ''
                          }`}
                        >
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
                      <td className="px-3 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          {isArchived ? (
                            <button
                              type="button"
                              onClick={() => unarchiveAccount(account)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-colors"
                              title="Obnoviť účet"
                              aria-label={`Obnoviť účet ${account.name}`}
                            >
                              <ArchiveRestore size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => archiveAccount(account)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-md transition-colors"
                              title="Archivovať účet (história zostane zachovaná)"
                              aria-label={`Archivovať účet ${account.name}`}
                            >
                              <Archive size={14} />
                            </button>
                          )}
                          {canPurge && (
                            <button
                              type="button"
                              onClick={() => purgeAccount(account)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
                              title="Zmazať natrvalo (účet nemá žiadne záznamy)"
                              aria-label={`Zmazať účet ${account.name} natrvalo`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t">
                <tr>
                  <td
                    colSpan={2}
                    className="px-6 py-4 sticky left-0 bg-slate-50 dark:bg-slate-800 border-r text-blue-600"
                  >
                    <div className="flex items-center gap-3">
                      <span>CELKOM</span>
                      {excludedAccountIds.size > 0 && (
                        <button
                          type="button"
                          onClick={resetIncluded}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="Znova zaškrtnúť všetky účty"
                        >
                          <RotateCcw size={12} />
                          Resetovať ({accounts.length - excludedAccountIds.size}/
                          {accounts.length})
                        </button>
                      )}
                    </div>
                  </td>
                  {dates.slice(0, 5).map((date) => {
                    // Archived accounts ARE counted in historical CELKOM —
                    // a closed bank account still held money on that date.
                    // Hiding it only applies to the "new record" form.
                    const fullTotal = accounts.reduce(
                      (sum, acc) => sum + (recordMap[date]?.[acc.id] || 0),
                      0
                    );
                    const total = accounts
                      .filter((acc) => !excludedAccountIds.has(acc.id))
                      .reduce(
                        (sum, acc) => sum + (recordMap[date]?.[acc.id] || 0),
                        0
                      );
                    const hasExclusions = excludedAccountIds.size > 0;
                    return (
                      <td
                        key={date}
                        className="px-6 py-4 text-blue-600"
                        title={
                          hasExclusions
                            ? `Pôvodne: ${formatCurrency(fullTotal)}`
                            : undefined
                        }
                      >
                        {formatCurrency(total)}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4"></td>
                  <td className="px-3 py-4"></td>
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
                .filter((acc) => !excludedAccountIds.has(acc.id))
                .map((acc) => ({
                  ...acc,
                  amount: recordMap[dates[0]]?.[acc.id] || 0,
                }))
                .filter((acc) => acc.amount > 0)
                .sort((a, b) => b.amount - a.amount)
                .map((acc) => {
                  const total = accounts
                    .filter((a) => !excludedAccountIds.has(a.id))
                    .reduce(
                      (sum, a) => sum + (recordMap[dates[0]]?.[a.id] || 0),
                      0
                    );
                  const percentage = total > 0 ? (acc.amount / total) * 100 : 0;
                  const isArchivedAcc = !!acc.archived_at;
                  return (
                    <div
                      key={acc.id}
                      className={`space-y-1 ${isArchivedAcc ? 'opacity-60' : ''}`}
                    >
                      <div className="flex justify-between text-sm">
                        <span className="font-medium flex items-center gap-1.5">
                          {isArchivedAcc && (
                            <Archive
                              size={12}
                              className="text-slate-400"
                              aria-label="Archivovaný účet"
                            />
                          )}
                          {acc.name}
                        </span>
                        <span className="text-slate-500">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={`h-full ${isArchivedAcc ? 'bg-slate-400' : 'bg-blue-600'}`}
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
