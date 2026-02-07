'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { assertSuccess, showError } from '@/lib/error-handling';
import type { Investment } from '@/types/financial';

interface AddInstrumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: 'default' | 'markusik';
  onSuccess: () => Promise<void>;
}

export function AddInstrumentModal({
  isOpen,
  onClose,
  portfolioId,
  onSuccess,
}: AddInstrumentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ticker: '',
    type: 'etf' as Investment['type'],
    shares: '',
    avg_price: '',
    current_price: '',
    currency: 'EUR' as Investment['currency'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from('investments').insert([
        {
          name: formData.name,
          ticker: formData.ticker.toUpperCase(),
          type: formData.type,
          shares: parseFloat(formData.shares),
          avg_price: parseFloat(formData.avg_price),
          current_price: parseFloat(formData.current_price),
          currency: formData.currency,
          portfolio_id: portfolioId,
          user_id: userData.user?.id,
        },
      ]);

      assertSuccess(error, 'Pridanie inštrumentu');

      toast.success('Inštrument bol pridaný');
      await onSuccess();
      onClose();
      setFormData({
        name: '',
        ticker: '',
        type: 'etf',
        shares: '',
        avg_price: '',
        current_price: '',
        currency: 'EUR',
      });
    } catch (err) {
      showError(err, 'Chyba pri pridávaní inštrumentu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-md shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <h3 className="text-2xl font-bold mb-6">
          Pridať do {portfolioId === 'markusik' ? 'Markusik' : 'Naše investície'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
              Názov
            </label>
            <input
              required
              type="text"
              placeholder="napr. S&P 500 ETF"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Ticker
              </label>
              <input
                type="text"
                placeholder="napr. VUSA"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.ticker}
                onChange={(e) =>
                  setFormData({ ...formData, ticker: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Typ
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as Investment['type'],
                  })
                }
              >
                <option value="etf">ETF</option>
                <option value="stock">Akcia</option>
                <option value="crypto">Krypto</option>
                <option value="other">Iné</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Počet kusov
              </label>
              <input
                required
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.shares}
                onChange={(e) =>
                  setFormData({ ...formData, shares: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Mena
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currency: e.target.value as Investment['currency'],
                  })
                }
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Nákupná cena
              </label>
              <input
                required
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.avg_price}
                onChange={(e) =>
                  setFormData({ ...formData, avg_price: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Aktuálna cena
              </label>
              <input
                required
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                value={formData.current_price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_price: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none transition-all mt-4 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" size={24} />
            ) : (
              'Uložiť inštrument'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
