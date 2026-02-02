'use client';

import Link from 'next/link';
import Image from 'next/image';
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
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { GlobalSearch } from './global-search';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const navigation = [
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

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Hide sidebar on login page
  if (pathname === '/login') return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-blue-600 text-white rounded-md shadow-lg"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-slate-50 dark:bg-slate-900 h-screen sticky top-0">
        <div className="p-4 pt-6">
          <Link href="/" className="block">
            <div className="relative w-full h-20">
              <Image 
                src="/logo.png" 
                alt="MoneyTracker" 
                fill
                priority
                className="object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          </Link>
        </div>

        {/* Global Search */}
        <div className="px-4">
          <GlobalSearch />
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-3 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                pathname === item.href
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t space-y-4">
          <div className="flex justify-between items-center px-4">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-rose-500 transition-colors"
              title="Odhlásiť sa"
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
              <div className="p-4 pt-16 flex-shrink-0">
                <Link href="/" className="block" onClick={() => setIsOpen(false)}>
                  <div className="relative w-full h-16">
                    <Image 
                      src="/logo.png" 
                      alt="MoneyTracker" 
                      fill
                      priority
                      className="object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </Link>
              </div>

              {/* Mobile Global Search */}
              <div className="px-4">
                <GlobalSearch />
              </div>

              <nav className="flex-1 px-4 space-y-2 mt-3 overflow-y-auto min-h-0">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                      pathname === item.href
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    )}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="p-4 border-t flex justify-between items-center bg-white dark:bg-slate-900 flex-shrink-0">
                <ThemeToggle />
                <span className="text-xs text-slate-400">v1.0.0</span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
