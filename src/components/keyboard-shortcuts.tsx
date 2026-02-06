'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const ROUTE_SHORTCUTS: Record<string, string> = {
  '1': '/',
  '2': '/expenses',
  '3': '/income',
  '4': '/assets',
  '5': '/portfolio',
};

/**
 * Global keyboard shortcuts:
 * - Cmd+1..5 — navigate to key pages
 * - Cmd+N — go to expenses with add action
 *
 * Cmd+K (search) is handled by GlobalSearch component.
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      // Cmd+N — quick add expense
      if (e.key === 'n') {
        e.preventDefault();
        router.push('/expenses?action=add');
        return;
      }

      // Cmd+1..5 — navigate to page
      const route = ROUTE_SHORTCUTS[e.key];
      if (route && route !== pathname) {
        e.preventDefault();
        router.push(route);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router, pathname]);

  return null; // renderless component
}
