'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { showError } from '@/lib/error-handling';
import type { ExpenseRecord } from '@/types/financial';

interface MonthlyAISummaryProps {
  month: string;
  expenses: ExpenseRecord[];
  total: number;
  isFocused?: boolean;
}

export function MonthlyAISummary({
  month,
  expenses,
  total,
  isFocused = false,
}: MonthlyAISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/expense-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, expenses, total }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Server error');
      setSummary(data.summary);
    } catch (err) {
      showError(err, 'Nepodarilo sa vygenerovať AI zhrnutie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{
        scale: isFocused ? 1.01 : 1,
      }}
      transition={{ duration: 0.2 }}
      className={`mt-4 rounded-2xl border-t pt-4 transition-all duration-300 ${
        isFocused
          ? 'border-rose-200 bg-rose-50/60 px-3 pb-3 dark:border-rose-900/40 dark:bg-rose-950/20'
          : 'border-slate-100 dark:border-slate-800'
      }`}
    >
      {!summary ? (
        <button
          onClick={generateSummary}
          disabled={loading}
          className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {loading ? 'Analyzujem...' : 'AI Analýza mesiaca'}
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
        >
          <Sparkles size={14} className="text-indigo-500 shrink-0 mt-0.5" />
          <p>{summary}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
