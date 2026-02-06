'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PageError]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
          <AlertTriangle
            className="text-rose-600 dark:text-rose-400"
            size={40}
          />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Niečo sa pokazilo
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-2">
          Pri načítaní stránky nastala chyba. Skús to prosím znova.
        </p>
        {error.message && (
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-2 mb-8 inline-block">
            {error.message}
          </p>
        )}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
          >
            <RefreshCw size={18} />
            Skúsiť znova
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
          >
            <Home size={18} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
