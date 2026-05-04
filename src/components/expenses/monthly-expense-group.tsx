'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CHART_COLORS, TOOLTIP_STYLE } from '@/lib/constants';
import { MonthlyAISummary } from './monthly-ai-summary';
import type { ExpenseRecord, ExpenseCategory } from '@/types/financial';

interface CategoryTotal {
  name: string;
  value: number;
}

interface GroupedCategory {
  id: string;
  name: string;
  subcategories: ExpenseCategory[];
}

export interface ExpenseGroup {
  month: string;
  records: ExpenseRecord[];
  total: number;
  categoryData: CategoryTotal[];
}

interface MonthlyExpenseGroupProps {
  group: ExpenseGroup;
  groupedCategories: GroupedCategory[];
  editingId: string | null;
  isCollapsed: boolean;
  isSummaryFocused: boolean;
  trend: {
    tone: 'increase' | 'decrease' | 'neutral';
    label: string;
    summary: string;
    helper: string;
  } | null;
  editValues: {
    description: string;
    category: string;
    amount: number;
    record_date: string;
  };
  onToggleCollapse: () => void;
  onEdit: (expense: ExpenseRecord) => void;
  onUpdate: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onEditValueChange: (field: string, value: string) => void;
  onEditKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    id: string
  ) => void;
}

