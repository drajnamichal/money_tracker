'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Loader2, Scan, Settings2, Filter, Search } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { assertSuccess, showError } from '@/lib/error-handling';
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
import type { ExpenseRecord, ExpenseCategory } from '@/types/financial';

export interface ExpensesClientProps {
  initialExpenses: ExpenseRecord[];
  initialCategories: ExpenseCategory[];
}

interface CategoryTotal {
  name: string;
  value: number;
}

export function ExpensesClient({
  initialExpenses,
  initialCategories,
}: ExpensesClientProps) {
  const {
    records: expenses,
    categories,
    loading,
    refresh,
    refreshCategories,
  } = useExpenseData({
    initialRecords: initialExpenses,
    initialCategories,
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
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
      assertSuccess(error, 'Pridanie výdavku');

      // Only "Vybavenie bytu" expenses count towards the apartment budget
      if (values.category === 'Bývanie: vybavenie bytu') {
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
    } catch (err) {
      showError(err, 'Chyba pri pridávaní výdavku');
    }
  };

  const handleDelete = async (id: string) => {
    // Capture the record before deleting so we can restore it
    const deletedRecord = expenses.find((e) => e.id === id);
    if (!deletedRecord) return;

    try {
      const { error } = await supabase
        .from('expense_records')
        .delete()
        .eq('id', id);
      assertSuccess(error, 'Mazanie výdavku');

      await refresh();
      toast.success('Výdavok bol vymazaný', {
        action: {
          label: 'Vrátiť späť',
          onClick: async () => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { id: _id, isOptimistic: _opt, ...rest } = deletedRecord;
              await supabase.from('expense_records').insert([rest]);
              await refresh();
              toast.success('Výdavok bol obnovený');
            } catch {
              toast.error('Nepodarilo sa obnoviť výdavok');
            }
          },
        },
      });
    } catch (err) {
      showError(err, 'Chyba pri mazaní výdavku');
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

      assertSuccess(error, 'Aktualizácia výdavku');

      setEditingId(null);
      await refresh();
      toast.success('Výdavok aktualizovaný');
    } catch (err) {
      showError(err, 'Chyba pri aktualizácii výdavku');
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
    } catch (err) {
      showError(err, 'Chyba pri skenovaní bločku');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---- Filtered + Grouped expense data ----

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (filterCategory) {
      result = result.filter((e) =>
        e.category?.toLowerCase().startsWith(filterCategory.toLowerCase())
      );
    }
    if (filterSearch.trim()) {
      const term = filterSearch.toLowerCase();
      result = result.filter(
        (e) =>
          e.description?.toLowerCase().includes(term) ||
          e.category?.toLowerCase().includes(term) ||
          e.amount?.toString().includes(term)
      );
    }
    return result;
  }, [expenses, filterCategory, filterSearch]);

  const hasActiveFilters = filterCategory !== '' || filterSearch.trim() !== '';

  const groupedExpenses: ExpenseGroup[] = useMemo(() => {
    const groups: Record<string, ExpenseRecord[]> = {};
    filteredExpenses.forEach((expense) => {
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
  }, [filteredExpenses]);

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
          <button
            onClick={() => setIsAdding(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            <span>Pridať výdavok</span>
          </button>
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

      {/* Filter Bar */}
      {!loading && expenses.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Hľadať popis, kategóriu..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-white dark:bg-slate-900 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 min-w-[180px]"
          >
            <option value="">Všetky kategórie</option>
            {groupedCategories.map((group) => (
              <optgroup key={group.id} label={group.name}>
                {group.subcategories.map((sub) => (
                  <option key={sub.id} value={`${group.name}: ${sub.name}`}>
                    {sub.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilterCategory('');
                setFilterSearch('');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 rounded-xl transition-colors"
            >
              <Filter size={14} />
              Zrušiť filtre ({filteredExpenses.length}/{expenses.length})
            </button>
          )}
        </div>
      )}

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
              {hasActiveFilters
                ? 'Žiadne výdavky nezodpovedajú filtrom.'
                : 'Žiadne výdavky nenájdené. Začni pridaním prvého.'}
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

        <ExpenseCategorySidebar expenses={filteredExpenses} loading={loading} />
      </div>
    </div>
  );
}
