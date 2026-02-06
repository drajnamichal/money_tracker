'use client';

import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface BenchmarkComparisonProps {
  portfolioReturn: number;
}

export function BenchmarkComparison({
  portfolioReturn,
}: BenchmarkComparisonProps) {
  const data = [
    { name: 'Tvoje', value: portfolioReturn, color: '#2563eb' },
    { name: 'S&P 500', value: 24.2, color: '#10b981' },
    { name: 'MSCI World', value: 18.5, color: '#f59e0b' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={20} className="text-blue-600" />
        <h3 className="font-bold">Vs. Benchmark (YTD)</h3>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                fontSize: '12px',
                fontWeight: 700,
              }}
              formatter={(value: number) => [`${value.toFixed(2)}%`, 'Výnos']}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-slate-400 text-center mt-4 font-medium italic">
        *Benchmarky sú odhadované ročné výnosy pre rok 2024.
      </p>
    </div>
  );
}
