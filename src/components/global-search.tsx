'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Receipt,
  TrendingUp,
  ArrowRight,
  Command,
  PieChart,
  CreditCard,
  Wallet,
  Building2,
} from 'lucide-react';
import {
  useExpenseData,
  useIncomeData,
  useInvestmentData,
  useRecurringPaymentsData,
  useWealthData,
  useBudgetData,
} from '@/hooks/use-financial-data';
import { formatCurrency, cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchResultType =
  | 'expense'
  | 'income'
  | 'investment'
  | 'recurring'
  | 'asset'
  | 'budget';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  amount: number;
  currency: string;
  date: string;
}

const TYPE_CONFIG: Record<
  SearchResultType,
  {
    label: string;
    route: string;
    icon: typeof Receipt;
    iconClass: string;
    bgClass: string;
    amountPrefix: string;
    amountClass: string;
  }
> = {
  expense: {
    label: 'Výdaj',
    route: '/expenses',
    icon: Receipt,
    iconClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-100 dark:bg-rose-900/30',
    amountPrefix: '-',
    amountClass: 'text-rose-600 dark:text-rose-400',
  },
  income: {
    label: 'Príjem',
    route: '/income',
    icon: TrendingUp,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    amountPrefix: '+',
    amountClass: 'text-emerald-600 dark:text-emerald-400',
  },
  investment: {
    label: 'Investícia',
    route: '/portfolio',
    icon: PieChart,
    iconClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    amountPrefix: '',
    amountClass: 'text-blue-600 dark:text-blue-400',
  },
  recurring: {
    label: 'Pravidelná platba',
    route: '/recurring-payments',
    icon: CreditCard,
    iconClass: 'text-violet-600 dark:text-violet-400',
    bgClass: 'bg-violet-100 dark:bg-violet-900/30',
    amountPrefix: '',
    amountClass: 'text-violet-600 dark:text-violet-400',
  },
  asset: {
    label: 'Majetok',
    route: '/assets',
    icon: Wallet,
    iconClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    amountPrefix: '',
    amountClass: 'text-amber-600 dark:text-amber-400',
  },
  budget: {
    label: 'Rozpočet',
    route: '/budget-tracker',
    icon: Building2,
    iconClass: 'text-cyan-600 dark:text-cyan-400',
    bgClass: 'bg-cyan-100 dark:bg-cyan-900/30',
    amountPrefix: '-',
    amountClass: 'text-cyan-600 dark:text-cyan-400',
  },
};

