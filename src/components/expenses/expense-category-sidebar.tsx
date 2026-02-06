'use client';

import { useMemo } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/skeleton';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
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

/** Custom Treemap cell content with label */
function TreemapCell(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  index: number;
  value: number;
  root: { children: { value: number }[] };
}) {
  const { x, y, width, height, name, index, value, root } = props;
  const color = CHART_COLORS[index % CHART_COLORS.length];
  const total = root?.children?.reduce((s, c) => s + c.value, 0) ?? 1;
  const pct = Math.round((value / total) * 100);
  const showLabel = width > 50 && height > 32;
  const showPct = width > 40 && height > 20;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={color}
        stroke="hsl(var(--background))"
        strokeWidth={2}
        className="transition-opacity hover:opacity-80"
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showPct ? 6 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white text-[9px] font-bold pointer-events-none"
        >
          {name.length > width / 7 ? name.slice(0, Math.floor(width / 7)) + '…' : name}
        </text>
      )}
      {showLabel && showPct && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white/70 text-[8px] font-medium pointer-events-none"
        >
          {pct}%
        </text>
      )}
    </g>
  );
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
      <div className="h-[220px] mb-6">
        {loading ? (
          <Skeleton className="w-full h-full rounded-xl" />
        ) : categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={sortedCategoryData}
              dataKey="value"
              aspectRatio={4 / 3}
              content={<TreemapCell x={0} y={0} width={0} height={0} name="" index={0} value={0} root={{ children: [] }} />}
            >
              <Tooltip
                contentStyle={{ ...TOOLTIP_STYLE, fontSize: '12px' }}
                formatter={(value) => formatCurrency(Number(value ?? 0))}
              />
            </Treemap>
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
                className="w-2.5 h-2.5 rounded-sm shrink-0"
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
