'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Plus,
  Loader2,
  Scan,
  Settings2,
  Filter,
  Search,
  CalendarDays,
  ReceiptText,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { assertSuccess, showError } from '@/lib/error-handling';
import { Skeleton } from '@/components/skeleton';
import { useExpenseData } from '@/hooks/use-financial-data';
import { compressImage } from '@/lib/image-utils';
import { formatCurrency } from '@/lib/utils';
import { TOOLTIP_STYLE } from '@/lib/constants';
import { ExpenseForm } from '@/components/expenses/expense-form';
import type { ExpenseFormValues } from '@/components/expenses/expense-form';
import { CategoryManager } from '@/components/expenses/category-manager';
import {
  MonthlyExpenseGroup,
  type ExpenseGroup,
} from '@/components/expenses/monthly-expense-group';
import { ExpenseCategorySidebar } from '@/components/expenses/expense-category-sidebar';
import type { ExpenseRecord, ExpenseCategory } from '@/types/financial';
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ExpensesClientProps {
  initialExpenses: ExpenseRecord[];
  initialCategories: ExpenseCategory[];
}

interface CategoryTotal {
  name: string;
  value: number;
}

interface MonthlyOverviewPoint {
  month: string;
  label: string;
  fullLabel: string;
  total: number;
  count: number;
}

type OverviewMode = 'all' | 'month';
type TrendTone = 'increase' | 'decrease' | 'neutral';

interface MonthTrend {
  difference: number;
  percentChange: number | null;
  tone: TrendTone;
  label: string;
  summary: string;
  helper: string;
}