export function MonthlyExpenseGroup({
  group,
  groupedCategories,
  editingId,
  isCollapsed,
  isSummaryFocused,
  trend,
  editValues,
  onToggleCollapse,
  onEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  onEditValueChange,
  onEditKeyDown,
}: MonthlyExpenseGroupProps) {
  const trendStyles =
    trend?.tone === 'increase'
      ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50'
      : trend?.tone === 'decrease'
        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50'
        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  // Per-month "include in total" toggles. Held only in component state so a
  // page refresh restores the default (everything counted) — exactly the
  // behaviour requested by the user.
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());

  const toggleIncluded = useCallback((id: string) => {
    setExcludedIds((current) => {
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
    setExcludedIds(new Set());
  }, []);

  const includedRecords = useMemo(
    () => group.records.filter((record) => !excludedIds.has(record.id)),
    [group.records, excludedIds]
  );

  const displayedTotal = useMemo(
    () =>
      includedRecords.reduce((sum, record) => sum + Number(record.amount_eur), 0),
    [includedRecords]
  );

  const displayedCategoryData = useMemo<CategoryTotal[]>(() => {
    const buckets = includedRecords.reduce<CategoryTotal[]>((acc, record) => {
      const categoryName = record.category || 'Ostatné';
      const existing = acc.find((item) => item.name === categoryName);
      if (existing) {
        existing.value += Number(record.amount_eur);
      } else {
        acc.push({ name: categoryName, value: Number(record.amount_eur) });
      }
      return acc;
    }, []);
    return buckets.sort((a, b) => b.value - a.value);
  }, [includedRecords]);

  const totalRecords = group.records.length;
  const includedCount = includedRecords.length;
  const hasExclusions = includedCount !== totalRecords;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={isCollapsed ? 'Rozbaliť mesiac' : 'Zbaliť mesiac'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-rose-500" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white capitalize">
                {new Date(group.month).toLocaleDateString('sk-SK', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <p className="text-xs text-slate-500">
                {hasExclusions
                  ? `${includedCount} / ${totalRecords} započítaných položiek`
                  : `${totalRecords} položiek`}
              </p>
              {trend && (
                <p
                  className={`text-xs font-medium ${
                    trend.tone === 'increase'
                      ? 'text-rose-600 dark:text-rose-300'
                      : trend.tone === 'decrease'
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {trend.summary}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <div
              className={`text-xs font-black px-3 py-1 rounded-full border ${trendStyles}`}
              title={trend.helper}
            >
              {trend.label}
            </div>
          )}
          {hasExclusions && (
            <button
              type="button"
              onClick={resetIncluded}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Znova zaškrtnúť všetky výdavky"
            >
              <RotateCcw size={12} />
              Resetovať
            </button>
          )}
          <div
            className="text-sm font-black text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/50"
            title={
              hasExclusions
                ? `Pôvodne: ${formatCurrency(group.total)} (${totalRecords} položiek)`
                : undefined
            }
          >
            Spolu: {formatCurrency(displayedTotal)}
            {hasExclusions && (
              <span className="ml-1 text-[10px] font-bold text-slate-500">
                ({includedCount}/{totalRecords})
              </span>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Monthly Chart */}
            <div className="px-6 py-4 bg-slate-50/30 dark:bg-slate-800/10 border-b">
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={displayedCategoryData}
                    layout="vertical"
                    margin={{ left: -20, right: 20, top: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" hide width={100} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => formatCurrency(Number(value ?? 0))}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {displayedCategoryData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {displayedCategoryData.slice(0, 5).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                      }}
                    />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                      {cat.name}: {formatCurrency(cat.value)}
                    </span>
                  </div>
                ))}
              </div>

              <MonthlyAISummary
                month={group.month}
                expenses={includedRecords}
                total={displayedTotal}
                isFocused={isSummaryFocused}
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
                    <th
                      className="px-3 py-3 text-center"
                      title="Započítať do mesačného súčtu"
                    >
                      ✓
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {group.records.map((expense) => {
                    const isIncluded = !excludedIds.has(expense.id);
                    const isCurrentlyEditing = editingId === expense.id;
                    return (
                    <tr
                      key={expense.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group ${
                        expense.isOptimistic ? 'opacity-50' : ''
                      } ${
                        !isIncluded && !isCurrentlyEditing
                          ? 'opacity-50 bg-slate-50/40 dark:bg-slate-800/20'
                          : ''
                      }`}
                    >
                      {isCurrentlyEditing ? (
                        <>
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              value={editValues.record_date}
                              onChange={(e) =>
                                onEditValueChange('record_date', e.target.value)
                              }
                              onKeyDown={(event) => onEditKeyDown(event, expense.id)}
                              className="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={editValues.description}
                              onChange={(e) =>
                                onEditValueChange('description', e.target.value)
                              }
                              onKeyDown={(event) => onEditKeyDown(event, expense.id)}
                              className="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={editValues.category}
                              onChange={(e) =>
                                onEditValueChange('category', e.target.value)
                              }
                              onKeyDown={(event) => onEditKeyDown(event, expense.id)}
                              className="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500"
                            >
                              {groupedCategories.map((g) => (
                                <optgroup key={g.id} label={g.name}>
                                  {g.subcategories.map((sub) => (
                                    <option
                                      key={sub.id}
                                      value={`${g.name}: ${sub.name}`}
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
                                onEditValueChange('amount', e.target.value)
                              }
                              onKeyDown={(event) => onEditKeyDown(event, expense.id)}
                              className="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 text-right outline-none focus:ring-1 focus:ring-rose-500 font-bold"
                            />
                          </td>
                          <td className="px-3 py-2"></td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => onUpdate(expense.id)}
                                className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md hover:bg-emerald-200 transition-colors"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={onCancelEdit}
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
                            {new Date(expense.record_date).toLocaleDateString(
                              'sk-SK',
                              { day: '2-digit', month: '2-digit' }
                            )}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                            {expense.description}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-black uppercase tracking-tighter">
                              {expense.category}
                            </span>
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-black ${
                              isIncluded
                                ? 'text-rose-600'
                                : 'text-slate-400 line-through'
                            }`}
                          >
                            -{formatCurrency(expense.amount_eur)}
                          </td>
                          <td className="px-3 py-4 text-center">
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => toggleIncluded(expense.id)}
                                aria-label={
                                  isIncluded
                                    ? 'Vyradiť z mesačného súčtu'
                                    : 'Pridať do mesačného súčtu'
                                }
                                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-2 focus:ring-rose-500 focus:ring-offset-0 cursor-pointer accent-rose-600"
                              />
                            </label>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                disabled={expense.isOptimistic}
                                onClick={() => onEdit(expense)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-all"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                disabled={expense.isOptimistic}
                                onClick={() => onDelete(expense.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
