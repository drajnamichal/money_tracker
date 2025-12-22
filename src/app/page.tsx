'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssets: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    assetsGrowth: 0,
    incomeChange: 0,
  });
  const [assetsHistory, setAssetsHistory] = useState<any[]>([]);
  const [incomeVsExpenses, setIncomeVsExpenses] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: wealthData } = await supabase
          .from('wealth_records')
          .select('amount_eur, record_date')
          .order('record_date', { ascending: false });

        if (wealthData && wealthData.length > 0) {
          const totalsByDate = wealthData.reduce((acc: any, curr: any) => {
            acc[curr.record_date] = (acc[curr.record_date] || 0) + Number(curr.amount_eur);
            return acc;
          }, {});

          const sortedDates = Object.keys(totalsByDate).sort();
          const latestDate = sortedDates[sortedDates.length - 1];
          const previousDate = sortedDates[sortedDates.length - 2];

          const currentTotal = totalsByDate[latestDate];
          const previousTotal = totalsByDate[previousDate] || currentTotal;
          const growth = previousTotal !== 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

          setStats(prev => ({ 
            ...prev, 
            totalAssets: currentTotal,
            assetsGrowth: growth
          }));

          setAssetsHistory(sortedDates.map(date => ({
            date: new Date(date).toLocaleDateString('sk-SK', { month: 'short', year: '2-digit' }),
            total: totalsByDate[date]
          })));
        }

        const { data: incomeData } = await supabase
          .from('income_records')
          .select('amount_eur, record_month');

        const { data: expenseData } = await supabase
          .from('expense_records')
          .select('amount_eur, record_date');

        const monthlyData: any = {};
        
        if (incomeData) {
          incomeData.forEach((item: any) => {
            const month = item.record_month.substring(0, 7);
            if (!monthlyData[month]) monthlyData[month] = { month, income: 0, expenses: 0 };
            monthlyData[month].income += Number(item.amount_eur);
          });
        }

        if (expenseData) {
          expenseData.forEach((item: any) => {
            const month = item.record_date.substring(0, 7);
            if (!monthlyData[month]) monthlyData[month] = { month, income: 0, expenses: 0 };
            monthlyData[month].expenses += Number(item.amount_eur);
          });
        }

        const combinedData = Object.values(monthlyData)
          .sort((a: any, b: any) => a.month.localeCompare(b.month))
          .map((item: any) => ({
            name: new Date(item.month).toLocaleDateString('sk-SK', { month: 'short', year: '2-digit' }),
            income: item.income,
            expenses: item.expenses
          }));

        setIncomeVsExpenses(combinedData);

        const latestMonth = combinedData[combinedData.length - 1];
        if (latestMonth) {
          setStats(prev => ({
            ...prev,
            monthlyIncome: latestMonth.income,
            monthlyExpenses: latestMonth.expenses
          }));
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ahoj! 👋</h1>
          <p className="text-slate-500">Tu je prehľad tvojich rodinných financií.</p>
        </div>
        <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 flex items-center gap-4">
          <Wallet size={24} />
          <div>
            <p className="text-xs opacity-80 uppercase font-bold tracking-wider">Celkový Majetok</p>
            <p className="text-xl font-bold">{formatCurrency(stats.totalAssets)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Mesačný Príjem" 
          value={formatCurrency(stats.monthlyIncome)} 
          change={0}
          icon={<TrendingUp className="text-emerald-500" />}
          color="emerald"
        />
        <StatCard 
          title="Mesačné Výdavky" 
          value={formatCurrency(stats.monthlyExpenses)} 
          change={0}
          icon={<TrendingDown className="text-rose-500" />}
          color="rose"
        />
        <StatCard 
          title="Mesačná Úspora" 
          value={formatCurrency(stats.monthlyIncome - stats.monthlyExpenses)} 
          change={0}
          icon={<TrendingUp className="text-blue-500" />}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border"
        >
          <h3 className="text-lg font-semibold mb-6">Vývoj Majetku</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={assetsHistory}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Majetok']}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border"
        >
          <h3 className="text-lg font-semibold mb-6">Príjmy vs Výdavky</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpenses}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Príjem" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Výdavky" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon, color }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border flex items-center gap-6"
    >
      <div className={`p-4 rounded-xl bg-${color}-50 dark:bg-${color}-950`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold">{value}</h3>
          {change !== 0 && (
            <span className={`text-xs font-bold ${change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

