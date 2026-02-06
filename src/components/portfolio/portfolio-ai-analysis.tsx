'use client';

import { useState } from 'react';
import {
  Loader2,
  BrainCircuit,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Investment } from '@/types/financial';

interface AnalysisResult {
  diversification: 'Nízka' | 'Stredná' | 'Vysoká';
  riskProfile: 'Konzervatívny' | 'Vyvážený' | 'Agresívny';
  score: number;
  recommendation: string;
}

interface PortfolioAIAnalysisProps {
  investments: Investment[];
}

export function PortfolioAIAnalysis({ investments }: PortfolioAIAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const runAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const totalValue = investments.reduce(
        (sum, inv) => sum + inv.shares * inv.current_price,
        0
      );
      const cryptoValue = investments
        .filter((inv) => inv.type === 'crypto')
        .reduce((sum, inv) => sum + inv.shares * inv.current_price, 0);
      const cryptoRatio = totalValue > 0 ? cryptoValue / totalValue : 0;

      const tickers = investments.length;

      let div: AnalysisResult['diversification'] = 'Nízka';
      if (tickers > 3) div = 'Stredná';
      if (tickers > 7) div = 'Vysoká';

      let risk: AnalysisResult['riskProfile'] = 'Konzervatívny';
      if (cryptoRatio > 0.1 || tickers > 5) risk = 'Vyvážený';
      if (cryptoRatio > 0.3) risk = 'Agresívny';

      setAnalysis({
        diversification: div,
        riskProfile: risk,
        score: Math.min(100, Math.floor(tickers * 10 + (1 - cryptoRatio) * 30)),
        recommendation:
          cryptoRatio > 0.2
            ? 'Tvoje portfólio má vysoký podiel kryptomien. Zváž zvýšenie podielu široko diverzifikovaných ETF pre stabilitu.'
            : tickers < 5
              ? 'Máš malý počet inštrumentov. Pre lepšie rozloženie rizika by bolo vhodné pridať aspoň 2-3 ďalšie tituly z rôznych sektorov.'
              : 'Tvoje portfólio vyzerá zdravo diverzifikované. Pokračuj v pravidelnom rebalansovaní.',
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BrainCircuit size={20} className="text-purple-600" />
          <h3 className="font-bold">AI Analýza</h3>
        </div>
        {!analysis && !isAnalyzing && (
          <button
            onClick={runAnalysis}
            className="text-[10px] font-black uppercase tracking-widest bg-purple-600 text-white px-3 py-1.5 rounded-full hover:bg-purple-700 transition-colors"
          >
            Spustiť
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isAnalyzing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8 text-center space-y-3"
          >
            <Loader2
              className="animate-spin mx-auto text-purple-600"
              size={32}
            />
            <p className="text-sm font-medium text-slate-500 animate-pulse">
              Analyzujem dáta a trhové trendy...
            </p>
          </motion.div>
        ) : analysis ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Diverzifikácia
                  </span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {analysis.diversification}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Riziko
                  </span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {analysis.riskProfile}
                </p>
              </div>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30">
              <p className="text-xs text-purple-900 dark:text-purple-300 leading-relaxed italic">
                &quot;{analysis.recommendation}&quot;
              </p>
            </div>

            <button
              onClick={() => setAnalysis(null)}
              className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-purple-600 transition-colors"
            >
              Resetovať analýzu
            </button>
          </motion.div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-400 italic">
              Klikni na tlačidlo pre AI zhodnotenie tvojho portfólia.
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
