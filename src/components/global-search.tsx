'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Receipt,
  TrendingUp,
  ArrowRight,
  Command,
} from 'lucide-react';
import { useFinancialData } from '@/providers/financial-provider';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'expense' | 'income';
  description: string;
  amount: number;
  currency: 'EUR' | 'CZK';
  date: string;
  category?: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { expenseRecords, incomeRecords } = useFinancialData();

  // Keyboard shortcut to open search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const searchTerm = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search expenses
    expenseRecords?.forEach((expense) => {
      if (!expense) return;
      
      const matchesDescription = expense.description
        ?.toLowerCase()
        ?.includes(searchTerm) ?? false;
      const matchesCategory = expense.category
        ?.toLowerCase()
        ?.includes(searchTerm) ?? false;
      const matchesAmount = expense.amount?.toString()?.includes(searchTerm) ?? false;

      if (matchesDescription || matchesCategory || matchesAmount) {
        searchResults.push({
          id: expense.id,
          type: 'expense',
          description: expense.description || '',
          amount: expense.amount || 0,
          currency: expense.currency || 'EUR',
          date: expense.record_date || '',
          category: expense.category,
        });
      }
    });

    // Search income
    incomeRecords?.forEach((income) => {
      if (!income) return;
      
      const matchesDescription = income.description
        ?.toLowerCase()
        ?.includes(searchTerm) ?? false;
      const matchesCategory = income.income_categories?.name
        ?.toLowerCase()
        ?.includes(searchTerm) ?? false;
      const matchesAmount = income.amount?.toString()?.includes(searchTerm) ?? false;

      if (matchesDescription || matchesCategory || matchesAmount) {
        searchResults.push({
          id: income.id,
          type: 'income',
          description: income.description || '',
          amount: income.amount || 0,
          currency: income.currency || 'EUR',
          date: income.record_month || '',
          category: income.income_categories?.name,
        });
      }
    });

    // Sort by date (newest first) and limit results
    searchResults.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setResults(searchResults.slice(0, 10));
    setSelectedIndex(0);
  }, [query, expenseRecords, incomeRecords]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        navigateToResult(results[selectedIndex]);
      }
    },
    [results, selectedIndex]
  );

  const navigateToResult = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    if (result.type === 'expense') {
      router.push('/expenses');
    } else {
      router.push('/income');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('sk-SK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
      >
        <Search size={16} className="text-slate-400 group-hover:text-blue-500" />
        <span className="flex-1 text-left">Hľadať...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
          <Command size={10} />K
        </kbd>
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[101] px-4"
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 border-b border-slate-100 dark:border-slate-800">
                  <Search
                    size={20}
                    className="text-slate-400 dark:text-slate-500 shrink-0"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Hľadať výdavky a príjmy..."
                    className="flex-1 py-4 bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    >
                      <X size={16} className="text-slate-400" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    ESC
                  </button>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto">
                  {query && results.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      <Search
                        size={32}
                        className="mx-auto mb-2 opacity-30"
                      />
                      <p>Žiadne výsledky pre &quot;{query}&quot;</p>
                    </div>
                  )}

                  {results.length > 0 && (
                    <div className="p-2">
                      <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Výsledky ({results.length})
                      </p>
                      {results.map((result, index) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => navigateToResult(result)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left',
                            selectedIndex === index
                              ? 'bg-blue-50 dark:bg-blue-900/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          )}
                        >
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                              result.type === 'expense'
                                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            )}
                          >
                            {result.type === 'expense' ? (
                              <Receipt size={18} />
                            ) : (
                              <TrendingUp size={18} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">
                              {result.description}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <span>{formatDate(result.date)}</span>
                              {result.category && (
                                <>
                                  <span>•</span>
                                  <span>{result.category}</span>
                                </>
                              )}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={cn(
                                'font-bold',
                                result.type === 'expense'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              )}
                            >
                              {result.type === 'expense' ? '-' : '+'}
                              {formatCurrency(result.amount, result.currency)}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase">
                              {result.type === 'expense' ? 'Výdaj' : 'Príjem'}
                            </p>
                          </div>

                          {selectedIndex === index && (
                            <ArrowRight
                              size={16}
                              className="text-blue-500 shrink-0"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {!query && (
                    <div className="p-6 text-center text-slate-500">
                      <div className="inline-flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium">
                            ↑↓
                          </kbd>
                          navigácia
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium">
                            Enter
                          </kbd>
                          otvoriť
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium">
                            Esc
                          </kbd>
                          zavrieť
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