// ---------------------------------------------------------------------------
// Debounce hook
// ---------------------------------------------------------------------------

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 200);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Data sources — TanStack Query only fetches when the hook is first used
  const { records: expenseRecords } = useExpenseData();
  const { records: incomeRecords } = useIncomeData();
  const { investments } = useInvestmentData();
  const { records: recurringPayments } = useRecurringPaymentsData();
  const { records: wealthRecords, accounts: assetAccounts } = useWealthData();
  const { expenses: budgetExpenses } = useBudgetData();

  // Build account name lookup once
  const accountNameMap = useMemo(() => {
    const map = new Map<string, string>();
    assetAccounts.forEach((acc) => map.set(acc.id, acc.name));
    return map;
  }, [assetAccounts]);

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

  // ---------------------------------------------------------------------------
  // Search logic — runs on debounced query
  // ---------------------------------------------------------------------------

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const term = debouncedQuery.toLowerCase();
    const matches = (value: string | number | null | undefined): boolean =>
      value != null && String(value).toLowerCase().includes(term);

    const searchResults: SearchResult[] = [];

    // Expenses
    expenseRecords?.forEach((r) => {
      if (matches(r.description) || matches(r.category) || matches(r.amount)) {
        searchResults.push({
          id: r.id,
          type: 'expense',
          title: r.description || '',
          subtitle: r.category,
          amount: r.amount_eur,
          currency: r.currency || 'EUR',
          date: r.record_date || '',
        });
      }
    });

    // Income
    incomeRecords?.forEach((r) => {
      if (
        matches(r.description) ||
        matches(r.income_categories?.name) ||
        matches(r.amount)
      ) {
        searchResults.push({
          id: r.id,
          type: 'income',
          title: r.income_categories?.name || r.description || '',
          subtitle: r.description,
          amount: r.amount_eur,
          currency: r.currency || 'EUR',
          date: r.record_month || '',
        });
      }
    });

    // Investments
    investments?.forEach((inv) => {
      if (matches(inv.name) || matches(inv.ticker) || matches(inv.type)) {
        searchResults.push({
          id: inv.id,
          type: 'investment',
          title: inv.name,
          subtitle: [inv.ticker, inv.type.toUpperCase()].filter(Boolean).join(' · '),
          amount: inv.shares * inv.current_price,
          currency: inv.currency || 'EUR',
          date: inv.updated_at || inv.created_at || '',
        });
      }
    });

    // Recurring payments
    recurringPayments?.forEach((rp) => {
      if (matches(rp.name) || matches(rp.amount)) {
        searchResults.push({
          id: rp.id,
          type: 'recurring',
          title: rp.name,
          subtitle: rp.frequency === 'monthly' ? 'Mesačne' : 'Ročne',
          amount: rp.amount,
          currency: rp.currency || 'EUR',
          date: rp.created_at || '',
        });
      }
    });

    // Wealth / Asset records (show only latest per account to avoid noise)
    const seenAccounts = new Set<string>();
    wealthRecords?.forEach((wr) => {
      const accountName = accountNameMap.get(wr.account_id) || 'Účet';
      if (seenAccounts.has(wr.account_id)) return;
      if (matches(accountName) || matches(wr.amount_eur)) {
        seenAccounts.add(wr.account_id);
        searchResults.push({
          id: wr.id,
          type: 'asset',
          title: accountName,
          subtitle: wr.record_date,
          amount: wr.amount_eur,
          currency: 'EUR',
          date: wr.record_date || '',
        });
      }
    });

    // Budget expenses
    budgetExpenses?.forEach((be) => {
      if (matches(be.description) || matches(be.category) || matches(be.amount)) {
        searchResults.push({
          id: be.id,
          type: 'budget',
          title: be.description,
          subtitle: be.category || undefined,
          amount: be.amount_eur,
          currency: be.currency || 'EUR',
          date: be.created_at || '',
        });
      }
    });

    // Sort by date (newest first) and limit
    searchResults.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return searchResults.slice(0, 12);
  }, [
    debouncedQuery,
    expenseRecords,
    incomeRecords,
    investments,
    recurringPayments,
    wealthRecords,
    budgetExpenses,
    accountNameMap,
  ]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const navigateToResult = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      setQuery('');
      const config = TYPE_CONFIG[result.type];
      router.push(config.route);
    },
    [router]
  );

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
    [results, selectedIndex, navigateToResult]
  );

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
      >
        <Search
          size={16}
          className="text-slate-400 group-hover:text-blue-500"
        />
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
                    placeholder="Hľadať výdavky, príjmy, investície, platby..."
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
                  {debouncedQuery && results.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      <Search size={32} className="mx-auto mb-2 opacity-30" />
                      <p>Žiadne výsledky pre &quot;{debouncedQuery}&quot;</p>
                    </div>
                  )}

                  {results.length > 0 && (
                    <div className="p-2">
                      <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Výsledky ({results.length})
                      </p>
                      {results.map((result, index) => {
                        const config = TYPE_CONFIG[result.type];
                        const Icon = config.icon;

                        return (
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
                                config.bgClass,
                                config.iconClass
                              )}
                            >
                              <Icon size={18} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white truncate">
                                {result.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span>{formatDate(result.date)}</span>
                                {result.subtitle && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">
                                      {result.subtitle}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className={cn('font-bold', config.amountClass)}>
                                {config.amountPrefix}
                                {formatCurrency(result.amount, result.currency)}
                              </p>
                              <p className="text-[10px] text-slate-400 uppercase">
                                {config.label}
                              </p>
                            </div>

                            {selectedIndex === index && (
                              <ArrowRight
                                size={16}
                                className="text-blue-500 shrink-0"
                              />
                            )}
                          </button>
                        );
                      })}
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
