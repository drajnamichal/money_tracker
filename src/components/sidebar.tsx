'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Receipt,
  Calculator,
  Menu,
  X,
  LogOut,
  CreditCard,
  Building2,
  Home,
  PieChart,
  Flame,
  ArrowRightLeft,
  Palmtree,
  Gem,
  Settings,
  Tags,
  MoreHorizontal,
  GripVertical,
} from 'lucide-react';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { GlobalSearch } from './global-search';
import { Sparkline } from './sparkline';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  useWealthData,
  useIncomeData,
  useExpenseData,
} from '@/hooks/use-financial-data';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const defaultNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Majetok', href: '/assets', icon: Wallet },
  { name: 'Portfólio', href: '/portfolio', icon: PieChart },
  { name: 'Príjmy', href: '/income', icon: TrendingUp },
  { name: 'Výdaje', href: '/expenses', icon: Receipt },
  { name: 'Rozpočet bytu', href: '/budget-tracker', icon: Building2 },
  { name: 'Pravidelné platby', href: '/recurring-payments', icon: CreditCard },
  { name: 'Hypotéka', href: '/mortgage', icon: Home },
  { name: 'Kalkulačka', href: '/calculator', icon: Calculator },
  { name: 'Prevod mien', href: '/currency-converter', icon: ArrowRightLeft },
  { name: 'FIRE', href: '/fire', icon: Flame },
  { name: 'Dôchodok', href: '/retirement', icon: Palmtree },
  { name: 'CZ', href: '/cz', icon: ArrowRightLeft },
  { name: 'Bloomreach RSU', href: '/bloomreach', icon: Gem },
  { name: 'Kategórie', href: '/categories', icon: Tags },
  { name: 'Nastavenia', href: '/settings', icon: Settings },
];

const bottomNavItems = [
  { name: 'Domov', href: '/', icon: LayoutDashboard },
  { name: 'Výdaje', href: '/expenses', icon: Receipt },
  { name: 'Príjmy', href: '/income', icon: TrendingUp },
  { name: 'Majetok', href: '/assets', icon: Wallet },
];

const NAV_ORDER_KEY = 'sidebar-nav-order';

/** Load saved order from localStorage, returning ordered NavItems */
function getOrderedNavigation(): NavItem[] {
  if (typeof window === 'undefined') return defaultNavigation;
  try {
    const saved = localStorage.getItem(NAV_ORDER_KEY);
    if (!saved) return defaultNavigation;
    const hrefs: string[] = JSON.parse(saved);
    // Map saved href order to NavItems, append any new items at end
    const itemMap = new Map(defaultNavigation.map((item) => [item.href, item]));
    const ordered: NavItem[] = [];
    hrefs.forEach((href) => {
      const item = itemMap.get(href);
      if (item) {
        ordered.push(item);
        itemMap.delete(href);
      }
    });
    // Append items not in saved order (new pages added later)
    itemMap.forEach((item) => ordered.push(item));
    return ordered;
  } catch {
    return defaultNavigation;
  }
}

function saveNavOrder(items: NavItem[]) {
  localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(items.map((i) => i.href)));
}

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [navigation, setNavigation] = useState<NavItem[]>(defaultNavigation);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  // Load saved order on mount
  useEffect(() => {
    setNavigation(getOrderedNavigation());
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((index: number) => {
    dragRef.current = index;
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (index: number) => {
      const from = dragRef.current;
      if (from === null || from === index) {
        setDragIndex(null);
        setDragOverIndex(null);
        return;
      }

      const updated = [...navigation];
      const [moved] = updated.splice(from, 1);
      updated.splice(index, 0, moved);
      setNavigation(updated);
      saveNavOrder(updated);
      setDragIndex(null);
      setDragOverIndex(null);
      dragRef.current = null;
    },
    [navigation]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
    dragRef.current = null;
  }, []);

  // Data for sparklines
  const { records: wealthRecords } = useWealthData();
  const { records: incomeRecords } = useIncomeData();
  const { records: expenseRecords } = useExpenseData();

  const sparklineData = useMemo(() => {
    const map: Record<string, number[]> = {};

    const wealthByMonth: Record<string, number> = {};
    wealthRecords.forEach((r) => {
      const m = r.record_date.substring(0, 7);
      wealthByMonth[m] = (wealthByMonth[m] || 0) + Number(r.amount_eur);
    });
    map['/assets'] = Object.entries(wealthByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);

    const incByMonth: Record<string, number> = {};
    incomeRecords.forEach((r) => {
      const m = r.record_month.substring(0, 7);
      incByMonth[m] = (incByMonth[m] || 0) + Number(r.amount_eur);
    });
    map['/income'] = Object.entries(incByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);

    const expByMonth: Record<string, number> = {};
    expenseRecords.forEach((r) => {
      const m = r.record_date.substring(0, 7);
      expByMonth[m] = (expByMonth[m] || 0) + Number(r.amount_eur);
    });
    map['/expenses'] = Object.entries(expByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);

    return map;
  }, [wealthRecords, incomeRecords, expenseRecords]);

  if (pathname === '/login') return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 border-r bg-slate-50 dark:bg-slate-900 h-screen sticky top-0"
        role="navigation"
        aria-label="Hlavná navigácia"
      >
        <div className="p-4 pt-5 pb-2" />

        <div className="px-4">
          <GlobalSearch />
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-3 overflow-y-auto" aria-label="Sekcie">
          {navigation.map((item, index) => {
            const isActive = pathname === item.href;
            const spark = sparklineData[item.href];
            const isDragging = dragIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={item.href}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'rounded-lg transition-all duration-150',
                  isDragging && 'opacity-40',
                  isDragOver && !isDragging && 'border-t-2 border-blue-500'
                )}
              >
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group',
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                  )}
                >
                  <GripVertical
                    size={14}
                    className={cn(
                      'shrink-0 cursor-grab active:cursor-grabbing transition-opacity',
                      isActive
                        ? 'opacity-40'
                        : 'opacity-0 group-hover:opacity-30'
                    )}
                  />
                  <item.icon size={18} />
                  <span className="font-medium flex-1 text-sm">{item.name}</span>
                  {spark && spark.length >= 2 && (
                    <Sparkline
                      data={spark}
                      color={isActive ? '#ffffff' : '#94a3b8'}
                      width={44}
                      height={14}
                    />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-4">
          <div className="flex justify-between items-center px-4">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-rose-500 transition-colors"
              title="Odhlásiť sa"
              aria-label="Odhlásiť sa"
            >
              <LogOut size={20} />
            </button>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              v1.0.0
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 z-50 md:hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 pt-16 pb-2 flex-shrink-0" />

              <div className="px-4">
                <GlobalSearch />
              </div>

              <nav
                className="flex-1 px-4 space-y-2 mt-3 overflow-y-auto min-h-0"
                aria-label="Sekcie"
              >
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      )}
                    >
                      <item.icon size={20} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t flex justify-between items-center bg-white dark:bg-slate-900 flex-shrink-0">
                <ThemeToggle />
                <span className="text-xs text-slate-400">v1.0.0</span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-bottom"
        role="navigation"
        aria-label="Rýchla navigácia"
      >
        <div className="flex items-center justify-around px-2 py-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.name}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[60px]',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold">{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Zobraziť viac sekcií"
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[60px]',
              'text-slate-400 dark:text-slate-500'
            )}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-bold">Viac</span>
          </button>
        </div>
      </nav>
    </>
  );
}
