'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  CalendarDays,
  CalendarRange,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/skeleton';

interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
}

export default function RecurringPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newFrequency, setNewFrequency] = useState<'monthly' | 'yearly'>(
    'monthly'
  );

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('recurring_payments')
      .select('*')
      .order('frequency', { ascending: false })
      .order('name');

    if (!error && data) {
      setPayments(data);
    }
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newAmount) return;

    const { error } = await supabase.from('recurring_payments').insert([
      {
        name: newName,
        amount: Number(newAmount),
        frequency: newFrequency,
      },
    ]);

    if (!error) {
      setIsAdding(false);
      setNewName('');
      setNewAmount('');
      fetchPayments();
      toast.success('Platba bola pridaná');
    } else {
      toast.error('Chyba pri pridávaní platby');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj chcete vymazať túto platbu?')) return;
    const { error } = await supabase
      .from('recurring_payments')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchPayments();
      toast.success('Platba bola odstránená');
    } else {
      toast.error('Chyba pri mazaní platby');
    }
  }

  async function handleUpdate(
    id: string,
    name: string,
    amount: number,
    frequency: 'monthly' | 'yearly'
  ) {
    const { error } = await supabase
      .from('recurring_payments')
      .update({ name, amount, frequency })
      .eq('id', id);

    if (!error) {
      setEditingId(null);
      fetchPayments();
      toast.success('Platba bola upravená');
    } else {
      toast.error('Chyba pri úprave platby');
    }
  }

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

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pravidelné platby</h1>
          <p className="text-slate-500">
            Správa tvojich fixných mesačných a ročných nákladov.
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
                    setNewFrequency(e.target.value as 'monthly' | 'yearly')
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
        {/* Monthly Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <h2 className="text-xl font-bold">Mesačné platby</h2>
            {!loading && (
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {monthlyPayments.length}
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
                {monthlyPayments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    onDelete={() => handleDelete(payment.id)}
                    onUpdate={(n, a, f) => handleUpdate(payment.id, n, a, f)}
                    isEditing={editingId === payment.id}
                    onEdit={() => setEditingId(payment.id)}
                    onCancel={() => setEditingId(null)}
                  />
                ))}
                {monthlyPayments.length === 0 && (
                  <p className="p-8 text-center text-slate-400 italic">
                    Žiadne mesačné platby
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Yearly Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <h2 className="text-xl font-bold">Ročné platby</h2>
            {!loading && (
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {yearlyPayments.length}
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
                {yearlyPayments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    onDelete={() => handleDelete(payment.id)}
                    onUpdate={(n, a, f) => handleUpdate(payment.id, n, a, f)}
                    isEditing={editingId === payment.id}
                    onEdit={() => setEditingId(payment.id)}
                    onCancel={() => setEditingId(null)}
                  />
                ))}
                {yearlyPayments.length === 0 && (
                  <p className="p-8 text-center text-slate-400 italic">
                    Žiadne ročné platby
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentRow({
  payment,
  onDelete,
  onUpdate,
  isEditing,
  onEdit,
  onCancel,
}: {
  payment: RecurringPayment;
  onDelete: () => void;
  onUpdate: (
    name: string,
    amount: number,
    frequency: 'monthly' | 'yearly'
  ) => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const [editName, setEditName] = useState(payment.name);
  const [editAmount, setEditAmount] = useState(payment.amount.toString());
  const [editFrequency, setEditFrequency] = useState(payment.frequency);

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
              setEditFrequency(e.target.value as 'monthly' | 'yearly')
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
    <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="space-y-0.5">
        <p className="font-medium">{payment.name}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {formatCurrency(payment.amount)}
        </p>
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
  );
}
