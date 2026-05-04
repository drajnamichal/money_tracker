'use client';

import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  CalendarDays,
  CalendarRange,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronRight,
  Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/skeleton';
import { assertSuccess, showError } from '@/lib/error-handling';
import type {
  RecurringPayment,
  RecurringPaymentHistoryEntry,
} from '@/types/financial';

type Frequency = 'monthly' | 'yearly';

export interface RecurringPaymentsClientProps {
  initialPayments: RecurringPayment[];
  initialHistory: RecurringPaymentHistoryEntry[];
}

const todayISO = () => new Date().toISOString().split('T')[0];

export function RecurringPaymentsClient({
  initialPayments,
  initialHistory,
}: RecurringPaymentsClientProps) {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<RecurringPayment[]>(initialPayments);
  const [history, setHistory] = useState<RecurringPaymentHistoryEntry[]>(
    initialHistory
  );
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);

  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newFrequency, setNewFrequency] = useState<Frequency>('monthly');

  const historyByPayment = useMemo(() => {
    const map = new Map<string, RecurringPaymentHistoryEntry[]>();
    history.forEach((entry) => {
      const list = map.get(entry.payment_id) ?? [];
      list.push(entry);
      map.set(entry.payment_id, list);
    });
    map.forEach((list) =>
      list.sort((a, b) => b.effective_from.localeCompare(a.effective_from))
    );
    return map;
  }, [history]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, historyRes] = await Promise.all([
        supabase
          .from('recurring_payments')
          .select('*')
          .order('frequency', { ascending: false })
          .order('name'),
        supabase
          .from('recurring_payment_history')
          .select('*')
          .order('payment_id')
          .order('effective_from', { ascending: false }),
      ]);

      if (!paymentsRes.error && paymentsRes.data) {
        setPayments(paymentsRes.data as RecurringPayment[]);
      }
      if (!historyRes.error && historyRes.data) {
        setHistory(historyRes.data as RecurringPaymentHistoryEntry[]);
      } else if (
        historyRes.error &&
        historyRes.error.code !== '42P01' &&
        historyRes.error.code !== 'PGRST205'
      ) {
        showError(historyRes.error, 'Načítanie histórie platieb');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const insertHistoryEntry = useCallback(
    async (
      paymentId: string,
      userId: string,
      amount: number,
      effectiveFrom: string,
      note?: string | null
    ) => {
      const { error } = await supabase
        .from('recurring_payment_history')
        .insert([
          {
            payment_id: paymentId,
            user_id: userId,
            amount,
            effective_from: effectiveFrom,
            note: note ?? null,
          },
        ]);
      if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
        // Surface only real failures; missing-table just means the migration
        // hasn't been applied yet and the history feature is dormant.
        showError(error, 'Zápis do histórie platby');
      }
    },
    []
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newAmount) return;

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      assertSuccess(userError, 'Načítanie používateľa');
      if (!userData.user) {
        throw new Error('Pre pridanie platby musíš byť prihlásený');
      }

      const amount = Number(newAmount);
      const { data: inserted, error } = await supabase
        .from('recurring_payments')
        .insert([
          {
            name: newName,
            amount,
            frequency: newFrequency,
            user_id: userData.user.id,
          },
        ])
        .select()
        .single();
      assertSuccess(error, 'Pridanie platby');

      if (inserted) {
        await insertHistoryEntry(
          inserted.id,
          userData.user.id,
          amount,
          todayISO(),
          'Počiatočná suma'
        );
      }

      setIsAdding(false);
      setNewName('');
      setNewAmount('');
      await refreshAll();
      toast.success('Platba bola pridaná');
    } catch (err) {
      showError(err, 'Chyba pri pridávaní platby');
    }
  }

  async function handleDelete(id: string) {
    const deletedPayment = payments.find((p) => p.id === id);
    if (!deletedPayment) return;

    try {
      const { error } = await supabase
        .from('recurring_payments')
        .delete()
        .eq('id', id);
      assertSuccess(error, 'Mazanie platby');

      await refreshAll();
      toast.success('Platba bola odstránená', {
        action: {
          label: 'Vrátiť späť',
          onClick: async () => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { id: _id, ...rest } = deletedPayment;
              const { data: userData } = await supabase.auth.getUser();
              await supabase.from('recurring_payments').insert([
                { ...rest, user_id: userData.user?.id ?? null },
              ]);
              await refreshAll();
              toast.success('Platba bola obnovená');
            } catch {
              toast.error('Nepodarilo sa obnoviť platbu');
            }
          },
        },
      });
    } catch (err) {
      showError(err, 'Chyba pri mazaní platby');
    }
  }

  async function handleUpdate(
    id: string,
    name: string,
    amount: number,
    frequency: Frequency
  ) {
    const currentPayment = payments.find((p) => p.id === id);
    const updateData: {
      name: string;
      amount: number;
      frequency: Frequency;
      last_amount?: number;
    } = { name, amount, frequency };

    const amountChanged =
      !!currentPayment && Number(currentPayment.amount) !== amount;
    if (currentPayment && amountChanged) {
      updateData.last_amount = currentPayment.amount;
    }

    try {
      const { error } = await supabase
        .from('recurring_payments')
        .update(updateData)
        .eq('id', id);
      assertSuccess(error, 'Úprava platby');

      if (amountChanged && currentPayment) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id ?? currentPayment.user_id ?? null;
        if (userId) {
          await insertHistoryEntry(
            id,
            userId,
            amount,
            todayISO(),
            'Zmena cez úpravu platby'
          );
        }
      }

      setEditingId(null);
      await refreshAll();
      toast.success('Platba bola upravená');
    } catch (err) {
      showError(err, 'Chyba pri úprave platby');
    }
  }

  async function handleAddHistoryEntry(
    paymentId: string,
    amount: number,
    effectiveFrom: string,
    note: string | null
  ) {
    try {
      const payment = payments.find((p) => p.id === paymentId);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? payment?.user_id ?? null;
      if (!userId) {
        throw new Error('Pre úpravu histórie musíš byť prihlásený');
      }

      const { error } = await supabase
        .from('recurring_payment_history')
        .insert([
          {
            payment_id: paymentId,
            user_id: userId,
            amount,
            effective_from: effectiveFrom,
            note,
          },
        ]);
      assertSuccess(error, 'Pridanie záznamu do histórie');

      // If this new entry is the most recent, also bump the parent payment
      // so the dashboard cards stay in sync.
      const existing = historyByPayment.get(paymentId) ?? [];
      const isMostRecent = existing.every(
        (entry) => entry.effective_from <= effectiveFrom
      );
      if (payment && isMostRecent && Number(payment.amount) !== amount) {
        await supabase
          .from('recurring_payments')
          .update({ amount, last_amount: payment.amount })
          .eq('id', paymentId);
      }

      await refreshAll();
      toast.success('Záznam pridaný do histórie');
    } catch (err) {
      showError(err, 'Chyba pri zapisovaní histórie');
    }
  }

  async function handleUpdateHistoryEntry(
    entryId: string,
    amount: number,
    effectiveFrom: string,
    note: string | null
  ) {
    try {
      const { error } = await supabase
        .from('recurring_payment_history')
        .update({ amount, effective_from: effectiveFrom, note })
        .eq('id', entryId);
      assertSuccess(error, 'Úprava záznamu histórie');
      await refreshAll();
      toast.success('Záznam aktualizovaný');
    } catch (err) {
      showError(err, 'Chyba pri úprave záznamu histórie');
    }
  }

  async function handleDeleteHistoryEntry(entryId: string) {
    try {
      const { error } = await supabase
        .from('recurring_payment_history')
        .delete()
        .eq('id', entryId);
      assertSuccess(error, 'Mazanie záznamu histórie');
      await refreshAll();
      toast.success('Záznam vymazaný');
    } catch (err) {
      showError(err, 'Chyba pri mazaní záznamu histórie');
    }
  }

  const toggleHistory = useCallback((paymentId: string) => {
    setExpandedHistoryIds((current) =>
      current.includes(paymentId)
        ? current.filter((id) => id !== paymentId)
        : [...current, paymentId]
    );
  }, []);

  const monthlyPayments = payments.filter((p) => p.frequency === 'monthly');
  const yearlyPayments = payments.filter((p) => p.frequency === 'yearly');

  const totalMonthly = monthlyPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const totalYearly = yearlyPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const totalMonthlyEquivalent = totalMonthly + totalYearly / 12;
  const priceIncreasePayments = payments.filter(
    (payment) =>
      payment.last_amount !== undefined &&
      payment.last_amount !== null &&
      Number(payment.amount) > Number(payment.last_amount)
  );
  const totalMonthlyIncreaseImpact = priceIncreasePayments.reduce((sum, payment) => {
    const difference = Number(payment.amount) - Number(payment.last_amount ?? 0);
    return sum + (payment.frequency === 'yearly' ? difference / 12 : difference);
  }, 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pravidelné platby</h1>
          <p className="text-slate-500">
            Správa tvojich fixných mesačných a ročných nákladov vrátane
            kompletnej histórie zdražení.
          </p>
        </div>
        {!loading && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
          >
            <Plus size={20} />
            <span>Pridať platbu</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-blue-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                  <CalendarDays size={20} />
                </div>
                <h3 className="font-semibold text-slate-600 dark:text-slate-400">
                  Mesačné fixy
                </h3>
              </div>
              <p className="text-3xl font-bold">
                {formatCurrency(totalMonthly)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                  <CalendarRange size={20} />
                </div>
                <h3 className="font-semibold text-slate-600 dark:text-slate-400">
                  Ročné fixy
                </h3>
              </div>
              <p className="text-3xl font-bold text-emerald-600">
                {formatCurrency(totalYearly)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                ({formatCurrency(totalYearly / 12)} / mesiac)
              </p>
            </div>

            <div className="bg-blue-600 p-6 rounded-2xl shadow-xl shadow-blue-200 dark:shadow-none text-white">
              <div className="flex items-center gap-3 mb-4 text-blue-100">
                <Wallet size={20} />
                <h3 className="font-semibold">Celkové mesačné zaťaženie</h3>
              </div>
              <p className="text-3xl font-bold">
                {formatCurrency(totalMonthlyEquivalent)}
              </p>
              <p className="text-xs text-blue-100 mt-1">
                Vrátane alikvotnej časti ročných platieb
              </p>
            </div>
          </>
        )}
      </div>

      {!loading && priceIncreasePayments.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-300">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Detegované zdraženie pravidelných platieb
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {priceIncreasePayments.length} platieb je drahších než predtým a
                  zvyšujú zaťaženie asi o{' '}
                  <span className="font-bold text-amber-700 dark:text-amber-300">
                    {formatCurrency(totalMonthlyIncreaseImpact)}
                  </span>{' '}
                  mesačne.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {priceIncreasePayments.slice(0, 4).map((payment) => (
                <span
                  key={payment.id}
                  className="inline-flex items-center rounded-full bg-white/80 dark:bg-slate-900/70 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                >
                  {payment.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-900 shadow-xl"
          >
            <form
              onSubmit={handleAdd}
              className="flex flex-col md:flex-row gap-4 items-end"
            >
              <div className="flex-1 space-y-1.5 w-full">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Názov platby
                </label>
                <input
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Napr. Hypotéka"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="w-full md:w-40 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Suma (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Periodicita
                </label>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  value={newFrequency}
                  onChange={(e) =>
                    setNewFrequency(e.target.value as Frequency)
                  }
                >
                  <option value="monthly">Mesačne</option>
                  <option value="yearly">Ročne</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  Pridať
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  <X size={24} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PaymentSection
          title="Mesačné platby"
          badgeClasses="bg-blue-100 text-blue-700"
          loading={loading}
          payments={monthlyPayments}
          emptyMessage="Žiadne mesačné platby"
          historyByPayment={historyByPayment}
          editingId={editingId}
          expandedHistoryIds={expandedHistoryIds}
          onEdit={(id) => setEditingId(id)}
          onCancel={() => setEditingId(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onToggleHistory={toggleHistory}
          onAddHistory={handleAddHistoryEntry}
          onUpdateHistory={handleUpdateHistoryEntry}
          onDeleteHistory={handleDeleteHistoryEntry}
        />
        <PaymentSection
          title="Ročné platby"
          badgeClasses="bg-emerald-100 text-emerald-700"
          loading={loading}
          payments={yearlyPayments}
          emptyMessage="Žiadne ročné platby"
          historyByPayment={historyByPayment}
          editingId={editingId}
          expandedHistoryIds={expandedHistoryIds}
          onEdit={(id) => setEditingId(id)}
          onCancel={() => setEditingId(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onToggleHistory={toggleHistory}
          onAddHistory={handleAddHistoryEntry}
          onUpdateHistory={handleUpdateHistoryEntry}
          onDeleteHistory={handleDeleteHistoryEntry}
        />
      </div>
    </div>
  );
}

interface PaymentSectionProps {
  title: string;
  badgeClasses: string;
  loading: boolean;
  payments: RecurringPayment[];
  emptyMessage: string;
  historyByPayment: Map<string, RecurringPaymentHistoryEntry[]>;
  editingId: string | null;
  expandedHistoryIds: string[];
  onEdit: (id: string) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    name: string,
    amount: number,
    frequency: Frequency
  ) => void;
  onToggleHistory: (id: string) => void;
  onAddHistory: (
    paymentId: string,
    amount: number,
    effectiveFrom: string,
    note: string | null
  ) => Promise<void>;
  onUpdateHistory: (
    entryId: string,
    amount: number,
    effectiveFrom: string,
    note: string | null
  ) => Promise<void>;
  onDeleteHistory: (entryId: string) => Promise<void>;
}

function PaymentSection({
  title,
  badgeClasses,
  loading,
  payments,
  emptyMessage,
  historyByPayment,
  editingId,
  expandedHistoryIds,
  onEdit,
  onCancel,
  onDelete,
  onUpdate,
  onToggleHistory,
  onAddHistory,
  onUpdateHistory,
  onDeleteHistory,
}: PaymentSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <h2 className="text-xl font-bold">{title}</h2>
        {!loading && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClasses}`}
          >
            {payments.length}
          </span>
        )}
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm divide-y">
        {loading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            {payments.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                history={historyByPayment.get(payment.id) ?? []}
                isHistoryOpen={expandedHistoryIds.includes(payment.id)}
                isEditing={editingId === payment.id}
                onDelete={() => onDelete(payment.id)}
                onUpdate={(n, a, f) => onUpdate(payment.id, n, a, f)}
                onEdit={() => onEdit(payment.id)}
                onCancel={onCancel}
                onToggleHistory={() => onToggleHistory(payment.id)}
                onAddHistory={(amount, effectiveFrom, note) =>
                  onAddHistory(payment.id, amount, effectiveFrom, note)
                }
                onUpdateHistory={onUpdateHistory}
                onDeleteHistory={onDeleteHistory}
              />
            ))}
            {payments.length === 0 && (
              <p className="p-8 text-center text-slate-400 italic">
                {emptyMessage}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface PaymentRowProps {
  payment: RecurringPayment;
  history: RecurringPaymentHistoryEntry[];
  isHistoryOpen: boolean;
  isEditing: boolean;
  onDelete: () => void;
  onUpdate: (name: string, amount: number, frequency: Frequency) => void;
  onEdit: () => void;
  onCancel: () => void;
  onToggleHistory: () => void;
  onAddHistory: (
    amount: number,
    effectiveFrom: string,
    note: string | null
  ) => Promise<void>;
  onUpdateHistory: (
    entryId: string,
    amount: number,
    effectiveFrom: string,
    note: string | null
  ) => Promise<void>;
  onDeleteHistory: (entryId: string) => Promise<void>;
}

function PaymentRow({
  payment,
  history,
  isHistoryOpen,
  isEditing,
  onDelete,
  onUpdate,
  onEdit,
  onCancel,
  onToggleHistory,
  onAddHistory,
  onUpdateHistory,
  onDeleteHistory,
}: PaymentRowProps) {
  const [editName, setEditName] = useState(payment.name);
  const [editAmount, setEditAmount] = useState(payment.amount.toString());
  const [editFrequency, setEditFrequency] = useState<Frequency>(
    payment.frequency
  );
  const hasPriceIncrease =
    payment.last_amount !== undefined &&
    payment.last_amount !== null &&
    payment.amount > payment.last_amount;
  const priceDifference = hasPriceIncrease
    ? payment.amount - Number(payment.last_amount ?? 0)
    : 0;
  const historyCount = history.length;

  if (isEditing) {
    return (
      <div className="p-4 bg-blue-50/30 dark:bg-blue-900/10">
        <div className="flex flex-wrap gap-3">
          <input
            className="flex-1 bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <input
            type="number"
            className="w-24 bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
          />
          <select
            className="w-32 bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={editFrequency}
            onChange={(e) =>
              setEditFrequency(e.target.value as Frequency)
            }
          >
            <option value="monthly">Mesačne</option>
            <option value="yearly">Ročne</option>
          </select>
          <div className="flex gap-1">
            <button
              onClick={() =>
                onUpdate(editName, Number(editAmount), editFrequency)
              }
              className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
            >
              <Save size={20} />
            </button>
            <button
              onClick={onCancel}
              className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`transition-colors ${
        hasPriceIncrease
          ? 'bg-amber-50/70 dark:bg-amber-950/10 border-l-4 border-amber-400'
          : ''
      }`}
    >
      <div
        className={`p-4 flex items-center justify-between group ${
          hasPriceIncrease
            ? 'hover:bg-amber-50 dark:hover:bg-amber-950/20'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
      >
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{payment.name}</p>
            {hasPriceIncrease && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
                <TrendingUp size={12} />
                Zdražené
              </span>
            )}
            <button
              onClick={onToggleHistory}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                isHistoryOpen
                  ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
              title="Zobraziť históriu zmien sumy"
            >
              {isHistoryOpen ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
              <History size={12} />
              {historyCount > 0
                ? `${historyCount} ${historyCount === 1 ? 'záznam' : historyCount < 5 ? 'záznamy' : 'záznamov'}`
                : 'História'}
            </button>
          </div>
          <div className="flex flex-col">
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
              {formatCurrency(payment.amount)}
            </p>
            {payment.last_amount !== undefined &&
              payment.last_amount !== null &&
              payment.last_amount !== payment.amount && (
                <p
                  className={`text-[10px] font-medium italic ${
                    hasPriceIncrease
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-slate-400'
                  }`}
                >
                  predtým {formatCurrency(payment.last_amount)}
                  {hasPriceIncrease && ` · +${formatCurrency(priceDifference)}`}
                </p>
              )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100">
          <button
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isHistoryOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t bg-slate-50/60 dark:bg-slate-900/40"
          >
            <PaymentHistoryPanel
              paymentName={payment.name}
              history={history}
              onAddHistory={onAddHistory}
              onUpdateHistory={onUpdateHistory}
              onDeleteHistory={onDeleteHistory}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PaymentHistoryPanelProps {
  paymentName: string;
  history: RecurringPaymentHistoryEntry[];
  onAddHistory: (
    amount: number,
    effectiveFrom: string,
    note: string | null
  ) => Promise<void>;
  onUpdateHistory: (
    entryId: string,
    amount: number,
    effectiveFrom: string,
    note: string | null
  ) => Promise<void>;
  onDeleteHistory: (entryId: string) => Promise<void>;
}

function PaymentHistoryPanel({
  paymentName,
  history,
  onAddHistory,
  onUpdateHistory,
  onDeleteHistory,
}: PaymentHistoryPanelProps) {
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [draftAmount, setDraftAmount] = useState('');
  const [draftDate, setDraftDate] = useState(todayISO());
  const [draftNote, setDraftNote] = useState('');

  const sortedHistory = useMemo(
    () =>
      [...history].sort((a, b) =>
        b.effective_from.localeCompare(a.effective_from)
      ),
    [history]
  );

  const resetDraft = () => {
    setDraftAmount('');
    setDraftDate(todayISO());
    setDraftNote('');
  };

  const handleStartAdd = () => {
    setEditingEntryId(null);
    resetDraft();
    setIsAddingEntry(true);
  };

  const handleStartEdit = (entry: RecurringPaymentHistoryEntry) => {
    setIsAddingEntry(false);
    setEditingEntryId(entry.id);
    setDraftAmount(entry.amount.toString());
    setDraftDate(entry.effective_from);
    setDraftNote(entry.note ?? '');
  };

  const handleCancelDraft = () => {
    setIsAddingEntry(false);
    setEditingEntryId(null);
    resetDraft();
  };

  const handleSubmitDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = Number(draftAmount);
    if (!Number.isFinite(amountValue) || amountValue < 0 || !draftDate) {
      toast.error('Vyplň platnú sumu a dátum');
      return;
    }
    const note = draftNote.trim() ? draftNote.trim() : null;

    if (editingEntryId) {
      await onUpdateHistory(editingEntryId, amountValue, draftDate, note);
    } else {
      await onAddHistory(amountValue, draftDate, note);
    }
    handleCancelDraft();
  };

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
          História sumy · {paymentName}
        </p>
        {!isAddingEntry && !editingEntryId && (
          <button
            type="button"
            onClick={handleStartAdd}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Pridať záznam
          </button>
        )}
      </div>

      {(isAddingEntry || editingEntryId) && (
        <form
          onSubmit={handleSubmitDraft}
          className="rounded-xl border border-blue-200 bg-white p-3 shadow-sm dark:border-blue-900/40 dark:bg-slate-900"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[140px_140px_1fr_auto] gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Dátum
              </label>
              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Suma (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Poznámka (voliteľná)
              </label>
              <input
                type="text"
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Napr. inflácia, zmena tarify..."
                className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-1">
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
              >
                <Save size={14} />
                Uložiť
              </button>
              <button
                type="button"
                onClick={handleCancelDraft}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </form>
      )}

      {sortedHistory.length === 0 ? (
        <p className="text-sm italic text-slate-400">
          Zatiaľ tu nie je žiadny záznam. Použi tlačidlo „Pridať záznam“
          a doplň staršie sumy aj s dátumom, aby si mal kompletnú históriu.
        </p>
      ) : (
        <ol className="relative ml-2 border-l border-slate-200 dark:border-slate-700 space-y-3 pl-4">
          {sortedHistory.map((entry, index) => {
            const previousEntry = sortedHistory[index + 1];
            const previousAmount = previousEntry
              ? Number(previousEntry.amount)
              : null;
            const currentAmount = Number(entry.amount);
            const diff =
              previousAmount === null ? null : currentAmount - previousAmount;
            const percent =
              previousAmount && previousAmount !== 0 && diff !== null
                ? (diff / previousAmount) * 100
                : null;
            const tone =
              diff === null || diff === 0
                ? 'neutral'
                : diff > 0
                  ? 'increase'
                  : 'decrease';
            const dotClasses =
              tone === 'increase'
                ? 'bg-amber-500'
                : tone === 'decrease'
                  ? 'bg-emerald-500'
                  : 'bg-slate-400';

            return (
              <li key={entry.id} className="relative">
                <span
                  className={`absolute -left-[19px] top-2 h-2.5 w-2.5 rounded-full ring-4 ring-slate-50 dark:ring-slate-900/40 ${dotClasses}`}
                />
                {editingEntryId === entry.id ? (
                  <p className="text-xs italic text-slate-400">Upravuje sa…</p>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-slate-500">
                        {new Date(entry.effective_from).toLocaleDateString(
                          'sk-SK',
                          { day: '2-digit', month: 'long', year: 'numeric' }
                        )}
                      </p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">
                        {formatCurrency(currentAmount)}
                      </p>
                      {diff !== null && (
                        <p
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            tone === 'increase'
                              ? 'text-amber-700 dark:text-amber-300'
                              : tone === 'decrease'
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-slate-500'
                          }`}
                        >
                          {tone === 'increase' ? (
                            <TrendingUp size={12} />
                          ) : tone === 'decrease' ? (
                            <TrendingDown size={12} />
                          ) : (
                            <Minus size={12} />
                          )}
                          {diff > 0 ? '+' : ''}
                          {formatCurrency(diff)}
                          {percent !== null && (
                            <span className="font-medium">
                              {' '}
                              ({percent > 0 ? '+' : ''}
                              {percent.toFixed(1)} %)
                            </span>
                          )}
                        </p>
                      )}
                      {entry.note && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {entry.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(entry)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                        title="Upraviť záznam"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteHistory(entry.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors"
                        title="Vymazať záznam"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
