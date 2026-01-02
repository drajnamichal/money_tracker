import React, { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { ChartEmoji, MoneyEmoji, HouseEmoji } from './icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SummaryProps {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  expenses: any[];
}

const COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#8b5cf6',
  '#06b6d4',
];

const Summary: React.FC<SummaryProps> = ({
  totalBudget,
  totalSpent,
  remainingBudget,
  expenses,
}) => {
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    expenses.forEach((expense) => {
      const cat = expense.category || 'Ostatné';
      categories[cat] = (categories[cat] || 0) + Number(expense.amount);
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const percentageSpent =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  let progressBarColor = 'bg-emerald-500';
  let statusMessage = 'Všetko v poriadku, rozpočet je pod kontrolou.';

  if (percentageSpent > 100) {
    progressBarColor = 'bg-red-600';
    statusMessage = 'Pozor! Prekročili ste rozpočet.';
  } else if (percentageSpent >= 90) {
    progressBarColor = 'bg-red-500';
    statusMessage = 'Varovanie: Rozpočet je takmer vyčerpaný!';
  } else if (percentageSpent >= 75) {
    progressBarColor = 'bg-amber-500';
    statusMessage = 'Blížite sa k limitu rozpočtu.';
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
          <ChartEmoji className="text-xl" />
          Súhrn rozpočtu
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
            <HouseEmoji className="w-4 h-4" />
            Celkový rozpočet
          </h3>
          <p className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mt-1">
            {formatCurrency(totalBudget)}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
            <span className="text-sm" role="img" aria-label="money spent">
              💸
            </span>
            Minuté
          </h3>
          <p className="text-2xl font-semibold text-rose-600 mt-1">
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
            <MoneyEmoji className="w-4 h-4" />
            Zostáva
          </h3>
          <p className="text-2xl font-semibold text-emerald-600 mt-1">
            {formatCurrency(remainingBudget)}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Priebeh
          </span>
          <span
            className={`text-sm font-bold ${percentageSpent > 100 ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}`}
          >
            {percentageSpent.toFixed(2)}%
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3.5">
          <div
            className={`h-3.5 rounded-full transition-all duration-500 ease-out ${progressBarColor}`}
            style={{ width: `${Math.min(percentageSpent, 100)}%` }}
          ></div>
        </div>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2">
          {statusMessage}
        </p>
      </div>

      {categoryData.length > 0 && (
        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 text-center uppercase tracking-widest">
            Rozdelenie podľa kategórií
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {categoryData.map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(item.value)}
                    </span>
                    <span className="text-slate-400 w-8 text-right">
                      {((item.value / totalSpent) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Summary;
