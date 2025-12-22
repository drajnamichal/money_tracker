'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Plus, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function IncomePage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: categoriesData } = await supabase
          .from('income_categories')
          .select('*')
          .order('name');

        const { data: incomeData } = await supabase
          .from('income_records')
          .select('*, income_categories(name)')
          .order('record_month', { ascending: false });

        if (categoriesData && incomeData) {
          setCategories(categoriesData);
          setRecords(incomeData);

          // Prepare chart data (last 12 months)
          const monthlyData: any = {};
          incomeData.forEach(r => {
            const month = r.record_month.substring(0, 7);
            if (!monthlyData[month]) monthlyData[month] = { month, total: 0 };
            monthlyData[month].total += Number(r.amount_eur);
          });

          const formattedChartData = Object.values(monthlyData)
            .sort((a: any, b: any) => a.month.localeCompare(b.month))
            .slice(-12)
            .map((item: any) => ({
              name: new Date(item.month).toLocaleDateString('sk-SK', { month: 'short' }),
              total: item.total
            }));
          
          setChartData(formattedChartData);
        }
      } catch (error) {
        console.error('Error fetching income:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const latestMonth = records.length > 0 ? records[0].record_month : null;
  const currentMonthIncome = records
    .filter(r => r.record_month === latestMonth)
    .reduce((sum, r) => sum + Number(r.amount_eur), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Príjmy</h1>
          <p className="text-slate-500">Sleduj svoje mesačné prítoky financií.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
          <Plus size={20} />
          <span>Pridať príjem</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border col-span-1 md:col-span-2">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" />
            Trend príjmov (12 mesiacov)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Príjem']}
                />
                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-200 dark:shadow-none flex flex-col justify-center">
          <Calendar size={32} className="mb-4 opacity-50" />
          <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Tento mesiac</p>
          <h2 className="text-4xl font-bold mb-1">{formatCurrency(currentMonthIncome)}</h2>
          <p className="text-emerald-100 text-xs mt-2">
            Zatiahnuté z {new Set(records.filter(r => r.record_month === latestMonth).map(r => r.category_id)).size} zdrojov
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold">História príjmov</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Mesiac</th>
                <th className="px-6 py-4 font-semibold">Kategória</th>
                <th className="px-6 py-4 font-semibold">Čiastka (pôvodná)</th>
                <th className="px-6 py-4 font-semibold text-right">Čiastka (EUR)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.slice(0, 20).map(record => (
                <motion.tr 
                  key={record.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium">
                    {new Date(record.record_month).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {record.income_categories?.name}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {record.amount} {record.currency}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                    {formatCurrency(record.amount_eur)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

