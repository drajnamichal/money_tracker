'use client';

import { formatCurrency } from '@/lib/utils';
import {
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
} from 'lucide-react';
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
  editValues: {
    description: string;
    category: string;
    amount: number;
    record_date: string;
  };
  onEdit: (expense: ExpenseRecord) => void;
  onUpdate: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onEditValueChange: (field: string, value: string) => void;
}

export function MonthlyExpenseGroup({
  group,
  groupedCategories,
  editingId,
  editValues,
  onEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  onEditValueChange,
}: MonthlyExpenseGroupProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-rose-500" />
          <h3 className="font-bold text-slate-900 dark:text-white capitalize">
            {new Date(group.month).toLocaleDateString('sk-SK', {
              month: 'long',
              year: 'numeric',
            })}
          </h3>
        </div>
        <div className="text-sm font-black text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/50">
          Spolu: {formatCurrency(group.total)}
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="px-6 py-4 bg-slate-50/30 dark:bg-slate-800/10 border-b">
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={group.categoryData}
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
                {group.categoryData.map((_entry, index) => (
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
          {group.categoryData.slice(0, 5).map((cat, idx) => (
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
          expenses={group.records}
          total={group.total}
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
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {group.records.map((expense) => (
              <tr
                key={expense.id}
                className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group ${expense.isOptimistic ? 'opacity-50' : ''}`}
              >
                {editingId === expense.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={editValues.record_date}
                        onChange={(e) =>
                          onEditValueChange('record_date', e.target.value)
                        }
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
                        className="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editValues.category}
                        onChange={(e) =>
                          onEditValueChange('category', e.target.value)
                        }
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
                        className="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 text-right outline-none focus:ring-1 focus:ring-rose-500 font-bold"
                      />
                    </td>
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
                    <td className="px-6 py-4 text-right font-black text-rose-600">
                      -{formatCurrency(expense.amount_eur)}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
