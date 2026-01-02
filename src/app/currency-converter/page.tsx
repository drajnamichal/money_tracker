'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRightLeft,
  Calendar,
  Info,
  RefreshCcw,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/skeleton';

export default function CurrencyConverterPage() {
  const [czkAmount, setCzkAmount] = useState<string>('1000');
  const [eurAmount, setEurAmount] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculated, setLastCalculated] = useState<'czk' | 'eur'>('czk');

  useEffect(() => {
    async function fetchRate() {
      try {
        setLoading(true);
        const res = await fetch('/api/exchange-rates');
        const data = await res.json();
        if (data.rate) {
          setExchangeRate(data.rate);
          setRateDate(data.date);
          setError(null);
        } else {
          setError('Nepodarilo sa načítať kurz');
        }
      } catch (err) {
        setError('Chyba pripojenia');
      } finally {
        setLoading(false);
      }
    }
    fetchRate();
  }, []);

  // Update EUR when CZK or Rate changes
  useEffect(() => {
    if (exchangeRate && lastCalculated === 'czk') {
      const val = parseFloat(czkAmount);
      if (!isNaN(val)) {
        setEurAmount((val / exchangeRate).toFixed(2));
      } else {
        setEurAmount('');
      }
    }
  }, [czkAmount, exchangeRate, lastCalculated]);

  // Update CZK when EUR changes
  useEffect(() => {
    if (exchangeRate && lastCalculated === 'eur') {
      const val = parseFloat(eurAmount);
      if (!isNaN(val)) {
        setCzkAmount((val * exchangeRate).toFixed(2));
      } else {
        setCzkAmount('');
      }
    }
  }, [eurAmount, exchangeRate, lastCalculated]);

  const handleCzkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastCalculated('czk');
    setCzkAmount(e.target.value);
  };

  const handleEurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastCalculated('eur');
    setEurAmount(e.target.value);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ArrowRightLeft className="text-blue-600" />
            Prevod mien
          </h1>
          <p className="text-slate-500 mt-1">
            Aktuálny kurz CZK / EUR podľa Európskej centrálnej banky.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Converter Card */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800"
          >
            <div className="space-y-8">
              {/* CZK Input */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                  České koruny (CZK)
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    value={czkAmount}
                    onChange={handleCzkChange}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 text-3xl font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all group-hover:border-slate-300 dark:group-hover:border-slate-600"
                    placeholder="0.00"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-200 dark:shadow-none">
                      Kč
                    </div>
                  </div>
                </div>
              </div>

              {/* Direction Indicator */}
              <div className="flex justify-center -my-4 relative z-10">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border shadow-lg text-blue-600">
                  <ArrowRightLeft className="rotate-90 md:rotate-0" />
                </div>
              </div>

              {/* EUR Input */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                  Eurá (EUR)
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    value={eurAmount}
                    onChange={handleEurChange}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 text-3xl font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all group-hover:border-slate-300 dark:group-hover:border-slate-600"
                    placeholder="0.00"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-200 dark:shadow-none">
                      €
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {exchangeRate && (
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Zúčtovací kurz:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      1 EUR = {exchangeRate.toFixed(4)} CZK
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-start gap-3">
            <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              Tento nástroj slúži na rýchly prepočet medzi menami. Pre presné
              transakcie kontaktujte svoju banku, nakoľko zmenárne a banky majú
              vlastné kurzové lístky s maržou.
            </p>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" />
              Detaily kurzu
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800">
                <span className="text-sm text-slate-500">Dátum kurzu</span>
                <span className="text-sm font-bold">
                  {loading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    rateDate || 'Neznámy'
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800">
                <span className="text-sm text-slate-500">Zdroj</span>
                <span className="text-sm font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  ECB (Frankfurt)
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-slate-500">Inverzný kurz</span>
                <span className="text-sm font-bold">
                  {loading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : exchangeRate ? (
                    `1 CZK = ${(1 / exchangeRate).toFixed(5)} EUR`
                  ) : (
                    '-'
                  )}
                </span>
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full mt-6 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCcw size={14} />
              Aktualizovať kurz
            </button>
          </motion.div>

          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl">
            <TrendingUp size={32} className="mb-4 opacity-50" />
            <h4 className="font-bold mb-2">Vedeli ste?</h4>
            <p className="text-sm text-white/80 leading-relaxed">
              Európska centrálna banka aktualizuje kurz každý pracovný deň okolo
              16:00 SEČ. Ak pracujete v Čechách a bývate na Slovensku,
              sledovanie vývoja kurzu vám môže mesačne ušetriť desiatky eur pri
              prevode výplaty.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
