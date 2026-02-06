'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Loader2, Scan, Settings2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/skeleton';
import { useExpenseData } from '@/hooks/use-financial-data';
import { compressImage } from '@/lib/image-utils';
import { ExpenseForm } from '@/components/expenses/expense-form';
import type { ExpenseFormValues } from '@/components/expenses/expense-form';
import { CategoryManager } from '@/components/expenses/category-manager';
import {
  MonthlyExpenseGroup,
  type ExpenseGroup,
} from '@/components/expenses/monthly-expense-group';
import { ExpenseCategorySidebar } from '@/components/expenses/expense-category-sidebar';
import type { ExpenseRecord } from '@/types/financial';

interface CategoryTotal {
  name: string;
  value: number;
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
  const [isScanning, setIsScanning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    description: '',
    category: '',
    amount: 0,
    record_date: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formSetValueRef = useRef<
    ((name: keyof ExpenseFormValues, value: string) => void) | null
  >(null);

  const groupedCategories = useMemo(() => {
    const main = categories.filter((c) => !c.parent_id);
    return main.map((m) => ({
      ...m,
      subcategories: categories.filter((c) => c.parent_id === m.id),
    }));
  }, [categories]);

  // ---- CRUD handlers ----

  const onAddExpense = async (values: ExpenseFormValues) => {
    setIsAdding(false);

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

      if (values.category.startsWith('Bývanie:')) {
        await supabase.from('budget_expenses').insert([
          {
            description: values.description,
            category: values.category,
            amount: Number(values.amount),
            amount_eur: Number(values.amount),
            currency: 'EUR',
          },
        ]);
      }

      await refresh();
      toast.success('Výdavok úspešne pridaný');
    } catch (err: unknown) {
      console.error('Error adding expense:', err);
      toast.error('Chyba pri pridávaní výdavku');
    }
  };

  const handleDelete = async (id: string) => {
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
  };

  const handleEdit = (expense: ExpenseRecord) => {
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
    } catch (err: unknown) {
      console.error('Error updating expense:', err);
      toast.error('Chyba pri aktualizácii');
    }
  };

  const handleEditValueChange = useCallback(
    (field: string, value: string) => {
      setEditValues((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ---- OCR handler ----

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setIsAdding(true);

    try {
      const compressedBase64 = await compressImage(file);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedBase64 }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const setter = formSetValueRef.current;
      if (setter) {
        if (data.description) setter('description', data.description);
        if (data.amount) setter('amount', data.amount.toString());
        if (data.category) {
          const categoryToMatch = String(data.category).toLowerCase();
          const foundCategory = categories.find(
            (c) =>
              c.name.toLowerCase() === categoryToMatch ||
              (c.parent_id && c.name.toLowerCase().includes(categoryToMatch))
          );

          if (foundCategory) {
            if (foundCategory.parent_id) {
              const parent = categories.find(
                (c) => c.id === foundCategory.parent_id
              );
              setter('category', `${parent?.name}: ${foundCategory.name}`);
            } else {
              const firstSub = categories.find(
                (c) => c.parent_id === foundCategory.id
              );
              setter(
                'category',
                firstSub
                  ? `${foundCategory.name}: ${firstSub.name}`
                  : 'Ostatné: nezaradené'
              );
            }
          } else {
            setter('category', 'Ostatné: nezaradené');
          }
        }
      }

      toast.success('Bloček úspešne naskenovaný!');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Neznáma chyba';
      console.error('OCR Error:', err);
      toast.error('Chyba pri skenovaní bločku: ' + errorMessage);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---- Grouped expense data ----

  const groupedExpenses: ExpenseGroup[] = useMemo(() => {
    const groups: Record<string, ExpenseRecord[]> = {};
    expenses.forEach((expense) => {
      const date = new Date(expense.record_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(expense);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const records = groups[key].sort((a, b) =>
          b.record_date.localeCompare(a.record_date)
        );
        const total = records.reduce(
          (sum, r) => sum + Number(r.amount_eur),
          0
        );

        const catData = records.reduce<CategoryTotal[]>((acc, curr) => {
          const categoryName = curr.category || 'Ostatné';
          const existing = acc.find((item) => item.name === categoryName);
          if (existing) {
            existing.value += Number(curr.amount_eur);
          } else {
            acc.push({ name: categoryName, value: Number(curr.amount_eur) });
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

  // ---- Render ----

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
          <CategoryManager
            categories={categories}
            onClose={() => setIsManagingCategories(false)}
            onRefresh={refreshCategories}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <ExpenseForm
            groupedCategories={groupedCategories}
            onSubmit={onAddExpense}
            onCancel={() => setIsAdding(false)}
            setValueRef={(setter) => {
              formSetValueRef.current = setter;
            }}
          />
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
              <MonthlyExpenseGroup
                key={group.month}
                group={group}
                groupedCategories={groupedCategories}
                editingId={editingId}
                editValues={editValues}
                onEdit={handleEdit}
                onUpdate={handleUpdate}
                onCancelEdit={() => setEditingId(null)}
                onDelete={handleDelete}
                onEditValueChange={handleEditValueChange}
              />
            ))
          )}
        </div>

        <ExpenseCategorySidebar expenses={expenses} loading={loading} />
      </div>
    </div>
  );
}