export function ExpensesClient({
  initialExpenses,
  initialCategories,
}: ExpensesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [overviewMode, setOverviewMode] = useState<OverviewMode>('all');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [highlightedMonth, setHighlightedMonth] = useState<string | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    description: '',
    category: '',
    amount: 0,
    record_date: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);
  const monthSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightTimeoutRef = useRef<number | null>(null);
  const hasInitializedFromUrlRef = useRef(false);
  const searchParamsRef = useRef(searchParams);
  const formSetValueRef = useRef<
    ((name: keyof ExpenseFormValues, value: string) => void) | null
  >(null);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

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

  const monthlyOverview = useMemo<MonthlyOverviewPoint[]>(() => {
    return [...groupedExpenses].reverse().map((group) => {
      const monthDate = new Date(`${group.month}-01`);

      return {
        month: group.month,
        label: monthDate.toLocaleDateString('sk-SK', {
          month: 'short',
          year: '2-digit',
        }),
        fullLabel: monthDate.toLocaleDateString('sk-SK', {
          month: 'long',
          year: 'numeric',
        }),
        total: group.total,
        count: group.records.length,
      };
    });
  }, [groupedExpenses]);

  const newestTrackedMonth = groupedExpenses[0]?.month ?? null;
  const activeSelectedMonth =
    selectedMonth && groupedExpenses.some((group) => group.month === selectedMonth)
      ? selectedMonth
      : newestTrackedMonth;

  const visibleGroupedExpenses = useMemo(() => {
    if (overviewMode !== 'month' || !activeSelectedMonth) {
      return groupedExpenses;
    }

    return groupedExpenses.filter((group) => group.month === activeSelectedMonth);
  }, [groupedExpenses, overviewMode, activeSelectedMonth]);

  const visibleExpenses = useMemo(() => {
    if (overviewMode !== 'month' || !activeSelectedMonth) {
      return filteredExpenses;
    }

    return filteredExpenses.filter((expense) => {
      const date = new Date(expense.record_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === activeSelectedMonth;
    });
  }, [filteredExpenses, overviewMode, activeSelectedMonth]);

  const overviewStats = useMemo(() => {
    const source =
      overviewMode === 'month' && activeSelectedMonth
        ? monthlyOverview.filter((item) => item.month === activeSelectedMonth)
        : monthlyOverview;
    const trackedMonths = source.length;
    const totalSpent = source.reduce((sum, item) => sum + item.total, 0);
    const totalRecords = source.reduce((sum, item) => sum + item.count, 0);
    const averagePerMonth = trackedMonths > 0 ? totalSpent / trackedMonths : 0;
    const topMonth = source.reduce<MonthlyOverviewPoint | null>(
      (highest, item) => {
        if (!highest || item.total > highest.total) {
          return item;
        }
        return highest;
      },
      null
    );

    return {
      trackedMonths,
      totalSpent,
      totalRecords,
      averagePerMonth,
      topMonth,
    };
  }, [monthlyOverview, overviewMode, activeSelectedMonth]);

  const monthComparison = useMemo(() => {
    if (!activeSelectedMonth) {
      return null;
    }

    const selectedIndex = monthlyOverview.findIndex(
      (item) => item.month === activeSelectedMonth
    );

    if (selectedIndex === -1) {
      return null;
    }

    const current = monthlyOverview[selectedIndex];
    const previous = selectedIndex > 0 ? monthlyOverview[selectedIndex - 1] : null;
    const difference = current.total - (previous?.total ?? 0);
    const percentChange =
      previous && previous.total > 0 ? (difference / previous.total) * 100 : null;

    return {
      current,
      previous,
      difference,
      percentChange,
      isIncrease: difference > 0,
    };
  }, [monthlyOverview, activeSelectedMonth]);

  const selectedMonthIndex = useMemo(() => {
    if (!activeSelectedMonth) {
      return -1;
    }

    return monthlyOverview.findIndex((item) => item.month === activeSelectedMonth);
  }, [monthlyOverview, activeSelectedMonth]);

  const previousSelectableMonth =
    selectedMonthIndex > 0 ? monthlyOverview[selectedMonthIndex - 1] : null;
  const nextSelectableMonth =
    selectedMonthIndex >= 0 && selectedMonthIndex < monthlyOverview.length - 1
      ? monthlyOverview[selectedMonthIndex + 1]
      : null;

  const monthTrendMap = useMemo<Record<string, MonthTrend>>(() => {
    return monthlyOverview.reduce<Record<string, MonthTrend>>((acc, current, index) => {
      const previous = index > 0 ? monthlyOverview[index - 1] : null;

      if (!previous) {
        acc[current.month] = {
          difference: 0,
          percentChange: null,
          tone: 'neutral',
          label: 'Bez porovnania',
          summary: 'Bez porovnania s minulým mesiacom',
          helper: 'Toto je prvý dostupný mesiac v prehľade.',
        };
        return acc;
      }

      const difference = current.total - previous.total;
      const percentChange =
        previous.total > 0 ? (difference / previous.total) * 100 : null;
      const isNeutral =
        difference === 0 || (percentChange !== null && Math.abs(percentChange) < 5);
      const tone: TrendTone = isNeutral
        ? 'neutral'
        : difference > 0
          ? 'increase'
          : 'decrease';
      const direction =
        tone === 'increase'
          ? 'viac než minulý mesiac'
          : tone === 'decrease'
            ? 'menej než minulý mesiac'
            : 'takmer rovnako ako minulý mesiac';
      const label =
        percentChange === null
          ? 'Bez % zmeny'
          : `${difference > 0 ? '+' : difference < 0 ? '' : ''}${percentChange.toFixed(1)} %`;
      const summary =
        percentChange === null
          ? `Zmena ${difference > 0 ? 'nahor' : 'nadol'} bez percenta`
          : tone === 'increase'
            ? `O ${Math.abs(percentChange).toFixed(1)} % viac než minulý mesiac`
            : tone === 'decrease'
              ? `O ${Math.abs(percentChange).toFixed(1)} % menej než minulý mesiac`
              : 'Takmer rovnako ako minulý mesiac';

      acc[current.month] = {
        difference,
        percentChange,
        tone,
        label,
        summary,
        helper: `${current.fullLabel}: ${direction}`,
      };

      return acc;
    }, {});
  }, [monthlyOverview]);

  const comparisonTone: TrendTone = useMemo(() => {
    if (!monthComparison?.previous) {
      return 'neutral';
    }

    if (
      monthComparison.difference === 0 ||
      (monthComparison.percentChange !== null &&
        Math.abs(monthComparison.percentChange) < 5)
    ) {
      return 'neutral';
    }

    return monthComparison.difference > 0 ? 'increase' : 'decrease';
  }, [monthComparison]);

  const comparisonComment = useMemo(() => {
    if (!monthComparison?.current) {
      return null;
    }

    if (!monthComparison.previous) {
      return `Pre ${monthComparison.current.fullLabel} ešte nemáš starší mesiac na porovnanie.`;
    }

    if (monthComparison.difference === 0) {
      return `Výdavky sú presne rovnaké ako v ${monthComparison.previous.fullLabel}.`;
    }

    if (
      monthComparison.percentChange !== null &&
      Math.abs(monthComparison.percentChange) < 5
    ) {
      return `V ${monthComparison.current.fullLabel} míňaš takmer rovnako ako v minulom mesiaci.`;
    }

    if (monthComparison.percentChange === null) {
      return monthComparison.difference > 0
        ? `V ${monthComparison.current.fullLabel} máš vyššie výdavky než v ${monthComparison.previous.fullLabel}.`
        : `V ${monthComparison.current.fullLabel} máš nižšie výdavky než v ${monthComparison.previous.fullLabel}.`;
    }

    const formattedPercent = `${Math.abs(monthComparison.percentChange).toFixed(1)} %`;

    return monthComparison.difference > 0
      ? `V ${monthComparison.current.fullLabel} míňaš o ${formattedPercent} viac než minulý mesiac.`
      : `V ${monthComparison.current.fullLabel} míňaš o ${formattedPercent} menej než minulý mesiac.`;
  }, [monthComparison]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isAdding) {
      window.setTimeout(() => {
        formSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 80);
    }
  }, [isAdding]);

  useEffect(() => {
    if (monthlyOverview.length === 0) {
      return;
    }

    const monthParam = searchParams.get('month');
    const viewParam = searchParams.get('view');
    const validMonth = monthlyOverview.some((item) => item.month === monthParam)
      ? monthParam
      : null;

    if (validMonth && selectedMonth !== validMonth) {
      setSelectedMonth(validMonth);
    }

    if (!validMonth && !hasInitializedFromUrlRef.current && newestTrackedMonth) {
      setSelectedMonth(newestTrackedMonth);
    }

    if (viewParam === 'month' && validMonth && overviewMode !== 'month') {
      setOverviewMode('month');
    }

    if (viewParam === 'all' && overviewMode !== 'all') {
      setOverviewMode('all');
    }

    hasInitializedFromUrlRef.current = true;
  }, [
    monthlyOverview,
    newestTrackedMonth,
    overviewMode,
    searchParams,
    selectedMonth,
  ]);

  useEffect(() => {
    if (!hasInitializedFromUrlRef.current) {
      return;
    }

    const current = searchParamsRef.current;
    const params = new URLSearchParams(current.toString());

    if (activeSelectedMonth) {
      params.set('month', activeSelectedMonth);
    } else {
      params.delete('month');
    }

    params.set('view', overviewMode);

    const nextQuery = params.toString();
    const currentQuery = current.toString();

    if (nextQuery !== currentQuery) {
      router.replace(
        nextQuery ? `${pathname}?${nextQuery}` : pathname,
        { scroll: false }
      );
    }
  }, [activeSelectedMonth, overviewMode, pathname, router]);

  const handleOverviewModeChange = useCallback(
    (mode: OverviewMode) => {
      if (mode === 'month') {
        const target = selectedMonth ?? newestTrackedMonth;
        if (!selectedMonth && target) {
          setSelectedMonth(target);
        }
        if (target) {
          setCollapsedMonths((current) =>
            current.includes(target)
              ? current.filter((value) => value !== target)
              : current
          );
        }
      }

      setOverviewMode(mode);
    },
    [newestTrackedMonth, selectedMonth]
  );

  const handleMonthSelect = useCallback(
    (month: string, shouldScroll = false) => {
      setSelectedMonth(month);
      setOverviewMode('month');
      setCollapsedMonths((current) => current.filter((value) => value !== month));

      if (shouldScroll) {
        if (highlightTimeoutRef.current) {
          window.clearTimeout(highlightTimeoutRef.current);
        }

        setHighlightedMonth(month);
        window.setTimeout(() => {
          monthSectionRefs.current[month]?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 120);

        highlightTimeoutRef.current = window.setTimeout(() => {
          setHighlightedMonth((current) => (current === month ? null : current));
        }, 2200);
      }
    },
    []
  );

  const toggleMonthCollapse = useCallback((month: string) => {
    setCollapsedMonths((current) =>
      current.includes(month)
        ? current.filter((value) => value !== month)
        : [...current, month]
    );
  }, []);

  const renderOverviewDot = useCallback(
    (props: {
      cx?: number;
      cy?: number;
      payload?: { month?: string };
    }) => {
      const { cx, cy, payload } = props;
      const isSelected = payload?.month === activeSelectedMonth;

      return (
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? 6 : 4}
          fill={isSelected ? '#be123c' : '#e11d48'}
          stroke="white"
          strokeWidth={isSelected ? 3 : 2}
          className="cursor-pointer"
        />
      );
    },
    [activeSelectedMonth]
  );

  const handleEditKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
      id: string
    ) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setEditingId(null);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        void handleUpdate(id);
      }
    },
    [handleUpdate]
  );

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

      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Prehľad výdavkov za všetky mesiace
          </h2>
          <p className="text-sm text-slate-500">
            Najprv vidíš vývoj výdavkov naprieč všetkými zaznamenanými mesiacmi
            a až nižšie detailné pridávanie a zoznam položiek.
          </p>
        </div>

        {!loading && monthlyOverview.length > 0 && (
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="inline-flex w-fit rounded-2xl border bg-white dark:bg-slate-900 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => handleOverviewModeChange('all')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  overviewMode === 'all'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Všetky mesiace
              </button>
              <button
                type="button"
                onClick={() => handleOverviewModeChange('month')}
                disabled={!activeSelectedMonth}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  overviewMode === 'month'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Vybraný mesiac
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-sm font-medium text-slate-500">
                Mesiac
              </label>
              <select
                value={activeSelectedMonth ?? ''}
                onChange={(e) => handleMonthSelect(e.target.value)}
                disabled={monthlyOverview.length === 0}
                className="bg-white dark:bg-slate-900 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 min-w-[220px]"
              >
                {monthlyOverview
                  .slice()
                  .reverse()
                  .map((item) => (
                    <option key={item.month} value={item.month}>
                      {item.fullLabel}
                    </option>
                  ))}
              </select>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    previousSelectableMonth &&
                    handleMonthSelect(previousSelectableMonth.month, true)
                  }
                  disabled={!previousSelectableMonth}
                  className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={16} />
                  Predchádzajúci
                </button>
                <button
                  type="button"
                  onClick={() =>
                    nextSelectableMonth &&
                    handleMonthSelect(nextSelectableMonth.month, true)
                  }
                  disabled={!nextSelectableMonth}
                  className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Ďalší
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <Skeleton className="h-[360px] rounded-2xl xl:col-span-2" />
              <Skeleton className="h-[360px] rounded-2xl" />
            </div>
          </div>
        ) : monthlyOverview.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-12 text-center text-slate-400">
            {hasActiveFilters
              ? 'Žiadne výdavky nezodpovedajú filtrom.'
              : 'Zatiaľ nemáš žiadne výdavky na zobrazenie prehľadu.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {overviewMode === 'month'
                        ? 'Vybraný mesiac'
                        : 'Zatrackované mesiace'}
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                      {overviewMode === 'month'
                        ? monthComparison?.current?.fullLabel ?? '-'
                        : overviewStats.trackedMonths}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {overviewStats.totalRecords} zaevidovaných výdavkov
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                    <CalendarDays size={18} />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Celkové výdavky
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                      {formatCurrency(overviewStats.totalSpent)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      súčet za všetky zobrazené mesiace
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                    <ReceiptText size={18} />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Priemer na mesiac
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                      {formatCurrency(overviewStats.averagePerMonth)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      pri aktuálnom výbere dát
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <TrendingUp size={18} />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Najsilnejší mesiac
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                      {overviewStats.topMonth
                        ? formatCurrency(overviewStats.topMonth.total)
                        : formatCurrency(0)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 capitalize">
                      {overviewStats.topMonth?.fullLabel ?? 'Zatiaľ bez dát'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                    <Filter size={18} />
                  </div>
                </div>
              </div>
            </div>

            {overviewMode === 'month' && monthComparison?.current && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Porovnanie s predchádzajúcim mesiacom
                    </h3>
                    <p className="text-sm text-slate-500">
                      {monthComparison.current.fullLabel}
                      {monthComparison.previous
                        ? ` vs. ${monthComparison.previous.fullLabel}`
                        : ' je prvý dostupný mesiac v prehľade'}
                    </p>
                  </div>

                  {monthComparison.previous ? (
                    <div
                      className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                        comparisonTone === 'increase'
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
                          : comparisonTone === 'decrease'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {comparisonTone === 'increase' ? (
                        <TrendingUp size={16} />
                      ) : comparisonTone === 'decrease' ? (
                        <TrendingDown size={16} />
                      ) : (
                        <Filter size={16} />
                      )}
                      {monthComparison.difference === 0
                        ? 'Bez zmeny'
                        : `${monthComparison.difference > 0 ? '+' : ''}${formatCurrency(
                            monthComparison.difference
                          )}`}
                      {monthComparison.percentChange !== null &&
                        ` (${monthComparison.percentChange > 0 ? '+' : ''}${monthComparison.percentChange.toFixed(1)} %)`}
                    </div>
                  ) : (
                    <div className="inline-flex w-fit items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Nie je k dispozícii predchádzajúci mesiac
                    </div>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Aktuálny mesiac
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {formatCurrency(monthComparison.current.total)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {monthComparison.current.count} položiek
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Predchádzajúci mesiac
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {formatCurrency(monthComparison.previous?.total ?? 0)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {monthComparison.previous?.count ?? 0} položiek
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Rozdiel
                    </p>
                    <p
                      className={`mt-2 text-2xl font-black ${
                        comparisonTone === 'increase'
                          ? 'text-rose-600'
                          : comparisonTone === 'decrease'
                            ? 'text-emerald-600'
                            : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {monthComparison.difference > 0 ? '+' : ''}
                      {formatCurrency(monthComparison.difference)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {monthComparison.percentChange !== null
                        ? `${monthComparison.percentChange > 0 ? '+' : ''}${monthComparison.percentChange.toFixed(1)} %`
                        : 'Percento nie je dostupné'}
                    </p>
                  </div>
                </div>

                {comparisonComment && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={monthComparison.current.month}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22 }}
                      className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 ${
                        comparisonTone === 'increase'
                          ? 'border-rose-100 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/20'
                          : comparisonTone === 'decrease'
                            ? 'border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                            : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
                      }`}
                    >
                      {comparisonComment}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Vývoj výdavkov podľa mesiacov
                    </h3>
                    <p className="text-sm text-slate-500">
                      Porovnaj si celkové mesačné výdavky a počet položiek.
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <span className="inline-flex w-fit items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                      Filtrovaný prehľad
                    </span>
                  )}
                </div>

                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyOverview}
                      margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                      onClick={(state) => {
                        const month = state?.activePayload?.[0]?.payload?.month;
                        if (month) {
                          handleMonthSelect(month, true);
                        }
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="expenses-overview-fill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="5%" stopColor="#e11d48" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#e11d48" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke="rgba(148, 163, 184, 0.2)"
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={80}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickFormatter={(value) => formatCurrency(Number(value)).replace(',00', '')}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelFormatter={(_label, payload) =>
                          payload?.[0]?.payload?.fullLabel ?? ''
                        }
                        formatter={(value, name, item) => {
                          if (name === 'count') {
                            const count = Number(value ?? 0);
                            return [
                              `${count} ${count === 1 ? 'položka' : count < 5 ? 'položky' : 'položiek'}`,
                              'Počet',
                            ];
                          }

                          return [
                            formatCurrency(Number(value ?? 0)),
                            item?.payload?.count
                              ? `Spolu (${item.payload.count} položiek)`
                              : 'Spolu',
                          ];
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="total"
                        stroke="#e11d48"
                        strokeWidth={3}
                        fill="url(#expenses-overview-fill)"
                        dot={renderOverviewDot}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {monthlyOverview
                    .slice()
                    .reverse()
                    .map((item) => (
                      <button
                        key={item.month}
                        type="button"
                        onClick={() => handleMonthSelect(item.month, true)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                          item.month === activeSelectedMonth
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {item.fullLabel}
                      </button>
                    ))}
                </div>
              </div>

              <ExpenseCategorySidebar expenses={visibleExpenses} loading={loading} />
            </div>
          </>
        )}
      </section>

      <div ref={formSectionRef} className="scroll-mt-24">
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
      </div>

      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Zoznam pridaných výdavkov podľa mesiacov
            </h2>
            <p className="text-sm text-slate-500">
              {overviewMode === 'month' && activeSelectedMonth
                ? 'Zobrazený je detail vybraného mesiaca vrátane úprav, mazania a AI sumarizácie.'
                : 'Tu nájdeš detailné položky pre každý mesiac vrátane úprav, mazania a AI sumarizácie.'}
            </p>
          </div>

          {!loading && visibleGroupedExpenses.length > 1 && (
            <div className="inline-flex w-fit rounded-2xl border bg-white dark:bg-slate-900 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setCollapsedMonths(visibleGroupedExpenses.map((group) => group.month))}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Zbaliť všetko
              </button>
              <button
                type="button"
                onClick={() => setCollapsedMonths([])}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Rozbaliť všetko
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
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
            visibleGroupedExpenses.map((group) => (
              <motion.div
                key={group.month}
                ref={(element) => {
                  monthSectionRefs.current[group.month] = element;
                }}
                id={`expense-month-${group.month}`}
                initial={false}
                animate={{
                  scale: highlightedMonth === group.month ? 1.01 : 1,
                }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`scroll-mt-24 rounded-3xl transition-all duration-500 ${
                  highlightedMonth === group.month
                    ? 'ring-2 ring-rose-400 ring-offset-4 ring-offset-background bg-rose-50/20 dark:bg-rose-950/10'
                    : ''
                }`}
              >
                <MonthlyExpenseGroup
                  group={group}
                  groupedCategories={groupedCategories}
                  editingId={editingId}
                  isCollapsed={collapsedMonths.includes(group.month)}
                  isSummaryFocused={
                    overviewMode === 'month' && activeSelectedMonth === group.month
                  }
                  trend={monthTrendMap[group.month] ?? null}
                  editValues={editValues}
                  onToggleCollapse={() => toggleMonthCollapse(group.month)}
                  onEdit={handleEdit}
                  onUpdate={handleUpdate}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={handleDelete}
                  onEditValueChange={handleEditValueChange}
                  onEditKeyDown={handleEditKeyDown}
                />
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
