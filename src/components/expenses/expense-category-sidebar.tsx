'use client';

import { useMemo } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CHART_COLORS, TOOLTIP_STYLE } from '@/lib/constants';
import type { ExpenseRecord } from '@/types/financial';

interface CategoryTotal {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface ExpenseCategorySidebarProps {
  expenses: ExpenseRecord[];
  loading: boolean;
}

export function ExpenseCategorySidebar({
  expenses,
  loading,
}: ExpenseCategorySidebarProps) {
  const categoryData = useMemo(() => {
    return expenses.reduce<CategoryTotal[]>((acc, curr) => {
      const categoryName = curr.category || 'Ostatné';
      const existing = acc.find((item) => item.name === categoryName);
      if (existing) {
        existing.value += Number(curr.amount_eur);
      } else {
        acc.push({ name: categoryName, value: Number(curr.amount_eur) });
      }
      return acc;
    }, []);
  }, [expenses]);

  const sortedCategoryData = useMemo(() => {
    return [...categoryData].sort((a, b) => b.value - a.value);
  }, [categoryData]);

  const totalExpensesValue = useMemo(() => {
    return categoryData.reduce((sum, cat) => sum + cat.value, 0);
  }, [categoryData]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border h-fit sticky top-8">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <PieChartIcon size={20} className="text-rose-500" />
        Rozdelenie výdavkov
      </h3>
      <div className="h-[200px] mb-8">
        {loading ? (
          <Skeleton className="w-full h-full rounded-full" />
        ) : categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ ...TOOLTIP_STYLE, fontSize: '12px' }}
                formatter={(value) => formatCurrency(Number(value ?? 0))}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
            Pridaj výdavky pre zobrazenie grafu
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {sortedCategoryData.map((item, idx) => (
          <div
            key={item.name}
            className="flex items-center justify-between group p-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                }}
              />
              <span
                className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate"
                title={item.name}
              >
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(item.value)}
              </span>
              <span className="text-[10px] text-slate-400 w-8 text-right">
                {totalExpensesValue > 0
                  ? `${Math.round((item.value / totalExpensesValue) * 100)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
